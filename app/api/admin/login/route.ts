import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import Admin from '@/models/Admin';
import sequelize from '@/lib/database';
import {
  generateAdminToken,
  successResponse,
  errorResponse,
} from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    await sequelize.authenticate();

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(errorResponse('用户名和密码不能为空'), {
        status: 400,
      });
    }

    // 查找管理员
    const admin = await Admin.findOne({ where: { username } });
    if (!admin) {
      return NextResponse.json(errorResponse('用户名或密码错误'), {
        status: 401,
      });
    }

    // 检查账户状态
    if (admin.status !== 'active') {
      return NextResponse.json(errorResponse('账户已被禁用'), {
        status: 401,
      });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return NextResponse.json(errorResponse('用户名或密码错误'), {
        status: 401,
      });
    }

    const token = generateAdminToken({
      adminId: admin.id,
      username: admin.username,
      role: admin.role,
      type: 'admin',
    });

    // 更新最后登录时间和IP
    const clientIP =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    await admin.update({
      lastLoginTime: new Date(),
      lastLoginIp: clientIP,
    });

    // 返回用户信息（不包含密码和盐值）
    const { password: _, salt: __, ...adminData } = admin.toJSON();

    const response = NextResponse.json(
      successResponse(
        {
          user: adminData,
          token,
          accountType: 'admin',
        },
        '登录成功'
      )
    );

    // 设置cookie，有效期7天
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7天
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('管理员登录失败:', error);
    return NextResponse.json(errorResponse('登录失败，请稍后重试'), {
      status: 500,
    });
  }
}
