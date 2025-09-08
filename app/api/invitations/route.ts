import { NextRequest, NextResponse } from 'next/server';
import { Invitation, User, UserOperationLog } from '@/models';
import {
  authenticateMainAccount,
  successResponse,
  errorResponse,
  getClientIP,
  formatObjectDates,
} from '@/lib/utils';

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
        },
      ],
      limit: pageSize,
      offset: (pageIndex - 1) * pageSize,
      order: [['createdTime', 'DESC']],
    });

    return NextResponse.json(
      successResponse(
        {
          invitations: rows.map((invitation) => {
            return formatObjectDates(invitation.toJSON());
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
