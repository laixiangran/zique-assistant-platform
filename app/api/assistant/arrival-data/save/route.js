import { NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { ArrivalDataDetail } from '../../../../models';
import { authenticateUser, validateMallAccess } from '../../../../lib/user-auth';

export async function POST(request) {
  try {
    // 用户权限验证
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const body = await request.json();
    const { data: datas } = body;
    for (const data of datas) {
      const {
        mallId,
        mallName,
        regionCode,
        regionName,
        accountingTime,
        skuId,
        skuCode,
        goodsName,
        skuProperty,
        salesVolume,
        incomeAmount,
        currency,
        updatedTime = dayjs().format('YYYY-MM-DD HH:mm:ss'),
      } = data;

      // 验证店铺权限
      const mallAccessResult = await validateMallAccess(authResult.user, mallId);
      if (!mallAccessResult.success) {
        return mallAccessResult.response;
      }

      const currentTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
      
      await ArrivalDataDetail.create({
        mall_id: mallId,
        mall_name: mallName,
        region_code: regionCode,
        region_name: regionName,
        accounting_time: accountingTime,
        sku_id: skuId,
        sku_code: skuCode,
        goods_name: goodsName,
        sku_property: skuProperty,
        sales_volume: salesVolume,
        sales_amount: incomeAmount,
        currency: currency,
        created_time: currentTime,
        updated_time: updatedTime,
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
