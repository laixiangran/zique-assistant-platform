import { NextRequest, NextResponse } from 'next/server';
import { User, SubAccount } from '@/models';
import {
  authenticateRequest,
  successResponse,
  errorResponse,
  formatObjectDates,
} from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    // 统一身份验证
    const authResult = authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const decoded = authResult.user!;

    let userInfo: any = null;

    if (decoded.type === 'user') {
      // 主账户
      const user = await User.findByPk(decoded.userId, {
        attributes: {
          exclude: ['password'],
        },
      });

      if (!user) {
        return NextResponse.json(errorResponse('用户不存在'), { status: 404 });
      }

      if (user.status !== 'active') {
        return NextResponse.json(errorResponse('账户已被禁用'), {
          status: 401,
        });
      }

      userInfo = {
        id: user.id,
        username: user.username,
        phone: user.phone,
        email: user.email,
        inviteCode: user.inviteCode,
        status: user.status,
        createdTime: user.createdTime,
        updatedTime: user.updatedTime,
        accountType: 'main',
      };
    } else if (decoded.type === 'sub_account') {
      // 子账户
      const subAccount = await SubAccount.findByPk(decoded.userId, {
        attributes: {
          exclude: ['password'],
        },
        include: [
          {
            model: User,
            as: 'parentUser',
            attributes: ['id', 'username', 'status'],
          },
        ],
      });

      if (!subAccount) {
        return NextResponse.json(errorResponse('子账户不存在'), {
          status: 404,
        });
      }

      if (subAccount.status !== 'active') {
        return NextResponse.json(errorResponse('子账户已被禁用'), {
          status: 401,
        });
      }

      if ((subAccount as any).parentUser.status !== 'active') {
        return NextResponse.json(errorResponse('主账户已被禁用'), {
          status: 401,
        });
      }

      userInfo = {
        id: subAccount.id,
        username: subAccount.username,
        role: subAccount.role,
        status: subAccount.status,
        createdTime: subAccount.createdTime,
        updatedTime: subAccount.updatedTime,
        accountType: 'sub',
        parentUser: {
          id: (subAccount as any).parentUser.id,
          username: (subAccount as any).parentUser.username,
        },
      };
    } else {
      return NextResponse.json(errorResponse('无效的账户类型'), {
        status: 400,
      });
    }

    return NextResponse.json(
      successResponse(formatObjectDates(userInfo), '获取用户信息成功')
    );
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json(errorResponse('获取用户信息失败，请稍后重试'), {
      status: 500,
    });
  }
}
