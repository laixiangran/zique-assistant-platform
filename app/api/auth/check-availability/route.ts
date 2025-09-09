import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/models';
import { successResponse, errorResponse } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, value } = body;

    // 验证必填字段
    if (!type || !value) {
      return NextResponse.json(errorResponse('类型和值不能为空'), {
        status: 400,
      });
    }

    // 验证类型
    const validTypes = ['username', 'phone', 'email'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(errorResponse('无效的检查类型'), {
        status: 400,
      });
    }

    // 根据类型构建查询条件
    let whereCondition: any = {};

    switch (type) {
      case 'username':
        // 验证用户名格式
        if (value.length < 3 || value.length > 20) {
          return NextResponse.json({
            success: false,
            data: {
              available: false,
              message: '用户名长度必须在3-20个字符之间',
            },
          });
        }
        if (!/^[a-zA-Z0-9_]+$/.test(value)) {
          return NextResponse.json({
            success: false,
            data: {
              available: false,
              message: '用户名只能包含字母、数字和下划线',
            },
          });
        }
        whereCondition = { username: value };
        break;

      case 'phone':
        // 验证手机号格式
        if (!/^1[3-9]\d{9}$/.test(value)) {
          return NextResponse.json({
            success: false,
            data: { available: false, message: '请输入正确的手机号格式' },
          });
        }
        whereCondition = { phone: value };
        break;

      case 'email':
        // 验证邮箱格式
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return NextResponse.json({
            success: false,
            data: { available: false, message: '请输入正确的邮箱格式' },
          });
        }
        whereCondition = { email: value };
        break;
    }

    // 检查是否已存在
    const existingUser = await User.findOne({
      where: whereCondition,
    });

    const available = !existingUser;
    let message = '';

    if (!available) {
      switch (type) {
        case 'username':
          message = '用户名已存在';
          break;
        case 'phone':
          message = '手机号已被注册';
          break;
        case 'email':
          message = '邮箱已被注册';
          break;
      }
    } else {
      switch (type) {
        case 'username':
          message = '用户名可用';
          break;
        case 'phone':
          message = '手机号可用';
          break;
        case 'email':
          message = '邮箱可用';
          break;
      }
    }

    return NextResponse.json({
      success: true,
      data: { available, message },
    });
  } catch (error) {
    console.error('检查可用性失败:', error);
    return NextResponse.json(errorResponse('检查失败，请稍后重试'), {
      status: 500,
    });
  }
}
