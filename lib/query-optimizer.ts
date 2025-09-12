import { Op, FindOptions, Model, ModelStatic } from 'sequelize';
import { getCache, setCache, generateQueryCacheKey } from './cache';

/**
 * 查询优化配置
 */
interface QueryOptimizerConfig {
  enableCache?: boolean;
  cacheTimeout?: number;
  enableCursorPagination?: boolean;
  defaultPageSize?: number;
  maxPageSize?: number;
  selectFields?: string[];
}

/**
 * 默认查询优化配置
 */
const DEFAULT_CONFIG: QueryOptimizerConfig = {
  enableCache: true,
  cacheTimeout: 300, // 5分钟
  enableCursorPagination: true,
  defaultPageSize: 20,
  maxPageSize: 100
};

/**
 * 游标分页参数
 */
interface CursorPaginationParams {
  cursor?: string; // 游标（通常是上一页最后一条记录的ID或时间戳）
  limit?: number;
  sortField?: string;
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * 传统分页参数
 */
interface OffsetPaginationParams {
  pageIndex?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * 查询结果
 */
interface QueryResult<T> {
  data: T[];
  total?: number;
  hasMore?: boolean;
  nextCursor?: string;
  pageIndex?: number;
  pageSize?: number;
  totalPages?: number;
}

/**
 * 优化的查询类
 */
export class QueryOptimizer {
  private config: QueryOptimizerConfig;

  constructor(config: Partial<QueryOptimizerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 执行优化的查询（支持缓存和游标分页）
   */
  async optimizedQuery<T extends Model>(
    model: ModelStatic<T>,
    whereCondition: any,
    paginationParams: CursorPaginationParams | OffsetPaginationParams,
    tableName: string,
    additionalOptions: Partial<FindOptions> = {}
  ): Promise<QueryResult<T>> {
    // 生成缓存键
    const cacheKey = this.generateCacheKey(tableName, whereCondition, paginationParams);
    
    // 尝试从缓存获取
    if (this.config.enableCache) {
      const cached = await getCache<QueryResult<T>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    let result: QueryResult<T>;

    // 判断使用游标分页还是传统分页
    if (this.isCursorPagination(paginationParams) && this.config.enableCursorPagination) {
      result = await this.executeCursorQuery(model, whereCondition, paginationParams, additionalOptions);
    } else {
      result = await this.executeOffsetQuery(model, whereCondition, paginationParams as OffsetPaginationParams, additionalOptions);
    }

    // 缓存结果
    if (this.config.enableCache) {
      await setCache(cacheKey, result, { ttl: this.config.cacheTimeout });
    }

    return result;
  }

  /**
   * 执行游标分页查询
   */
  private async executeCursorQuery<T extends Model>(
    model: ModelStatic<T>,
    whereCondition: any,
    params: CursorPaginationParams,
    additionalOptions: Partial<FindOptions>
  ): Promise<QueryResult<T>> {
    const limit = Math.min(params.limit || this.config.defaultPageSize!, this.config.maxPageSize!);
    const sortField = params.sortField || 'id';
    const sortOrder = params.sortOrder || 'DESC';

    // 构建游标条件
    const cursorCondition = { ...whereCondition };
    if (params.cursor) {
      const cursorOp = sortOrder === 'DESC' ? Op.lt : Op.gt;
      cursorCondition[sortField] = { [cursorOp]: params.cursor };
    }

    // 执行查询（多查询一条以判断是否还有更多数据）
    const queryOptions: FindOptions = {
      where: cursorCondition,
      limit: limit + 1,
      order: [[sortField, sortOrder]],
      ...additionalOptions
    };

    // 添加字段选择
    if (this.config.selectFields && this.config.selectFields.length > 0) {
      queryOptions.attributes = this.config.selectFields;
    }

    const results = await model.findAll(queryOptions);
    
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;
    const nextCursor = hasMore && data.length > 0 ? (data[data.length - 1] as any)[sortField] : undefined;

    return {
      data,
      hasMore,
      nextCursor
    };
  }

  /**
   * 执行传统偏移分页查询
   */
  private async executeOffsetQuery<T extends Model>(
    model: ModelStatic<T>,
    whereCondition: any,
    params: OffsetPaginationParams,
    additionalOptions: Partial<FindOptions>
  ): Promise<QueryResult<T>> {
    const pageIndex = params.pageIndex || 1;
    const pageSize = Math.min(params.pageSize || this.config.defaultPageSize!, this.config.maxPageSize!);
    const sortField = params.sortField || 'updated_time';
    const sortOrder = params.sortOrder || 'DESC';
    const offset = (pageIndex - 1) * pageSize;

    const queryOptions: FindOptions = {
      where: whereCondition,
      limit: pageSize,
      offset,
      order: [[sortField, sortOrder]],
      ...additionalOptions
    };

    // 添加字段选择
    if (this.config.selectFields && this.config.selectFields.length > 0) {
      queryOptions.attributes = this.config.selectFields;
    }

    const result = await model.findAndCountAll(queryOptions);
    const totalPages = Math.ceil(result.count / pageSize);

    return {
      data: result.rows,
      total: result.count,
      pageIndex,
      pageSize,
      totalPages
    };
  }

  /**
   * 判断是否为游标分页
   */
  private isCursorPagination(params: any): params is CursorPaginationParams {
    return 'cursor' in params || (!('pageIndex' in params) && !('pageSize' in params));
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(
    tableName: string,
    whereCondition: any,
    paginationParams: any
  ): string {
    const params = {
      table: tableName,
      where: whereCondition,
      pagination: paginationParams,
      fields: this.config.selectFields
    };
    return generateQueryCacheKey('optimized_query', params);
  }

  /**
   * 设置查询字段
   */
  setSelectFields(fields: string[]): void {
    this.config.selectFields = fields;
  }

  /**
   * 清除相关缓存
   */
  async clearCache(tableName: string): Promise<void> {
    const { deleteCachePattern } = await import('./cache');
    await deleteCachePattern(`*${tableName}*`);
  }
}

/**
 * 创建查询优化器实例
 */
export function createQueryOptimizer(config?: Partial<QueryOptimizerConfig>): QueryOptimizer {
  return new QueryOptimizer(config);
}

/**
 * 预定义的字段选择配置
 */
export const FIELD_SELECTIONS = {
  MALL_STATE: ['id', 'mall_id', 'mall_name', 'region_name', 'updated_time'],
  ARRIVAL_DATA: ['id', 'mall_id', 'sku_id', 'accounting_time', 'arrival_quantity', 'updated_time'],
  COST_SETTLEMENT: ['id', 'mall_id', 'sku_id', 'product_name', 'cost_price', 'updated_time'],
  PENDING_SETTLEMENT: ['id', 'mall_id', 'sku_id', 'pending_amount', 'updated_time'],
  SALES_DETAILS: ['id', 'mall_id', 'sku_id', 'sales_amount', 'sales_quantity', 'updated_time']
};