import { NextRequest, NextResponse } from 'next/server';
import { Op } from 'sequelize';
import { PendingSettlementDetail, CostSettlement } from '@/models';
import { USDToCNY, successResponse, errorResponse } from '@/lib/utils';
import { authenticateUser } from '@/lib/user-auth';
import dayjs from 'dayjs';

export async function POST(request: NextRequest) {
  try {
    // 用户权限验证
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return authResult.response || NextResponse.json(errorResponse('用户未登录或权限不足'), { status: 401 });
    }

    const { mallId, skuId } = await request.json();

    if (!mallId || !skuId) {
      return NextResponse.json(errorResponse('缺少必要参数'), { status: 400 });
    }

    // 从表 pending_settlement_details 同步数据到表 cost_settlement
    const pendingDetails = await PendingSettlementDetail.findAll({
      where: {
        mallId: mallId,
        skuId: skuId
      },
      attributes: [
        'mallId', 'skuId', 'mallName', 'skuCode', 'skuProperty', 'goodsName',
        'pendingSalesVolume', 'pendingSalesAmount', 'currency', 'updatedTime'
      ],
      raw: true
    });

    // 遍历查询结果，更新或插入到cost_settlement表中
    for (const pendingDetail of pendingDetails) {
      const {
        mallId,
        skuId,
        mallName,
        skuCode,
        skuProperty,
        goodsName,
        pendingSalesVolume,
        pendingSalesAmount,
        currency,
        updatedTime: pending_updated_time,
      } = pendingDetail as any;

      const pendingSalesVolumeNum = parseFloat(pendingSalesVolume?.toString() || '0') || 0;
      const pendingSalesAmountNum = currency === 'USD'
        ? USDToCNY(pendingSalesAmount)
        : parseFloat(pendingSalesAmount?.toString() || '0') || 0;

      // 计算待结算平均价格
      const pendingAveragePrice = pendingSalesVolumeNum
        ? Math.floor((pendingSalesAmountNum / pendingSalesVolumeNum) * 100) / 100
        : 0;

      // 检查是否已存在相同的mallId和skuId记录
      const existingRecord = await CostSettlement.findAll({
        where: {
          mallId: mallId,
          skuId: skuId
        },
        attributes: ['id', 'costPrice'],
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

        // 如果存在产品价格 costPrice，则重新更新毛利润和利润率
        const { costPrice: cost_price } = existingRecord[0] || {};
        if (cost_price) {
          const costPrice = parseFloat(cost_price?.toString() || '0');

          // 1. 待结算毛利润=((待结算均价-产品成本-0.1)-待结算均价*2.5*0.01-(产品成本+0.1)*0.01)*待结算销量
          const pendingGrossProfit = pendingSalesVolume
            ? (pendingAveragePrice -
                costPrice -
                0.1 -
                pendingAveragePrice * 2.5 * 0.01 -
                (costPrice + 0.1) * 0.01) *
              (parseFloat(pendingSalesVolume.toString()) || 0)
            : null;

          updateFields.push('pending_gross_profit = ?');
          updateValues.push(pendingGrossProfit);

          // 2. 待结算利润率=待结算毛利润/(产品成本*待结算销量)
          const pendingProfitRate =
            costPrice && pendingSalesVolume && pendingGrossProfit
              ? parseFloat(pendingGrossProfit.toFixed(2)) /
                (costPrice * (parseFloat(pendingSalesVolume.toString()) || 0))
              : null;

          updateFields.push('pending_profit_rate = ?');
          updateValues.push(pendingProfitRate);
        }

        // 总是更新updated_time字段
        updateFields.push('pending_updated_time = ?', 'updated_time = ?');
        updateValues.push(new_pending_updated_time, currentTime);

        // 如果有要更新的字段，则执行更新
        if (updateFields.length > 0) {
          const updateData: any = {};
          
          // 构建更新对象
          if (mallName !== undefined) updateData.mallName = mallName;
          if (skuCode !== undefined) updateData.skuCode = skuCode;
          if (skuProperty !== undefined) updateData.skuProperty = skuProperty;
          if (goodsName !== undefined) updateData.goodsName = goodsName;
          if (pendingAveragePrice !== undefined) updateData.pendingAveragePrice = pendingAveragePrice;
          if (pendingSalesVolume !== undefined) updateData.pendingSalesVolume = pendingSalesVolume;
          if (pendingSalesAmount !== undefined) updateData.pendingSalesAmount = pendingSalesAmount;
          
          // 如果存在产品价格，添加毛利润和利润率
          const { costPrice: cost_price } = (existingRecord[0] as any) || {};
          if (cost_price) {
            const costPrice = parseFloat(cost_price?.toString() || '0');
            const pendingGrossProfit = pendingSalesVolume
              ? (pendingAveragePrice -
                  costPrice -
                  0.1 -
                  pendingAveragePrice * 2.5 * 0.01 -
                  (costPrice + 0.1) * 0.01) *
                (parseFloat(pendingSalesVolume.toString()) || 0)
              : 0;
            
            if (pendingGrossProfit !== null && pendingGrossProfit !== undefined) {
              updateData.pendingGrossProfit = pendingGrossProfit;
            }
            
            const pendingProfitRate =
              costPrice && pendingSalesVolume && pendingGrossProfit
                ? parseFloat(pendingGrossProfit.toFixed(2)) /
                  (costPrice * (parseFloat(pendingSalesVolume.toString()) || 0))
                : 0;
            
            if (pendingProfitRate !== null && pendingProfitRate !== undefined) {
              updateData.pendingProfitRate = pendingProfitRate;
            }
          }
          
          // 总是更新时间字段
          updateData.pendingUpdatedTime = new Date(new_pending_updated_time);
          updateData.updatedTime = new Date(currentTime);

          await CostSettlement.update(updateData, {
            where: {
              mallId: mallId,
              skuId: skuId
            }
          });
        }
      } else {
        // 如果不存在相同mallId和skuId的记录，则插入新记录
        const insertData: any = {
          mallId: mallId,
          skuId: skuId,
          mallName: mallName || '',
          skuCode: skuCode || '',
          skuProperty: skuProperty || '',
          goodsName: goodsName || '',
          pendingAveragePrice: pendingAveragePrice || 0,
          pendingSalesVolume: pendingSalesVolume || 0,
          pendingSalesAmount: pendingSalesAmount || 0,
          createdTime: new Date(currentTime),
          pendingUpdatedTime: new Date(new_pending_updated_time),
          updatedTime: new Date(currentTime)
        };

        await CostSettlement.create(insertData);
      }
    }
    return NextResponse.json(successResponse('待结算数据同步到成本结算成功！'));
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(errorResponse(error instanceof Error ? error.message : 'Unknown error'), {
      status: 500
    });
  }
}
