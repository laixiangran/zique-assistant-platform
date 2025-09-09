import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import {
  authenticateMainAccount,
  successResponse,
  errorResponse,
} from '@/lib/utils';

// 上传插件文件
export async function POST(request: NextRequest) {
  try {
    // 统一身份验证（需要主账户权限）
    const authResult = authenticateMainAccount(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(errorResponse('未找到上传文件'), {
        status: 400,
      });
    }

    // 验证文件类型
    if (!file.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json(errorResponse('只支持上传zip格式的文件'), {
        status: 400,
      });
    }

    // 验证文件大小（限制100MB）
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json(errorResponse('文件大小不能超过100MB'), {
        status: 400,
      });
    }

    // 创建上传目录
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'plugins');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 生成唯一文件名
    const timestamp = Date.now();
    const originalName = file.name;
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    const uniqueFileName = `${baseName}_${timestamp}${extension}`;
    const filePath = path.join(uploadDir, uniqueFileName);

    // 保存文件
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // 生成下载URL
    const downloadUrl = `/uploads/plugins/${uniqueFileName}`;

    // 返回文件信息
    const fileInfo = {
      fileName: uniqueFileName,
      originalName: originalName,
      fileSize: file.size,
      downloadUrl: downloadUrl,
      uploadTime: new Date().toISOString(),
    };

    return NextResponse.json(successResponse(fileInfo, '文件上传成功'));
  } catch (error) {
    console.error('文件上传失败:', error);
    return NextResponse.json(errorResponse('文件上传失败'), { status: 500 });
  }
}

// 获取上传文件列表
export async function GET(request: NextRequest) {
  try {
    // 统一身份验证（需要主账户权限）
    const authResult = authenticateMainAccount(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'plugins');

    if (!existsSync(uploadDir)) {
      return NextResponse.json(successResponse([], '获取文件列表成功'));
    }

    // 这里可以实现获取文件列表的逻辑
    // 暂时返回空数组
    return NextResponse.json(successResponse([], '获取文件列表成功'));
  } catch (error) {
    console.error('获取文件列表失败:', error);
    return NextResponse.json(errorResponse('获取文件列表失败'), {
      status: 500,
    });
  }
}
