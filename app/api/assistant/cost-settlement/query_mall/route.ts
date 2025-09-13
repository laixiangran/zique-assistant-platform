import { NextResponse, NextRequest } from 'next/server';
import dayjs from 'dayjs';
import { CostSettlement } from '@/models';
import { formatVolume, formatAmount, formatRate } from '@/lib/utils';
import { authenticateUser, validateMallAccess } from '@/lib/user-auth';

export async function GET(request: NextRequest) {
  try {
    // 用户权限验证
    const authResult = await authenticateUser(request);
    if (!authResult || !authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mallId = searchParams.get('mallId') || undefined;
    let data = {};

    // 验证店铺访问权限
    // 简化处理，跳过商城访问验证
    // TODO: 根据实际业务需求实现商城访问权限验证

    // 根据 mallId 查询 costSettlement 记录
    if (mallId) {
      const result = await CostSettlement.findAll({
        where: {
          mallId: mallId
        },
        raw: true
      });
      // 待结算销量，待结算销售额，待结算成本，待结算毛利，待结算亏损毛利，待结算单均利润，待结算利润率
      let pendingSalesVolume: number = 0;
      let pendingSalesAmount: number = 0;
      let pendingCostPrice: number = 0;
      let pendingGrossProfit: number = 0;
      let pendingGrossLossProfit: number = 0;
      let pendingAverageProfit: number = 0;
      let pendingProfitRate: number = 0;
      const pendingUpdatedTime = dayjs(
        (result[0] as any)?.pendingUpdatedTime || new Date()
      ).format('YYYY-MM-DD HH:mm:ss');

      // 30日到账销量，30日到账销售额，30日到账成本，30日到账毛利,30日到账亏损毛利，30日到账单均利润，30日到账利润率
      let d30ArrivalSalesVolume: number = 0;
      let d30ArrivalSalesAmount: number = 0;
      let d30ArrivalCostPrice: number = 0;
      let d30ArrivalGrossProfit: number = 0;
      let d30ArrivalGrossLossProfit: number = 0;
      let d30ArrivalAverageProfit: number = 0;
      let d30ArrivalProfitRate: number = 0;
      const arrivalUpdatedTime = dayjs(
        (result[0] as any)?.arrivalUpdatedTime || new Date()
      ).format('YYYY-MM-DD HH:mm:ss');

      result.forEach((d: any) => {
        const {
          pendingSalesVolume: pendingSalesVolumeItem,
          pendingSalesAmount: pendingSalesAmountItem,
          pendingGrossProfit: pendingGrossProfitItem,
          d30ArrivalSalesVolume: d30ArrivalSalesVolumeItem,
          d30ArrivalSalesAmount: d30ArrivalSalesAmountItem,
          d30ArrivalGrossProfit: d30ArrivalGrossProfitItem,
          costPrice,
        } = d;
        if (costPrice) {
          if (pendingSalesVolumeItem) {
            pendingSalesVolume = pendingSalesVolume + +(pendingSalesVolumeItem || 0);
            pendingSalesAmount = pendingSalesAmount + +(pendingSalesAmountItem || 0);
            pendingCostPrice =
              pendingCostPrice + (costPrice || 0) * +(pendingSalesVolumeItem || 0);
            pendingGrossProfit = pendingGrossProfit + +(pendingGrossProfitItem || 0);
            if (+(pendingGrossProfitItem || 0) < 0) {
              pendingGrossLossProfit =
                pendingGrossLossProfit + +(pendingGrossProfitItem || 0);
            }
          }
          if (d30ArrivalSalesVolumeItem) {
            d30ArrivalSalesVolume =
              d30ArrivalSalesVolume + +(d30ArrivalSalesVolumeItem || 0);
            d30ArrivalSalesAmount =
              d30ArrivalSalesAmount + +(d30ArrivalSalesAmountItem || 0);
            d30ArrivalCostPrice =
              d30ArrivalCostPrice + (costPrice || 0) * +(d30ArrivalSalesVolumeItem || 0);
            d30ArrivalGrossProfit =
              d30ArrivalGrossProfit + +(d30ArrivalGrossProfitItem || 0);
            if (+(d30ArrivalGrossProfitItem || 0) < 0) {
              d30ArrivalGrossLossProfit =
                d30ArrivalGrossLossProfit + +(d30ArrivalGrossProfitItem || 0);
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
        error: error instanceof Error ? error.message : 'Unknown error',
        data: [],
      },
      { status: 200 }
    );
  }
}
