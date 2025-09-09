import { NextRequest, NextResponse } from 'next/server';
import { User, SubAccount, UserOperationLog } from '@/models';
import {
  comparePassword,
  generateToken,
  successResponse,
  errorResponse,
  getClientIP,
} from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // 验证必填字段
    if (!username || !password) {
      return NextResponse.json(errorResponse('请输入用户名和密码'), {
        status: 400,
      });
    }
    
    // 验证字段长度
    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(errorResponse('用户名长度必须在3-20个字符之间'), {
        status: 400,
      });
    }
    
    if (password.length < 6 || password.length > 20) {
      return NextResponse.json(errorResponse('密码长度必须在6-20个字符之间'), {
        status: 400,
      });
    }

    let user: any = null;
    let userInfo: any = null;
    let tokenPayload: any = null;
    let accountType = '';

    // 先尝试查找主账户
    user = await User.findOne({
      where: {
        username,
      },
    });

    if (user) {
      // 找到主账户
      accountType = 'main';

      // 检查账户状态
      if (user.status !== 'active') {
        return NextResponse.json(errorResponse('账户已被禁用'), {
          status: 401,
        });
      }

      // 验证密码
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        // 记录登录失败日志
        await UserOperationLog.create({
          userId: user.id,
          operationType: 'login',
          operationDesc: '用户登录失败 - 密码错误',
          ipAddress: getClientIP(request),
          userAgent: request.headers.get('user-agent') || '',
        });

        return NextResponse.json(errorResponse('用户名或密码错误'), {
          status: 401,
        });
      }

      userInfo = {
        id: user.id,
        username: user.username,
        phone: user.phone,
        email: user.email,
        status: user.status,
        createdTime: user.createdTime,
      };

      tokenPayload = {
        userId: user.id,
        username: user.username,
        type: 'main',
      };
    } else {
      // 如果没找到主账户，则尝试查找子账户
      user = await SubAccount.findOne({
        where: {
          username,
        },
        include: [
          {
            model: User,
            as: 'parentUser',
            attributes: ['id', 'username', 'status'],
          },
        ],
      });

      if (!user) {
        return NextResponse.json(errorResponse('用户名或密码错误'), {
          status: 401,
        });
      }

      accountType = '`sub`';

      // 检查子账户状态
      if (user.status !== 'active') {
        return NextResponse.json(errorResponse('子账户已被禁用'), {
          status: 401,
        });
      }

      // 检查主账户状态
      if (user.parentUser.status !== 'active') {
        return NextResponse.json(errorResponse('主账户已被禁用'), {
          status: 401,
        });
      }

      // 验证密码
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        // 记录登录失败日志
        await UserOperationLog.create({
          userId: user.id,
          operationType: 'sub_account_login',
          operationDesc: `子账户登录失败 - 密码错误 (${user.username})`,
          ipAddress: getClientIP(request),
          userAgent: request.headers.get('user-agent') || '',
        });

        return NextResponse.json(errorResponse('用户名或密码错误'), {
          status: 401,
        });
      }

      userInfo = {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
        createdTime: user.createdTime,
        parentUser: {
          id: user.parentUser.id,
          username: user.parentUser.username,
        },
      };

      tokenPayload = {
        userId: user.id,
        username: user.username,
        type: 'sub',
      };
    }

    // 生成JWT token
    const token = generateToken(tokenPayload);

    // 记录登录成功日志
    await UserOperationLog.create({
      userId: user.id,
      operationType: `${accountType}_login`,
      operationDesc: `${user.username} 登录成功`,
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || '',
    });

    const response = NextResponse.json(
      successResponse(
        {
          user: userInfo,
          token,
          accountType,
        },
        '登录成功'
      )
    );

    // 设置cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7天
    });

    return response;
  } catch (error) {
    console.error('登录失败:', error);
    return NextResponse.json(errorResponse('登录失败，请稍后重试'), {
      status: 500,
    });
  }
}
