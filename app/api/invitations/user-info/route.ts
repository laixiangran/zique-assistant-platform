import { NextRequest, NextResponse } from 'next/server';
import { User, Invitation, InvitationReward } from '../../../../models';
import { authenticateRequest } from '../../../../lib/utils';

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

    const userIdNumber = authResult.user!.userId;

    // 获取用户信息
    const user = await User.findByPk(userIdNumber);
    if (!user) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      );
    }

    // 生成用户邀请码（如果没有的话）
    let invitationCode = user.inviteCode;
    if (!invitationCode) {
      invitationCode = `INV${userIdNumber}${Date.now().toString().slice(-6)}`;
      await user.update({ inviteCode: invitationCode });
    }

    // 统计邀请用户数（从invitations表获取当前用户的邀请记录数）
    const totalInvitees = await Invitation.count({
      where: {
        inviterId: userIdNumber,
      },
    });

    // 统计奖励店铺数量（从invitation_rewards表获取reward_type='free_malls'的reward_count总和）
    const rewardShopCount =
      (await InvitationReward.sum('rewardCount', {
        where: {
          userId: userIdNumber,
          rewardType: 'free_malls',
          status: 'granted',
        },
      })) || 0;

    return NextResponse.json({
      success: true,
      data: {
        invitationCode,
        totalInvitees,
        rewardShopCount,
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
