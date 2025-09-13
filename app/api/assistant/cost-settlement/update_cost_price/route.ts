import { NextResponse, NextRequest } from 'next/server';
import { CostSettlement } from '@/models';
import { authenticateUser, validateMallAccess } from '@/lib/user-auth';
import { Op } from 'sequelize';

export async function POST(request: NextRequest) {
  try {
    // 用户权限验证
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const body = await request.json();
    const { skuId, productName, costPrice } = body;

    // 先查询当前记录的数据用于计算（包含权限验证）
    const currentData = await CostSettlement.findAll({
      where: {
        skuId: skuId,
        mallId: {
          [Op.in]: authResult.allowedMallIds
        }
      },
      attributes: [
        'pendingSalesAmount', 'pendingSalesVolume', 'pendingAveragePrice',
        'd30ArrivalSalesAmount', 'd30ArrivalSalesVolume', 'd30ArrivalAveragePrice'
      ],
      raw: true
    });

    if (currentData.length === 0) {
      return NextResponse.json(
        { success: false, error: '未找到对应的 SKU 记录' },
        { status: 200 }
      );
    }

    const data = currentData[0];
    const {
      pendingSalesVolume,
      pendingAveragePrice: pendingAvgPrice,
      d30ArrivalSalesVolume,
      d30ArrivalAveragePrice: d30ArrivalAvgPrice,
    } = data;

    // 将字符串转换为数值
    const pendingAveragePrice = parseFloat(pendingAvgPrice?.toString() || '0') || 0;
    const d30ArrivalAveragePrice = parseFloat(d30ArrivalAvgPrice?.toString() || '0') || 0;

    // 计算四个利润相关值
    // 1. 待结算毛利润=((待结算均价-产品成本-0.1)-待结算均价*2.5*0.01-(产品成本+0.1)*0.01)*待结算销量
    const pending_gross_profit = pendingSalesVolume
      ? (pendingAveragePrice -
          costPrice -
          0.1 -
          pendingAveragePrice * 2.5 * 0.01 -
          (costPrice + 0.1) * 0.01) *
        (parseFloat(pendingSalesVolume?.toString() || '0') || 0)
      : 0;

    // 2. 待结算利润率=待结算毛利润/(产品成本*待结算销量)
    const pending_profit_rate =
      costPrice && pendingSalesVolume && pending_gross_profit
        ? parseFloat(pending_gross_profit.toFixed(2)) /
          (costPrice * (parseFloat(pendingSalesVolume?.toString() || '0') || 0))
        : 0;

    // 3. 30日毛利润=(30日均价-产品成本)*30日销量
    const d30_arrival_gross_profit = d30ArrivalSalesVolume
      ? (d30ArrivalAveragePrice - costPrice) *
        (parseFloat(d30ArrivalSalesVolume?.toString() || '0') || 0)
      : 0;

    // 4. 30日利润率=30日毛利润/(产品成本*30日到账销量)
    const d30_arrival_profit_rate =
      costPrice && d30ArrivalSalesVolume && d30_arrival_gross_profit
        ? parseFloat(d30_arrival_gross_profit.toFixed(2)) /
          (costPrice * (parseFloat(d30ArrivalSalesVolume?.toString() || '0') || 0))
        : 0;

    // 构建更新数据对象
    const updateData: any = {
      costPrice: costPrice,
      pendingProfitRate: pending_profit_rate,
      pendingGrossProfit: pending_gross_profit,
      d30ArrivalProfitRate: d30_arrival_profit_rate,
      d30ArrivalGrossProfit: d30_arrival_gross_profit
    };
    
    if (productName !== undefined) {
      updateData.productName = productName;
    }
    
    await CostSettlement.update(updateData, {
      where: {
        skuId: skuId
      }
    });
    return NextResponse.json({
      success: true,
      data: '成本价以及利润数据更新成功！',
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
