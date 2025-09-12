import { NextResponse } from 'next/server';
import { gzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);

/**
 * 压缩中间件配置
 */
const COMPRESSION_CONFIG = {
  // 最小压缩大小（字节）
  threshold: 1024,
  // 压缩级别 (1-9, 9为最高压缩率)
  level: 6,
  // 支持压缩的内容类型
  compressibleTypes: [
    'application/json',
    'text/plain',
    'text/html',
    'text/css',
    'application/javascript',
    'text/javascript'
  ]
};

/**
 * 检查是否应该压缩响应
 * @param {Request} request - 请求对象
 * @param {string} contentType - 内容类型
 * @param {number} contentLength - 内容长度
 * @returns {boolean} 是否应该压缩
 */
function shouldCompress(request, contentType, contentLength) {
  // 检查客户端是否支持gzip
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  if (!acceptEncoding.includes('gzip')) {
    return false;
  }

  // 检查内容长度是否达到压缩阈值
  if (contentLength < COMPRESSION_CONFIG.threshold) {
    return false;
  }

  // 检查内容类型是否支持压缩
  return COMPRESSION_CONFIG.compressibleTypes.some(type => 
    contentType.includes(type)
  );
}

/**
 * 压缩响应数据
 * @param {string} data - 要压缩的数据
 * @returns {Promise<Buffer>} 压缩后的数据
 */
async function compressData(data) {
  try {
    return await gzipAsync(Buffer.from(data, 'utf8'), {
      level: COMPRESSION_CONFIG.level
    });
  } catch (error) {
    console.error('压缩数据时出错:', error);
    throw error;
  }
}

/**
 * 创建压缩的响应
 * @param {any} data - 响应数据
 * @param {Request} request - 请求对象
 * @param {number} status - HTTP状态码
 * @returns {Promise<NextResponse>} 压缩后的响应
 */
export async function createCompressedResponse(data, request, status = 200) {
  try {
    const jsonString = JSON.stringify(data);
    const contentType = 'application/json; charset=utf-8';
    const contentLength = Buffer.byteLength(jsonString, 'utf8');

    // 检查是否应该压缩
    if (!shouldCompress(request, contentType, contentLength)) {
      return NextResponse.json(data, { status });
    }

    // 压缩数据
    const compressedData = await compressData(jsonString);

    // 创建压缩响应
    const response = new NextResponse(compressedData, {
      status,
      headers: {
        'Content-Type': contentType,
        'Content-Encoding': 'gzip',
        'Content-Length': compressedData.length.toString(),
        'Vary': 'Accept-Encoding'
      }
    });

    return response;
  } catch (error) {
    console.error('创建压缩响应时出错:', error);
    // 如果压缩失败，返回未压缩的响应
    return NextResponse.json(data, { status });
  }
}

/**
 * 压缩装饰器函数
 * 用于包装API处理函数，自动添加压缩功能
 * @param {Function} handler - 原始API处理函数
 * @returns {Function} 包装后的处理函数
 */
export function withCompression(handler) {
  return async function(request, ...args) {
    try {
      // 执行原始处理函数
      const result = await handler(request, ...args);
      
      // 如果结果已经是Response对象，直接返回
      if (result instanceof Response) {
        return result;
      }
      
      // 如果结果是普通对象，创建压缩响应
      return await createCompressedResponse(result, request);
    } catch (error) {
      console.error('压缩装饰器执行出错:', error);
      // 如果出错，返回原始错误响应
      return NextResponse.json(
        { success: false, error: '服务器内部错误' },
        { status: 500 }
      );
    }
  };
}

/**
 * 获取压缩统计信息
 * @param {string} originalData - 原始数据
 * @param {Buffer} compressedData - 压缩后数据
 * @returns {Object} 压缩统计信息
 */
export function getCompressionStats(originalData, compressedData) {
  const originalSize = Buffer.byteLength(originalData, 'utf8');
  const compressedSize = compressedData.length;
  const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);
  
  return {
    originalSize,
    compressedSize,
    compressionRatio: `${compressionRatio}%`,
    savedBytes: originalSize - compressedSize
  };
}

export default {
  createCompressedResponse,
  withCompression,
  getCompressionStats,
  COMPRESSION_CONFIG
};