import { NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { PendingSettlementDetail } from '../../../../models';

export async function POST(request) {
  try {
    const body = await request.json();
    const { mallId, regionCode, data: datas } = body;

    // 先删除该店铺该区域的旧数据
    await PendingSettlementDetail.destroy({
      where: {
        mall_id: mallId,
        region_code: regionCode
      }
    });

    // 再插入该店铺新数据
    for (const data of datas) {
      const {
        mallId,
        mallName,
        regionCode,
        regionName,
        skuId,
        skuCode,
        goodsName,
        skuProperty,
        salesVolume,
        estimatedPendingSalesAmount,
        currency,
        updatedTime = dayjs().format('YYYY-MM-DD HH:mm:ss'),
      } = data;

      const createTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
      
      await PendingSettlementDetail.create({
        mall_id: mallId,
        mall_name: mallName,
        region_code: regionCode,
        region_name: regionName,
        sku_id: skuId,
        sku_code: skuCode,
        goods_name: goodsName,
        sku_property: skuProperty,
        sales_volume: salesVolume,
        sales_amount: estimatedPendingSalesAmount,
        currency: currency,
        created_time: createTime,
        updated_time: updatedTime
      });
    }

    return NextResponse.json({ success: true, data: '数据保存成功！' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
