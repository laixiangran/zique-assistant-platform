import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import PluginVersion from '@/models/PluginVersion';
import sequelize from '@/lib/database';
import { Op } from 'sequelize';

// 获取插件列表
export async function GET(request: NextRequest) {
  try {
    // 验证管理员身份和权限
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      );
    }

    await sequelize.authenticate();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const offset = (page - 1) * limit;

    // 构建查询条件
    const whereConditions: any = {};
    if (search) {
      whereConditions.version = {
        [Op.like]: `%${search}%`,
      };
    }
    if (status) {
      whereConditions.status = status;
    }

    // 查询插件列表
    const { count, rows } = await PluginVersion.findAndCountAll({
      where: whereConditions,
      limit,
      offset,
      order: [['createdTime', 'DESC']],
    });

    return NextResponse.json({
      success: true,
      message: '获取插件列表成功',
      data: {
        list: rows,
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('获取插件列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取插件列表失败' },
      { status: 500 }
    );
  }
}

// 创建插件版本
export async function POST(request: NextRequest) {
  try {
    // 验证管理员身份和权限
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      );
    }

    await sequelize.authenticate();

    const {
      version,
      releaseDate,
      downloadUrl,
      fileName,
      fileSize,
      description,
      changelog,
      isLatest = false,
      status = 'active',
    } = await request.json();

    // 验证必填字段
    if (!version || !downloadUrl || !fileName || !fileSize || !releaseDate) {
      return NextResponse.json(
        { success: false, message: '版本号、发布日期、下载地址、文件名和文件大小不能为空' },
        { status: 400 }
      );
    }

    // 检查版本是否已存在
    const existingPlugin = await PluginVersion.findOne({
      where: {
        version,
      },
    });

    if (existingPlugin) {
      return NextResponse.json(
        { success: false, message: '该插件版本已存在' },
        { status: 400 }
      );
    }

    // 如果设置为最新版本，先将其他版本设为非最新
    if (isLatest) {
      await PluginVersion.update(
        { isLatest: false },
        { where: { isLatest: true } }
      );
    }

    // 创建插件版本
    const plugin = await PluginVersion.create({
      version,
      releaseDate: new Date(releaseDate),
      downloadUrl,
      fileName,
      fileSize,
      description,
      changelog,
      isLatest,
      status,
    });

    return NextResponse.json({
      success: true,
      message: '插件版本创建成功',
      data: plugin,
    });
  } catch (error) {
    console.error('创建插件版本失败:', error);
    return NextResponse.json(
      { success: false, message: '创建插件版本失败' },
      { status: 500 }
    );
  }
}

// 批量删除插件版本
export async function DELETE(request: NextRequest) {
  try {
    // 验证管理员身份和权限
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      );
    }

    await sequelize.authenticate();

    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, message: '请选择要删除的插件版本' },
        { status: 400 }
      );
    }

    // 删除插件版本
    const deletedCount = await PluginVersion.destroy({
      where: {
        id: ids,
      },
    });

    return NextResponse.json({
      success: true,
      message: `成功删除 ${deletedCount} 个插件版本`,
      data: { deletedCount },
    });
  } catch (error) {
    console.error('删除插件版本失败:', error);
    return NextResponse.json(
      { success: false, message: '删除插件版本失败' },
      { status: 500 }
    );
  }
}