import { NextRequest, NextResponse } from 'next/server'
import { UserMallBinding, User, UserOperationLog } from '@/models'
import { verifyToken, successResponse, errorResponse, getClientIP } from '@/lib/utils'
import { Op } from 'sequelize'

// 获取用户店铺列表
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

    const userId = decoded.type === 'user' ? decoded.userId : decoded.parentUserId

    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const platform = searchParams.get('platform')
    const status = searchParams.get('status')
    const binding_type = searchParams.get('binding_type')

    // 构建查询条件
    const where: any = { user_id: userId }
    if (platform) where.platform = platform
    if (status) where.status = status
    if (binding_type) where.binding_type = binding_type

    // 查询店铺列表
    const { count, rows } = await UserMallBinding.findAndCountAll({
      where,
      limit,
      offset: (page - 1) * limit,
      order: [['created_at', 'DESC']],
    })

    return NextResponse.json(
      successResponse(
        {
          shops: rows,
          pagination: {
            total: count,
            page,
            limit,
            pages: Math.ceil(count / limit),
          },
        },
        '获取店铺列表成功'
      )
    )
  } catch (error) {
    console.error('获取店铺列表失败:', error)
    return NextResponse.json(errorResponse('获取店铺列表失败，请稍后重试'), { status: 500 })
  }
}

// 绑定新店铺
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

    const userId = decoded.type === 'user' ? decoded.userId : decoded.parentUserId

    const body = await request.json()
    const { shop_name, platform, shop_url, shop_id, binding_type = 'free' } = body

    // 验证必填字段
    if (!shop_name || !platform || !shop_url || !shop_id) {
      return NextResponse.json(errorResponse('请填写完整的店铺信息'), { status: 400 })
    }

    // 验证平台类型
    const validPlatforms = ['taobao', 'tmall', 'jd', 'pdd', 'douyin', 'kuaishou', 'other']
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(errorResponse('不支持的平台类型'), { status: 400 })
    }

    // 检查店铺是否已存在
    const existingShop = await UserMallBinding.findOne({
      where: {
        [Op.or]: [
          { shop_url: shop_url },
          { shop_id: shop_id, platform: platform },
        ],
      },
    } as any)

    if (existingShop) {
      return NextResponse.json(errorResponse('该店铺已被绑定'), { status: 400 })
    }

    // 获取用户信息
    const user = await User.findByPk(userId)
    if (!user) {
      return NextResponse.json(errorResponse('用户不存在'), { status: 404 })
    }

    // 检查免费店铺数量限制
    if (binding_type === 'free') {
      const currentShopCount = await UserMallBinding.count({
        where: {
          user_id: userId,
          binding_type: 'free',
          status: 'active',
        },
      })

      if (currentShopCount >= (user as any).free_shop_count) {
        return NextResponse.json(
          errorResponse(`免费店铺数量已达上限（${(user as any).free_shop_count}个），请升级套餐或绑定付费店铺`),
          { status: 400 }
        )
      }
    }

    // 创建店铺绑定
    const shopBinding = await UserMallBinding.create({
      user_id: userId,
      shop_name,
      shop_url,
      shop_id,
      binding_type,
      status: 'active',
    } as any)

    // 更新用户已使用店铺数量
    if (binding_type === 'free') {
      await User.update(
        { used_shop_count: (user as any).used_shop_count + 1 },
        { where: { id: userId } }
      )
    }

    // 记录操作日志
    await UserOperationLog.create({
      user_id: userId,
      operation_type: 'shop_binding',
      operation_description: `绑定店铺：${shop_name} (${platform})`,
      target_type: 'shop',
      target_id: Number(shopBinding.id),
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || '',
      status: 'success',
    } as any)

    return NextResponse.json(successResponse(shopBinding, '店铺绑定成功'))
  } catch (error) {
    console.error('店铺绑定失败:', error)
    return NextResponse.json(errorResponse('店铺绑定失败，请稍后重试'), { status: 500 })
  }
}