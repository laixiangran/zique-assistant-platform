import { NextRequest, NextResponse } from 'next/server';
import { PluginVersion } from '@/models';
import { 
  successResponse, 
  errorResponse, 
  formatObjectDates
} from '@/lib/utils';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { Op } from 'sequelize';
import fs from 'fs';
import path from 'path';

// 获取插件版本信息
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const currentVersion = searchParams.get('currentVersion');

    if (action === 'check') {
      // 检查版本更新
      const latestVersion = await PluginVersion.findOne({
        where: {
          status: 'active',
          isLatest: true,
        },
        order: [['releaseDate', 'DESC']],
      });

      if (!latestVersion) {
        return NextResponse.json(errorResponse('未找到可用版本'), {
          status: 404,
        });
      }

      const hasUpdate = currentVersion
        ? compareVersions(latestVersion.version, currentVersion) > 0
        : true;

      const result = {
        hasUpdate,
        currentVersion: currentVersion || null,
        latestVersion: {
          version: latestVersion.version,
          releaseDate: latestVersion.releaseDate,
          description: latestVersion.description,
          changelog: latestVersion.changelog,
          downloadUrl: latestVersion.downloadUrl,
          fileName: latestVersion.fileName,
          fileSize: latestVersion.fileSize,
        },
      };

      return NextResponse.json(successResponse(formatObjectDates(result)));
    } else {
      // 获取版本列表
      const pageIndex = parseInt(searchParams.get('pageIndex') || '1');
      const pageSize = parseInt(searchParams.get('pageSize') || '10');
      const status = searchParams.get('status');

      const where: any = {};
      if (status) {
        where.status = status;
      }

      const { count, rows } = await PluginVersion.findAndCountAll({
        where,
        limit: pageSize,
        offset: (pageIndex - 1) * pageSize,
        order: [['releaseDate', 'DESC']],
      });

      return NextResponse.json(
        successResponse({
          list: rows.map((invitation) => {
            return formatObjectDates(invitation.toJSON());
          }),
          pagination: {
            total: count,
            pageIndex,
            pageSize,
            pages: Math.ceil(count / pageSize),
          },
        })
      );
    }
  } catch (error) {
    console.error('获取插件版本信息失败:', error);
    return NextResponse.json(errorResponse('获取插件版本信息失败'), {
      status: 500,
    });
  }
}

// 创建新版本（管理员功能）
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(errorResponse('未授权访问'), {
        status: 401,
      });
    }

    const body = await request.json();
    const {
      version,
      releaseDate,
      downloadUrl,
      fileName,
      fileSize,
      description,
      changelog,
      isLatest = true,
    } = body;

    // 验证必填字段
    if (!version || !releaseDate || !downloadUrl || !fileName || !fileSize) {
      return NextResponse.json(errorResponse('缺少必填字段'), { status: 400 });
    }

    // 检查版本号是否已存在
    const existingVersion = await PluginVersion.findOne({
      where: { version },
    });

    if (existingVersion) {
      return NextResponse.json(errorResponse('版本号已存在'), { status: 400 });
    }

    // 如果设置为最新版本，先将其他版本的isLatest设为false
    if (isLatest) {
      await PluginVersion.update(
        { isLatest: false },
        { where: { isLatest: true } }
      );
    }

    // 创建新版本
    const newVersion = await PluginVersion.create({
      version,
      releaseDate: new Date(releaseDate),
      downloadUrl,
      fileName,
      fileSize,
      description,
      changelog,
      isLatest,
      status: 'active',
    });

    return NextResponse.json(successResponse(formatObjectDates(newVersion)), {
      status: 201,
    });
  } catch (error) {
    console.error('创建插件版本失败:', error);
    return NextResponse.json(errorResponse('创建插件版本失败'), {
      status: 500,
    });
  }
}

// 更新版本信息（管理员功能）
export async function PUT(request: NextRequest) {
  try {
    // 验证管理员权限
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(errorResponse('未授权访问'), {
        status: 401,
      });
    }

    const formData = await request.formData();
    const id = formData.get('id') as string;
    const version = formData.get('version') as string;
    const releaseNotes = formData.get('releaseNotes') as string;
    const isLatest = formData.get('isLatest') === 'true';
    const file = formData.get('file') as File | null;

    if (!id) {
      return NextResponse.json(errorResponse('缺少版本ID'), { status: 400 });
    }

    const existingVersion = await PluginVersion.findByPk(id);
    if (!existingVersion) {
      return NextResponse.json(errorResponse('版本不存在'), { status: 404 });
    }

    let updateData: any = {};
    if (version) updateData.version = version;
    if (releaseNotes) updateData.releaseNotes = releaseNotes;
    if (isLatest !== undefined) updateData.isLatest = isLatest;

    // 如果上传了新文件，处理文件替换
    if (file) {
      // 删除原文件
      if (existingVersion.downloadUrl) {
        const oldFilePath = path.join(
          process.cwd(),
          'public',
          existingVersion.downloadUrl
        );
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
            console.log('已删除原文件:', oldFilePath);
          } catch (error) {
            console.error('删除原文件失败:', error);
          }
        }
      }

      // 保存新文件
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const timestamp = Date.now();
      const originalName = file.name;
      const extension = path.extname(originalName);
      const baseName = path.basename(originalName, extension);
      const uniqueFileName = `${baseName}_${timestamp}${extension}`;
      const filePath = path.join(
        process.cwd(),
        'public',
        'uploads',
        'plugins',
        uniqueFileName
      );

      // 确保目录存在
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, buffer);

      // 更新文件相关字段
      updateData.fileName = uniqueFileName;
      updateData.downloadUrl = `/uploads/plugins/${uniqueFileName}`;
      updateData.fileSize = file.size;
    }

    // 如果设置为最新版本，先将其他版本的isLatest设为false
    if (updateData.isLatest) {
      await PluginVersion.update(
        { isLatest: false },
        { where: { isLatest: true, id: { [Op.ne]: id } } }
      );
    }

    // 更新版本信息
    await existingVersion.update(updateData);

    return NextResponse.json(
      successResponse(formatObjectDates(existingVersion))
    );
  } catch (error) {
    console.error('更新插件版本失败:', error);
    return NextResponse.json(errorResponse('更新插件版本失败'), {
      status: 500,
    });
  }
}

// 删除版本（管理员功能）
export async function DELETE(request: NextRequest) {
  try {
    // 验证管理员权限
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(errorResponse('未授权访问'), {
        status: 401,
      });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(errorResponse('缺少版本ID'), { status: 400 });
    }

    const version = await PluginVersion.findByPk(id);
    if (!version) {
      return NextResponse.json(errorResponse('版本不存在'), { status: 404 });
    }

    // 删除对应的物理文件
    const filePath = path.join(process.cwd(), 'public', version.downloadUrl);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`已删除文件: ${filePath}`);
      } catch (fileError) {
        console.error(`删除文件失败: ${filePath}`, fileError);
        // 文件删除失败不影响数据库删除，只记录错误
      }
    }

    // 如果删除的是最新版本，需要重新设置最新版本
    if (version.isLatest) {
      const nextLatest = await PluginVersion.findOne({
        where: {
          status: 'active',
          id: { [Op.ne]: id },
        },
        order: [['releaseDate', 'DESC']],
      });

      if (nextLatest) {
        await nextLatest.update({ isLatest: true });
      }
    }

    await version.destroy();

    return NextResponse.json(successResponse({ message: '删除成功' }));
  } catch (error) {
    console.error('删除插件版本失败:', error);
    return NextResponse.json(errorResponse('删除插件版本失败'), {
      status: 500,
    });
  }
}

// 版本比较函数
function compareVersions(version1: string, version2: string): number {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);

  const maxLength = Math.max(v1Parts.length, v2Parts.length);

  for (let i = 0; i < maxLength; i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;

    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }

  return 0;
}
