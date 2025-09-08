import { NextRequest, NextResponse } from 'next/server';
import { PasswordResetToken } from '@/models';
import { successResponse, errorResponse } from '@/lib/utils';

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