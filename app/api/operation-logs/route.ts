import { NextRequest, NextResponse } from 'next/server';
import { UserOperationLog, User } from '@/models';
import {
  authenticateRequest,
  authenticateMainAccount,
  successResponse,
  errorResponse,
  formatObjectDates,
} from '@/lib/utils';
import { Op } from 'sequelize';

// 获取用户操作日志
export async function GET(request: NextRequest) {
  try {
    // 统一身份验证
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(errorResponse(authResult.error!), {
        status: 401,
      });
    }

    const decoded = authResult.user!;
    const userId = decoded.userId;
    const userType = decoded.type;

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const operationType = searchParams.get('operation_type');
    const status = searchParams.get('status');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // 构建查询条件
    const where: any = {};

    // 根据用户类型设置查询条件
    if (userType === 'user') {
      // 主账户可以查看自己和子账户的操作日志
      const subUsers = await User.findAll({
        where: { parent_user_id: userId } as any,
        attributes: ['id'],
      });
      const subUserIds = subUsers.map((user: any) => user.id);
      where.userId = { [Op.in]: [userId, ...subUserIds] };
    } else {
      // 子账户只能查看自己的操作日志
      where.userId = userId;
    }

    // 添加其他筛选条件
    if (operationType) where.operationType = operationType;
    if (status) where.status = status;
    if (startDate && endDate) {
      where.createdTime = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    } else if (startDate) {
      where.createdTime = {
        [Op.gte]: new Date(startDate),
      };
    } else if (endDate) {
      where.createdTime = {
        [Op.lte]: new Date(endDate),
      };
    }

    // 查询操作日志
    const { count, rows } = await UserOperationLog.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'phone', 'email', 'account_type'],
        },
      ],
      limit,
      offset: (page - 1) * limit,
      order: [['createdTime', 'DESC']],
    });

    // 计算统计数据
    const totalLogs = await UserOperationLog.count({
      where:
        userType === 'user'
          ? {
              userId: {
                [Op.in]: [
                  userId,
                  ...(
                    await User.findAll({
                      where: { parent_user_id: userId } as any,
                      attributes: ['id'],
                    })
                  ).map((user: any) => user.id),
                ],
              },
            }
          : { userId: userId },
    } as any);

    const successLogs = await UserOperationLog.count({
      where: {
        ...where,
        status: 'success',
      },
    });

    const failedLogs = await UserOperationLog.count({
      where: {
        ...where,
        status: 'failed',
      },
    });

    // 获取操作类型统计
    const operationTypeStats = await UserOperationLog.findAll({
      where,
      attributes: [
        'operationType',
        [
          UserOperationLog.sequelize?.fn(
            'COUNT',
            UserOperationLog.sequelize?.col('id')
          ),
          'count',
        ],
      ],
      group: ['operationType'],
      order: [
        [
          UserOperationLog.sequelize?.fn(
            'COUNT',
            UserOperationLog.sequelize?.col('id')
          ),
          'DESC',
        ],
      ],
    } as any);

    return NextResponse.json(
      successResponse(
        {
          logs: formatObjectDates(rows),
          pagination: {
            total: count,
            page,
            limit,
            pages: Math.ceil(count / limit),
          },
          stats: {
            total: totalLogs,
            success: successLogs,
            failed: failedLogs,
            operationTypes: formatObjectDates(operationTypeStats),
          },
        },
        '获取操作日志成功'
      )
    );
  } catch (error) {
    console.error('获取操作日志失败:', error);
    return NextResponse.json(errorResponse('获取操作日志失败，请稍后重试'), {
      status: 500,
    });
  }
}

// 清理操作日志（仅管理员）
export async function DELETE(request: NextRequest) {
  try {
    // 统一身份验证（仅主账户）
    const authResult = await authenticateMainAccount(request);
    if (!authResult.success) {
      return NextResponse.json(errorResponse(authResult.error!), {
        status: authResult.error === '只有主账户可以访问此接口' ? 403 : 401,
      });
    }

    const userId = authResult.user?.userId!;
    const body = await request.json();
    const { days = 30 } = body; // 默认清理30天前的日志

    // 计算清理日期
    const cleanupDate = new Date();
    cleanupDate.setDate(cleanupDate.getDate() - days);

    // 获取要清理的日志范围（主账户和子账户）
    const subUsers = await User.findAll({
      where: { parent_user_id: userId } as any,
      attributes: ['id'],
    });
    const subUserIds = subUsers.map((user: any) => user.id);
    const userIds = [userId, ...subUserIds];

    // 删除指定日期前的日志
    const deletedCount = await UserOperationLog.destroy({
      where: {
        userId: { [Op.in]: userIds },
        createdTime: { [Op.lt]: cleanupDate },
      },
    });

    return NextResponse.json(
      successResponse(
        {
          deletedCount,
          cleanupDate: formatObjectDates(cleanupDate),
        },
        `成功清理 ${deletedCount} 条操作日志`
      )
    );
  } catch (error) {
    console.error('清理操作日志失败:', error);
    return NextResponse.json(errorResponse('清理操作日志失败，请稍后重试'), {
      status: 500,
    });
  }
}
