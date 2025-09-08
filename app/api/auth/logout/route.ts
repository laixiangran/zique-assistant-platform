import { NextRequest, NextResponse } from 'next/server';
import { UserOperationLog } from '@/models';
import {
  authenticateRequest,
  successResponse,
  errorResponse,
  getClientIP,
} from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    // 尝试验证token并记录登出日志（即使token无效也允许登出）
    const authResult = await authenticateRequest(request);
    if (authResult.success && authResult.user) {
      const decoded = authResult.user;
      try {
        // 记录登出日志
        await UserOperationLog.create({
          userId: decoded.userId,
          operationType:
            decoded.type === 'main' ? 'logout' : 'sub_account_logout',
          operationDesc:
            decoded.type === 'main'
              ? '用户登出'
              : `子账户登出 (${decoded.username})`,
          ipAddress: getClientIP(request),
          userAgent: request.headers.get('user-agent') || '',
        });
      } catch (error) {
        console.log('记录登出日志失败:', error);
      }
    }

    const response = NextResponse.json(successResponse(null, '登出成功'));

    // 清除cookie
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // 立即过期
    });

    return response;
  } catch (error) {
    console.error('登出失败:', error);
    return NextResponse.json(errorResponse('登出失败，请稍后重试'), {
      status: 500,
    });
  }
}
