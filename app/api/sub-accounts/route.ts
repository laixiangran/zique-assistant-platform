import { NextRequest, NextResponse } from 'next/server';
import { SubAccount, User, UserOperationLog, UserMallBinding } from '@/models';
import {
  verifyToken,
  successResponse,
  errorResponse,
  hashPassword,
  getClientIP,
  formatObjectDates,
  authenticateRequest,
} from '@/lib/utils';

// 获取子账户列表
export async function GET(request: NextRequest) {
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

    // 只有主账户可以管理子账户
    if (decoded.type !== 'user') {
      return NextResponse.json(errorResponse('只有主账户可以管理子账户'), {
        status: 403,
      });
    }

    const mainAccountUserId = decoded.userId;

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // 构建查询条件
    const where: any = { parentUserId: mainAccountUserId };
    if (status && status !== 'all') where.status = status;
    if (search) {
      where[require('sequelize').Op.or] = [
        { username: { [require('sequelize').Op.like]: `%${search}%` } },
      ];
    }

    // 查询子账户列表
    const { count, rows } = await SubAccount.findAndCountAll({
      where,
      attributes: {
        exclude: ['password'],
      },
      limit: pageSize,
      offset: (page - 1) * pageSize,
      order: [['createdTime', 'DESC']],
    });

    // 处理数据并查询每个子账户的店铺绑定
    const processedRows = await Promise.all(
      rows.map(async (row: any) => {
        // 查询子账户的店铺绑定
        const mallBindings = await UserMallBinding.findAll({
          where: { userId: row.id, accountType: 'sub' },
          attributes: ['mallId', 'mallName'],
        });

        return {
          ...formatObjectDates(row.toJSON()),
          responsibleMalls: mallBindings.map((binding) => ({
            mallId: binding.mallId,
            mallName: binding.mallName,
          })),
        };
      })
    );

    return NextResponse.json(
      successResponse(
        {
          subAccounts: processedRows,
          pagination: {
            total: count,
            page,
            pageSize,
            pages: Math.ceil(count / pageSize),
          },
        },
        '获取子账户列表成功'
      )
    );
  } catch (error) {
    console.error('获取子账户列表失败:', error);
    return NextResponse.json(errorResponse('获取子账户列表失败，请稍后重试'), {
      status: 500,
    });
  }
}

// 创建子账户
export async function POST(request: NextRequest) {
  try {
    // 统一身份验证
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(errorResponse(authResult.error!), {
        status: 401,
      });
    }

    // 只有主账户可以创建子账户
    if (authResult.user?.type !== 'user') {
      return NextResponse.json(errorResponse('只有主账户可以创建子账户'), {
        status: 403,
      });
    }

    const mainAccountUserId = authResult.user?.userId;

    // 解析请求体
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(errorResponse('请求数据格式错误'), {
        status: 400,
      });
    }

    const {
      username,
      password,
      responsibleMalls = [],
      status = 'active',
    } = body;

    // 详细数据验证
    const validationErrors = [];

    if (
      !username ||
      typeof username !== 'string' ||
      username.trim().length < 3
    ) {
      validationErrors.push('用户名必须是至少3个字符的字符串');
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      validationErrors.push('密码必须是至少6个字符的字符串');
    }

    if (responsibleMalls && !Array.isArray(responsibleMalls)) {
      validationErrors.push('负责店铺必须是数组格式');
    }

    if (!['active', 'inactive'].includes(status)) {
      validationErrors.push('状态必须是active或inactive');
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        errorResponse(`数据验证失败: ${validationErrors.join(', ')}`),
        {
          status: 400,
        }
      );
    }

    // 验证必填字段
    if (!username || !password) {
      return NextResponse.json(errorResponse('请输入用户名和密码'), {
        status: 400,
      });
    }

    // 验证用户名格式
    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(errorResponse('用户名长度应在3-20个字符之间'), {
        status: 400,
      });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        errorResponse('用户名只能包含字母、数字和下划线'),
        { status: 400 }
      );
    }

    // 验证密码格式
    if (password.length < 6 || password.length > 20) {
      return NextResponse.json(errorResponse('密码长度应在6-20个字符之间'), {
        status: 400,
      });
    }

    // 验证状态
    const validStatuses = ['active', 'inactive'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(errorResponse('无效的状态'), { status: 400 });
    }

    // 检查用户名是否已存在（主账户和子账户都要检查）
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return NextResponse.json(errorResponse('用户名已存在'), { status: 400 });
    }

    const existingSubAccount = await SubAccount.findOne({
      where: { username },
    });
    if (existingSubAccount) {
      return NextResponse.json(errorResponse('用户名已存在'), { status: 400 });
    }

    // 加密密码
    const hashedPassword = await hashPassword(password);

    // 创建子账户
    const subAccount = await SubAccount.create({
      parentUserId: mainAccountUserId,
      username,
      password: hashedPassword,
      status,
    } as any);

    // 为子账户创建店铺绑定关系
    if (responsibleMalls && responsibleMalls.length > 0) {
      // 获取主账户的店铺绑定信息
      const parentMallBindings = await UserMallBinding.findAll({
        where: {
          userId: mainAccountUserId,
          mallId: responsibleMalls,
        },
      });

      // 为子账户创建相应的店铺绑定
        const subAccountBindings = parentMallBindings.map((binding) => ({
           userId: Number(subAccount.id),
           accountType: 'sub' as const,
           mallId: binding.mallId,
           mallName: binding.mallName,
         }));

      if (subAccountBindings.length > 0) {
        await UserMallBinding.bulkCreate(subAccountBindings);
      }
    }

    // 记录操作日志
    await UserOperationLog.create({
      userId: mainAccountUserId,
      operationType: 'sub_account_create',
      operationDesc: `创建子账户：${username}`,
      targetType: 'sub_account',
      targetId: Number(subAccount.id),
      requestData: JSON.stringify({
        username,
        responsibleMalls,
      }),
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || '',
      status: 'success',
    } as any);

    // 查询创建的子账户的店铺绑定
    const mallBindings = await UserMallBinding.findAll({
      where: { userId: subAccount.id, accountType: 'sub' },
      attributes: ['mallId', 'mallName'],
    });

    // 返回结果（不包含密码）
    const result = {
      ...formatObjectDates(subAccount.toJSON()),
      responsibleMalls: mallBindings.map((binding) => binding.mallId),
      permissions: JSON.parse((subAccount as any).permissions || '[]'),
    };
    delete (result as any).password;

    return NextResponse.json(
      successResponse(formatObjectDates(result), '子账户创建成功')
    );
  } catch (error) {
    console.error('创建子账户失败:', error);
    return NextResponse.json(errorResponse('创建子账户失败，请稍后重试'), {
      status: 500,
    });
  }
}
