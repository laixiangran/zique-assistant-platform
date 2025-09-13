import { NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { PromotionSalesDetail, CostSettlement } from '@/models';
import { USDToCNY } from '@/lib/utils';
import { Op } from 'sequelize';
import { authenticateUser, validateMallAccess } from '@/lib/user-auth';

export async function POST(request) {
  try {
    // 用户权限验证
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const body = await request.json();
    const { mallId, data: datas = [] } = body;

    if (!mallId) {
      return NextResponse.json({
        success: false,
        data: '请传入参数 mallId',
      });
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
        mall_id: mallId,
        updated_time: {
          [Op.lt]: today
        }
      }
    });

    for (const data of datas) {
      const {
        mall_id,
        mall_name,
        spu_id,
        skc_id,
        sku_id,
        sku_code,
        sku_property,
        goods_name,
        declared_price,
        today_sales_volume,
        today_promotion_sales_volume,
        today_promotion_sales_amount,
        currency,
        updated_time = dayjs().format('YYYY-MM-DD HH:mm:ss'),
        created_time = dayjs().format('YYYY-MM-DD HH:mm:ss'),
      } = data;
      let today_sales_amount = null;
      let today_average_price = null;
      let today_gross_profit = null;
      let today_sales_cost = null;
      let today_profit_rate = null;
      const todayPromotionSalesAmount =
        currency === 'USD'
          ? USDToCNY(today_promotion_sales_amount)
          : today_promotion_sales_amount;
      const declaredPrice =
        currency === 'USD' ? USDToCNY(declared_price) : declared_price;

      // 查出SKU产品成本
      const existingRecord = await CostSettlement.findOne({
        where: {
          sku_id: sku_id
        },
        attributes: ['sku_id', 'cost_price'],
        raw: true
      });

      // 如果 sku 不存在，则在 cost_settlement 插入一条新的 sku 数据
      if (!existingRecord) {
        await CostSettlement.create({
          mall_id,
          mall_name,
          sku_id,
          sku_code,
          sku_property,
          goods_name,
          created_time,
          updated_time
        });
      }

      const { cost_price = null } = existingRecord || {};

      if (today_sales_volume > today_promotion_sales_volume) {
        // 今日SKU销售额=(今日SKU销售销量-今日SKU活动销量)*申报价+今日SKU活动销售额
        today_sales_amount =
          (today_sales_volume - today_promotion_sales_volume) * declaredPrice +
          todayPromotionSalesAmount;

        // 今日SKU均价=今日SKU销售额/今日SKU销售销量
        today_average_price = today_sales_amount / today_sales_volume;

        if (cost_price) {
          // 今日SKU毛利=(今日SKU均价-SKU产品成本)*今日SKU销售销量
          today_gross_profit =
            (today_average_price - cost_price) * today_sales_volume;

          // 今日SKU销售本金=产品成本*今日SKU销售销量
          today_sales_cost = cost_price * today_sales_volume;

          // 今日SKU利润率=今日SKU毛利/今日SKU销售本金
          today_profit_rate = today_gross_profit / today_sales_cost;
        }
      } else {
        // 今日SKU销售额=今日SKU活动销售额
        today_sales_amount = todayPromotionSalesAmount;

        // 今日SKU均价=今日SKU活动销售额/今日SKU活动销量
        today_average_price = today_sales_amount / today_promotion_sales_volume;

        if (cost_price) {
          // 今日SKU毛利=（今日SKU均价-产品成本）*今日SKU活动销量
          today_gross_profit =
            (today_average_price - cost_price) * today_promotion_sales_volume;

          // 今日SKU销售本金=产品成本*今日SKU活动销量
          today_sales_cost = cost_price * today_promotion_sales_volume;

          // 今日SKU利润率=今日SKU毛利/今日SKU销售本金
          today_profit_rate = today_gross_profit / today_sales_cost;
        }
      }
      await PromotionSalesDetail.upsert({
        mall_id,
        mall_name,
        spu_id,
        skc_id,
        sku_id,
        declared_price: declaredPrice,
        cost_price,
        today_sales_cost,
        today_sales_volume,
        today_sales_amount,
        today_promotion_sales_volume,
        today_promotion_sales_amount: todayPromotionSalesAmount,
        today_average_price,
        today_gross_profit,
        today_profit_rate,
        currency: 'CNY',
        created_time,
        updated_time
      });
    }

    return NextResponse.json({ success: true, data: '销售数据更新成功！' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
