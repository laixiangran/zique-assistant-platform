import { NextRequest, NextResponse } from 'next/server';
import {
  UserPackage,
  MembershipPackage,
  InvitationReward,
  UserMallBinding,
} from '@/models';
import {
  authenticateRequest,
  successResponse,
  errorResponse,
} from '@/lib/utils';

// 获取用户店铺绑定配额信息
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

    // 查询邀请奖励中的免费店铺数
    const invitationRewards = await InvitationReward.findAll({
      where: {
        status: 'granted',
        userId: userId,
        rewardType: 'free_malls',
      },
    });

    // 计算邀请奖励的店铺数
    const rewardMallCount = invitationRewards.reduce((total, reward) => {
      return total + Number(reward.rewardCount || 0);
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

    // 计算剩余可绑定数
    const remainingQuota = Math.max(0, totalQuota - currentBindCount);

    const quotaInfo = {
      totalQuota, // 总配额
      currentBindCount, // 当前已绑定数
      remainingQuota, // 剩余可绑定数
      packageQuota: packageMaxBindMall, // 套餐配额
      rewardQuota: rewardMallCount, // 奖励配额
      canBind: remainingQuota > 0, // 是否可以绑定
      packageInfo: userPackage
        ? {
            id: userPackage.id,
            packageName: (userPackage as any).package?.packageName,
            expireTime: userPackage.expireTime,
          }
        : null,
    };

    return NextResponse.json(
      successResponse(quotaInfo, '获取店铺配额信息成功')
    );
  } catch (error) {
    console.error('获取店铺配额信息失败:', error);
    return NextResponse.json(
      errorResponse('获取店铺配额信息失败，请稍后重试'),
      { status: 500 }
    );
  }
}
