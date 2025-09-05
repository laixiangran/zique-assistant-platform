import { NextRequest, NextResponse } from 'next/server'
import { User, SubAccount } from '@/models'
import { verifyToken, successResponse, errorResponse } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    // 获取token
    const token = request.cookies.get('token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(errorResponse('未登录'), { status: 401 })
    }

    // 验证token
    const decoded = verifyToken(token) as any
    if (!decoded) {
      return NextResponse.json(errorResponse('token无效'), { status: 401 })
    }

    let userInfo: any = null

    if (decoded.type === 'user') {
      // 主账户
      const user = await User.findByPk(decoded.userId, {
        attributes: {
          exclude: ['password']
        }
      })

      if (!user) {
        return NextResponse.json(errorResponse('用户不存在'), { status: 404 })
      }

      if (user.status !== 'active') {
        return NextResponse.json(errorResponse('账户已被禁用'), { status: 401 })
      }

      userInfo = {
        id: user.id,
        username: user.username,
        phone: user.phone,
        email: user.email,
        invitation_code: (user as any).invitation_code,
        inviter_id: (user as any).inviter_id,
        free_shop_count: (user as any).free_shop_count,
        used_shop_count: (user as any).used_shop_count,
        status: user.status,
        created_at: user.created_at,
        updated_at: user.updated_at,
        accountType: 'user',
      }
    } else if (decoded.type === 'sub_account') {
      // 子账户
      const subAccount = await SubAccount.findByPk(decoded.userId, {
        attributes: {
          exclude: ['password']
        },
        include: [
          {
            model: User,
            as: 'parentUser',
            attributes: ['id', 'username', 'status'],
          },
        ],
      })

      if (!subAccount) {
        return NextResponse.json(errorResponse('子账户不存在'), { status: 404 })
      }

      if (subAccount.status !== 'active') {
        return NextResponse.json(errorResponse('子账户已被禁用'), { status: 401 })
      }

      if ((subAccount as any).parentUser.status !== 'active') {
        return NextResponse.json(errorResponse('主账户已被禁用'), { status: 401 })
      }

      userInfo = {
        id: subAccount.id,
        username: subAccount.username,
        parent_user_id: (subAccount as any).parent_user_id,
        responsible_shops: JSON.parse((subAccount as any).responsible_shops || '[]'),
        role: (subAccount as any).role,
        permissions: JSON.parse((subAccount as any).permissions || '[]'),
        status: subAccount.status,
        created_at: subAccount.created_at,
        updated_at: subAccount.updated_at,
        accountType: 'sub_account',
        parentUser: {
          id: (subAccount as any).parentUser.id,
          username: (subAccount as any).parentUser.username,
        },
      }
    } else {
      return NextResponse.json(errorResponse('无效的账户类型'), { status: 400 })
    }

    return NextResponse.json(successResponse(userInfo, '获取用户信息成功'))
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return NextResponse.json(errorResponse('获取用户信息失败，请稍后重试'), { status: 500 })
  }
}