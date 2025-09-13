import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// JWT相关函数
export const JWT_SECRET =
  process.env.JWT_SECRET || 'zique-assistant-secret-key';

export interface JWTPayload {
  userId: number;
  username: string;
  type: 'main' | 'sub';
  iat?: number;
  exp?: number;
}

export interface AdminJWTPayload {
  adminId: number;
  username: string;
  role: 'super_admin' | 'admin';
  type: 'admin';
  iat?: number;
  exp?: number;
}

// 生成JWT token
export function generateToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>
): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// 生成管理员JWT token
export function generateAdminToken(
  payload: Omit<AdminJWTPayload, 'iat' | 'exp'>
): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// 验证JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

// 验证管理员JWT token
export function verifyAdminToken(token: string): AdminJWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AdminJWTPayload;
    return decoded.type === 'admin' ? decoded : null;
  } catch (error) {
    return null;
  }
}

// 从请求中获取用户信息
export function getUserFromRequest(request: NextRequest): JWTPayload | null {
  const token =
    request.headers.get('authorization')?.replace('Bearer ', '') ||
    request.cookies.get('token')?.value;

  if (!token) return null;

  return verifyToken(token);
}

// 统一身份验证中间件
export interface AuthResult {
  success: boolean;
  error?: string;
  user?: JWTPayload;
  response?: NextResponse;
}

export interface AdminAuthResult {
  success: boolean;
  error?: string;
  admin?: AdminJWTPayload;
  response?: NextResponse;
}

export function authenticateRequest(request: NextRequest): AuthResult {
  // 获取token
  const token =
    request.cookies.get('token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return {
      success: false,
      response: NextResponse.json(errorResponse('未登录'), { status: 401 }),
    };
  }

  // 验证token
  const decoded = verifyToken(token) as JWTPayload;
  if (!decoded) {
    return {
      success: false,
      response: NextResponse.json(errorResponse('token无效'), { status: 401 }),
    };
  }

  return {
    success: true,
    user: decoded,
  };
}

// 需要主账户权限的验证
export function authenticateMainAccount(request: NextRequest): AuthResult {
  const authResult = authenticateRequest(request);

  if (!authResult.success) {
    return authResult;
  }

  if (authResult.user!.type !== 'main') {
    return {
      success: false,
      response: NextResponse.json(errorResponse('只有主账户可以执行此操作'), {
        status: 403,
      }),
    };
  }

  return authResult;
}

// 管理员身份验证
export function authenticateAdmin(request: NextRequest): AdminAuthResult {
  // 获取token
  const token =
    request.cookies.get('admin_token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return {
      success: false,
      response: NextResponse.json(errorResponse('管理员未登录'), {
        status: 401,
      }),
    };
  }

  // 验证token
  const decoded = verifyAdminToken(token);
  if (!decoded) {
    return {
      success: false,
      response: NextResponse.json(errorResponse('管理员token无效'), {
        status: 401,
      }),
    };
  }

  return {
    success: true,
    admin: decoded,
  };
}

// 验证管理员插件管理权限
export function authenticateAdminPluginPermission(
  request: NextRequest
): AdminAuthResult {
  const authResult = authenticateAdmin(request);

  if (!authResult.success) {
    return authResult;
  }

  const admin = authResult.admin!;

  // 只检查管理员角色
  if (admin.role !== 'super_admin' && admin.role !== 'admin') {
    return {
      success: false,
      response: NextResponse.json(errorResponse('没有插件管理权限'), {
        status: 403,
      }),
    };
  }

  return authResult;
}

// 获取用户ID（主账户返回自己的ID，子账户返回父账户ID）
export function getUserId(user: JWTPayload): number {
  return user.userId;
}

// 密码相关函数
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// 生成邀请码
export function generateInvitationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 生成随机密码
export function generateRandomPassword(): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 生成订单号
export function generateOrderNo(): string {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `ZQ${timestamp}${random}`;
}

// 验证手机号
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

// 验证邮箱
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 验证密码强度
export function validatePassword(password: string): {
  valid: boolean;
  message: string;
} {
  if (password.length < 6) {
    return { valid: false, message: '密码长度至少6位' };
  }
  if (password.length > 20) {
    return { valid: false, message: '密码长度不能超过20位' };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: '密码必须包含字母' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: '密码必须包含数字' };
  }
  return { valid: true, message: '密码格式正确' };
}

// API响应格式化
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  code?: number;
}

export function successResponse<T>(
  data: T,
  message = '操作成功'
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

export function errorResponse(message: string, code = 400): ApiResponse {
  return {
    success: false,
    message,
    code,
  };
}

// 获取客户端IP
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  return 'unknown';
}

// 格式化日期为 yyyy-MM-DD HH:mm:ss 格式
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '';

  try {
    // 使用dayjs格式化日期
    return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
  } catch (error) {
    return '';
  }
}

// 递归格式化对象中的所有日期字段
export function formatObjectDates<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Date) {
    return formatDateTime(obj) as unknown as T;
  }

  if (typeof obj === 'object') {
    if (Array.isArray(obj)) {
      return obj.map((item) => formatObjectDates(item)) as unknown as T;
    }

    const formattedObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = (obj as any)[key];
        if (value instanceof Date) {
          formattedObj[key] = formatDateTime(value);
        } else if (typeof value === 'object' && value !== null) {
          formattedObj[key] = formatObjectDates(value);
        } else {
          formattedObj[key] = value;
        }
      }
    }
    return formattedObj as T;
  }

  return obj;
}

// 封装的postMessage通信方法
export function sendMessageToPlugin(
  messageType: string,
  data?: any
): Promise<any> {
  return new Promise((resolve) => {
    const requestId = messageType + '_' + Date.now().toString();

    // 设置超时
    const timeout = setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      resolve({
        success: false,
        errorCode: 0,
        errorMsg: '插件通信超时，请检查是否已安装插件！',
      });
    }, 3000);

    // 消息处理器
    const messageHandler = (event: MessageEvent) => {
      const {
        type,
        source,
        requestId: currRequestId,
        data = {},
      } = event?.data || {};
      if (
        source === 'zique-assistant' &&
        requestId === currRequestId &&
        type === `${messageType}_RESPONSE`
      ) {
        clearTimeout(timeout);
        window.removeEventListener('message', messageHandler);
        resolve(data);
      }
    };

    // 添加事件监听器
    window.addEventListener('message', messageHandler);

    // 发送消息
    window.postMessage(
      {
        type: messageType,
        source: 'zique-platform',
        requestId,
        data,
      },
      '*'
    );
  });
}

export function USDToCNY(amount: any) {
  const rate = 7;
  return amount * rate;
}

export function isEmptyValue(value: any) {
  return value === null || value === undefined || value === '';
}

/**
 * 格式化金额
 * @param {*} amount
 * @param {*} currency
 * @returns
 */
export function formatAmount(amount: any, currency = '¥') {
  if (currency === 'CNY') {
    currency = '¥';
  } else if (currency === 'USD') {
    currency = '$';
  }
  return !isEmptyValue(amount)
    ? `${currency}${parseFloat(amount).toFixed(2)}`
    : '-';
}

/**
 * 格式化数量
 * @param {*} volume
 * @returns
 */
export function formatVolume(volume: any) {
  return !isEmptyValue(volume) ? volume : '-';
}

/**
 * 格式化百分比
 * @param {*} rate
 * @returns
 */
export function formatRate(rate: any) {
  return !isEmptyValue(rate) ? (parseFloat(rate) * 100).toFixed(2) + '%' : '-';
}
