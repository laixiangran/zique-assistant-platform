import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { successResponse, errorResponse } from '@/lib/utils';

// 管理员退出登录
export async function POST(request: NextRequest) {
  try {
    // 验证管理员身份（可选，因为退出登录不需要严格验证）
    const admin = await getAdminFromRequest(request);

    if (admin) {
      console.log(`管理员 ${admin.username} 退出登录`);
    }

    const response = NextResponse.json(successResponse(null, '退出成功'));

    // 清除cookie
    response.cookies.set('admin_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // 立即过期
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('管理员退出失败:', error);
    return NextResponse.json(errorResponse('退出失败'), {
      status: 500,
    });
  }
}
