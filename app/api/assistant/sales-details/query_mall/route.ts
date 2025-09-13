import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { PromotionSalesDetail } from '@/models';
import { formatVolume, formatAmount, formatRate } from '@/lib/utils';

export async function GET(request: NextRequest) {
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
        mallId: mall_id
      },
      raw: true
    });

    // 店铺今日活动销量 = 今日所有SKU活动销量之和
    let mallTodayPromotionSalesVolume: number = 0;

    // 店铺今日销售额 = 今日所有SKU销售额之和
    let mallTodaySalesAmount: number = 0;

    // 店铺今日销售毛利 = 今日所有SKU毛利之和
    let mallTodayGrossProfit: number = 0;

    // 店铺今日亏损毛利 = 今日所有毛利金额为负的之和
    let mallTodayGrossLossProfit: number = 0;

    // 店铺今日销售本金 = 今日所有SKU销售本金之和
    let mallTodaySalesCost: number = 0;

    // 店铺今日利润率 = 店铺今日销售毛利/店铺今日销售本金
    let mallTodayProfitRate: number | null = null;

    // 店铺今日销量 = 今日所有SKU销售销量之和
    let mallTodaySalesVolume: number = 0;

    // 店铺今日单均利润 = 店铺今日销售毛利/店铺今日销量
    let mallTodayAverageProfit: number | null = null;

    const updatedTime = dayjs(result[0]?.updatedTime || new Date()).format(
      'YYYY-MM-DD HH:mm:ss'
    );

    result.forEach((d) => {
      const {
        todayPromotionSalesVolume,
        todaySalesVolume,
        todaySalesAmount,
        todayGrossProfit,
        todaySalesCost,
        costPrice,
      } = d;
      if (costPrice) {
        mallTodayPromotionSalesVolume += +(todayPromotionSalesVolume || 0);
        mallTodaySalesAmount += +(todaySalesAmount || 0);
        mallTodayGrossProfit += +(todayGrossProfit || 0);
        if (+(todayGrossProfit || 0) < 0) {
          mallTodayGrossLossProfit += +(todayGrossProfit || 0);
        }
        mallTodaySalesCost += +(todaySalesCost || 0);
        mallTodaySalesVolume += +(todaySalesVolume || 0);
      }
    });
    if (mallTodayGrossProfit && mallTodaySalesCost) {
      mallTodayProfitRate = mallTodayGrossProfit / mallTodaySalesCost;
    }
    if (mallTodayGrossProfit && mallTodaySalesVolume) {
      mallTodayAverageProfit = mallTodayGrossProfit / mallTodaySalesVolume;
    }
    data = {
      mallTodayPromotionSalesVolume: formatVolume(mallTodayPromotionSalesVolume),
      mallTodaySalesAmount: formatAmount(mallTodaySalesAmount),
      mallTodayGrossProfit: formatAmount(mallTodayGrossProfit),
      mallTodayGrossLossProfit: formatAmount(
        mallTodayGrossProfit
          ? mallTodayGrossLossProfit || 0
          : mallTodayGrossLossProfit
      ),
      mallTodayProfitRate: formatRate(mallTodayProfitRate),
      mallTodayAverageProfit: formatAmount(mallTodayAverageProfit),
      mallTodaySalesVolume: formatVolume(mallTodaySalesVolume),
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
        error: error instanceof Error ? error.message : 'Unknown error',
        data: [],
      },
      { status: 200 }
    );
  }
}
