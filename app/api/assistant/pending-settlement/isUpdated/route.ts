import { NextResponse, NextRequest } from 'next/server';
import dayjs from 'dayjs';
import { PendingSettlementDetail } from '@/models';
import { authenticateUser } from '@/lib/user-auth';
import { successResponse, errorResponse } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    // 验证用户权限
    const authResult = await authenticateUser(request);
    console.log('authResult: ', authResult);
    if (!authResult.success) {
      return authResult.response;
    }

    const mallId = authResult.allowedMallIds?.[0];
    const { searchParams } = new URL(request.url);
    const regionCode = searchParams.get('regionCode') || undefined;
    const results = await PendingSettlementDetail.findAll({
      where: {
        mallId: mallId,
        regionCode: regionCode,
      },
      attributes: ['updatedTime'],
      order: [['updatedTime', 'DESC']],
      limit: 1,
      raw: true,
    });

    if (results.length > 0) {
      const updatedTime = dayjs(results[0].updatedTime);
      const threeHoursAgo = dayjs().subtract(3, 'hour');

      // 如果更新时间在3小时内，返回true
      if (updatedTime.isAfter(threeHoursAgo)) {
        return NextResponse.json(successResponse(true));
      }
    }

    return NextResponse.json(successResponse(false));
  } catch (error) {
    return NextResponse.json(errorResponse(error instanceof Error ? error.message : 'Unknown error'), {
      status: 500
    });
  }
}
