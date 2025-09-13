import { NextResponse, NextRequest } from 'next/server';
import dayjs from 'dayjs';
import { MallState } from '@/models';
import { authenticateUser, validateMallAccess } from '@/lib/user-auth';
import { successResponse, errorResponse } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    // 用户权限验证
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json(authResult, {
        status: 403,
      });
    }

    const body = await request.json();
    const { mallId, mallName, stateType, state } = body;

    // 验证店铺权限
    const mallAccessResult = await validateMallAccess(authResult, mallId);
    if (!mallAccessResult.success) {
      return mallAccessResult.response;
    }

    // 检查是否存在相同的 mallId 记录
    const existingRecord = await MallState.findAll({
      where: {
        mallId: mallId,
      },
      attributes: ['id'],
      raw: true,
    });

    const createdTime = new Date();
    const updatedTime = createdTime;
    if (existingRecord.length > 0) {
      // 如果存在，则更新记录
      await MallState.update(
        {
          mallName: mallName,
          stateType: stateType,
          state: state,
          updatedTime: updatedTime,
        },
        {
          where: {
            mallId: mallId,
          },
        }
      );
    } else {
      // 如果不存在，则插入新记录
      await MallState.create({
        mallId: mallId,
        mallName: mallName,
        stateType: stateType,
        state: state,
        createdTime: createdTime,
        updatedTime: updatedTime,
      });
    }
    return NextResponse.json(successResponse('店铺状态记录成功！'));
  } catch (error) {
    console.error('保存店铺状态失败:', error);
    return NextResponse.json(errorResponse('保存失败，请稍后重试'), {
      status: 500,
    });
  }
}
