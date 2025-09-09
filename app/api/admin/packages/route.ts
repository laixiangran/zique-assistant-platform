import { NextRequest, NextResponse } from 'next/server';
import { MembershipPackage } from '@/models';
import {
  authenticateRequest,
  successResponse,
  errorResponse,
  formatObjectDates,
} from '@/lib/utils';
import { getAdminFromRequest } from '@/lib/admin-auth';

// 获取会员套餐列表
export async function GET(request: NextRequest) {
  try {
    // 管理员身份验证
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(errorResponse('未授权访问'), {
        status: 401,
      });
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const pageIndex = parseInt(searchParams.get('pageIndex') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('search');
    const packageType = searchParams.get('packageType');

    // 构建查询条件
    const where: any = {};
    if (search) {
      where.packageName = { [require('sequelize').Op.like]: `%${search}%` };
    }
    if (packageType) {
      where.packageType = packageType;
    }

    // 查询套餐列表
    const { count, rows } = await MembershipPackage.findAndCountAll({
      where,
      limit: pageSize,
      offset: (pageIndex - 1) * pageSize,
      order: [['createdTime', 'DESC']],
    });

    // 处理数据
    const processedPackages = rows.map((pkg: any) => 
      formatObjectDates(pkg.toJSON())
    );

    return NextResponse.json(
      successResponse({
        list: processedPackages,
        total: count,
        pageIndex,
        pageSize,
      }, '获取套餐列表成功')
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
    // 管理员身份验证
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(errorResponse('未授权访问'), {
        status: 401,
      });
    }

    const body = await request.json();
    const {
      packageName,
      packageDesc,
      packageType = 'official',
      originalPrice,
      durationMonths,
      maxBindMall,
      discountPercent,
      discountStartTime,
      discountEndTime,
      isActive = true,
    } = body;

    // 验证必填字段
    if (!packageName || originalPrice === undefined || !durationMonths || !maxBindMall) {
      return NextResponse.json(errorResponse('请填写完整的套餐信息'), {
        status: 400,
      });
    }

    // 验证数据类型
    if (typeof originalPrice !== 'number' || originalPrice < 0) {
      return NextResponse.json(errorResponse('价格必须为非负数'), {
        status: 400,
      });
    }

    if (typeof durationMonths !== 'number' || durationMonths <= 0) {
      return NextResponse.json(errorResponse('时长必须为正数'), {
        status: 400,
      });
    }

    if (typeof maxBindMall !== 'number' || maxBindMall <= 0) {
      return NextResponse.json(errorResponse('店铺数量必须为正数'), {
        status: 400,
      });
    }

    // 验证试用套餐唯一性
    if (packageType === 'trial') {
      const existingTrialPackage = await MembershipPackage.findOne({
        where: { packageType: 'trial' }
      });
      if (existingTrialPackage) {
        return NextResponse.json(errorResponse('试用套餐只能存在一个，请先删除现有试用套餐'), {
          status: 400,
        });
      }
    }

    // 创建套餐
    const membershipPackage = await MembershipPackage.create({
      packageName,
      packageDesc,
      packageType,
      originalPrice,
      durationMonths,
      maxBindMall,
      discountPercent,
      discountStartTime: discountStartTime ? new Date(discountStartTime) : undefined,
       discountEndTime: discountEndTime ? new Date(discountEndTime) : undefined,
      isActive,
      createdTime: new Date(),
      updatedTime: new Date(),
    } as any);

    return NextResponse.json(
      successResponse(
        formatObjectDates(membershipPackage.toJSON()),
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

// 更新会员套餐（管理员功能）
export async function PUT(request: NextRequest) {
  try {
    // 管理员身份验证
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(errorResponse('未授权访问'), {
        status: 401,
      });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(errorResponse('缺少套餐ID'), {
        status: 400,
      });
    }

    const body = await request.json();
    const {
      packageName,
      packageDesc,
      packageType,
      originalPrice,
      durationMonths,
      maxBindMall,
      discountPercent,
      discountStartTime,
      discountEndTime,
      isActive,
    } = body;

    // 查找套餐
    const membershipPackage = await MembershipPackage.findByPk(id);
    if (!membershipPackage) {
      return NextResponse.json(errorResponse('套餐不存在'), {
        status: 404,
      });
    }

    // 验证必填字段
    if (!packageName || originalPrice === undefined || !durationMonths || !maxBindMall) {
      return NextResponse.json(errorResponse('请填写完整的套餐信息'), {
        status: 400,
      });
    }

    // 验证试用套餐唯一性
    if (packageType === 'trial') {
      const existingTrialPackage = await MembershipPackage.findOne({
        where: { 
          packageType: 'trial',
          id: { [require('sequelize').Op.ne]: id } // 排除当前套餐
        }
      });
      if (existingTrialPackage) {
        return NextResponse.json(errorResponse('试用套餐只能存在一个，请先删除现有试用套餐'), {
          status: 400,
        });
      }
    }

    // 更新套餐
    await membershipPackage.update({
      packageName,
      packageDesc,
      packageType,
      originalPrice,
      durationMonths,
      maxBindMall,
      discountPercent,
      discountStartTime: discountStartTime ? new Date(discountStartTime) : undefined,
       discountEndTime: discountEndTime ? new Date(discountEndTime) : undefined,
      isActive,
      updatedTime: new Date(),
    });

    return NextResponse.json(
      successResponse(
        formatObjectDates(membershipPackage.toJSON()),
        '套餐更新成功'
      )
    );
  } catch (error) {
    console.error('更新套餐失败:', error);
    return NextResponse.json(errorResponse('更新套餐失败，请稍后重试'), {
      status: 500,
    });
  }
}

// 删除会员套餐（管理员功能）
export async function DELETE(request: NextRequest) {
  try {
    // 管理员身份验证
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(errorResponse('未授权访问'), {
        status: 401,
      });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(errorResponse('缺少套餐ID'), {
        status: 400,
      });
    }

    // 查找套餐
    const membershipPackage = await MembershipPackage.findByPk(id);
    if (!membershipPackage) {
      return NextResponse.json(errorResponse('套餐不存在'), {
        status: 404,
      });
    }

    // 删除套餐
    await membershipPackage.destroy();

    return NextResponse.json(
      successResponse(null, '套餐删除成功')
    );
  } catch (error) {
    console.error('删除套餐失败:', error);
    return NextResponse.json(errorResponse('删除套餐失败，请稍后重试'), {
      status: 500,
    });
  }
}
