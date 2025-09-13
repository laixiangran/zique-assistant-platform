import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { Op } from 'sequelize';
import { ArrivalDataDetail, CostSettlement } from '@/models';
import { authenticateUser, buildMallWhereCondition } from '@/lib/user-auth';
import { createQueryOptimizer, FIELD_SELECTIONS } from '@/lib/query-optimizer';
import { successResponse, errorResponse } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    // 用户权限验证
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json(authResult, {
        status: 403,
      });
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const pageIndex = parseInt(searchParams.get('pageIndex') || '1') || 1;
    const pageSize = parseInt(searchParams.get('pageSize') || '10') || 10;
    const mallId = searchParams.get('mall_id'); // 店铺ID查询参数
    const mallName = searchParams.get('mall_name'); // 新增店铺名称查询参数
    const regionName = searchParams.get('region_name'); // 新增地区查询参数
    const skuId = searchParams.get('sku_id'); // 新增SKU ID查询参数
    // 添加财务时间查询参数
    const accountingTimeStart = searchParams.get('accounting_time_start');
    const accountingTimeEnd = searchParams.get('accounting_time_end');

    // 添加排序参数
    const sortField = searchParams.get('sortField');
    const sortOrder = searchParams.get('sortOrder');

    // 构建查询条件（包含权限控制）
    const whereCondition = await buildMallWhereCondition(
      authResult,
      mallId || undefined,
      mallName || undefined
    );

    if (regionName) {
      whereCondition.regionName = { [Op.like]: `%${regionName}%` };
    }

    if (skuId) {
      const skuIds = skuId.split(',').map((id) => id.trim());
      whereCondition.skuId = { [Op.in]: skuIds };
    }

    if (accountingTimeStart && accountingTimeEnd) {
      whereCondition.accountingTime = {
        [Op.between]: [
          `${accountingTimeStart} 00:00:00`,
          `${accountingTimeEnd} 23:59:59`,
        ],
      };
    }

    // 创建查询优化器
    const queryOptimizer = createQueryOptimizer({
      enableCache: true,
      cacheTimeout: 300,
      selectFields: FIELD_SELECTIONS.ARRIVAL_DATA,
    });

    // 执行优化查询
    const queryResult = await queryOptimizer.optimizedQuery(
      ArrivalDataDetail,
      whereCondition,
      {
        pageIndex,
        pageSize,
        sortField: sortField || 'accountingTime',
        sortOrder: (sortOrder || 'DESC').toUpperCase() as 'ASC' | 'DESC',
      },
      'arrival_data'
    );

    const { total, data: results } = queryResult;

    // 获取所有唯一的skuId
    const skuIds = Array.from(new Set(results.map((item: any) => item.skuId)));

    // 批量查询cost_settlement表
    let costSettlementMap: {
      [key: string]: { productName: string; costPrice: number };
    } = {};
    if (skuIds.length > 0) {
      const costSettlementResults = await CostSettlement.findAll({
        where: {
          skuId: { [Op.in]: skuIds },
        },
        attributes: ['skuId', 'productName', 'costPrice'],
        raw: true,
      });

      // 创建映射以便快速查找
      costSettlementResults.forEach((item: any) => {
        costSettlementMap[item.skuId] = {
          productName: item.productName,
          costPrice: item.costPrice,
        };
      });
    }

    // 转换时间格式&计算已到账平均价格
    const formattedResults = results.map((item: any) => {
      const costSettlementInfo = costSettlementMap[item.skuId] || {};
      item.d30ArrivalAveragePrice = item.salesAmount
        ? Math.floor((item.salesAmount / item.salesVolume) * 100) / 100
        : 0;
      return {
        ...item,
        productName: costSettlementInfo.productName,
        costPrice: costSettlementInfo.costPrice,
        accountingTime: dayjs(item.accountingTime).format(
          'YYYY-MM-DD HH:mm:ss'
        ),
        createdTime: dayjs(item.createdTime).format('YYYY-MM-DD HH:mm:ss'),
        updatedTime: dayjs(item.updatedTime).format('YYYY-MM-DD HH:mm:ss'),
      };
    });

    return NextResponse.json(
      successResponse(
        {
          data: formattedResults || [],
          total: queryResult.total,
          pageIndex: queryResult.pageIndex,
          pageSize: queryResult.pageSize,
          totalPages: queryResult.totalPages,
        },
        '查询成功'
      )
    );
  } catch (error) {
    console.error('查询到货数据失败:', error);
    return NextResponse.json(errorResponse('查询失败，请稍后重试'), {
      status: 500,
    });
  }
}
