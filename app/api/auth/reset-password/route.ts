import { NextRequest, NextResponse } from 'next/server';
import { User, PasswordResetToken, UserOperationLog } from '@/models';
import {
  hashPassword,
  successResponse,
  errorResponse,
  getClientIP,
} from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    // 验证必填字段
    if (!token || !password) {
      return NextResponse.json(errorResponse('重置令牌和新密码不能为空'), {
        status: 400,
      });
    }

    // 验证密码强度
    if (password.length < 6) {
      return NextResponse.json(errorResponse('密码至少6个字符'), {
        status: 400,
      });
    }

    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json(errorResponse('密码必须包含字母和数字'), {
        status: 400,
      });
    }

    // 查找重置令牌
    const resetToken = await PasswordResetToken.findOne({
      where: {
        token,
        used: false,
      },
      include: [
        {
          model: User,
          as: 'user',
        },
      ],
    });

    if (!resetToken) {
      return NextResponse.json(errorResponse('重置令牌无效'), {
        status: 404,
      });
    }

    // 检查令牌是否过期
    if (new Date() > resetToken.expiresTime) {
      return NextResponse.json(errorResponse('重置令牌已过期'), {
        status: 410,
      });
    }

    // 获取用户信息
    const user = await User.findByPk(resetToken.userId);
    if (!user) {
      return NextResponse.json(errorResponse('用户不存在'), {
        status: 404,
      });
    }

    // 检查用户状态
    if (user.status !== 'active') {
      return NextResponse.json(errorResponse('账户已被禁用'), {
        status: 401,
      });
    }

    // 加密新密码
    const hashedPassword = await hashPassword(password);

    // 更新用户密码
    await user.update({
      password: hashedPassword,
    });

    // 标记令牌为已使用
    await resetToken.update({
      used: true,
    });

    // 删除该用户所有未使用的重置令牌
    await PasswordResetToken.destroy({
      where: {
        userId: user.id,
        used: false,
      },
    });

    // 记录操作日志
    try {
      await UserOperationLog.create({
        userId: user.id,
        operationType: 'password_reset',
        operationDesc: '通过邮件重置密码',
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || '',
      });
    } catch (logError) {
      console.error('记录操作日志失败:', logError);
      // 不影响主流程，继续执行
    }

    return NextResponse.json(successResponse('密码重置成功，请使用新密码登录'));
  } catch (error) {
    console.error('重置密码失败:', error);
    return NextResponse.json(errorResponse('服务器错误，请稍后重试'), {
      status: 500,
    });
  }
}
