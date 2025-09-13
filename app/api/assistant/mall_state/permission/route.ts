import { NextResponse, NextRequest } from 'next/server';
import { authenticateUser } from '@/lib/user-auth';
import { errorResponse } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    // 验证用户权限
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json(authResult, {
        status: 403,
      });
    }
    return NextResponse.json(authResult);
  } catch (error) {
    return NextResponse.json(
      errorResponse(error instanceof Error ? error.message : 'Unknown error'),
      {
        status: 500,
      }
    );
  }
}
