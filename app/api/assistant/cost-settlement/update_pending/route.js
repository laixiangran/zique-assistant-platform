import { NextResponse } from 'next/server';
import { Op } from 'sequelize';
import { PendingSettlementDetail, CostSettlement } from '../../../../models';
import { USDToCNY } from '../../../../lib/utils';
import dayjs from 'dayjs';

export async function POST(request) {
  try {
    // 从表 pending_settlement_details 同步数据到表 cost_settlement
    const pendingDetails = await PendingSettlementDetail.findAll({
      attributes: [
        'mall_id',
        'sku_id',
        [PendingSettlementDetail.sequelize.fn('SUM', PendingSettlementDetail.sequelize.col('sales_volume')), 'pending_sales_volume'],
        [PendingSettlementDetail.sequelize.fn('SUM', PendingSettlementDetail.sequelize.col('sales_amount')), 'pending_sales_amount']
      ],
      group: ['mall_id', 'sku_id'],
      raw: true
    });

    // 遍历查询结果，更新或插入到cost_settlement表中
    for (const data of pendingDetails) {
      const {
        mall_id: mallId,
        sku_id: skuId,
        pending_sales_volume,
        pending_sales_amount,
      } = data;

      const skuPendingData = await PendingSettlementDetail.findAll({
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
        updated_time: pending_updated_time,
      } = skuPendingData[0] || {};

      const pendingSalesVolume = pending_sales_volume;
      const pendingSalesAmount =
        currency === 'USD'
          ? USDToCNY(pending_sales_amount)
          : pending_sales_amount;

      // 计算待结算平均价格
      const pendingAveragePrice = pendingSalesVolume
        ? Math.floor((pendingSalesAmount / pendingSalesVolume) * 100) / 100
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

      const new_pending_updated_time = dayjs(pending_updated_time).format(
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
        if (pendingAveragePrice !== undefined) {
          updateFields.push('pending_average_price = ?');
          updateValues.push(pendingAveragePrice);
        }
        if (pendingSalesVolume !== undefined) {
          updateFields.push('pending_sales_volume = ?');
          updateValues.push(pendingSalesVolume);
        }
        if (pendingSalesAmount !== undefined) {
          updateFields.push('pending_sales_amount = ?');
          updateValues.push(pendingSalesAmount);
        }

        // 如果存在产品价格 cost_price，则重新更新毛利润和利润率
        const { cost_price } = existingRecord[0] || {};
        if (cost_price) {
          const costPrice = parseFloat(cost_price);

          // 1. 待结算毛利润=((待结算均价-产品成本-0.1)-待结算均价*2.5*0.01-(产品成本+0.1)*0.01)*待结算销量
          const pendingGrossProfit = pendingSalesVolume
            ? (pendingAveragePrice -
                costPrice -
                0.1 -
                pendingAveragePrice * 2.5 * 0.01 -
                (costPrice + 0.1) * 0.01) *
              (parseFloat(pendingSalesVolume) || 0)
            : null;

          updateFields.push('pending_gross_profit = ?');
          updateValues.push(pendingGrossProfit);

          // 2. 待结算利润率=待结算毛利润/(产品成本*待结算销量)
          const pendingProfitRate =
            costPrice && pendingSalesVolume && pendingGrossProfit
              ? parseFloat(pendingGrossProfit.toFixed(2)) /
                (costPrice * (parseFloat(pendingSalesVolume) || 0))
              : null;

          updateFields.push('pending_profit_rate = ?');
          updateValues.push(pendingProfitRate);
        }

        // 总是更新updated_time字段
        updateFields.push('pending_updated_time = ?', 'updated_time = ?');
        updateValues.push(new_pending_updated_time, currentTime);

        // 如果有要更新的字段，则执行更新
        if (updateFields.length > 0) {
          const updateData = {};
          
          // 构建更新对象
          if (mallName !== undefined) updateData.mall_name = mallName;
          if (skuCode !== undefined) updateData.sku_code = skuCode;
          if (skuProperty !== undefined) updateData.sku_property = skuProperty;
          if (goodsName !== undefined) updateData.goods_name = goodsName;
          if (pendingAveragePrice !== undefined) updateData.pending_average_price = pendingAveragePrice;
          if (pendingSalesVolume !== undefined) updateData.pending_sales_volume = pendingSalesVolume;
          if (pendingSalesAmount !== undefined) updateData.pending_sales_amount = pendingSalesAmount;
          
          // 如果存在产品价格，添加毛利润和利润率
          const { cost_price } = existingRecord[0] || {};
          if (cost_price) {
            const costPrice = parseFloat(cost_price);
            const pendingGrossProfit = pendingSalesVolume
              ? (pendingAveragePrice -
                  costPrice -
                  0.1 -
                  pendingAveragePrice * 2.5 * 0.01 -
                  (costPrice + 0.1) * 0.01) *
                (parseFloat(pendingSalesVolume) || 0)
              : null;
            
            updateData.pending_gross_profit = pendingGrossProfit;
            
            const pendingProfitRate =
              costPrice && pendingSalesVolume && pendingGrossProfit
                ? parseFloat(pendingGrossProfit.toFixed(2)) /
                  (costPrice * (parseFloat(pendingSalesVolume) || 0))
                : null;
            
            updateData.pending_profit_rate = pendingProfitRate;
          }
          
          // 总是更新时间字段
          updateData.pending_updated_time = new_pending_updated_time;
          updateData.updated_time = currentTime;

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
          pending_updated_time: currentTime,
          updated_time: currentTime
        };

        if (mallName !== undefined) insertData.mall_name = mallName;
        if (skuCode !== undefined) insertData.sku_code = skuCode;
        if (skuProperty !== undefined) insertData.sku_property = skuProperty;
        if (goodsName !== undefined) insertData.goods_name = goodsName;
        if (pendingAveragePrice !== undefined) insertData.pending_average_price = pendingAveragePrice;
        if (pendingSalesVolume !== undefined) insertData.pending_sales_volume = pendingSalesVolume;
        if (pendingSalesAmount !== undefined) insertData.pending_sales_amount = pendingSalesAmount;

        await CostSettlement.create(insertData);
      }
    }
    return NextResponse.json({
      success: true,
      data: '待结算数据同步到成本结算成功！',
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
