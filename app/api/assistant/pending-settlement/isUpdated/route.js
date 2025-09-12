import { NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { PendingSettlementDetail } from '../../../../models';

export async function POST(request) {
  try {
    const { mallId, regionCode } = await request.json();

    const results = await PendingSettlementDetail.findAll({
      where: {
        mall_id: mallId,
        region_code: regionCode
      },
      attributes: ['updated_time'],
      order: [['updated_time', 'DESC']],
      limit: 1,
      raw: true
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
