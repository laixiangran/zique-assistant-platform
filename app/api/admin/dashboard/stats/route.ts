import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { User, UserMallBinding } from '@/models';
import sequelize from '@/lib/database';
import { successResponse, errorResponse } from '@/lib/utils';

// 获取仪表板统计数据
export async function GET(request: NextRequest) {
  try {
    // 验证管理员身份
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(errorResponse('未授权访问'), { status: 401 });
    }

    await sequelize.authenticate();

    // 获取用户总数
    const totalUsers = await User.count();

    // 获取总绑定店铺数
    const totalMallBindings = await UserMallBinding.count();

    const stats = {
      totalUsers,
      totalMallBindings,
    };

    return NextResponse.json(successResponse(stats, '获取统计数据成功'));
  } catch (error) {
    console.error('获取仪表板统计数据失败:', error);
    return NextResponse.json(errorResponse('获取统计数据失败'), {
      status: 500,
    });
  }
}
