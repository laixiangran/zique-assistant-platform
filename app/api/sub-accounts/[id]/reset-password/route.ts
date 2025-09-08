import { NextRequest, NextResponse } from 'next/server';
import { SubAccount, User, UserOperationLog } from '@/models';
import {
  successResponse,
  errorResponse,
  hashPassword,
  getClientIP,
  generateRandomPassword,
  authenticateMainAccount,
} from '@/lib/utils';

// 重置子账户密码
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 统一身份验证（需要主账户权限）
    const authResult = authenticateMainAccount(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const mainAccountUserId = authResult.user?.userId;
    const subAccountId = params.id;

    // 验证子账户ID格式
    if (
      !subAccountId ||
      isNaN(Number(subAccountId)) ||
      Number(subAccountId) <= 0
    ) {
      return NextResponse.json(errorResponse('无效的子账户ID'), {
        status: 400,
      });
    }

    // 查询子账户
    const subAccount = await SubAccount.findOne({
      where: {
        id: subAccountId,
        parentUserId: mainAccountUserId,
      },
    });

    if (!subAccount) {
      return NextResponse.json(errorResponse('子账户不存在'), { status: 404 });
    }

    // 生成唯一的随机密码
    let newPassword;
    let hashedPassword;
    let isPasswordUnique = false;

    while (!isPasswordUnique) {
      newPassword = generateRandomPassword();
      hashedPassword = await hashPassword(newPassword);

      // 检查密码是否已存在（确保密码唯一性）
      const existingPasswordUser = await User.findOne({
        where: { password: hashedPassword },
      });
      const existingPasswordSubAccount = await SubAccount.findOne({
        where: { password: hashedPassword },
      });

      if (!existingPasswordUser && !existingPasswordSubAccount) {
        isPasswordUnique = true;
      }
    }

    // 更新子账户密码
    await subAccount.update({
      password: hashedPassword,
    });

    // 记录操作日志
    await UserOperationLog.create({
      userId: mainAccountUserId,
      operationType: 'sub_account_password_reset',
      operationDesc: `重置子账户密码：${(subAccount as any).username}`,
      targetType: 'sub_account',
      targetId: Number(subAccountId),
      requestData: JSON.stringify({ subAccountId }),
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || '',
      status: 'success',
    } as any);

    const result = {
      id: subAccount.id,
      username: (subAccount as any).username,
      generatedPassword: newPassword,
    };

    return NextResponse.json(
      successResponse(
        result,
        `密码重置成功！用户名：${(subAccount as any).username}，新密码：${newPassword}，请妥善保管登录信息`
      )
    );
  } catch (error) {
    console.error('重置子账户密码失败:', error);
    return NextResponse.json(
      errorResponse('重置子账户密码失败，请稍后重试'),
      {
        status: 500,
      }
    );
  }
}