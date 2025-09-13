import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { successResponse, errorResponse } from '@/lib/utils';

// 获取管理员个人信息
export async function GET(request: NextRequest) {
  try {
    // 验证管理员身份
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(errorResponse('未授权访问'), {
        status: 401,
      });
    }

    // 返回管理员信息（不包含密码和盐值）
    const { password: _, salt: __, ...adminData } = admin.toJSON();

    return NextResponse.json(successResponse(adminData, '获取个人信息成功'));
  } catch (error) {
    console.error('获取管理员个人信息失败:', error);
    return NextResponse.json(errorResponse('获取个人信息失败'), {
      status: 500,
    });
  }
}