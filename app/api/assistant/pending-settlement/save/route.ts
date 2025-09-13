import { NextResponse, NextRequest } from 'next/server';
import dayjs from 'dayjs';
import { PendingSettlementDetail } from '@/models';
import { authenticateUser, validateMallAccess } from '@/lib/user-auth';
import { successResponse, errorResponse } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    // 用户权限验证
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const body = await request.json();
    const { mallId, regionCode, data: datas } = body;

    // 验证店铺权限
    const mallAccessResult = await validateMallAccess(authResult, mallId);
    if (!mallAccessResult.success) {
      return mallAccessResult.response;
    }

    // 先删除该店铺该区域的旧数据
    await PendingSettlementDetail.destroy({
      where: {
        mallId: mallId,
        regionCode: regionCode
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

      const createTime = new Date();
      const updateTime = new Date(updatedTime);
      
      await PendingSettlementDetail.create({
        mallId: mallId,
        mallName: mallName,
        regionCode: regionCode,
        regionName: regionName,
        skuId: skuId,
        skuCode: skuCode,
        goodsName: goodsName,
        skuProperty: skuProperty,
        salesVolume: salesVolume,
        salesAmount: estimatedPendingSalesAmount,
        currency: currency,
        createdTime: createTime,
        updatedTime: updateTime
      });
    }

    return NextResponse.json(successResponse('数据保存成功！'));
  } catch (error) {
    console.error('保存待结算数据失败:', error);
    return NextResponse.json(errorResponse('保存失败，请稍后重试'), {
      status: 500,
    });
  }
}
