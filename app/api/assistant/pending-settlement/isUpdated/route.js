import { NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { PendingSettlementDetail } from '@/models';
import { authenticateUser } from '@/lib/user-auth';

export async function GET(request) {
  try {
    // 验证用户权限
    const authResult = await authenticateUser(request);
    console.log('authResult: ', authResult);
    if (!authResult.success) {
      return authResult.response;
    }

    const mallId = authResult.allowedMallIds?.[0];
    const { searchParams } = new URL(request.url);
    const regionCode = searchParams.get('regionCode');
    const results = await PendingSettlementDetail.findAll({
      where: {
        mall_id: mallId,
        region_code: regionCode,
      },
      attributes: ['updated_time'],
      order: [['updated_time', 'DESC']],
      limit: 1,
      raw: true,
    });

    if (results.length > 0) {
      const updatedTime = dayjs(results[0].updated_time);
      const threeHoursAgo = dayjs().subtract(3, 'hour');

      // 如果更新时间在3小时内，返回true
      if (updatedTime.isAfter(threeHoursAgo)) {
        return NextResponse.json({
          success: true,
          data: true,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: false,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        data: false,
      },
      { status: 200 }
    );
  }
}
