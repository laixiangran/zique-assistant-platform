import { NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { ArrivalDataDetail } from '@/models';

export async function POST(request) {
  try {
    const { mallId, regionCode } = await request.json();
    const results = await ArrivalDataDetail.findAll({
      where: {
        mall_id: mallId,
        region_code: regionCode,
      },
      attributes: ['accounting_time'],
      order: [['accounting_time', 'DESC']],
      limit: 1,
      raw: true,
    });

    // 将昨天作为结束时间
    const endDate = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    if (results.length > 0) {
      // 获取最新的accounting_time的后一天作为beginDate
      const beginDate = dayjs(results[0].accounting_time)
        .add(1, 'day')
        .format('YYYY-MM-DD');

      // 当 beginDate 大于 endDate 时返回空数组
      if (beginDate > endDate) {
        return NextResponse.json({
          success: true,
          data: [],
        });
      }

      // 否则返回[beginDate, endDate]数组
      return NextResponse.json({
        success: true,
        data: [beginDate, endDate],
      });
    }

    // 如果没有结果，startDate 为 endDate 前30天
    const beginDate = dayjs(endDate).subtract(29, 'day').format('YYYY-MM-DD');
    return NextResponse.json({
      success: true,
      data: [beginDate, endDate],
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        data: [],
      },
      { status: 200 }
    );
  }
}
