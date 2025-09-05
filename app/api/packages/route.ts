import { NextRequest, NextResponse } from 'next/server';
import { MembershipPackage } from '@/models';
import {
  authenticateRequest,
  successResponse,
  errorResponse,
  formatObjectDates,
} from '@/lib/utils';

// 获取会员套餐列表
export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const enabled = searchParams.get('enabled');

    // 构建查询条件
    const where: any = {};
    if (enabled !== null) {
      where.is_enabled = enabled === 'true';
    }

    // 查询套餐列表
    const packages = await MembershipPackage.findAll({
      where,
      order: [
        ['sort_order', 'ASC'],
        ['created_at', 'DESC'],
      ],
    });

    // 处理功能字段
    const processedPackages = packages.map((pkg: any) => ({
      ...formatObjectDates(pkg.toJSON()),
      features: JSON.parse(pkg.features || '[]'),
    }));

    return NextResponse.json(
      successResponse(processedPackages, '获取套餐列表成功')
    );
  } catch (error) {
    console.error('获取套餐列表失败:', error);
    return NextResponse.json(errorResponse('获取套餐列表失败，请稍后重试'), {
      status: 500,
    });
  }
}

// 创建会员套餐（管理员功能）
export async function POST(request: NextRequest) {
  try {
    // 统一身份验证
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(errorResponse(authResult.error!), { status: 401 });
    }

    const decoded = authResult.user!;

    // 这里应该检查用户是否为管理员，暂时跳过
    // if (decoded.role !== 'admin') {
    //   return NextResponse.json(errorResponse('权限不足'), { status: 403 })
    // }

    const body = await request.json();
    const {
      name,
      description,
      price,
      duration_months,
      max_shop_count,
      features = [],
      is_enabled = true,
      sort_order = 0,
    } = body;

    // 验证必填字段
    if (!name || price === undefined || !duration_months || !max_shop_count) {
      return NextResponse.json(errorResponse('请填写完整的套餐信息'), {
        status: 400,
      });
    }

    // 验证数据类型
    if (typeof price !== 'number' || price < 0) {
      return NextResponse.json(errorResponse('价格必须为非负数'), {
        status: 400,
      });
    }

    if (typeof duration_months !== 'number' || duration_months <= 0) {
      return NextResponse.json(errorResponse('时长必须为正数'), {
        status: 400,
      });
    }

    if (typeof max_shop_count !== 'number' || max_shop_count <= 0) {
      return NextResponse.json(errorResponse('店铺数量必须为正数'), {
        status: 400,
      });
    }

    // 创建套餐
    const membershipPackage = await MembershipPackage.create({
      name,
      description,
      price,
      duration_months,
      max_shop_count,
      features: JSON.stringify(features),
      is_enabled,
      sort_order,
    } as any);

    return NextResponse.json(
      successResponse(
        {
          ...formatObjectDates(membershipPackage.toJSON()),
          features: JSON.parse((membershipPackage as any).features || '[]'),
        },
        '套餐创建成功'
      )
    );
  } catch (error) {
    console.error('创建套餐失败:', error);
    return NextResponse.json(errorResponse('创建套餐失败，请稍后重试'), {
      status: 500,
    });
  }
}
