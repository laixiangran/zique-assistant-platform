import { NextResponse } from 'next/server';
import { CostSettlement } from '../../../../models';

export async function POST(request) {
  try {
    const body = await request.json();
    const { sku_id, product_name, cost_price } = body;

    // 先查询当前记录的数据用于计算
    const currentData = await CostSettlement.findAll({
      where: {
        sku_id: sku_id
      },
      attributes: [
        'pending_sales_amount', 'pending_sales_volume', 'pending_average_price',
        'd30_arrival_sales_amount', 'd30_arrival_sales_volume', 'd30_arrival_average_price'
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
      pending_sales_volume,
      pending_average_price,
      d30_arrival_sales_volume,
      d30_arrival_average_price,
    } = data;

    // 将字符串转换为数值
    const pendingAveragePrice = parseFloat(pending_average_price) || 0;
    const d30ArrivalAveragePrice = parseFloat(d30_arrival_average_price) || 0;

    // 计算四个利润相关值
    // 1. 待结算毛利润=((待结算均价-产品成本-0.1)-待结算均价*2.5*0.01-(产品成本+0.1)*0.01)*待结算销量
    const pending_gross_profit = pending_sales_volume
      ? (pendingAveragePrice -
          cost_price -
          0.1 -
          pendingAveragePrice * 2.5 * 0.01 -
          (cost_price + 0.1) * 0.01) *
        (parseFloat(pending_sales_volume) || 0)
      : null;

    // 2. 待结算利润率=待结算毛利润/(产品成本*待结算销量)
    const pending_profit_rate =
      cost_price && pending_sales_volume && pending_gross_profit
        ? parseFloat(pending_gross_profit.toFixed(2)) /
          (cost_price * (parseFloat(pending_sales_volume) || 0))
        : null;

    // 3. 30日毛利润=(30日均价-产品成本)*30日销量
    const d30_arrival_gross_profit = d30_arrival_sales_volume
      ? (d30ArrivalAveragePrice - cost_price) *
        (parseFloat(d30_arrival_sales_volume) || 0)
      : null;

    // 4. 30日利润率=30日毛利润/(产品成本*30日到账销量)
    const d30_arrival_profit_rate =
      cost_price && d30_arrival_sales_volume && d30_arrival_gross_profit
        ? parseFloat(d30_arrival_gross_profit.toFixed(2)) /
          (cost_price * (parseFloat(d30_arrival_sales_volume) || 0))
        : null;

    // 构建更新数据对象
    const updateData = {
      cost_price: cost_price,
      pending_profit_rate: pending_profit_rate,
      pending_gross_profit: pending_gross_profit,
      d30_arrival_profit_rate: d30_arrival_profit_rate,
      d30_arrival_gross_profit: d30_arrival_gross_profit
    };
    
    if (product_name !== undefined) {
      updateData.product_name = product_name;
    }
    
    await CostSettlement.update(updateData, {
      where: {
        sku_id: sku_id
      }
    });
    return NextResponse.json({
      success: true,
      data: '成本价以及利润数据更新成功！',
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
