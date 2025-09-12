// Redis客户端实例（暂时使用内存缓存模拟）
let memoryCache: Map<string, { value: any; expiry: number }> = new Map();

/**
 * 获取Redis客户端实例（内存缓存实现）
 */
function getRedisClient() {
  return {
    async setex(key: string, ttl: number, value: string): Promise<void> {
      const expiry = Date.now() + (ttl * 1000);
      memoryCache.set(key, { value, expiry });
    },
    
    async get(key: string): Promise<string | null> {
      const cached = memoryCache.get(key);
      if (!cached) return null;
      
      if (Date.now() > cached.expiry) {
        memoryCache.delete(key);
        return null;
      }
      
      return cached.value;
    },
    
    async del(...keys: string[]): Promise<void> {
      keys.forEach(key => memoryCache.delete(key));
    },
    
    async keys(pattern: string): Promise<string[]> {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return Array.from(memoryCache.keys()).filter(key => regex.test(key));
    },
    
    async quit(): Promise<void> {
      memoryCache.clear();
    }
  };
}

/**
 * 缓存配置
 */
interface CacheConfig {
  ttl?: number; // 缓存过期时间（秒）
  prefix?: string; // 缓存键前缀
}

/**
 * 默认缓存配置
 */
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 300, // 5分钟
  prefix: 'api_cache'
};

/**
 * 生成缓存键
 */
function generateCacheKey(key: string, prefix?: string): string {
  const cachePrefix = prefix || DEFAULT_CACHE_CONFIG.prefix;
  return `${cachePrefix}:${key}`;
}

/**
 * 设置缓存
 */
export async function setCache(
  key: string, 
  value: any, 
  config: CacheConfig = {}
): Promise<void> {
  try {
    const client = getRedisClient();
    const cacheKey = generateCacheKey(key, config.prefix);
    const ttl = config.ttl || DEFAULT_CACHE_CONFIG.ttl;
    
    await client.setex(cacheKey, ttl!, JSON.stringify(value));
  } catch (error) {
    console.error('设置缓存失败:', error);
    // 缓存失败不应该影响主要业务逻辑
  }
}

/**
 * 获取缓存
 */
export async function getCache<T = any>(
  key: string, 
  config: CacheConfig = {}
): Promise<T | null> {
  try {
    const client = getRedisClient();
    const cacheKey = generateCacheKey(key, config.prefix);
    
    const cached = await client.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as T;
    }
    return null;
  } catch (error) {
    console.error('获取缓存失败:', error);
    return null;
  }
}

/**
 * 删除缓存
 */
export async function deleteCache(
  key: string, 
  config: CacheConfig = {}
): Promise<void> {
  try {
    const client = getRedisClient();
    const cacheKey = generateCacheKey(key, config.prefix);
    
    await client.del(cacheKey);
  } catch (error) {
    console.error('删除缓存失败:', error);
  }
}

/**
 * 批量删除缓存（支持通配符）
 */
export async function deleteCachePattern(
  pattern: string, 
  config: CacheConfig = {}
): Promise<void> {
  try {
    const client = getRedisClient();
    const cachePattern = generateCacheKey(pattern, config.prefix);
    
    const keys = await client.keys(cachePattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (error) {
    console.error('批量删除缓存失败:', error);
  }
}

/**
 * 缓存装饰器函数
 * 用于自动缓存函数结果
 */
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  config: CacheConfig = {}
): T {
  return (async (...args: Parameters<T>) => {
    const cacheKey = keyGenerator(...args);
    
    // 尝试从缓存获取
    const cached = await getCache(cacheKey, config);
    if (cached !== null) {
      return cached;
    }
    
    // 执行原函数
    const result = await fn(...args);
    
    // 缓存结果
    await setCache(cacheKey, result, config);
    
    return result;
  }) as T;
}

/**
 * 生成查询缓存键
 */
export function generateQueryCacheKey(
  tableName: string,
  params: Record<string, any>
): string {
  // 对参数进行排序以确保缓存键的一致性
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {} as Record<string, any>);
  
  const paramsString = JSON.stringify(sortedParams);
  const hash = require('crypto')
    .createHash('md5')
    .update(paramsString)
    .digest('hex');
  
  return `${tableName}:${hash}`;
}

/**
 * 关闭Redis连接
 */
export async function closeRedisConnection(): Promise<void> {
  memoryCache.clear();
}