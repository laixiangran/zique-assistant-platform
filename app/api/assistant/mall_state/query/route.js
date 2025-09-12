import { NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { MallState } from '../../../../models';
import { authenticateUser, validateMallAccess } from '../../../../lib/user-auth';

export async function GET(request) {
  try {
    // 验证用户权限
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return authResult.response;
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const pageIndex = parseInt(searchParams.get('pageIndex') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const mallId = searchParams.get('mall_id');
    const mallName = searchParams.get('mallName');
    const skuId = searchParams.get('skuId');
    const sortField = searchParams.get('sortField') || 'updated_time';
    const sortOrder = searchParams.get('sortOrder') || 'DESC';

    // 构建查询条件（包含权限控制）
    const whereCondition = await buildMallWhereCondition(
      authResult,
      mallId,
      mallName
    );

    // 添加其他查询条件
    if (skuId) {
      const skuIds = skuId.split(',').map(id => id.trim()).filter(id => id);
      if (skuIds.length > 0) {
        whereCondition.sku_id = { [Op.in]: skuIds };
      }
    }

    // 计算偏移量
    const offset = (pageIndex - 1) * pageSize;

    // 构建排序条件
    const orderCondition = [[sortField, sortOrder.toUpperCase()]];

    const results = await MallState.findAndCountAll({
      where: whereCondition,
      limit: pageSize,
      offset: offset,
      order: orderCondition
    });

    // 转换时间格式
    const formattedResults = results.map((item) => ({
      ...item,
      created_time: dayjs(item.created_time).format('YYYY-MM-DD HH:mm:ss'),
      updated_time: dayjs(item.updated_time).format('YYYY-MM-DD HH:mm:ss'),
    }));

    return NextResponse.json({
      success: true,
      data: formattedResults,
      total: results.count,
      pageIndex,
      pageSize,
      totalPages: Math.ceil(results.count / pageSize)
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        data: null,
      },
      { status: 200 }
    );
  }
}
