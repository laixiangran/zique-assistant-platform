import { NextResponse, NextRequest } from 'next/server';
import dayjs from 'dayjs';
import { MallState } from '@/models';
import { Op } from 'sequelize';
import { authenticateUser, buildMallWhereCondition } from '@/lib/user-auth';
import { createQueryOptimizer, FIELD_SELECTIONS } from '@/lib/query-optimizer';
import { successResponse, errorResponse } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    // 验证用户权限
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json(authResult, {
        status: 403,
      });
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const pageIndex = parseInt(searchParams.get('pageIndex') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const mallId = searchParams.get('mallId') || undefined;
    const mallName = searchParams.get('mallName') || undefined;
    const skuId = searchParams.get('skuId') || undefined;
    const sortField = searchParams.get('sortField') || 'updatedTime';
    const sortOrder = searchParams.get('sortOrder') || 'DESC';

    // 构建查询条件（包含权限控制）
    const whereCondition = await buildMallWhereCondition(
      authResult,
      mallId,
      mallName
    );

    // 添加其他查询条件
    if (skuId) {
      const skuIds = skuId
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id);
      if (skuIds.length > 0) {
        whereCondition.skuId = { [Op.in]: skuIds };
      }
    }

    // 创建查询优化器
    const queryOptimizer = createQueryOptimizer({
      enableCache: true,
      cacheTimeout: 300,
      selectFields: FIELD_SELECTIONS.MALL_STATE,
    });

    // 执行优化查询
    const results = await queryOptimizer.optimizedQuery(
      MallState,
      whereCondition,
      {
        pageIndex,
        pageSize,
        sortField,
        sortOrder: sortOrder.toUpperCase() as 'ASC' | 'DESC',
      },
      'mall_state'
    );

    // 转换时间格式
    const formattedResults = results.data.map((item: any) => ({
      ...item.dataValues,
      updatedTime: dayjs(item.updatedTime).format('YYYY-MM-DD HH:mm:ss'),
    }));

    return NextResponse.json(
      successResponse({
        data: formattedResults,
        total: results.total,
        pageIndex: results.pageIndex,
        pageSize: results.pageSize,
        totalPages: results.totalPages,
      })
    );
  } catch (error) {
    return NextResponse.json(
      errorResponse(error instanceof Error ? error.message : 'Unknown error'),
      {
        status: 500,
      }
    );
  }
}
