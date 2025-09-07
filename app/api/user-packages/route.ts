import { NextRequest, NextResponse } from 'next/server';
import {
  UserPackage,
  MembershipPackage,
  User,
  UserOperationLog,
} from '@/models';
import {
  authenticateRequest,
  successResponse,
  errorResponse,
  generateOrderNo,
  getClientIP,
  formatObjectDates,
} from '@/lib/utils';

// 获取用户套餐订购记录
export async function GET(request: NextRequest) {
  try {
    // 统一身份验证
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(errorResponse(authResult.error!), {
        status: 401,
      });
    }

    const userId = authResult.user?.userId!;

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    // 构建查询条件
    const where: any = { userId: userId };
    if (status) where.status = status;

    // 查询用户套餐记录
    const { count, rows } = await UserPackage.findAndCountAll({
      where,
      include: [
        {
          model: MembershipPackage,
          as: 'package',
        },
      ],
      limit,
      offset: (page - 1) * limit,
      order: [['createdTime', 'DESC']],
    });

    // 处理数据
    const processedRows = rows.map((row: any) => ({
      ...formatObjectDates(row.toJSON()),
      package: row.package
        ? {
            ...formatObjectDates(row.package.toJSON()),
            features: JSON.parse(row.package.features || '[]'),
          }
        : null,
    }));

    return NextResponse.json(
      successResponse(
        {
          userPackages: processedRows,
          pagination: {
            total: count,
            page,
            limit,
            pages: Math.ceil(count / limit),
          },
        },
        '获取用户套餐记录成功'
      )
    );
  } catch (error) {
    console.error('获取用户套餐记录失败:', error);
    return NextResponse.json(
      errorResponse('获取用户套餐记录失败，请稍后重试'),
      { status: 500 }
    );
  }
}

// 订购套餐
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

    const body = await request.json();
    const { package_id, payment_method = 'alipay' } = body;

    // 验证必填字段
    if (!package_id) {
      return NextResponse.json(errorResponse('请选择套餐'), { status: 400 });
    }

    // 获取套餐信息
    const membershipPackage = await MembershipPackage.findByPk(package_id);
    if (!membershipPackage) {
      return NextResponse.json(errorResponse('套餐不存在'), { status: 404 });
    }

    if (!(membershipPackage as any).is_enabled) {
      return NextResponse.json(errorResponse('套餐已下架'), { status: 400 });
    }

    // 获取用户信息
    const user = await User.findByPk(userId);
    if (!user) {
      return NextResponse.json(errorResponse('用户不存在'), { status: 404 });
    }

    // 生成订单号
    const orderNumber = generateOrderNo();

    // 计算套餐时间
    const startTime = new Date();
    const endTime = new Date();
    endTime.setMonth(
      endTime.getMonth() + (membershipPackage as any).durationMonths
    );
    // 设置到期时间为当天的23:59:59
    endTime.setHours(23, 59, 59, 999);

    // 创建用户套餐订单
    const userPackage = await UserPackage.create({
      userId: userId,
      packageId: package_id,
      orderTime: startTime,
      expireTime: endTime,
      isActive: true,
    });

    // 记录操作日志
    await UserOperationLog.create({
      user_id: userId,
      operation_type: 'package_purchase',
      operation_description: `订购套餐：${(membershipPackage as any).name}`,
      target_type: 'package',
      target_id: Number(userPackage.id),
      request_data: JSON.stringify({ package_id, payment_method }),
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || '',
      status: 'success',
    } as any);

    return NextResponse.json(
      successResponse(
        {
          ...formatObjectDates(userPackage.toJSON()),
          package: {
            ...formatObjectDates((membershipPackage as any).toJSON()),
            features: JSON.parse((membershipPackage as any).features || '[]'),
          },
        },
        '套餐订购成功，请完成支付'
      )
    );
  } catch (error) {
    console.error('订购套餐失败:', error);
    return NextResponse.json(errorResponse('订购套餐失败，请稍后重试'), {
      status: 500,
    });
  }
}
