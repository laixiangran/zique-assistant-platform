import { NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { Op } from 'sequelize';
import { PromotionSalesDetail, CostSettlement } from '../../../../models';

export async function GET(request) {
  try {
    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const pageIndex = parseInt(searchParams.get('pageIndex')) || 1;
    const pageSize = parseInt(searchParams.get('pageSize')) || 10;
    const mallName = searchParams.get('mall_name'); // 新增mallName查询参数
    const skuId = searchParams.get('sku_id');

    // 添加排序参数
    const sortField = searchParams.get('sortField');
    const sortOrder = searchParams.get('sortOrder');

    // 计算偏移量
    const offset = (pageIndex - 1) * pageSize;

    // 构建查询条件
    const whereCondition = {};

    if (skuId) {
      const skuIdList = skuId.split(',').map((id) => id.trim());
      whereCondition.sku_id = {
        [Op.in]: skuIdList
      };
    }

    // 添加mallName模糊查询条件
    if (mallName) {
      whereCondition.mall_name = {
        [Op.like]: `%${mallName}%`
      };
    }

    // 构建排序条件
    let orderCondition = [['updated_time', 'DESC']];
    if (sortField && sortOrder) {
      orderCondition = [[sortField, sortOrder.toUpperCase()]];
    }

    // 查询数据和总数
    const { count: total, rows: results } = await PromotionSalesDetail.findAndCountAll({
      where: whereCondition,
      order: orderCondition,
      limit: pageSize,
      offset: offset,
      raw: true
    });

    // 获取所有唯一的sku_id
    const skuIds = [...new Set(results.map((item) => item.sku_id))];

    // 批量查询cost_settlement表
    let costSettlementMap = {};
    if (skuIds.length > 0) {
      const costSettlementResults = await CostSettlement.findAll({
        where: {
          sku_id: {
            [Op.in]: skuIds
          }
        },
        attributes: ['sku_id', 'product_name'],
        raw: true
      });

      // 创建映射以便快速查找
      costSettlementResults.forEach((item) => {
        costSettlementMap[item.sku_id] = {
          product_name: item.product_name,
        };
      });
    }

    // 转换时间格式
    const formattedResults = results.map((item) => {
      const costSettlementInfo = costSettlementMap[item.sku_id] || {};
      return {
        ...item,
        product_name: costSettlementInfo.product_name,
        created_time: dayjs(item.created_time).format('YYYY-MM-DD HH:mm:ss'),
        updated_time: dayjs(item.updated_time).format('YYYY-MM-DD HH:mm:ss'),
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedResults || [],
      pageIndex,
      pageSize,
      total,
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
