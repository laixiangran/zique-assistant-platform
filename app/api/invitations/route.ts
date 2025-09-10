import { NextRequest, NextResponse } from 'next/server';
import { Invitation, User, UserMallBinding } from '@/models';
import {
  authenticateMainAccount,
  successResponse,
  errorResponse,
  formatObjectDates,
} from '@/lib/utils';

// 强制动态渲染
export const dynamic = 'force-dynamic';

// 获取邀请记录
export async function GET(request: NextRequest) {
  try {
    // 统一身份验证（需要主账户权限）
    const authResult = authenticateMainAccount(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const userId = authResult.user?.userId;
    if (!userId) {
      return NextResponse.json(errorResponse('用户ID不存在'), {
        status: 400,
      });
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const pageIndex = parseInt(searchParams.get('pageIndex') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const status = searchParams.get('status');

    let where: any = { inviter_id: userId };

    if (status) {
      where.status = status;
    }

    // 查询邀请记录
    const { count, rows } = await Invitation.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'invitee',
          attributes: ['username'],
          include: [
            {
              model: UserMallBinding,
              as: 'shopBindings',
              attributes: ['id', 'mallName'],
              required: false, // 左连接，即使没有绑定店铺也要显示用户
            },
          ],
        },
      ],
      limit: pageSize,
      offset: (pageIndex - 1) * pageSize,
      order: [['createdTime', 'DESC']],
    });

    // 用户名加密函数
    const maskUsername = (username: string) => {
      if (!username || username.length <= 2) {
        return username;
      }

      const firstChar = username.charAt(0);
      const lastChar = username.charAt(username.length - 1);
      const middleLength = username.length - 2;
      const maskedMiddle = '*'.repeat(middleLength);

      return firstChar + maskedMiddle + lastChar;
    };

    return NextResponse.json(
      successResponse(
        {
          invitations: rows.map((invitation) => {
            const invitationData: any = formatObjectDates(invitation.toJSON());
            // 对用户名进行加密处理
            if (invitationData.invitee && invitationData.invitee.username) {
              invitationData.invitee.username = maskUsername(
                invitationData.invitee.username
              );
            }
            // 添加店铺绑定状态信息
            if (invitationData.invitee) {
              const shopBindings = invitationData.invitee.shopBindings || [];
              invitationData.invitee.hasShopBinding = shopBindings.length > 0;
              invitationData.invitee.shopCount = shopBindings.length;
              // 移除详细的店铺绑定信息，只保留统计数据
              delete invitationData.invitee.shopBindings;
            }
            return invitationData;
          }),
          pagination: {
            total: count,
            pageIndex,
            pageSize,
            pages: Math.ceil(count / pageSize),
          },
        },
        '获取邀请记录成功'
      )
    );
  } catch (error) {
    console.error('获取邀请记录失败:', error);
    return NextResponse.json(errorResponse('获取邀请记录失败，请稍后重试'), {
      status: 500,
    });
  }
}
