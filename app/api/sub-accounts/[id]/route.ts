import { NextRequest, NextResponse } from 'next/server';
import { SubAccount, User, UserOperationLog, UserMallBinding } from '@/models';
import {
  verifyToken,
  successResponse,
  errorResponse,
  hashPassword,
  getClientIP,
  formatObjectDates,
  authenticateMainAccount,
} from '@/lib/utils';

// 获取子账户详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 统一身份验证（需要主账户权限）
    const authResult = authenticateMainAccount(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const mainAccountUserId = authResult.user?.userId;
    const subAccountId = params.id;

    // 查询子账户
    const subAccount = await SubAccount.findOne({
      where: {
        id: subAccountId,
        parentUserId: mainAccountUserId,
      },
      attributes: {
        exclude: ['password'],
      },
    });

    if (!subAccount) {
      return NextResponse.json(errorResponse('子账户不存在'), { status: 404 });
    }

    // 查询子账户的店铺绑定
    const mallBindings = await UserMallBinding.findAll({
      where: { userId: subAccountId, accountType: 'sub' },
      attributes: ['mallId', 'mallName'],
    });

    // 处理数据
    const result = {
      ...formatObjectDates(subAccount.toJSON()),
      responsibleMalls: mallBindings.map((binding) => binding.mallId),
    };

    return NextResponse.json(
      successResponse(formatObjectDates(result), '获取子账户详情成功')
    );
  } catch (error) {
    console.error('获取子账户详情失败:', error);
    return NextResponse.json(errorResponse('获取子账户详情失败，请稍后重试'), {
      status: 500,
    });
  }
}

// 更新子账户
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 统一身份验证（需要主账户权限）
    const authResult = authenticateMainAccount(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const mainAccountUserId = authResult.user?.userId;
    const subAccountId = params.id;

    // 验证子账户ID格式
    if (
      !subAccountId ||
      isNaN(Number(subAccountId)) ||
      Number(subAccountId) <= 0
    ) {
      return NextResponse.json(errorResponse('无效的子账户ID'), {
        status: 400,
      });
    }

    // 获取请求数据并验证
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(errorResponse('请求数据格式错误'), {
        status: 400,
      });
    }

    const { username, password, responsibleMalls, status } = body;

    // 数据验证
    const validationErrors = [];

    if (
      username !== undefined &&
      (typeof username !== 'string' ||
        username.trim().length < 3 ||
        username.trim().length > 20)
    ) {
      validationErrors.push('用户名必须是3-20个字符的字符串');
    }

    if (
      password !== undefined &&
      (typeof password !== 'string' ||
        password.length < 6 ||
        password.length > 20)
    ) {
      validationErrors.push('密码必须是6-20个字符的字符串');
    }

    if (responsibleMalls !== undefined && !Array.isArray(responsibleMalls)) {
      validationErrors.push('负责店铺必须是数组格式');
    }

    if (status !== undefined && !['active', 'inactive'].includes(status)) {
      validationErrors.push('状态必须是active或inactive');
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        errorResponse(`数据验证失败: ${validationErrors.join(', ')}`),
        { status: 400 }
      );
    }

    // 查询子账户
    const subAccount = await SubAccount.findOne({
      where: {
        id: subAccountId,
        parentUserId: mainAccountUserId,
      },
    });

    if (!subAccount) {
      return NextResponse.json(errorResponse('子账户不存在'), { status: 404 });
    }

    // 构建更新数据
    const updateData: any = {};

    // 更新用户名
    if (username && username !== (subAccount as any).username) {
      // 验证用户名格式
      if (username.length < 3 || username.length > 20) {
        return NextResponse.json(
          errorResponse('用户名长度应在3-20个字符之间'),
          { status: 400 }
        );
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return NextResponse.json(
          errorResponse('用户名只能包含字母、数字和下划线'),
          { status: 400 }
        );
      }

      // 检查用户名是否已存在
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        return NextResponse.json(errorResponse('用户名已存在'), {
          status: 400,
        });
      }

      const existingSubAccount = await SubAccount.findOne({
        where: {
          username,
          id: { [require('sequelize').Op.ne]: subAccountId },
        },
      });
      if (existingSubAccount) {
        return NextResponse.json(errorResponse('用户名已存在'), {
          status: 400,
        });
      }

      updateData.username = username;
    }

    // 更新密码
    if (password) {
      // 验证密码格式
      if (password.length < 6 || password.length > 20) {
        return NextResponse.json(errorResponse('密码长度应在6-20个字符之间'), {
          status: 400,
        });
      }

      updateData.password = await hashPassword(password);
    }

    // 更新状态
    if (status) {
      const validStatuses = ['active', 'inactive'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(errorResponse('无效的状态'), { status: 400 });
      }
      updateData.status = status;
    }

    // 执行更新
    await subAccount.update(updateData);

    // 如果更新了负责店铺，同步更新user_mall_bindings表
    if (responsibleMalls !== undefined) {
      // 删除子账户现有的店铺绑定
      await UserMallBinding.destroy({
        where: {
          userId: Number(subAccountId),
          accountType: 'sub',
        },
      });

      // 为子账户创建新的店铺绑定关系
      if (responsibleMalls && responsibleMalls.length > 0) {
        // 获取主账户的店铺绑定信息
        const parentMallBindings = await UserMallBinding.findAll({
          where: {
            userId: mainAccountUserId,
            accountType: 'main',
            mallId: responsibleMalls,
          },
        });

        // 为子账户创建相应的店铺绑定
        const subAccountBindings = parentMallBindings.map((binding) => ({
          userId: Number(subAccountId),
          accountType: 'sub' as const,
          mallId: binding.mallId,
          mallName: binding.mallName,
        }));

        if (subAccountBindings.length > 0) {
          await UserMallBinding.bulkCreate(subAccountBindings);
        }
      }
    }

    // 记录操作日志
    await UserOperationLog.create({
      userId: mainAccountUserId,
      operationType: 'sub_account_update',
      operationDesc: `更新子账户：${(subAccount as any).username}`,
      targetType: 'sub_account',
      targetId: Number(subAccountId),
      requestData: JSON.stringify(updateData),
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || '',
      status: 'success',
    } as any);

    // 重新查询更新后的数据
    const updatedSubAccount = await SubAccount.findByPk(subAccountId, {
      attributes: {
        exclude: ['password'],
      },
    });

    // 查询更新后的子账户店铺绑定
    const updatedMallBindings = await UserMallBinding.findAll({
      where: { userId: subAccountId, accountType: 'sub' },
      attributes: ['mallId', 'mallName'],
    });

    // 处理数据
    const result = {
      ...formatObjectDates(updatedSubAccount?.toJSON()),
      responsibleMalls: updatedMallBindings.map((binding) => binding.mallId),
    };

    return NextResponse.json(
      successResponse(formatObjectDates(result), '子账户更新成功')
    );
  } catch (error) {
    console.error('更新子账户失败:', error);
    return NextResponse.json(errorResponse('更新子账户失败，请稍后重试'), {
      status: 500,
    });
  }
}

// 删除子账户
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 统一身份验证（需要主账户权限）
    const authResult = authenticateMainAccount(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const mainAccountUserId = authResult.user?.userId;
    const subAccountId = params.id;

    // 验证子账户ID格式
    if (
      !subAccountId ||
      isNaN(Number(subAccountId)) ||
      Number(subAccountId) <= 0
    ) {
      return NextResponse.json(errorResponse('无效的子账户ID'), {
        status: 400,
      });
    }

    // 查询子账户
    const subAccount = await SubAccount.findOne({
      where: {
        id: subAccountId,
        parentUserId: mainAccountUserId,
      },
    });

    if (!subAccount) {
      return NextResponse.json(errorResponse('子账户不存在'), { status: 404 });
    }

    const username = (subAccount as any).username;

    // 删除子账户的店铺绑定关系
    await UserMallBinding.destroy({
      where: {
        userId: Number(subAccountId),
        accountType: 'sub',
      },
    });

    // 删除子账户
    await subAccount.destroy();

    // 记录操作日志
    await UserOperationLog.create({
      userId: mainAccountUserId,
      operationType: 'sub_account_delete',
      operationDesc: `删除子账户：${username}`,
      targetType: 'sub_account',
      targetId: Number(subAccountId),
      requestData: JSON.stringify({ subAccountId, username }),
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || '',
      status: 'success',
    } as any);

    return NextResponse.json(successResponse(null, '子账户删除成功'));
  } catch (error) {
    console.error('删除子账户失败:', error);
    return NextResponse.json(errorResponse('删除子账户失败，请稍后重试'), {
      status: 500,
    });
  }
}
