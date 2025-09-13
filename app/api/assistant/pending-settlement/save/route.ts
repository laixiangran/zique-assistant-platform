import { NextResponse, NextRequest } from 'next/server';
import { Transaction } from 'sequelize';
import { PendingSettlementDetail, MallState } from '@/models';
import { authenticateUser, validateMallAccess } from '@/lib/user-auth';
import { successResponse, errorResponse } from '@/lib/utils';
import sequelize from '@/lib/database';

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
    const { mallId, mallName, regionCode, regionName, data } = body;

    // 验证店铺权限
    const mallAccessResult = await validateMallAccess(authResult, mallId);
    if (!mallAccessResult.success) {
      return NextResponse.json(mallAccessResult, {
        status: 403,
      });
    }

    // 使用事务确保数据一致性，提高隔离级别防止并发问题
    const transaction = await sequelize.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    });

    try {
      // 先锁定相关记录，防止并发修改
      await PendingSettlementDetail.findAll({
        where: {
          mallId: mallId,
          regionCode: regionCode,
        },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      // 删除该店铺该区域的旧数据
      await PendingSettlementDetail.destroy({
        where: {
          mallId: mallId,
          regionCode: regionCode,
        },
        transaction,
      });

      // 批量插入新数据，提高性能
      if (data && data.length > 0) {
        const currentTime = new Date();
        const dataWithTimestamps = data.map((item: any) => ({
          ...item,
          createdTime: currentTime,
          updatedTime: currentTime,
        }));

        await PendingSettlementDetail.bulkCreate(dataWithTimestamps, {
          transaction,
          validate: true,
        });
      }

      // 更新 mall_state 表
      await MallState.upsert(
        {
          mallId,
          mallName,
          regionCode,
          regionName,
          stateType: 'pending_settlement',
          state: 'updated',
          lastCollectTime: new Date(),
        },
        { transaction }
      );

      // 提交事务
      await transaction.commit();
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      throw error;
    }

    return NextResponse.json(successResponse('数据保存成功！'));
  } catch (error) {
    console.error('保存待结算数据失败:', error);
    return NextResponse.json(errorResponse('保存失败，请稍后重试'), {
      status: 500,
    });
  }
}
