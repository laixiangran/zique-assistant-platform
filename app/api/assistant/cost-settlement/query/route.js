import { NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { Op } from 'sequelize';
import { CostSettlement } from '../../../../models';
import { authenticateUser, buildMallWhereCondition } from '../../../../lib/user-auth';
import { createQueryOptimizer, FIELD_SELECTIONS } from '../../../../lib/query-optimizer';

export async function GET(request) {
  try {
    // 用户权限验证
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return authResult.response;
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const pageIndex = parseInt(searchParams.get('pageIndex')) || 1;
    const pageSize = parseInt(searchParams.get('pageSize')) || 10;
    const skuId = searchParams.get('sku_id');
    const mallId = searchParams.get('mall_id');
    const mallName = searchParams.get('mall_name');
    const costStatus = searchParams.get('cost_status');

    // 添加排序参数
    const sortField = searchParams.get('sortField');
    const sortOrder = searchParams.get('sortOrder');

    // 构建查询条件（包含权限控制）
    const whereCondition = await buildMallWhereCondition(
      authResult,
      mallId,
      mallName
    );
    
    if (skuId) {
      const skuIdList = skuId.split(',').map((id) => id.trim());
      whereCondition.sku_id = { [Op.in]: skuIdList };
    }
    
    // 添加成本状态查询条件
    if (costStatus === 'completed') {
      whereCondition.cost_price = {
        [Op.and]: [
          { [Op.ne]: null },
          { [Op.ne]: '' }
        ]
      };
    } else if (costStatus === 'incomplete') {
      whereCondition.cost_price = {
        [Op.or]: [
          { [Op.is]: null },
          { [Op.eq]: '' }
        ]
      };
    }

    // 创建查询优化器
    const queryOptimizer = createQueryOptimizer({
      enableCache: true,
      cacheTimeout: 300,
      selectFields: FIELD_SELECTIONS.COST_SETTLEMENT
    });

    // 执行优化查询
    const queryResult = await queryOptimizer.optimizedQuery(
      CostSettlement,
      whereCondition,
      {
        pageIndex,
        pageSize,
        sortField: sortField || 'updated_time',
        sortOrder: (sortOrder || 'DESC').toUpperCase()
      },
      'cost_settlement'
    );
    
    const { total, data: results } = queryResult;

    // 转换时间格式
    const formattedResults = results.map((item) => ({
      ...item,
      created_time: dayjs(item.created_time).format('YYYY-MM-DD HH:mm:ss'),
      pending_updated_time: dayjs(item.pending_updated_time).format(
        'YYYY-MM-DD HH:mm:ss'
      ),
      arrival_updated_time: dayjs(item.arrival_updated_time).format(
        'YYYY-MM-DD HH:mm:ss'
      ),
      updated_time: dayjs(item.updated_time).format('YYYY-MM-DD HH:mm:ss'),
    }));

    return NextResponse.json({
      success: true,
      data: formattedResults || [],
      total: queryResult.total,
      pageIndex: queryResult.pageIndex,
      pageSize: queryResult.pageSize,
      totalPages: queryResult.totalPages
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        data: [],
      },
      { status: 200 }
    );
  }
}
