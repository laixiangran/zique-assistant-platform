import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, successResponse, errorResponse } from './utils';
import { UserMallBinding } from '@/models';
import { Op } from 'sequelize';

/**
 * 验证Temu API访问权限
 */
export async function validateTemuApiAccess(
  temuCookie: string
): Promise<{ success: boolean; errorCode?: string; errorMsg?: string }> {
  try {
    const res = await fetch(
      'https://agentseller.temu.com/api/seller/auth/userInfo',
      {
        headers: {
          'content-type': 'application/json',
          cookie: temuCookie,
        },
        body: '{}',
        method: 'POST',
      }
    );
    const data = await res.json();
    if (data.success) {
      return successResponse({}, 'Temu 登录验证成功');
    } else {
      return errorResponse('Temu 登录验证失败', 'TEMU_LOGIN_ERROR');
    }
  } catch (error) {
    return errorResponse('Temu 登录验证失败', 'TEMU_LOGIN_ERROR');
  }
}

/**
 * 验证用户身份并获取绑定的店铺列表
 */
export async function authenticateUser(request: NextRequest): Promise<any> {
  try {
    // 检查是否为插件模式
    const endParam = request.headers.get('zique-end');
    const temuCookie = request.headers.get('temu-cookie') || '';
    const mallId = request.headers.get('mall_id') || '';

    // 插件模式验证
    if (endParam === 'zique-assistant') {
      const temuValidation = await validateTemuApiAccess(temuCookie);
      if (!temuValidation.success) {
        return temuValidation;
      }

      const mallBinding = await UserMallBinding.findOne({
        where: {
          mallId: mallId,
        },
      });

      if (!mallBinding) {
        return errorResponse(
          `店铺绑定验证失败: 店铺ID ${mallId} 未找到绑定关系，请先在系统中绑定该店铺`,
          'MALL_NOT_BINDING'
        );
      }

      // 插件模式下，允许访问指定的店铺
      return successResponse({
        isPluginMode: true,
        mallId,
        allowedMallIds: [mallId],
      });
    }

    // 普通模式：获取用户信息
    const user = getUserFromRequest(request);

    if (!user) {
      return errorResponse('用户未登录', 'USER_NOT_LOGIN');
    }

    // 获取用户绑定的店铺列表
    const mallBindings = await UserMallBinding.findAll({
      where: {
        userId: user.userId,
      },
      attributes: ['mallId', 'mallName'],
      raw: true,
    });

    const allowedMallIds: string[] = mallBindings.map(
      (binding) => binding.mallId
    );

    if (allowedMallIds.length === 0) {
      return errorResponse('用户未绑定任何店铺', 'USER_NOT_BINDING_MALL');
    }

    return successResponse({
      user,
      allowedMallIds,
      isPluginMode: false,
    });
  } catch (error) {
    console.error('用户认证失败:', error);
    return errorResponse('认证失败', 'AUTHENTICATION_FAILED');
  }
}

/**
 * 验证用户是否有权限访问指定店铺
 */
export async function validateMallAccess(
  authResult: any,
  mallId?: string,
  mallName?: string
): Promise<{ success: boolean; error?: string; response?: NextResponse }> {
  // 插件模式下，直接验证店铺ID是否匹配
  if (authResult?.data?.isPluginMode) {
    if (mallId && authResult?.data?.allowedMallIds?.includes(`${mallId}`)) {
      return successResponse(true);
    } else {
      return errorResponse('插件模式下无权限访问指定店铺');
    }
  }

  // 普通模式验证
  const user = authResult.user;
  if (!user) {
    return errorResponse('用户信息缺失');
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
        return errorResponse('用户无权限访问指定店铺');
      } else {
        return errorResponse('用户未绑定任何店铺');
      }
    }

    return successResponse(true);
  } catch (error) {
    console.error('店铺权限验证失败:', error);
    return errorResponse('权限验证失败');
  }
}

/**
 * 获取用户的默认店铺ID（第一个绑定的店铺）
 */
export async function getUserDefaultMallId(
  userId: number
): Promise<string | null> {
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
  authResult: any,
  requestedMallId?: string | null,
  requestedMallName?: string | null
): Promise<any> {
  const allowedMallIds = authResult?.data?.allowedMallIds || [];
  const whereCondition: any = {
    mallId: { [Op.in]: allowedMallIds },
  };

  // 如果指定了店铺ID，进一步限制
  if (requestedMallId) {
    if (allowedMallIds.includes(requestedMallId)) {
      whereCondition.mallId = requestedMallId;
    } else {
      // 如果请求的店铺ID不在允许列表中，返回一个不可能匹配的条件
      whereCondition.mallId = -1;
    }
  }

  // 如果指定了店铺名称，添加名称过滤
  if (requestedMallName) {
    whereCondition.mallName = { [Op.like]: `%${requestedMallName}%` };
  }

  return whereCondition;
}
