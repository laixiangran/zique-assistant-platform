import { NextResponse } from 'next/server';
import { Op } from 'sequelize';
import { ArrivalDataDetail, CostSettlement } from '../../../../models';
import { USDToCNY } from '../../../../lib/utils';
import dayjs from 'dayjs';

export async function POST(request) {
  try {
    // 从表 arrival_data_details 同步 accounting_time 为最近30天的数据到表 cost_settlement
    const startDate = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
    const endDate = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

    const arrivalDetails = await ArrivalDataDetail.findAll({
      where: {
        accounting_time: {
          [Op.between]: [`${startDate} 00:00:00`, `${endDate} 23:59:59`]
        }
      },
      attributes: [
        'mall_id',
        'sku_id',
        [ArrivalDataDetail.sequelize.fn('SUM', ArrivalDataDetail.sequelize.col('sales_volume')), 'd30_arrival_sales_volume'],
        [ArrivalDataDetail.sequelize.fn('SUM', ArrivalDataDetail.sequelize.col('sales_amount')), 'd30_arrival_sales_amount']
      ],
      group: ['mall_id', 'sku_id'],
      raw: true
    });

    // 遍历查询结果，更新或插入到cost_settlement表中
    for (const data of arrivalDetails) {
      const {
        mall_id: mallId,
        sku_id: skuId,
        d30_arrival_sales_volume,
        d30_arrival_sales_amount,
      } = data;

      const skuArrivalData = await ArrivalDataDetail.findAll({
        where: {
          sku_id: skuId
        },
        attributes: ['mall_name', 'sku_code', 'sku_property', 'goods_name', 'currency', 'updated_time'],
        order: [['updated_time', 'DESC']],
        limit: 1,
        raw: true
      });

      const {
        mall_name: mallName,
        sku_code: skuCode,
        sku_property: skuProperty,
        goods_name: goodsName,
        currency,
        updated_time: arrival_updated_time,
      } = skuArrivalData[0];

      const d30ArrivalSalesVolume = d30_arrival_sales_volume;
      const d30ArrivalSalesAmount =
        currency === 'USD'
          ? USDToCNY(d30_arrival_sales_amount)
          : d30_arrival_sales_amount;

      // 计算30天已结算均价
      const d30ArrivalAveragePrice = d30ArrivalSalesVolume
        ? Math.floor((d30ArrivalSalesAmount / d30ArrivalSalesVolume) * 100) /
          100
        : 0;

      // 检查是否已存在相同的mallId和skuId记录
      const existingRecord = await CostSettlement.findAll({
        where: {
          mall_id: mallId,
          sku_id: skuId
        },
        attributes: ['id', 'cost_price'],
        raw: true
      });

      const new_arrival_updated_time = dayjs(arrival_updated_time).format(
        'YYYY-MM-DD HH:mm:ss'
      );
      const currentTime = dayjs().format('YYYY-MM-DD HH:mm:ss');

      // 如果存在相同mallId和skuId的记录，则更新该记录
      if (existingRecord.length > 0) {
        // 构建动态更新语句
        const updateFields = [];
        const updateValues = [];

        // 只有在body中提供了相应字段时才添加到更新列表
        if (mallName !== undefined) {
          updateFields.push('mall_name = ?');
          updateValues.push(mallName);
        }
        if (skuCode !== undefined) {
          updateFields.push('sku_code = ?');
          updateValues.push(skuCode);
        }
        if (skuProperty !== undefined) {
          updateFields.push('sku_property = ?');
          updateValues.push(skuProperty);
        }
        if (goodsName !== undefined) {
          updateFields.push('goods_name = ?');
          updateValues.push(goodsName);
        }
        if (d30ArrivalAveragePrice !== undefined) {
          updateFields.push('d30_arrival_average_price = ?');
          updateValues.push(d30ArrivalAveragePrice);
        }
        if (d30ArrivalSalesVolume !== undefined) {
          updateFields.push('d30_arrival_sales_volume = ?');
          updateValues.push(d30ArrivalSalesVolume);
        }
        if (d30ArrivalSalesAmount !== undefined) {
          updateFields.push('d30_arrival_sales_amount = ?');
          updateValues.push(d30ArrivalSalesAmount);
        }

        // 如果存在产品价格 cost_price，则重新更新毛利润和利润率
        const { cost_price } = existingRecord[0] || {};
        if (cost_price) {
          const costPrice = parseFloat(cost_price);

          // 1. 30日毛利润=(30日均价-产品成本)*30日销量
          const d30ArrivalGrossProfit = d30ArrivalSalesVolume
            ? (d30ArrivalAveragePrice - costPrice) *
              (parseFloat(d30ArrivalSalesVolume) || 0)
            : null;

          updateFields.push('d30_arrival_gross_profit = ?');
          updateValues.push(d30ArrivalGrossProfit);

          // 2. 30日利润率=30日毛利润/(产品成本*30日到账销量)
          const d30ArrivalProfitRate =
            costPrice && d30ArrivalSalesVolume && d30ArrivalGrossProfit
              ? parseFloat(d30ArrivalGrossProfit.toFixed(2)) /
                (costPrice * (parseFloat(d30ArrivalSalesVolume) || 0))
              : null;

          updateFields.push('d30_arrival_profit_rate = ?');
          updateValues.push(d30ArrivalProfitRate);
        }

        // 总是更新updated_time字段
        updateFields.push('arrival_updated_time = ?', 'updated_time = ?');
        updateValues.push(new_arrival_updated_time, currentTime);

        // 如果有要更新的字段，则执行更新
        if (updateFields.length > 0) {
          // 构建更新对象
          const updateData = {};
          updateFields.forEach((field, index) => {
            const fieldName = field.split(' = ?')[0];
            updateData[fieldName] = updateValues[index];
          });

          await CostSettlement.update(updateData, {
            where: {
              mall_id: mallId,
              sku_id: skuId
            }
          });
        }
      } else {
        // 如果不存在相同mallId和skuId的记录，则插入新记录
        const insertData = {
          mall_id: mallId,
          sku_id: skuId,
          created_time: currentTime,
          arrival_updated_time: currentTime,
          updated_time: currentTime
        };

        if (mallName !== undefined) {
          insertData.mall_name = mallName;
        }
        if (skuCode !== undefined) {
          insertData.sku_code = skuCode;
        }
        if (skuProperty !== undefined) {
          insertData.sku_property = skuProperty;
        }
        if (goodsName !== undefined) {
          insertData.goods_name = goodsName;
        }
        if (d30ArrivalAveragePrice !== undefined) {
          insertData.d30_arrival_average_price = d30ArrivalAveragePrice;
        }
        if (d30ArrivalSalesVolume !== undefined) {
          insertData.d30_arrival_sales_volume = d30ArrivalSalesVolume;
        }
        if (d30ArrivalSalesAmount !== undefined) {
          insertData.d30_arrival_sales_amount = d30ArrivalSalesAmount;
        }

        await CostSettlement.create(insertData);
      }
    }
    return NextResponse.json({
      success: true,
      data: '30天已结算数据同步到成本结算成功！',
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
