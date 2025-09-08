import { NextRequest, NextResponse } from 'next/server';
import {
  User,
  Invitation,
  InvitationReward,
  UserOperationLog,
  MembershipPackage,
  UserPackage,
} from '@/models';
import {
  hashPassword,
  validatePhone,
  validateEmail,
  validatePassword,
  generateToken,
  successResponse,
  errorResponse,
  getClientIP,
} from '@/lib/utils';

export async function POST(request: NextRequest) {
  const transaction = await User.sequelize!.transaction();
  try {
    const body = await request.json();
    const { username, password, phone, email, invitationCode } = body;

    // 验证必填字段
    if (!username || !password || !phone || !email) {
      return NextResponse.json(errorResponse('请填写完整的注册信息'), {
        status: 400,
      });
    }

    // 验证用户名长度
    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(errorResponse('用户名长度应在3-20个字符之间'), {
        status: 400,
      });
    }

    // 验证密码强度
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(errorResponse(passwordValidation.message), {
        status: 400,
      });
    }

    // 验证手机号格式
    if (!validatePhone(phone)) {
      return NextResponse.json(errorResponse('手机号格式不正确'), {
        status: 400,
      });
    }

    // 验证邮箱格式
    if (!validateEmail(email)) {
      return NextResponse.json(errorResponse('邮箱格式不正确'), {
        status: 400,
      });
    }

    // 检查用户名是否已存在
    const existingUser = await User.findOne({
      where: {
        username,
      },
    });

    if (existingUser) {
      await transaction.rollback();
      return NextResponse.json(errorResponse('用户名已存在'), { status: 400 });
    }

    // 检查手机号是否已存在
    const existingPhone = await User.findOne({
      where: {
        phone,
      },
    });

    if (existingPhone) {
      await transaction.rollback();
      return NextResponse.json(errorResponse('手机号已被注册'), {
        status: 400,
      });
    }

    // 检查邮箱是否已存在
    const existingEmail = await User.findOne({
      where: {
        email,
      },
    });

    if (existingEmail) {
      await transaction.rollback();
      return NextResponse.json(errorResponse('邮箱已被注册'), { status: 400 });
    }

    // 如果提供了邀请码，验证邀请码是否存在
    let inviterId: number | null = null;
    if (invitationCode) {
      const inviter = await User.findOne({
        where: {
          inviteCode: invitationCode,
        },
      });

      if (!inviter) {
        await transaction.rollback();
        return NextResponse.json(errorResponse('邀请码无效'), { status: 400 });
      }

      inviterId = inviter.id;
    }

    // 加密密码
    const hashedPassword = await hashPassword(password);

    // 生成用户邀请码 (更短、更友好的格式)
    let userInvitationCode: string = '';
    let isUnique = false;
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 避免易混淆字符如 0, O, I, 1
    const codeLength = 6; // 6位邀请码

    while (!isUnique) {
      let code = '';
      for (let i = 0; i < codeLength; i++) {
        code += characters.charAt(
          Math.floor(Math.random() * characters.length)
        );
      }

      // 检查邀请码是否已存在
      const existingUserWithCode = await User.findOne({
        where: {
          inviteCode: code,
        },
      });

      if (!existingUserWithCode) {
        userInvitationCode = code;
        isUnique = true;
      }
    }

    // 创建用户
    const newUser = await User.create(
      {
        username,
        password: hashedPassword,
        phone,
        email,
        inviteCode: userInvitationCode,
        status: 'active',
      },
      { transaction }
    );

    // 如果有邀请人，创建邀请记录
    if (inviterId !== null) {
      await Invitation.create(
        {
          inviterId,
          inviteeId: newUser.id,
          status: 'accepted',
        },
        { transaction }
      );
    }

    // 查询试用套餐并创建用户套餐绑定关系
    const trialPackage = await MembershipPackage.findOne({
      where: {
        packageType: 'try',
        isActive: true,
      },
    });

    if (trialPackage) {
      // 计算过期时间（当前时间 + 套餐有效期月数）
      const expireTime = new Date();
      expireTime.setMonth(
        expireTime.getMonth() + (trialPackage.durationMonths || 6)
      );
      // 设置到期时间为当天的23:59:59
      expireTime.setHours(23, 59, 59, 999);

      await UserPackage.create(
        {
          userId: newUser.id,
          packageId: trialPackage.id,
          orderTime: new Date(),
          expireTime: expireTime,
          isActive: true,
        },
        { transaction }
      );
    }

    // 记录操作日志
    await UserOperationLog.create(
      {
        userId: newUser.id,
        operationType: 'register',
        operationDesc: invitationCode ? '用户注册（通过邀请）' : '用户注册',
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || '',
      },
      { transaction }
    );

    // 提交事务
    await transaction.commit();

    // 生成JWT token
    const token = generateToken({
      userId: newUser.id,
      username: newUser.username,
      type: 'user',
    });

    // 返回用户信息（不包含密码）
    const userInfo = {
      id: newUser.id,
      username: newUser.username,
      phone: newUser.phone,
      email: newUser.email,
      status: newUser.status,
      createdTime: newUser.createdTime,
    };

    const response = NextResponse.json(
      successResponse({ user: userInfo, token }, '注册成功')
    );

    // 设置cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7天
    });

    return response;
  } catch (error) {
    await transaction.rollback();
    console.error('注册失败:', error);
    return NextResponse.json(errorResponse('注册失败，请稍后重试'), {
      status: 500,
    });
  }
}
