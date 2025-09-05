import { NextRequest, NextResponse } from 'next/server'
import { UserOperationLog } from '@/models'
import { verifyToken, successResponse, errorResponse, getClientIP } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    // 获取token
    const token = request.cookies.get('token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')

    if (token) {
      try {
        // 验证token并获取用户信息
        const decoded = verifyToken(token) as any
        
        if (decoded) {
          // 记录登出日志
          await UserOperationLog.create({
            user_id: decoded.type === 'user' ? decoded.userId : decoded.parentUserId,
            operation_type: decoded.type === 'user' ? 'logout' : 'sub_account_logout',
            operation_description: decoded.type === 'user' ? '用户登出' : `子账户登出 (${decoded.username})`,
            ip_address: getClientIP(request),
            user_agent: request.headers.get('user-agent') || '',
            status: 'success',
          })
        }
      } catch (error) {
        // token无效，但仍然清除cookie
        console.log('登出时token验证失败:', error)
      }
    }

    const response = NextResponse.json(successResponse(null, '登出成功'))

    // 清除cookie
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // 立即过期
    })

    return response
  } catch (error) {
    console.error('登出失败:', error)
    return NextResponse.json(errorResponse('登出失败，请稍后重试'), { status: 500 })
  }
}