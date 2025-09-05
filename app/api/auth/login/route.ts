import { NextRequest, NextResponse } from 'next/server'
import { User, SubAccount, UserOperationLog } from '@/models'
import { comparePassword, generateToken, successResponse, errorResponse, getClientIP } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password, accountType = 'user' } = body

    // 验证必填字段
    if (!username || !password) {
      return NextResponse.json(errorResponse('请输入用户名和密码'), { status: 400 })
    }

    let user: any = null
    let userInfo: any = null
    let tokenPayload: any = null

    if (accountType === 'user') {
      // 主账户登录
      user = await User.findOne({
        where: {
          username,
        },
      })

      if (!user) {
        return NextResponse.json(errorResponse('用户名或密码错误'), { status: 401 })
      }

      // 检查账户状态
      if (user.status !== 'active') {
        return NextResponse.json(errorResponse('账户已被禁用'), { status: 401 })
      }

      // 验证密码
      const isPasswordValid = await comparePassword(password, user.password)
      if (!isPasswordValid) {
        // 记录登录失败日志
        await UserOperationLog.create({
          user_id: user.id,
          operation_type: 'login',
          operation_description: '用户登录失败 - 密码错误',
          ip_address: getClientIP(request),
          user_agent: request.headers.get('user-agent') || '',
          status: 'failed',
        })
        
        return NextResponse.json(errorResponse('用户名或密码错误'), { status: 401 })
      }

      userInfo = {
        id: user.id,
        username: user.username,
        phone: user.phone,
        email: user.email,
        free_shop_count: user.free_shop_count,
        used_shop_count: user.used_shop_count,
        status: user.status,
        created_at: user.created_at,
      }

      tokenPayload = {
        userId: user.id,
        username: user.username,
        type: 'user',
      }
    } else if (accountType === 'sub_account') {
      // 子账户登录
      user = await SubAccount.findOne({
        where: {
          username,
        },
        include: [
          {
            model: User,
            as: 'parentUser',
            attributes: ['id', 'username', 'status'],
          },
        ],
      })

      if (!user) {
        return NextResponse.json(errorResponse('用户名或密码错误'), { status: 401 })
      }

      // 检查子账户状态
      if (user.status !== 'active') {
        return NextResponse.json(errorResponse('子账户已被禁用'), { status: 401 })
      }

      // 检查主账户状态
      if (user.parentUser.status !== 'active') {
        return NextResponse.json(errorResponse('主账户已被禁用'), { status: 401 })
      }

      // 验证密码
      const isPasswordValid = await comparePassword(password, user.password)
      if (!isPasswordValid) {
        // 记录登录失败日志
        await UserOperationLog.create({
          user_id: user.parent_user_id,
          operation_type: 'sub_account_login',
          operation_description: `子账户登录失败 - 密码错误 (${user.username})`,
          ip_address: getClientIP(request),
          user_agent: request.headers.get('user-agent') || '',
          status: 'failed',
        })
        
        return NextResponse.json(errorResponse('用户名或密码错误'), { status: 401 })
      }

      userInfo = {
        id: user.id,
        username: user.username,
        parent_user_id: user.parent_user_id,
        responsible_shops: JSON.parse(user.responsible_shops || '[]'),
        role: user.role,
        permissions: JSON.parse(user.permissions || '[]'),
        status: user.status,
        created_at: user.created_at,
        parentUser: {
          id: user.parentUser.id,
          username: user.parentUser.username,
        },
      }

      tokenPayload = {
        userId: user.id,
        username: user.username,
        type: 'sub_account',
        parentUserId: user.parent_user_id,
        role: user.role,
      }
    } else {
      return NextResponse.json(errorResponse('无效的账户类型'), { status: 400 })
    }

    // 生成JWT token
    const token = generateToken(tokenPayload)

    // 记录登录成功日志
    await UserOperationLog.create({
      user_id: accountType === 'user' ? user.id : user.parent_user_id,
      operation_type: accountType === 'user' ? 'login' : 'sub_account_login',
      operation_description: accountType === 'user' ? '用户登录成功' : `子账户登录成功 (${user.username})`,
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || '',
      status: 'success',
    })

    const response = NextResponse.json(
      successResponse(
        {
          user: userInfo,
          token,
          accountType,
        },
        '登录成功'
      )
    )

    // 设置cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7天
    })

    return response
  } catch (error) {
    console.error('登录失败:', error)
    return NextResponse.json(errorResponse('登录失败，请稍后重试'), { status: 500 })
  }
}