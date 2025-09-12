import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, JWTPayload } from './utils';
import { UserMallBinding } from '../models';
import { Op } from 'sequelize';

export interface UserAuthResult {
  success: boolean;
  error?: string;
  user?: JWTPayload;
  allowedMallIds?: number[];
  response?: NextResponse;
  isPluginMode?: boolean;
}

/**
 * 验证Temu API访问权限
 */
export async function validateTemuApiAccess(
  temuCookies: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(
      'https://agentseller.temu.com/api/seller/auth/userInfo',
      {
        method: 'GET',
        headers: {
          Cookie: temuCookies,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      }
    );

    if (response.ok) {
      return { valid: true };
    } else {
      return {
        valid: false,
        error: `Temu API访问失败: ${response.status} ${response.statusText}`,
      };
    }
  } catch (error) {
    console.error('Temu API验证失败:', error);
    return {
      valid: false,
      error: 'Temu API验证失败',
    };
  }
}

/**
 * 验证用户身份并获取绑定的店铺列表
 */
export async function authenticateUser(
  request: NextRequest
): Promise<UserAuthResult> {
  try {
    // 检查是否为插件模式
    const { searchParams } = new URL(request.url);
    const endParam = searchParams.get('end');
    const temuCookies = searchParams.get('temuCookies');
    const mallId = searchParams.get('mall_id');

    // 插件模式验证
    if (endParam === 'plugin' && temuCookies && mallId) {
      const temuValidation = await validateTemuApiAccess(temuCookies);
      if (!temuValidation.valid) {
        return {
          success: false,
          error: temuValidation.error || 'Temu API验证失败',
          response: NextResponse.json(
            {
              success: false,
              error: temuValidation.error || 'Temu API验证失败',
            },
            { status: 403 }
          ),
        };
      }

      // 插件模式下，允许访问指定的店铺
      return {
        success: true,
        isPluginMode: true,
        allowedMallIds: [parseInt(mallId)],
      };
    }

    // 普通模式：获取用户信息
    const user = getUserFromRequest(request);

    if (!user) {
      return {
        success: false,
        error: '用户未登录',
        response: NextResponse.json(
          { success: false, error: '用户未登录' },
          { status: 401 }
        ),
      };
    }

    // 获取用户绑定的店铺列表
    const mallBindings = await UserMallBinding.findAll({
      where: {
        userId: user.userId,
      },
      attributes: ['mallId', 'mallName'],
      raw: true,
    });

    const allowedMallIds = mallBindings.map((binding) => binding.mallId);

    if (allowedMallIds.length === 0) {
      return {
        success: false,
        error: '用户未绑定任何店铺',
        response: NextResponse.json(
          { success: false, error: '用户未绑定任何店铺' },
          { status: 403 }
        ),
      };
    }

    return {
      success: true,
      user,
      allowedMallIds,
      isPluginMode: false,
    };
  } catch (error) {
    console.error('用户认证失败:', error);
    return {
      success: false,
      error: '认证失败',
      response: NextResponse.json(
        { success: false, error: '认证失败' },
        { status: 500 }
      ),
    };
  }
}

/**
 * 验证用户是否有权限访问指定店铺
 */
export async function validateMallAccess(
  authResult: UserAuthResult,
  mallId?: string | number,
  mallName?: string
): Promise<{ success: boolean; error?: string; response?: NextResponse }> {
  // 插件模式下，直接验证店铺ID是否匹配
  if (authResult.isPluginMode) {
    const requestedMallId =
      typeof mallId === 'string' ? parseInt(mallId) : mallId;
    if (
      requestedMallId &&
      authResult.allowedMallIds?.includes(requestedMallId)
    ) {
      return { success: true };
    } else {
      return {
        success: false,
        error: '插件模式下无权限访问指定店铺',
        response: NextResponse.json(
          { success: false, error: '插件模式下无权限访问指定店铺' },
          { status: 403 }
        ),
      };
    }
  }

  // 普通模式验证
  const user = authResult.user;
  if (!user) {
    return {
      success: false,
      error: '用户信息缺失',
      response: NextResponse.json(
        { success: false, error: '用户信息缺失' },
        { status: 401 }
      ),
    };
  }
  try {
    // 获取用户绑定的店铺列表
    const whereCondition: any = {
      userId: user.userId,
    };

    // 如果指定了店铺ID或名称，添加到查询条件
    if (mallId) {
      whereCondition.mallId =
        typeof mallId === 'string' ? parseInt(mallId) : mallId;
    }
    if (mallName) {
      whereCondition.mallName = { [Op.like]: `%${mallName}%` };
    }

    const mallBinding = await UserMallBinding.findOne({
      where: whereCondition,
      attributes: ['mallId', 'mallName'],
      raw: true,
    });

    if (!mallBinding) {
      if (mallId || mallName) {
        return {
          success: false,
          error: '用户无权限访问指定店铺',
          response: NextResponse.json(
            { success: false, error: '用户无权限访问指定店铺' },
            { status: 403 }
          ),
        };
      } else {
        return {
          success: false,
          error: '用户未绑定任何店铺',
          response: NextResponse.json(
            { success: false, error: '用户未绑定任何店铺' },
            { status: 403 }
          ),
        };
      }
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('店铺权限验证失败:', error);
    return {
      success: false,
      error: '权限验证失败',
      response: NextResponse.json(
        { success: false, error: '权限验证失败' },
        { status: 500 }
      ),
    };
  }
}

/**
 * 获取用户的默认店铺ID（第一个绑定的店铺）
 */
export async function getUserDefaultMallId(
  userId: number
): Promise<number | null> {
  try {
    const mallBinding = await UserMallBinding.findOne({
      where: {
        userId: userId,
      },
      attributes: ['mallId'],
      order: [['createdTime', 'ASC']],
      raw: true,
    });

    return mallBinding ? mallBinding.mallId : null;
  } catch (error) {
    console.error('获取默认店铺ID失败:', error);
    return null;
  }
}

/**
 * 构建店铺权限查询条件
 */
export async function buildMallWhereCondition(
  authResult: UserAuthResult,
  requestedMallId?: string | number,
  requestedMallName?: string
): Promise<any> {
  const allowedMallIds = authResult.allowedMallIds || [];
  const whereCondition: any = {
    mall_id: { [Op.in]: allowedMallIds },
  };

  // 如果指定了店铺ID，进一步限制
  if (requestedMallId) {
    const mallId =
      typeof requestedMallId === 'string'
        ? parseInt(requestedMallId)
        : requestedMallId;
    if (allowedMallIds.includes(mallId)) {
      whereCondition.mall_id = mallId;
    } else {
      // 如果请求的店铺ID不在允许列表中，返回一个不可能匹配的条件
      whereCondition.mall_id = -1;
    }
  }

  // 如果指定了店铺名称，添加名称过滤
  if (requestedMallName) {
    whereCondition.mall_name = { [Op.like]: `%${requestedMallName}%` };
  }

  return whereCondition;
}
