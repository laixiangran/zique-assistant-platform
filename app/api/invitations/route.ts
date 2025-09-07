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

    const userId = authResult.user!.userId;

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
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
      limit,
      offset: (page - 1) * limit,
      order: [['createdTime', 'DESC']],
    });

    return NextResponse.json(
      successResponse(
        {
          invitations: rows,
          pagination: {
            total: count,
            page,
            limit,
            pages: Math.ceil(count / limit),
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

// 生成邀请链接
export async function POST(request: NextRequest) {
  try {
    // 统一身份验证（需要主账户权限）
    const authResult = authenticateMainAccount(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const userId = authResult.user!.userId;

    // 获取用户信息
    const user = await User.findByPk(userId);
    if (!user) {
      return NextResponse.json(errorResponse('用户不存在'), { status: 404 });
    }

    // 生成邀请链接（使用用户的邀请码）
    const invitationCode = (user as any).invitation_code;
    const invitationLink = `${
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    }/login?invitation_code=${invitationCode}`;

    // 记录操作日志
    await UserOperationLog.create({
      user_id: userId,
      operation_type: 'invitation_link_generate',
      operation_description: '生成邀请链接',
      target_type: 'invitation',
      target_id: 0,
      request_data: JSON.stringify({ invitation_code: invitationCode }),
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || '',
      status: 'success',
    } as any);

    return NextResponse.json(
      successResponse(
        {
          invitation_code: invitationCode,
          invitation_link: invitationLink,
        },
        '邀请链接生成成功'
      )
    );
  } catch (error) {
    console.error('生成邀请链接失败:', error);
    return NextResponse.json(errorResponse('生成邀请链接失败，请稍后重试'), {
      status: 500,
    });
  }
}
