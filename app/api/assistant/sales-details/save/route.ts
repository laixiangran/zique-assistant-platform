import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { PromotionSalesDetail, CostSettlement } from '@/models';
import { USDToCNY, successResponse, errorResponse } from '@/lib/utils';
import { Op } from 'sequelize';
import { authenticateUser, validateMallAccess } from '@/lib/user-auth';

export async function POST(request: NextRequest) {
  try {
    // 用户权限验证
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const body = await request.json();
    const { mallId, data: datas = [] } = body;

    if (!mallId) {
      return NextResponse.json(errorResponse('请传入参数 mallId'));
    }

    // 验证店铺权限
    const mallAccessResult = await validateMallAccess(authResult, mallId);
    if (!mallAccessResult.success) {
      return mallAccessResult.response;
    }

    // 获取今天的日期（YYYY-MM-DD格式）
    const today = dayjs().format('YYYY-MM-DD');

    // 删除 mallId 昨天及之前的数据
    await PromotionSalesDetail.destroy({
      where: {
        mallId: mallId,
        updatedTime: {
          [Op.lt]: today,
        },
      },
    });

    for (const data of datas) {
      const {
        mallId: mall_id,
        mallName: mall_name,
        spuId: spu_id,
        skcId: skc_id,
        skuId: sku_id,
        skuCode: sku_code,
        skuProperty: sku_property,
        goodsName: goods_name,
        declaredPrice: declared_price,
        todaySalesVolume: today_sales_volume,
        todayPromotionSalesVolume: today_promotion_sales_volume,
        todayPromotionSalesAmount: today_promotion_sales_amount,
        currency,
        updatedTime: updated_time = dayjs().format('YYYY-MM-DD HH:mm:ss'),
        createdTime: created_time = dayjs().format('YYYY-MM-DD HH:mm:ss'),
      } = data;
      let todaySalesAmount = null;
      let todayAveragePrice = null;
      let todayGrossProfit = null;
      let todaySalesCost = null;
      let todayProfitRate = null;
      const todayPromotionSalesAmountConverted =
        currency === 'USD'
          ? USDToCNY(today_promotion_sales_amount)
          : today_promotion_sales_amount;
      const declaredPriceConverted =
        currency === 'USD' ? USDToCNY(declared_price) : declared_price;

      // 查出SKU产品成本
      const existingRecord = await CostSettlement.findOne({
        where: {
          skuId: sku_id,
        },
        attributes: ['skuId', 'costPrice'],
        raw: true,
      });

      // 如果 sku 不存在，则在 cost_settlement 插入一条新的 sku 数据
      if (!existingRecord) {
        await CostSettlement.create({
          mallId: mall_id,
          mallName: mall_name,
          skuId: sku_id,
          skuCode: sku_code,
          skuProperty: sku_property,
          goodsName: goods_name,
          createdTime: created_time,
          updatedTime: updated_time,
        });
      }

      const { costPrice = null } = existingRecord || {};

      if (today_sales_volume > today_promotion_sales_volume) {
        // 今日SKU销售额=(今日SKU销售销量-今日SKU活动销量)*申报价+今日SKU活动销售额
        todaySalesAmount =
          (today_sales_volume - today_promotion_sales_volume) * declaredPriceConverted +
          todayPromotionSalesAmountConverted;

        // 今日SKU均价=今日SKU销售额/今日SKU销售销量
        todayAveragePrice = todaySalesAmount / today_sales_volume;

        if (costPrice) {
          // 今日SKU毛利=(今日SKU均价-SKU产品成本)*今日SKU销售销量
          todayGrossProfit =
            (todayAveragePrice - costPrice) * today_sales_volume;

          // 今日SKU销售本金=产品成本*今日SKU销售销量
          todaySalesCost = costPrice * today_sales_volume;

          // 今日SKU利润率=今日SKU毛利/今日SKU销售本金
          todayProfitRate = todayGrossProfit / todaySalesCost;
        }
      } else {
        // 今日SKU销售额=今日SKU活动销售额
        todaySalesAmount = todayPromotionSalesAmountConverted;

        // 今日SKU均价=今日SKU活动销售额/今日SKU活动销量
        todayAveragePrice = todaySalesAmount / today_promotion_sales_volume;

        if (costPrice) {
          // 今日SKU毛利=（今日SKU均价-产品成本）*今日SKU活动销量
          todayGrossProfit =
            (todayAveragePrice - costPrice) * today_promotion_sales_volume;

          // 今日SKU销售本金=产品成本*今日SKU活动销量
          todaySalesCost = costPrice * today_promotion_sales_volume;

          // 今日SKU利润率=今日SKU毛利/今日SKU销售本金
          todayProfitRate = todayGrossProfit / todaySalesCost;
        }
      }
      await PromotionSalesDetail.upsert({
        mallId: mall_id,
        mallName: mall_name,
        spuId: spu_id,
        skcId: skc_id,
        skuId: sku_id,
        declaredPrice: declaredPriceConverted,
        costPrice: costPrice ?? undefined,
        todaySalesCost: todaySalesCost ?? undefined,
        todaySalesVolume: today_sales_volume,
        todaySalesAmount: todaySalesAmount,
        todayPromotionSalesVolume: today_promotion_sales_volume,
        todayPromotionSalesAmount: todayPromotionSalesAmountConverted,
        todayAveragePrice: todayAveragePrice ?? undefined,
        todayGrossProfit: todayGrossProfit ?? undefined,
        todayProfitRate: todayProfitRate ?? undefined,
        currency: 'CNY',
        createdTime: created_time,
        updatedTime: updated_time,
      });
    }

    return NextResponse.json(successResponse('销售数据更新成功！'));
  } catch (error) {
    console.error('保存销售数据失败:', error);
    return NextResponse.json(errorResponse('保存失败，请稍后重试'), {
      status: 500,
    });
  }
}
