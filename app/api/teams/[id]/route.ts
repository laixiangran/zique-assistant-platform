import { NextRequest, NextResponse } from 'next/server';
import { SubAccount, User, UserOperationLog } from '@/models';
import {
  verifyToken,
  successResponse,
  errorResponse,
  hashPassword,
  getClientIP,
  formatObjectDates,
} from '@/lib/utils';

// 获取子账户详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 获取token
    const token =
      request.cookies.get('token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(errorResponse('未登录'), { status: 401 });
    }

    // 验证token
    const decoded = verifyToken(token) as any;
    if (!decoded) {
      return NextResponse.json(errorResponse('token无效'), { status: 401 });
    }

    // 只有主账户可以查看子账户详情
    if (decoded.type !== 'user') {
      return NextResponse.json(errorResponse('只有主账户可以查看子账户详情'), {
        status: 403,
      });
    }

    const userId = decoded.userId;
    const subAccountId = params.id;

    // 查询子账户
    const subAccount = await SubAccount.findOne({
      where: {
        id: subAccountId,
        parentUserId: userId,
      },
      attributes: {
        exclude: ['password'],
      },
    });

    if (!subAccount) {
      return NextResponse.json(errorResponse('子账户不存在'), { status: 404 });
    }

    // 处理数据
    const result = {
      ...formatObjectDates(subAccount.toJSON()),
      responsible_shops: JSON.parse(
        (subAccount as any).responsible_shops || '[]'
      ),
      permissions: JSON.parse((subAccount as any).permissions || '[]'),
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
    // 获取token
    const token =
      request.cookies.get('token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(errorResponse('未登录'), { status: 401 });
    }

    // 验证token
    const decoded = verifyToken(token) as any;
    if (!decoded) {
      return NextResponse.json(errorResponse('token无效'), { status: 401 });
    }

    // 只有主账户可以更新子账户
    if (decoded.type !== 'user') {
      return NextResponse.json(errorResponse('只有主账户可以更新子账户'), {
        status: 403,
      });
    }

    const userId = decoded.userId;
    const subAccountId = params.id;

    const body = await request.json();
    const { username, password, responsible_shops, role, permissions, status } =
      body;

    // 查询子账户
    const subAccount = await SubAccount.findOne({
      where: {
        id: subAccountId,
        parentUserId: userId,
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

    // 更新角色
    if (role) {
      const validRoles = ['admin', 'manager', 'operator'];
      if (!validRoles.includes(role)) {
        return NextResponse.json(errorResponse('无效的角色类型'), {
          status: 400,
        });
      }
      updateData.role = role;
    }

    // 更新负责店铺
    if (responsible_shops !== undefined) {
      updateData.responsible_shops = JSON.stringify(responsible_shops);
    }

    // 更新权限
    if (permissions !== undefined) {
      updateData.permissions = JSON.stringify(permissions);
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

    // 记录操作日志
    await UserOperationLog.create({
      userId: userId,
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

    // 处理数据
    const result = {
      ...formatObjectDates(updatedSubAccount?.toJSON()),
      responsible_shops: JSON.parse(
        (updatedSubAccount as any)?.responsible_shops || '[]'
      ),
      permissions: JSON.parse((updatedSubAccount as any)?.permissions || '[]'),
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
    // 获取token
    const token =
      request.cookies.get('token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(errorResponse('未登录'), { status: 401 });
    }

    // 验证token
    const decoded = verifyToken(token) as any;
    if (!decoded) {
      return NextResponse.json(errorResponse('token无效'), { status: 401 });
    }

    // 只有主账户可以删除子账户
    if (decoded.type !== 'user') {
      return NextResponse.json(errorResponse('只有主账户可以删除子账户'), {
        status: 403,
      });
    }

    const userId = decoded.userId;
    const subAccountId = params.id;

    // 查询子账户
    const subAccount = await SubAccount.findOne({
      where: {
        id: subAccountId,
        parentUserId: userId,
      },
    });

    if (!subAccount) {
      return NextResponse.json(errorResponse('子账户不存在'), { status: 404 });
    }

    const username = (subAccount as any).username;

    // 删除子账户
    await subAccount.destroy();

    // 记录操作日志
    await UserOperationLog.create({
      userId: userId,
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
