import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { ArrivalDataDetail } from '@/models';
import { successResponse, errorResponse } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { mallId, regionCode } = await request.json();
    const results = await ArrivalDataDetail.findAll({
      where: {
        mallId: mallId,
        regionCode: regionCode,
      },
      attributes: ['accountingTime'],
      order: [['accountingTime', 'DESC']],
      limit: 1,
      raw: true,
    });

    // 将昨天作为结束时间
    const endDate = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    if (results.length > 0) {
      // 获取最新的accountingTime的后一天作为beginDate
      const beginDate = dayjs(results[0].accountingTime)
        .add(1, 'day')
        .format('YYYY-MM-DD');

      // 当 beginDate 大于 endDate 时返回空数组
      if (beginDate > endDate) {
        return NextResponse.json(successResponse([], '查询成功'));
      }

      // 否则返回[beginDate, endDate]数组
      return NextResponse.json(successResponse([beginDate, endDate], '查询成功'));
    }

    // 如果没有结果，startDate 为 endDate 前30天
    const beginDate = dayjs(endDate).subtract(29, 'day').format('YYYY-MM-DD');
    return NextResponse.json(successResponse([beginDate, endDate], '查询成功'));
  } catch (error) {
    console.error('查询到货数据更新状态失败:', error);
    return NextResponse.json(errorResponse('查询失败，请稍后重试'), {
      status: 500,
    });
  }
}