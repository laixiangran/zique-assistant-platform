import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'

// JWT相关函数
export const JWT_SECRET = process.env.JWT_SECRET || 'zique-assistant-secret-key'

export interface JWTPayload {
  userId: number
  username: string
  type: 'user' | 'sub_account'
  iat?: number
  exp?: number
}

// 生成JWT token
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

// 验证JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch (error) {
    return null
  }
}

// 从请求中获取用户信息
export function getUserFromRequest(request: NextRequest): JWTPayload | null {
  const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                request.cookies.get('token')?.value
  
  if (!token) return null
  
  return verifyToken(token)
}

// 密码相关函数
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// 生成邀请码
export function generateInvitationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// 生成订单号
export function generateOrderNo(): string {
  const timestamp = Date.now().toString()
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `ZQ${timestamp}${random}`
}

// 验证手机号
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/
  return phoneRegex.test(phone)
}

// 验证邮箱
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 验证密码强度
export function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 6) {
    return { valid: false, message: '密码长度至少6位' }
  }
  if (password.length > 20) {
    return { valid: false, message: '密码长度不能超过20位' }
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: '密码必须包含字母' }
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: '密码必须包含数字' }
  }
  return { valid: true, message: '密码格式正确' }
}

// API响应格式化
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message: string
  code?: number
}

export function successResponse<T>(data: T, message = '操作成功'): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  }
}

export function errorResponse(message: string, code = 400): ApiResponse {
  return {
    success: false,
    message,
    code,
  }
}

// 获取客户端IP
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  return 'unknown'
}