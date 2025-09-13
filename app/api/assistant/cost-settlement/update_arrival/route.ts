import { NextRequest, NextResponse } from 'next/server';
import { Op } from 'sequelize';
import { ArrivalDataDetail, CostSettlement } from '@/models';
import { authenticateUser } from '@/lib/user-auth';
import { USDToCNY, successResponse, errorResponse } from '@/lib/utils';
import dayjs from 'dayjs';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return authResult.response || NextResponse.json(errorResponse('用户未登录或权限不足'), { status: 401 });
    }

    // 从表 arrival_data_details 同步 accounting_time 为最近30天的数据到表 cost_settlement
    const startDate = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
    const endDate = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

    const arrivalDetails = await ArrivalDataDetail.findAll({
      where: {
        accountingTime: {
          [Op.between]: [`${startDate} 00:00:00`, `${endDate} 23:59:59`]
        },
        mallId: {
          [Op.in]: authResult.allowedMallIds || []
        }
      },
      attributes: [
        'mallId',
        'skuId',
        'salesVolume',
        'salesAmount'
      ],
      raw: true
    });

    // 遍历查询结果，更新或插入到costSettlement表中
    for (const data of arrivalDetails) {
      const {
        mallId,
        skuId,
        d30ArrivalSalesVolume,
        d30ArrivalSalesAmount,
      } = data as any;

      const skuArrivalData = await ArrivalDataDetail.findAll({
        where: {
          skuId: skuId
        },
        attributes: ['mallName', 'skuCode', 'skuProperty', 'goodsName', 'currency', 'updatedTime'],
        order: [['updatedTime', 'DESC']],
        limit: 1,
        raw: true
      });

      const {
        mallName,
        skuCode,
        skuProperty,
        goodsName,
        currency,
        updatedTime: arrival_updated_time,
      } = skuArrivalData[0];

      const d30ArrivalSalesVolumeNum = parseFloat(d30ArrivalSalesVolume?.toString() || '0') || 0;
      const d30ArrivalSalesAmountNum = currency === 'USD'
        ? USDToCNY(d30ArrivalSalesAmount)
        : parseFloat(d30ArrivalSalesAmount?.toString() || '0') || 0;

      // 计算30天已结算均价
      const d30ArrivalAveragePrice = d30ArrivalSalesVolumeNum
        ? Math.floor((d30ArrivalSalesAmountNum / d30ArrivalSalesVolumeNum) * 100) /
          100
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

      const new_arrival_updated_time = dayjs(arrival_updated_time).format(
        'YYYY-MM-DD HH:mm:ss'
      );
      const currentTime = dayjs().format('YYYY-MM-DD HH:mm:ss');

      // 如果存在相同mallId和skuId的记录，则更新该记录
      if (existingRecord.length > 0) {
        // 构建更新对象
        const updateData: any = {};

        // 只有在提供了相应字段时才添加到更新对象
        if (mallName !== undefined) {
          updateData.mallName = mallName;
        }
        if (skuCode !== undefined) {
          updateData.skuCode = skuCode;
        }
        if (skuProperty !== undefined) {
          updateData.skuProperty = skuProperty;
        }
        if (goodsName !== undefined) {
          updateData.goodsName = goodsName;
        }
        if (d30ArrivalAveragePrice !== undefined) {
          updateData.d30ArrivalAveragePrice = d30ArrivalAveragePrice;
        }
        if (d30ArrivalSalesVolumeNum !== undefined) {
          updateData.d30ArrivalSalesVolume = d30ArrivalSalesVolumeNum;
        }
        if (d30ArrivalSalesAmountNum !== undefined) {
          updateData.d30ArrivalSalesAmount = d30ArrivalSalesAmountNum;
        }

        // 如果存在产品价格 cost_price，则重新更新毛利润和利润率
        const { costPrice: cost_price } = (existingRecord[0] as any) || {};
        if (cost_price) {
          const costPrice = parseFloat(cost_price?.toString() || '0');

          // 1. 30日毛利润=(30日均价-产品成本)*30日销量
          const d30ArrivalGrossProfit = d30ArrivalSalesVolumeNum
            ? (d30ArrivalAveragePrice - costPrice) * d30ArrivalSalesVolumeNum
            : null;

          if (d30ArrivalGrossProfit !== null && d30ArrivalGrossProfit !== undefined) {
            updateData.d30ArrivalGrossProfit = d30ArrivalGrossProfit;
          }

          // 2. 30日利润率=30日毛利润/(产品成本*30日到账销量)
          const d30ArrivalProfitRate =
            costPrice && d30ArrivalSalesVolumeNum && d30ArrivalGrossProfit
              ? parseFloat(d30ArrivalGrossProfit.toFixed(2)) /
                (costPrice * d30ArrivalSalesVolumeNum)
              : null;

          if (d30ArrivalProfitRate !== null && d30ArrivalProfitRate !== undefined) {
            updateData.d30ArrivalProfitRate = d30ArrivalProfitRate;
          }
        }

        // 总是更新时间字段
        updateData.arrivalUpdatedTime = new_arrival_updated_time;
        updateData.updatedTime = currentTime;

        // 执行更新
        await CostSettlement.update(updateData, {
          where: {
            mallId: mallId,
            skuId: skuId
          }
        });
      } else {
        // 如果不存在相同mallId和skuId的记录，则插入新记录
        const insertData: any = {
          mallId: mallId,
          skuId: skuId,
          createdTime: currentTime,
          arrivalUpdatedTime: new_arrival_updated_time,
          updatedTime: currentTime
        };

        if (mallName !== undefined) {
          insertData.mallName = mallName;
        }
        if (skuCode !== undefined) {
          insertData.skuCode = skuCode;
        }
        if (skuProperty !== undefined) {
          insertData.skuProperty = skuProperty;
        }
        if (goodsName !== undefined) {
          insertData.goodsName = goodsName;
        }
        if (d30ArrivalAveragePrice !== undefined) {
          insertData.d30ArrivalAveragePrice = d30ArrivalAveragePrice;
        }
        if (d30ArrivalSalesVolumeNum !== undefined) {
          insertData.d30ArrivalSalesVolume = d30ArrivalSalesVolumeNum;
        }
        if (d30ArrivalSalesAmountNum !== undefined) {
          insertData.d30ArrivalSalesAmount = d30ArrivalSalesAmountNum;
        }

        await CostSettlement.create(insertData);
      }
    }
    return NextResponse.json(successResponse('30天已结算数据同步到成本结算成功！'));
  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json(errorResponse(error.message), {
      status: 500
    });
  }
}
