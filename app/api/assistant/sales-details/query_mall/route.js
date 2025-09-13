import { NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { PromotionSalesDetail } from '@/models';
import { formatVolume, formatAmount, formatRate } from '@/lib/utils';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mall_id = searchParams.get('mall_id');
    let data = {};

    if (!mall_id) {
      return NextResponse.json({
        success: false,
        data: '请传入参数 mall_id',
      });
    }

    const result = await PromotionSalesDetail.findAll({
      where: {
        mall_id: mall_id
      },
      raw: true
    });

    // 店铺今日活动销量 = 今日所有SKU活动销量之和
    let mall_today_promotion_sales_volume = null;

    // 店铺今日销售额 = 今日所有SKU销售额之和
    let mall_today_sales_amount = null;

    // 店铺今日销售毛利 = 今日所有SKU毛利之和
    let mall_today_gross_profit = null;

    // 店铺今日亏损毛利 = 今日所有毛利金额为负的之和
    let mall_today_gross_loss_profit = null;

    // 店铺今日销售本金 = 今日所有SKU销售本金之和
    let mall_today_sales_cost = null;

    // 店铺今日利润率 = 店铺今日销售毛利/店铺今日销售本金
    let mall_today_profit_rate = null;

    // 店铺今日销量 = 今日所有SKU销售销量之和
    let mall_today_sales_volume = null;

    // 店铺今日单均利润 = 店铺今日销售毛利/店铺今日销量
    let mall_today_average_profit = null;

    const updatedTime = dayjs(result[0]?.updated_time || new Date()).format(
      'YYYY-MM-DD HH:mm:ss'
    );

    result.forEach((d) => {
      const {
        today_promotion_sales_volume,
        today_sales_volume,
        today_sales_amount,
        today_gross_profit,
        today_sales_cost,
        cost_price,
      } = d;
      if (cost_price) {
        mall_today_promotion_sales_volume += +today_promotion_sales_volume;
        mall_today_sales_amount += +today_sales_amount;
        mall_today_gross_profit += +today_gross_profit;
        if (+today_gross_profit < 0) {
          mall_today_gross_loss_profit += +today_gross_profit;
        }
        mall_today_sales_cost += +today_sales_cost;
        mall_today_sales_volume += +today_sales_volume;
      }
    });
    if (mall_today_gross_profit && mall_today_sales_cost) {
      mall_today_profit_rate = mall_today_gross_profit / mall_today_sales_cost;
    }
    if (mall_today_gross_profit && mall_today_sales_volume) {
      mall_today_average_profit =
        mall_today_gross_profit / mall_today_sales_volume;
    }
    data = {
      mallTodayPromotionSalesVolume: formatVolume(
        mall_today_promotion_sales_volume
      ),
      mallTodaySalesAmount: formatAmount(mall_today_sales_amount),
      mallTodayGrossProfit: formatAmount(mall_today_gross_profit),
      mallTodayGrossLossProfit: formatAmount(
        mall_today_gross_profit
          ? mall_today_gross_loss_profit || 0
          : mall_today_gross_loss_profit
      ),
      mallTodayProfitRate: formatRate(mall_today_profit_rate),
      mallTodayAverageProfit: formatAmount(mall_today_average_profit),
      mallTodaySalesVolume: formatVolume(mall_today_sales_volume),
      updatedTime,
    };
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.log('error: ', error);
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
