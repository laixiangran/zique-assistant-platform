import { NextRequest, NextResponse } from 'next/server';
import { UserMallBinding, User, UserOperationLog } from '@/models';
import {
  authenticateRequest,
  successResponse,
  errorResponse,
  getClientIP,
  formatObjectDates,
} from '@/lib/utils';

// 获取用户店铺列表
export async function GET(request: NextRequest) {
  try {
    // 统一身份验证
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(errorResponse(authResult.error!), {
        status: 401,
      });
    }

    const userId = authResult.user?.userId;

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const pageIndex = parseInt(searchParams.get('pageIndex') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const mallName = searchParams.get('mallName');

    // 构建查询条件
    const where: any = { userId: userId };

    if (mallName) {
      where.mallName = mallName;
    }

    // 查询店铺列表
    const { count, rows } = await UserMallBinding.findAndCountAll({
      where,
      limit: pageSize,
      offset: (pageIndex - 1) * pageSize,
      order: [['createdTime', 'DESC']],
    });
    return NextResponse.json(
      successResponse(
        {
          malls: formatObjectDates(rows.map((row) => row.dataValues)),
          pagination: {
            total: count,
            pageIndex,
            pageSize,
            pages: Math.ceil(count / pageSize),
          },
        },
        '获取店铺列表成功'
      )
    );
  } catch (error) {
    console.error('获取店铺列表失败:', error);
    return NextResponse.json(errorResponse('获取店铺列表失败，请稍后重试'), {
      status: 500,
    });
  }
}

// 绑定新店铺
export async function POST(request: NextRequest) {
  try {
    // 统一身份验证
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(errorResponse(authResult.error!), {
        status: 401,
      });
    }

    const userId = authResult.user?.userId!;

    // TODO: 查询已绑定的店铺数是否超过限制（从套餐和邀请奖励中统计总共可绑定的店铺数）
    // 查询当前用户已绑定的店铺数
    // 查询当前套餐的最大可绑定店铺数以及邀请获得的奖励数
    // 如果已绑定店铺数 >= 最大可绑定店铺数 + 奖励数，则返回错误
    // return NextResponse.json(errorResponse('绑定店铺数量已超出限制'), {
    //   status: 500,
    // });

    const body = await request.json();
    const { mallId, mallName } = body;

    // 验证必填字段
    if (!mallId || !mallName) {
      return NextResponse.json(errorResponse('请填写完整的店铺信息'), {
        status: 400,
      });
    }

    // 检查店铺是否已存在
    const existingMall = await UserMallBinding.findOne({
      where: {
        mallId,
      },
    });

    if (existingMall) {
      return NextResponse.json(errorResponse('该店铺已被绑定'), {
        status: 400,
      });
    }

    // 获取用户信息
    const user = await User.findByPk(userId);
    if (!user) {
      return NextResponse.json(errorResponse('用户不存在'), { status: 404 });
    }

    // 创建店铺绑定
    const mallBinding = await UserMallBinding.create({
      userId: userId,
      mallName: mallName,
      mallId: mallId,
    });

    // 记录操作日志
    await UserOperationLog.create({
      userId: userId,
      operationType: 'mall_binding',
      operationDesc: `绑定店铺：${mallId} (${mallName})`,
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || '',
    });

    return NextResponse.json(
      successResponse(formatObjectDates(mallBinding), '店铺绑定成功')
    );
  } catch (error) {
    console.error('店铺绑定失败:', error);
    return NextResponse.json(errorResponse('店铺绑定失败，请稍后重试'), {
      status: 500,
    });
  }
}

// 删除店铺绑定
export async function DELETE(request: NextRequest) {
  try {
    // 统一身份验证
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(errorResponse(authResult.error!), {
        status: 401,
      });
    }

    const userId = authResult.user?.userId!;

    // 获取要删除的店铺ID
    const { searchParams } = new URL(request.url);
    const mallId = searchParams.get('id');

    if (!mallId) {
      return NextResponse.json(errorResponse('店铺ID不能为空'), {
        status: 400,
      });
    }

    // 查找店铺绑定记录
    const shopBinding = await UserMallBinding.findOne({
      where: {
        id: mallId,
        userId: userId,
      },
    });

    if (!shopBinding) {
      return NextResponse.json(errorResponse('店铺不存在或无权限删除'), {
        status: 404,
      });
    }

    // 删除店铺绑定
    await shopBinding.destroy();

    // 记录操作日志
    await UserOperationLog.create({
      userId,
      operationType: 'mall_unbinding',
      operationDesc: `删除店铺：${shopBinding.mallName}`,
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || '',
    } as any);

    return NextResponse.json(successResponse(null, '店铺删除成功'));
  } catch (error) {
    console.error('店铺删除失败:', error);
    return NextResponse.json(errorResponse('店铺删除失败，请稍后重试'), {
      status: 500,
    });
  }
}
