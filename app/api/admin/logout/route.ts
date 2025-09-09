import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';

// 管理员退出登录
export async function POST(request: NextRequest) {
  try {
    // 验证管理员身份（可选，因为退出登录不需要严格验证）
    const admin = await getAdminFromRequest(request);
    
    if (admin) {
      console.log(`管理员 ${admin.username} 退出登录`);
    }

    return NextResponse.json({
      success: true,
      message: '退出成功',
    });
  } catch (error) {
    console.error('管理员退出失败:', error);
    return NextResponse.json(
      { success: false, message: '退出失败' },
      { status: 500 }
    );
  }
}