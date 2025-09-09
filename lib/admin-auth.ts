import { NextRequest } from 'next/server';
import Admin from '@/models/Admin';
import { verifyAdminToken as utilsVerifyAdminToken } from '@/lib/utils';

interface AdminTokenPayload {
  adminId: number;
  username: string;
  role: 'super_admin' | 'admin';
  type: 'admin';
}

/**
 * 验证管理员JWT令牌
 */
export async function verifyAdminToken(
  token: string
): Promise<AdminTokenPayload | null> {
  try {
    const decoded = await utilsVerifyAdminToken(token);
    return decoded;
  } catch (error) {
    console.error('管理员令牌验证失败:', error);
    return null;
  }
}

/**
 * 从请求中提取管理员信息
 */
export async function getAdminFromRequest(
  request: NextRequest
): Promise<Admin | null> {
  try {
    let token: string | null = null;

    // 首先尝试从Authorization header获取token
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // 如果header中没有token，尝试从cookie中获取
    if (!token) {
      token = request.cookies.get('admin_token')?.value || null;
    }

    if (!token) {
      return null;
    }

    const payload = await verifyAdminToken(token);
    if (!payload) {
      return null;
    }

    // 从数据库获取完整的管理员信息
    const admin = await Admin.findByPk(payload.adminId);
    if (!admin || admin.status !== 'active') {
      return null;
    }

    return admin;
  } catch (error) {
    return null;
  }
}

/**
 * 管理员角色常量
 */
export const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
} as const;

/**
 * 创建管理员认证中间件
 */
export function createAdminAuthMiddleware() {
  return async (request: NextRequest) => {
    const admin = await getAdminFromRequest(request);

    if (!admin) {
      return new Response(
        JSON.stringify({ success: false, message: '未授权访问' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 将管理员信息添加到请求中
    (request as any).admin = admin;
    return null; // 继续处理请求
  };
}

/**
 * 验证超级管理员权限
 */
export async function requireSuperAdmin(
  request: NextRequest
): Promise<Response | null> {
  const admin = await getAdminFromRequest(request);

  if (!admin) {
    return new Response(
      JSON.stringify({ success: false, message: '未授权访问' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (admin.role !== 'super_admin') {
    return new Response(
      JSON.stringify({ success: false, message: '需要超级管理员权限' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  (request as any).admin = admin;
  return null;
}
