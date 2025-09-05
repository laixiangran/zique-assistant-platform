import { NextRequest, NextResponse } from 'next/server'
import { Invitation, InvitationReward, User, UserOperationLog } from '@/models'
import { verifyToken, successResponse, errorResponse, getClientIP } from '@/lib/utils'
import { Op } from 'sequelize'

// 获取邀请记录
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

    // 只有主账户可以查看邀请记录
    if (decoded.type !== 'user') {
      return NextResponse.json(errorResponse('只有主账户可以查看邀请记录'), { status: 403 })
    }

    const userId = decoded.userId

    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const type = searchParams.get('type') // 'sent' | 'received'

    let where: any = {}
    
    if (type === 'sent') {
      // 我发出的邀请
      where.inviter_id = userId
    } else if (type === 'received') {
      // 我收到的邀请（实际上是我通过别人的邀请码注册）
      where.invitee_id = userId
    } else {
      // 默认显示我发出的邀请
      where.inviter_id = userId
    }

    if (status) {
      where.status = status
    }

    // 查询邀请记录
    const { count, rows } = await Invitation.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'inviter',
          attributes: ['id', 'username', 'phone', 'email'],
        },
        {
          model: User,
          as: 'invitee',
          attributes: ['id', 'username', 'phone', 'email'],
        },
      ],
      limit,
      offset: (page - 1) * limit,
      order: [['created_at', 'DESC']],
    })

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
    )
  } catch (error) {
    console.error('获取邀请记录失败:', error)
    return NextResponse.json(errorResponse('获取邀请记录失败，请稍后重试'), { status: 500 })
  }
}

// 生成邀请链接
export async function POST(request: NextRequest) {
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

    // 只有主账户可以生成邀请链接
    if (decoded.type !== 'user') {
      return NextResponse.json(errorResponse('只有主账户可以生成邀请链接'), { status: 403 })
    }

    const userId = decoded.userId

    // 获取用户信息
    const user = await User.findByPk(userId)
    if (!user) {
      return NextResponse.json(errorResponse('用户不存在'), { status: 404 })
    }

    // 生成邀请链接（使用用户的邀请码）
    const invitationCode = (user as any).invitation_code
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login?invitation_code=${invitationCode}`

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
    } as any)

    return NextResponse.json(
      successResponse(
        {
          invitation_code: invitationCode,
          invitation_link: invitationLink,
        },
        '邀请链接生成成功'
      )
    )
  } catch (error) {
    console.error('生成邀请链接失败:', error)
    return NextResponse.json(errorResponse('生成邀请链接失败，请稍后重试'), { status: 500 })
  }
}