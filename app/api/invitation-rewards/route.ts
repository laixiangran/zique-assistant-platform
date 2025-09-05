import { NextRequest, NextResponse } from 'next/server'
import { InvitationReward, User, UserOperationLog } from '@/models'
import { verifyToken, successResponse, errorResponse, getClientIP } from '@/lib/utils'

// 获取邀请奖励记录
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

    // 只有主账户可以查看邀请奖励记录
    if (decoded.type !== 'user') {
      return NextResponse.json(errorResponse('只有主账户可以查看邀请奖励记录'), { status: 403 })
    }

    const userId = decoded.userId

    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const rewardType = searchParams.get('reward_type')

    // 构建查询条件
    const where: any = { user_id: userId }
    if (status) where.status = status
    if (rewardType) where.reward_type = rewardType

    // 查询邀请奖励记录
    const { count, rows } = await InvitationReward.findAndCountAll({
      where,
      include: [
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

    // 计算统计数据
    const totalRewards = await InvitationReward.count({
      where: { user_id: userId } as any,
    })

    const claimedRewards = await InvitationReward.count({
      where: { user_id: userId, status: 'claimed' } as any,
    })

    const pendingRewards = await InvitationReward.count({
      where: { user_id: userId, status: 'pending' } as any,
    })

    return NextResponse.json(
      successResponse(
        {
          rewards: rows,
          pagination: {
            total: count,
            page,
            limit,
            pages: Math.ceil(count / limit),
          },
          stats: {
            total: totalRewards,
            claimed: claimedRewards,
            pending: pendingRewards,
          },
        },
        '获取邀请奖励记录成功'
      )
    )
  } catch (error) {
    console.error('获取邀请奖励记录失败:', error)
    return NextResponse.json(errorResponse('获取邀请奖励记录失败，请稍后重试'), { status: 500 })
  }
}

// 领取邀请奖励
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

    // 只有主账户可以领取邀请奖励
    if (decoded.type !== 'user') {
      return NextResponse.json(errorResponse('只有主账户可以领取邀请奖励'), { status: 403 })
    }

    const userId = decoded.userId
    const body = await request.json()
    const { reward_id } = body

    if (!reward_id) {
      return NextResponse.json(errorResponse('请提供奖励ID'), { status: 400 })
    }

    // 查询奖励记录
    const reward = await InvitationReward.findOne({
      where: {
        id: reward_id,
        user_id: userId,
        status: 'pending',
      } as any,
    })

    if (!reward) {
      return NextResponse.json(errorResponse('奖励不存在或已领取'), { status: 404 })
    }

    // 更新奖励状态
    await reward.update({
      status: 'claimed',
      claimed_at: new Date(),
    } as any)

    // 根据奖励类型处理奖励
    const user = await User.findByPk(userId)
    if (!user) {
      return NextResponse.json(errorResponse('用户不存在'), { status: 404 })
    }

    if ((reward as any).reward_type === 'free_shop') {
      // 增加免费店铺数量
      const currentFreeShopCount = (user as any).free_shop_count || 0
      const rewardValue = (reward as any).reward_value || 1
      
      await user.update({
        free_shop_count: currentFreeShopCount + rewardValue,
      } as any)
    }

    // 记录操作日志
    await UserOperationLog.create({
      user_id: userId,
      operation_type: 'invitation_reward_claim',
      operation_description: `领取邀请奖励：${(reward as any).reward_type}`,
      target_type: 'invitation_reward',
      target_id: Number(reward_id),
      request_data: JSON.stringify({ reward_id, reward_type: (reward as any).reward_type, reward_value: (reward as any).reward_value }),
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || '',
      status: 'success',
    } as any)

    return NextResponse.json(successResponse(reward, '奖励领取成功'))
  } catch (error) {
    console.error('领取邀请奖励失败:', error)
    return NextResponse.json(errorResponse('领取邀请奖励失败，请稍后重试'), { status: 500 })
  }
}