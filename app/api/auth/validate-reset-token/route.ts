import { NextRequest, NextResponse } from 'next/server';
import { PasswordResetToken, UserOperationLog } from '@/models';
import { successResponse, errorResponse, getClientIP } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    // 验证必填字段
    if (!token) {
      return NextResponse.json(errorResponse('重置令牌不能为空'), {
        status: 400,
      });
    }

    // 查找重置令牌
    const resetToken = await PasswordResetToken.findOne({
      where: {
        token,
        used: false,
      },
    });

    if (!resetToken) {
      // 无效令牌无法获取userId，记录到控制台日志
      console.warn('验证无效的重置密码令牌', {
        token: token.substring(0, 8) + '...',
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || '',
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(errorResponse('重置令牌无效'), {
        status: 404,
      });
    }

    // 检查令牌是否过期
    if (new Date() > resetToken.expiresTime) {
      // 记录令牌过期的日志
      try {
        await UserOperationLog.create({
          userId: resetToken.userId,
          operationType: 'password_reset_token_expired',
          operationDesc: '重置密码令牌已过期',
          ipAddress: getClientIP(request),
          userAgent: request.headers.get('user-agent') || '',
        });
      } catch (logError) {
        console.error('记录日志失败:', logError);
      }

      return NextResponse.json(errorResponse('重置令牌已过期'), {
        status: 410,
      });
    }

    // 记录令牌验证成功的日志
    try {
      await UserOperationLog.create({
        userId: resetToken.userId,
        operationType: 'password_reset_token_validated',
        operationDesc: '重置密码令牌验证成功',
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || '',
      });
    } catch (logError) {
      console.error('记录日志失败:', logError);
    }

    return NextResponse.json(
      successResponse('重置令牌有效')
    );
  } catch (error) {
    console.error('验证重置令牌失败:', error);
    return NextResponse.json(
      errorResponse('服务器错误，请稍后重试'),
      { status: 500 }
    );
  }
}