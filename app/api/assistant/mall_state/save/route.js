import { NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { MallState } from '../../../../models';

export async function POST(request) {
  try {
    const body = await request.json();
    const { mall_id, mall_name, settlement_update_state } = body;

    // 检查是否存在相同的 mall_id 记录
    const existingRecord = await MallState.findAll({
      where: {
        mall_id: mall_id
      },
      attributes: ['id'],
      raw: true
    });

    const created_time = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const updated_time = created_time;
    if (existingRecord.length > 0) {
      // 如果存在，则更新记录
      await MallState.update({
        mall_name: mall_name,
        settlement_update_state: settlement_update_state,
        updated_time: updated_time
      }, {
        where: {
          mall_id: mall_id
        }
      });
    } else {
      // 如果不存在，则插入新记录
      await MallState.create({
        mall_id: mall_id,
        mall_name: mall_name,
        settlement_update_state: settlement_update_state,
        created_time: created_time,
        updated_time: updated_time
      });
    }
    return NextResponse.json({ success: true, data: '店铺状态记录成功！' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
