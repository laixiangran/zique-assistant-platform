import { NextResponse, NextRequest } from 'next/server';
import dayjs from 'dayjs';
import { Op } from 'sequelize';
import { PromotionSalesDetail, CostSettlement } from '@/models';
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
    const pageIndex = parseInt(searchParams.get('pageIndex') || '1') || 1;
    const pageSize = parseInt(searchParams.get('pageSize') || '10') || 10;
    const mallId = searchParams.get('mallId') || undefined; // 店铺ID查询参数
    const mallName = searchParams.get('mallName') || undefined; // 新增mallName查询参数
    const skuId = searchParams.get('skuId') || undefined;

    // 添加排序参数
    const sortField = searchParams.get('sortField');
    const sortOrder = searchParams.get('sortOrder');

    // 计算偏移量
    const offset = (pageIndex - 1) * pageSize;

    // 构建查询条件（包含权限控制）
    const whereCondition = await buildMallWhereCondition(authResult, mallId, mallName);

    if (skuId) {
      const skuIdList = skuId.split(',').map((id) => id.trim());
      whereCondition.skuId = {
        [Op.in]: skuIdList
      };
    }

    // 创建查询优化器
    const queryOptimizer = createQueryOptimizer({
      enableCache: true,
      cacheTimeout: 300,
      selectFields: FIELD_SELECTIONS.SALES_DETAILS
    });

    // 执行优化查询
    const queryResult = await queryOptimizer.optimizedQuery(
      PromotionSalesDetail,
      whereCondition,
      {
        pageIndex,
        pageSize,
        sortField: sortField || 'updatedTime',
        sortOrder: (sortOrder || 'DESC').toUpperCase() as 'ASC' | 'DESC'
      },
      'sales_details'
    );
    
    const { total, data: results } = queryResult;

    // 获取所有唯一的skuId
    const skuIds = Array.from(new Set(results.map((item: any) => item.skuId).filter(Boolean)));

    // 批量查询costSettlement表
    let costSettlementMap: Record<string, { productName: string }> = {};
    if (skuIds.length > 0) {
      const costSettlementResults = await CostSettlement.findAll({
        where: {
          skuId: {
            [Op.in]: skuIds
          }
        },
        attributes: ['skuId', 'productName'],
        raw: true
      });

      // 创建映射以便快速查找
      costSettlementResults.forEach((item: any) => {
        costSettlementMap[item.skuId] = {
          productName: item.productName,
        };
      });
    }

    // 转换时间格式
    const formattedResults = results.map((item: any) => {
      const costSettlementInfo = costSettlementMap[item.skuId] || {};
      return {
        ...item,
        productName: costSettlementInfo.productName,
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
