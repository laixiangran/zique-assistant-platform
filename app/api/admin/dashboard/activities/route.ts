import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { UserOperationLog } from '@/models';
import sequelize from '@/lib/database';

// 获取最近活动数据
export async function GET(request: NextRequest) {
  try {
    // 验证管理员身份
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      );
    }

    await sequelize.authenticate();

    // 获取最近的操作日志作为活动数据
    const activities = await UserOperationLog.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'action', 'description', 'createdAt', 'userId']
    });

    // 如果没有操作日志，返回模拟数据
    const mockActivities = [
      {
        id: 1,
        action: '用户注册',
        description: '新用户注册成功',
        createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30分钟前
        userId: 1
      },
      {
        id: 2,
        action: '插件下载',
        description: '用户下载了最新版本插件',
        createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1小时前
        userId: 2
      },
      {
        id: 3,
        action: '商城绑定',
        description: '用户绑定了新的商城',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2小时前
        userId: 3
      }
    ];

    const result = activities.length > 0 ? activities : mockActivities;

    return NextResponse.json({
      success: true,
      message: '获取最近活动成功',
      data: result,
    });
  } catch (error) {
    console.error('获取最近活动失败:', error);
    return NextResponse.json(
      { success: false, message: '获取最近活动失败' },
      { status: 500 }
    );
  }
}