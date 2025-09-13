import { NextResponse, NextRequest } from 'next/server';
import { MallState } from '@/models';
import { authenticateUser, buildMallWhereCondition } from '@/lib/user-auth';
import { successResponse, errorResponse, formatObjectDates } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    // 验证用户权限
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json(authResult, {
        status: 403,
      });
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const mallId = searchParams.get('mallId');
    const regionCode = searchParams.get('regionCode');
    const stateType = searchParams.get('stateType');

    // 构建查询条件
    const whereCondition: any = {};

    // 添加店铺权限过滤
    const mallWhereCondition = await buildMallWhereCondition(authResult);
    Object.assign(whereCondition, mallWhereCondition);

    // 添加具体查询条件
    whereCondition.mallId = mallId;
    whereCondition.regionCode = regionCode;
    whereCondition.stateType = stateType;

    const record = await MallState.findOne({
      where: whereCondition,
      order: [['lastCollectTime', 'DESC']],
    });

    if (!record) {
      return NextResponse.json(successResponse(null));
    }

    return NextResponse.json(
      successResponse(formatObjectDates(record.toJSON()))
    );
  } catch (error) {
    return NextResponse.json(
      errorResponse(error instanceof Error ? error.message : 'Unknown error'),
      {
        status: 500,
      }
    );
  }
}
