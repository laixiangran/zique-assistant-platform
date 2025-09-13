import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { ArrivalDataDetail } from '@/models';
import { authenticateUser, validateMallAccess } from '@/lib/user-auth';
import { successResponse, errorResponse } from '@/lib/utils';

interface ArrivalDataItem {
  mallId: string;
  mallName: string;
  regionCode: string;
  regionName: string;
  accountingTime: string;
  skuId: string;
  skuCode: string;
  goodsName: string;
  skuProperty: string;
  salesVolume: number;
  incomeAmount: number;
  currency: string;
  updatedTime?: string;
}

export async function POST(request: NextRequest) {
  try {
    // 用户权限验证
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const body = await request.json();
    const { data: datas }: { data: ArrivalDataItem[] } = body;

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
      const mallAccessResult = await validateMallAccess(authResult, mallId);
      if (!mallAccessResult.success) {
        return mallAccessResult.response;
      }

      const currentTime = dayjs().format('YYYY-MM-DD HH:mm:ss');

      await ArrivalDataDetail.create({
        mallId: mallId,
        mallName: mallName,
        regionCode: regionCode,
        regionName: regionName,
        accountingTime: new Date(accountingTime),
        skuId: skuId,
        skuCode: skuCode,
        goodsName: goodsName,
        skuProperty: skuProperty,
        salesVolume: salesVolume,
        salesAmount: incomeAmount,
        currency: currency,
        createdTime: new Date(currentTime),
        updatedTime: new Date(updatedTime),
      });
    }

    return NextResponse.json(successResponse('数据保存成功！'));
  } catch (error) {
    console.error('保存到货数据失败:', error);
    return NextResponse.json(errorResponse('保存失败，请稍后重试'), {
      status: 500,
    });
  }
}
