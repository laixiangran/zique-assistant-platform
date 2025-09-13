import { NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { CostSettlement } from '@/models';
import { formatVolume, formatAmount, formatRate } from '@/lib/utils';
import { authenticateUser, validateMallAccess } from '@/lib/user-auth';

export async function GET(request) {
  try {
    // 用户权限验证
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { searchParams } = new URL(request.url);
    const mall_id = searchParams.get('mall_id');
    let data = {};

    // 验证店铺访问权限
    if (mall_id) {
      const mallAccess = await validateMallAccess(authResult.user, mall_id);
      if (!mallAccess.valid) {
        return NextResponse.json(
          { success: false, error: mallAccess.error },
          { status: 403 }
        );
      }
    }

    // 根据 mall_id 查询 cost_settlement 记录
    if (mall_id) {
      const result = await CostSettlement.findAll({
        where: {
          mall_id: mall_id
        },
        raw: true
      });
      // 待结算销量，待结算销售额，待结算成本，待结算毛利，待结算亏损毛利，待结算单均利润，待结算利润率
      let pendingSalesVolume = null;
      let pendingSalesAmount = null;
      let pendingCostPrice = null;
      let pendingGrossProfit = null;
      let pendingGrossLossProfit = null;
      let pendingAverageProfit = null;
      let pendingProfitRate = null;
      const pendingUpdatedTime = dayjs(
        result[0]?.pending_updated_time || new Date()
      ).format('YYYY-MM-DD HH:mm:ss');

      // 30日到账销量，30日到账销售额，30日到账成本，30日到账毛利,30日到账亏损毛利，30日到账单均利润，30日到账利润率
      let d30ArrivalSalesVolume = null;
      let d30ArrivalSalesAmount = null;
      let d30ArrivalCostPrice = null;
      let d30ArrivalGrossProfit = null;
      let d30ArrivalGrossLossProfit = null;
      let d30ArrivalAverageProfit = null;
      let d30ArrivalProfitRate = null;
      const arrivalUpdatedTime = dayjs(
        result[0]?.arrival_updated_time || new Date()
      ).format('YYYY-MM-DD HH:mm:ss');

      result.forEach((d) => {
        const {
          pending_sales_volume,
          pending_sales_amount,
          pending_gross_profit,
          d30_arrival_sales_volume,
          d30_arrival_sales_amount,
          d30_arrival_gross_profit,
          cost_price,
        } = d;
        if (cost_price) {
          if (pending_sales_volume) {
            pendingSalesVolume = +pendingSalesVolume + +pending_sales_volume;
            pendingSalesAmount = +pendingSalesAmount + +pending_sales_amount;
            pendingCostPrice =
              +pendingCostPrice + cost_price * pending_sales_volume;
            pendingGrossProfit = +pendingGrossProfit + +pending_gross_profit;
            if (+pending_gross_profit < 0) {
              pendingGrossLossProfit =
                +pendingGrossLossProfit + +pending_gross_profit;
            }
          }
          if (d30_arrival_sales_volume) {
            d30ArrivalSalesVolume =
              +d30ArrivalSalesVolume + +d30_arrival_sales_volume;
            d30ArrivalSalesAmount =
              +d30ArrivalSalesAmount + +d30_arrival_sales_amount;
            d30ArrivalCostPrice =
              +d30ArrivalCostPrice + cost_price * d30_arrival_sales_volume;
            d30ArrivalGrossProfit =
              +d30ArrivalGrossProfit + +d30_arrival_gross_profit;
            if (+d30_arrival_gross_profit < 0) {
              d30ArrivalGrossLossProfit =
                +d30ArrivalGrossLossProfit + +d30_arrival_gross_profit;
            }
          }
        }
      });
      if (pendingGrossProfit && pendingCostPrice) {
        pendingProfitRate = pendingGrossProfit / pendingCostPrice;
      }
      if (pendingGrossProfit && pendingSalesVolume) {
        pendingAverageProfit = pendingGrossProfit / pendingSalesVolume;
      }
      if (d30ArrivalGrossProfit && d30ArrivalCostPrice) {
        d30ArrivalProfitRate = d30ArrivalGrossProfit / d30ArrivalCostPrice;
      }
      if (d30ArrivalGrossProfit && d30ArrivalSalesVolume) {
        d30ArrivalAverageProfit = d30ArrivalGrossProfit / d30ArrivalSalesVolume;
      }

      data = {
        pendingSalesVolume: formatVolume(pendingSalesVolume),
        pendingSalesAmount: formatAmount(pendingSalesAmount),
        pendingCostPrice: formatAmount(pendingCostPrice),
        pendingGrossProfit: formatAmount(pendingGrossProfit),
        pendingGrossLossProfit: formatAmount(
          pendingGrossProfit
            ? pendingGrossLossProfit || 0
            : pendingGrossLossProfit
        ),
        pendingAverageProfit: formatAmount(pendingAverageProfit),
        pendingProfitRate: formatRate(pendingProfitRate),
        d30ArrivalSalesVolume: formatVolume(d30ArrivalSalesVolume),
        d30ArrivalSalesAmount: formatAmount(d30ArrivalSalesAmount),
        d30ArrivalCostPrice: formatAmount(d30ArrivalCostPrice),
        d30ArrivalGrossProfit: formatAmount(d30ArrivalGrossProfit),
        d30ArrivalGrossLossProfit: formatAmount(
          d30ArrivalGrossProfit
            ? d30ArrivalGrossLossProfit || 0
            : d30ArrivalGrossLossProfit
        ),
        d30ArrivalAverageProfit: formatAmount(d30ArrivalAverageProfit),
        d30ArrivalProfitRate: formatRate(d30ArrivalProfitRate),
        pendingUpdatedTime,
        arrivalUpdatedTime,
      };
    }
    return NextResponse.json({
      success: true,
      data,
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
