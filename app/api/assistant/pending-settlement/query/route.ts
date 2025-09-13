import { NextResponse, NextRequest } from 'next/server';
import dayjs from 'dayjs';
import { Op } from 'sequelize';
import { PendingSettlementDetail, CostSettlement } from '@/models';
import { authenticateUser, buildMallWhereCondition } from '@/lib/user-auth';
import { createQueryOptimizer, FIELD_SELECTIONS } from '@/lib/query-optimizer';

export async function GET(request: NextRequest) {
  try {
    // 用户权限验证
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return authResult.response;
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const pageIndex = parseInt(searchParams.get('pageIndex') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const mallId = searchParams.get('mallId') || undefined;
    const mallName = searchParams.get('mallName') || undefined;
    const regionName = searchParams.get('regionName') || undefined;
    const skuId = searchParams.get('skuId') || undefined;

    // 添加排序参数
    const sortField = searchParams.get('sortField');
    const sortOrder = searchParams.get('sortOrder');

    // 计算偏移量
    const offset = (pageIndex - 1) * pageSize;

    // 构建查询条件（包含权限控制）
    const whereCondition = await buildMallWhereCondition(authResult, mallId, mallName);

    // 添加regionName模糊查询条件
    if (regionName) {
      whereCondition.regionName = {
        [Op.like]: `%${regionName}%`
      };
    }

    // 添加skuId查询条件（支持多个ID）
    if (skuId) {
      const skuIds = skuId.split(',').map((id: string) => id.trim()).filter((id: string) => id);
      if (skuIds.length > 0) {
        whereCondition.skuId = {
          [Op.in]: skuIds
        };
      }
    }

    // 创建查询优化器
    const queryOptimizer = createQueryOptimizer({
      enableCache: true,
      cacheTimeout: 300,
      selectFields: FIELD_SELECTIONS.PENDING_SETTLEMENT
    });

    // 执行优化查询
    const queryResult = await queryOptimizer.optimizedQuery(
      PendingSettlementDetail,
      whereCondition,
      {
        pageIndex,
        pageSize,
        sortField: sortField || 'updatedTime',
        sortOrder: (sortOrder || 'DESC').toUpperCase() as 'ASC' | 'DESC'
      },
      'pending_settlement'
    );
    
    const { total, data: results } = queryResult;

    // 获取所有唯一的skuId
    const skuIds = Array.from(new Set(results.map((item: any) => item.skuId)));

    // 批量查询cost_settlement表
    let costSettlementMap: any = {};
    if (skuIds.length > 0) {
      const costSettlementResults = await CostSettlement.findAll({
        where: {
          skuId: {
            [Op.in]: skuIds
          }
        },
        attributes: ['skuId', 'productName', 'costPrice'],
        raw: true
      });

      // 创建映射以便快速查找
      costSettlementResults.forEach((item: any) => {
        costSettlementMap[item.skuId] = {
          productName: item.productName,
          costPrice: item.costPrice,
        };
      });
    }

    // 转换时间格式&计算待结算平均价格
    const formattedResults = results.map((item: any) => {
      const costSettlementInfo = costSettlementMap[item.skuId] || {};
      const pendingAveragePrice = item.salesAmount
        ? Math.floor((item.salesAmount / item.salesVolume) * 100) / 100
        : 0;

      return {
        ...item,
        productName: costSettlementInfo.productName,
        costPrice: costSettlementInfo.costPrice,
        pendingAveragePrice: pendingAveragePrice,
        createdTime: dayjs(item.createdTime).format('YYYY-MM-DD HH:mm:ss'),
        updatedTime: dayjs(item.updatedTime).format('YYYY-MM-DD HH:mm:ss'),
      };
    });

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
        error: error instanceof Error ? error.message : 'Unknown error',
        data: [],
      },
      { status: 200 }
    );
  }
}
