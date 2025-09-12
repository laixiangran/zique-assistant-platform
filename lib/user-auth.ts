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
}

/**
 * 验证用户身份并获取绑定的店铺列表
 */
export async function authenticateUser(request: NextRequest): Promise<UserAuthResult> {
  try {
    // 获取用户信息
    const user = getUserFromRequest(request);
    
    if (!user) {
      return {
        success: false,
        error: '用户未登录',
        response: NextResponse.json(
          { success: false, error: '用户未登录' },
          { status: 401 }
        )
      };
    }

    // 获取用户绑定的店铺列表
    const mallBindings = await UserMallBinding.findAll({
      where: {
        userId: user.userId
      },
      attributes: ['mallId', 'mallName'],
      raw: true
    });

    const allowedMallIds = mallBindings.map(binding => binding.mallId);

    if (allowedMallIds.length === 0) {
      return {
        success: false,
        error: '用户未绑定任何店铺',
        response: NextResponse.json(
          { success: false, error: '用户未绑定任何店铺' },
          { status: 403 }
        )
      };
    }

    return {
      success: true,
      user,
      allowedMallIds
    };
  } catch (error) {
    console.error('用户认证失败:', error);
    return {
      success: false,
      error: '认证失败',
      response: NextResponse.json(
        { success: false, error: '认证失败' },
        { status: 500 }
      )
    };
  }
}

/**
 * 验证用户是否有权限访问指定店铺
 */
export async function validateMallAccess(
  user: JWTPayload,
  mallId?: string | number,
  mallName?: string
): Promise<{ valid: boolean; error?: string; validatedMallId?: number }> {
  try {
    // 获取用户绑定的店铺列表
    const whereCondition: any = {
      userId: user.userId
    };

    // 如果指定了店铺ID或名称，添加到查询条件
    if (mallId) {
      whereCondition.mallId = typeof mallId === 'string' ? parseInt(mallId) : mallId;
    }
    if (mallName) {
      whereCondition.mallName = { [Op.like]: `%${mallName}%` };
    }

    const mallBinding = await UserMallBinding.findOne({
      where: whereCondition,
      attributes: ['mallId', 'mallName'],
      raw: true
    });

    if (!mallBinding) {
      if (mallId || mallName) {
        return {
          valid: false,
          error: '用户无权限访问指定店铺'
        };
      } else {
        return {
          valid: false,
          error: '用户未绑定任何店铺'
        };
      }
    }

    return {
      valid: true,
      validatedMallId: mallBinding.mallId
    };
  } catch (error) {
    console.error('店铺权限验证失败:', error);
    return {
      valid: false,
      error: '权限验证失败'
    };
  }
}

/**
 * 获取用户的默认店铺ID（第一个绑定的店铺）
 */
export async function getUserDefaultMallId(userId: number): Promise<number | null> {
  try {
    const mallBinding = await UserMallBinding.findOne({
      where: {
        userId: userId
      },
      attributes: ['mallId'],
      order: [['createdTime', 'ASC']],
      raw: true
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
export function buildMallWhereCondition(
  allowedMallIds: number[],
  requestedMallId?: string | number,
  requestedMallName?: string
): any {
  const whereCondition: any = {
    mall_id: { [Op.in]: allowedMallIds }
  };

  // 如果指定了店铺ID，进一步限制
  if (requestedMallId) {
    const mallId = typeof requestedMallId === 'string' ? parseInt(requestedMallId) : requestedMallId;
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