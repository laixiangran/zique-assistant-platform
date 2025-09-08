import { NextRequest, NextResponse } from 'next/server';
import {
  UserMallBinding,
  User,
  UserOperationLog,
  UserPackage,
  MembershipPackage,
  InvitationReward,
  Invitation,
} from '@/models';
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

    // 验证店铺绑定配额
    // 获取用户当前有效的套餐
    const userPackage = await UserPackage.findOne({
      where: {
        userId: userId,
        isActive: true,
        expireTime: {
          [require('sequelize').Op.gt]: new Date(),
        },
      },
      include: [
        {
          model: MembershipPackage,
          as: 'package',
        },
      ],
      order: [['expireTime', 'DESC']],
    });

    // 获取用户已领取的邀请奖励（免费店铺类型）
    const invitationRewards = await InvitationReward.findAll({
      where: {
        inviterId: userId,
        rewardType: 'free_malls',
        status: 'granted',
      },
    });

    // 计算邀请奖励的店铺数
    const rewardMallCount = invitationRewards.reduce((total, reward) => {
      return total + Number((reward as any).rewardValue || 0);
    }, 0);

    // 获取套餐的最大绑定店铺数
    const packageMaxBindMall = (userPackage as any)?.package?.maxBindMall || 0;

    // 计算总的可绑定店铺数
    const totalQuota = packageMaxBindMall + rewardMallCount;

    // 获取用户当前已绑定的店铺数
    const currentBindCount = await UserMallBinding.count({
      where: {
        userId: userId,
        accountType: 'main',
      },
    });

    // 检查是否超过配额
    if (currentBindCount >= totalQuota) {
      return NextResponse.json(
        errorResponse(
          '绑定店铺数量已达配额上限，请升级套餐或通过邀请好友获得更多配额'
        ),
        {
          status: 400,
        }
      );
    }

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
      accountType: 'main',
      mallName: mallName,
      mallId: mallId,
    });

    // 检查用户是否有邀请关系，并处理邀请奖励
    const invitation = await Invitation.findOne({
      where: {
        inviteeId: userId,
      },
    });

    if (invitation) {
      // 检查invitation_rewards表中是否已存在该mall_id的记录
      const existingReward = await InvitationReward.findOne({
        where: {
          mallId: mallId,
        },
      });

      // 如果不存在该mall_id的记录，则为邀请者创建奖励记录
      if (!existingReward) {
        await InvitationReward.create({
          inviterId: invitation.inviterId,
          inviteeId: userId,
          mallId: mallId,
          mallName: mallName,
          rewardType: 'free_malls',
          rewardCount: 1,
          usedCount: 0,
          status: 'granted',
        });
      }
    }

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
