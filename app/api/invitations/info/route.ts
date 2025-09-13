import { NextRequest, NextResponse } from 'next/server';
import { User, Invitation, InvitationReward } from '@/models';
import { authenticateRequest } from '@/lib/utils';

// 强制动态渲染
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 统一身份验证
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error || '身份验证失败' },
        { status: 401 }
      );
    }

    const userId = authResult.user?.userId;

    // 获取用户信息
    const user = await User.findByPk(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      );
    }

    const totalInvitees = await Invitation.count({
      where: {
        inviterId: userId,
      },
    });

    const rewardMallCount =
      (await InvitationReward.sum('rewardCount', {
        where: {
          inviterId: userId,
          rewardType: 'free_malls',
          status: 'granted',
        },
      })) || 0;

    return NextResponse.json({
      success: true,
      data: {
        invitationCode: user.inviteCode,
        totalInvitees,
        rewardMallCount,
      },
    });
  } catch (error) {
    console.error('获取用户邀请信息失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}
