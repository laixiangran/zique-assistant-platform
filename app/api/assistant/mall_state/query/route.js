import { NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { MallState } from '../../../../models';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mall_id = parseInt(searchParams.get('mall_id')) || 1;

    const results = await MallState.findAll({
      where: {
        mall_id: mall_id
      },
      raw: true
    });

    // 转换时间格式
    const formattedResults = results.map((item) => ({
      ...item,
      created_time: dayjs(item.created_time).format('YYYY-MM-DD HH:mm:ss'),
      updated_time: dayjs(item.updated_time).format('YYYY-MM-DD HH:mm:ss'),
    }));

    return NextResponse.json({
      success: true,
      data: formattedResults[0] || {},
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        data: null,
      },
      { status: 200 }
    );
  }
}
