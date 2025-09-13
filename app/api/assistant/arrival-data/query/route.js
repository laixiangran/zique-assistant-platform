import { NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { Op } from 'sequelize';
import { ArrivalDataDetail, CostSettlement } from '@/models';
import { authenticateUser, buildMallWhereCondition } from '@/lib/user-auth';
import { createQueryOptimizer, FIELD_SELECTIONS } from '@/lib/query-optimizer';

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
      mallId,
      mallName
    );

    if (regionName) {
      whereCondition.region_name = { [Op.like]: `%${regionName}%` };
    }

    if (skuId) {
      const skuIds = skuId.split(',').map((id) => id.trim());
      whereCondition.sku_id = { [Op.in]: skuIds };
    }

    if (accountingTimeStart && accountingTimeEnd) {
      whereCondition.accounting_time = {
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
        sortField: sortField || 'accounting_time',
        sortOrder: (sortOrder || 'DESC').toUpperCase(),
      },
      'arrival_data'
    );

    const { total, data: results } = queryResult;

    // 获取所有唯一的sku_id
    const skuIds = [...new Set(results.map((item) => item.sku_id))];

    // 批量查询cost_settlement表
    let costSettlementMap = {};
    if (skuIds.length > 0) {
      const costSettlementResults = await CostSettlement.findAll({
        where: {
          sku_id: { [Op.in]: skuIds },
        },
        attributes: ['sku_id', 'product_name', 'cost_price'],
        raw: true,
      });

      // 创建映射以便快速查找
      costSettlementResults.forEach((item) => {
        costSettlementMap[item.sku_id] = {
          product_name: item.product_name,
          cost_price: item.cost_price,
        };
      });
    }

    // 转换时间格式&计算已到账平均价格
    const formattedResults = results.map((item) => {
      const costSettlementInfo = costSettlementMap[item.sku_id] || {};
      item.d30_arrival_average_price = item.sales_amount
        ? Math.floor((item.sales_amount / item.sales_volume) * 100) / 100
        : 0;
      return {
        ...item,
        product_name: costSettlementInfo.product_name,
        cost_price: costSettlementInfo.cost_price,
        accounting_time: dayjs(item.accounting_time).format(
          'YYYY-MM-DD HH:mm:ss'
        ),
        created_time: dayjs(item.created_time).format('YYYY-MM-DD HH:mm:ss'),
        updated_time: dayjs(item.updated_time).format('YYYY-MM-DD HH:mm:ss'),
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedResults || [],
      total: queryResult.total,
      pageIndex: queryResult.pageIndex,
      pageSize: queryResult.pageSize,
      totalPages: queryResult.totalPages,
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
