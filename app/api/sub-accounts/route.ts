import { NextRequest, NextResponse } from 'next/server'
import { SubAccount, User, UserOperationLog } from '@/models'
import { verifyToken, successResponse, errorResponse, hashPassword, getClientIP } from '@/lib/utils'

// 获取子账户列表
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

    // 只有主账户可以管理子账户
    if (decoded.type !== 'user') {
      return NextResponse.json(errorResponse('只有主账户可以管理子账户'), { status: 403 })
    }

    const userId = decoded.userId

    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const role = searchParams.get('role')

    // 构建查询条件
    const where: any = { parent_user_id: userId }
    if (status) where.status = status
    if (role) where.role = role

    // 查询子账户列表
    const { count, rows } = await SubAccount.findAndCountAll({
      where,
      attributes: {
        exclude: ['password']
      },
      limit,
      offset: (page - 1) * limit,
      order: [['created_at', 'DESC']],
    })

    // 处理数据
    const processedRows = rows.map((row: any) => ({
      ...row.toJSON(),
      responsible_shops: JSON.parse(row.responsible_shops || '[]'),
      permissions: JSON.parse(row.permissions || '[]'),
    }))

    return NextResponse.json(
      successResponse(
        {
          subAccounts: processedRows,
          pagination: {
            total: count,
            page,
            limit,
            pages: Math.ceil(count / limit),
          },
        },
        '获取子账户列表成功'
      )
    )
  } catch (error) {
    console.error('获取子账户列表失败:', error)
    return NextResponse.json(errorResponse('获取子账户列表失败，请稍后重试'), { status: 500 })
  }
}

// 创建子账户
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

    // 只有主账户可以创建子账户
    if (decoded.type !== 'user') {
      return NextResponse.json(errorResponse('只有主账户可以创建子账户'), { status: 403 })
    }

    const userId = decoded.userId

    const body = await request.json()
    const {
      username,
      password,
      responsible_shops = [],
      role = 'operator',
      permissions = [],
    } = body

    // 验证必填字段
    if (!username || !password) {
      return NextResponse.json(errorResponse('请输入用户名和密码'), { status: 400 })
    }

    // 验证用户名格式
    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(errorResponse('用户名长度应在3-20个字符之间'), { status: 400 })
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(errorResponse('用户名只能包含字母、数字和下划线'), { status: 400 })
    }

    // 验证密码格式
    if (password.length < 6 || password.length > 20) {
      return NextResponse.json(errorResponse('密码长度应在6-20个字符之间'), { status: 400 })
    }

    // 验证角色
    const validRoles = ['admin', 'manager', 'operator']
    if (!validRoles.includes(role)) {
      return NextResponse.json(errorResponse('无效的角色类型'), { status: 400 })
    }

    // 检查用户名是否已存在（主账户和子账户都要检查）
    const existingUser = await User.findOne({ where: { username } })
    if (existingUser) {
      return NextResponse.json(errorResponse('用户名已存在'), { status: 400 })
    }

    const existingSubAccount = await SubAccount.findOne({ where: { username } })
    if (existingSubAccount) {
      return NextResponse.json(errorResponse('用户名已存在'), { status: 400 })
    }

    // 加密密码
    const hashedPassword = await hashPassword(password)

    // 创建子账户
    const subAccount = await SubAccount.create({
      parent_user_id: userId,
      username,
      password: hashedPassword,
      responsible_shops: JSON.stringify(responsible_shops),
      role,
      permissions: JSON.stringify(permissions),
      status: 'active',
    } as any)

    // 记录操作日志
    await UserOperationLog.create({
      user_id: userId,
      operation_type: 'sub_account_create',
      operation_description: `创建子账户：${username}`,
      target_type: 'sub_account',
      target_id: Number(subAccount.id),
      request_data: JSON.stringify({ username, role, responsible_shops, permissions }),
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || '',
      status: 'success',
    } as any)

    // 返回结果（不包含密码）
    const result = {
      ...subAccount.toJSON(),
      responsible_shops: JSON.parse((subAccount as any).responsible_shops || '[]'),
      permissions: JSON.parse((subAccount as any).permissions || '[]'),
    }
    delete (result as any).password

    return NextResponse.json(successResponse(result, '子账户创建成功'))
  } catch (error) {
    console.error('创建子账户失败:', error)
    return NextResponse.json(errorResponse('创建子账户失败，请稍后重试'), { status: 500 })
  }
}