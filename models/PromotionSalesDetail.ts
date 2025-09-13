import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/lib/database';

interface PromotionSalesDetailAttributes {
  id: number;
  mallId: string;
  mallName: string;
  spuId?: string;
  skcId?: string;
  skuId?: string;
  declaredPrice?: number;
  costPrice?: number;
  todaySalesCost?: number;
  todaySalesVolume?: number;
  todaySalesAmount?: number;
  todayPromotionSalesVolume?: number;
  todayPromotionSalesAmount?: number;
  todayAveragePrice?: number;
  todayGrossProfit?: number;
  todayProfitRate?: number;
  currency?: string;
  createdTime: Date;
  updatedTime: Date;
}

interface PromotionSalesDetailCreationAttributes
  extends Optional<
    PromotionSalesDetailAttributes,
    | 'id'
    | 'spuId'
    | 'skcId'
    | 'skuId'
    | 'declaredPrice'
    | 'costPrice'
    | 'todaySalesCost'
    | 'todaySalesVolume'
    | 'todaySalesAmount'
    | 'todayPromotionSalesVolume'
    | 'todayPromotionSalesAmount'
    | 'todayAveragePrice'
    | 'todayGrossProfit'
    | 'todayProfitRate'
    | 'currency'
    | 'createdTime'
    | 'updatedTime'
  > {}

class PromotionSalesDetail
  extends Model<
    PromotionSalesDetailAttributes,
    PromotionSalesDetailCreationAttributes
  >
  implements PromotionSalesDetailAttributes
{
  public id!: number;
  public mallId!: string;
  public mallName!: string;
  public spuId?: string;
  public skcId?: string;
  public skuId?: string;
  public declaredPrice?: number;
  public costPrice?: number;
  public todaySalesCost?: number;
  public todaySalesVolume?: number;
  public todaySalesAmount?: number;
  public todayPromotionSalesVolume?: number;
  public todayPromotionSalesAmount?: number;
  public todayAveragePrice?: number;
  public todayGrossProfit?: number;
  public todayProfitRate?: number;
  public currency?: string;
  public createdTime!: Date;
  public updatedTime!: Date;
}

PromotionSalesDetail.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    mallId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'mall_id',
      comment: '商城ID',
    },
    mallName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'mall_name',
      comment: '商城名称',
    },
    spuId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'spu_id',
      comment: 'SPU ID',
    },
    skcId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'skc_id',
      comment: 'SKC ID',
    },
    skuId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'sku_id',
      comment: 'SKU ID',
    },
    declaredPrice: {
      type: DataTypes.DECIMAL(10, 5),
      allowNull: true,
      field: 'declared_price',
      comment: '申报价格',
    },
    costPrice: {
      type: DataTypes.DECIMAL(10, 5),
      allowNull: true,
      field: 'cost_price',
      comment: '成本价格',
    },
    todaySalesCost: {
      type: DataTypes.DECIMAL(10, 5),
      allowNull: true,
      field: 'today_sales_cost',
      comment: '今日销售成本',
    },
    todaySalesVolume: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'today_sales_volume',
      comment: '今日销售数量',
    },
    todaySalesAmount: {
      type: DataTypes.DECIMAL(10, 5),
      allowNull: true,
      field: 'today_sales_amount',
      comment: '今日销售金额',
    },
    todayPromotionSalesVolume: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'today_promotion_sales_volume',
      comment: '今日促销销售数量',
    },
    todayPromotionSalesAmount: {
      type: DataTypes.DECIMAL(10, 5),
      allowNull: true,
      field: 'today_promotion_sales_amount',
      comment: '今日促销销售金额',
    },
    todayAveragePrice: {
      type: DataTypes.DECIMAL(10, 5),
      allowNull: true,
      field: 'today_average_price',
      comment: '今日平均价格',
    },
    todayGrossProfit: {
      type: DataTypes.DECIMAL(10, 5),
      allowNull: true,
      field: 'today_gross_profit',
      comment: '今日毛利润',
    },
    todayProfitRate: {
      type: DataTypes.DECIMAL(10, 5),
      allowNull: true,
      field: 'today_profit_rate',
      comment: '今日利润率',
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: '货币类型',
    },
    createdTime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_time',
    },
    updatedTime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_time',
    },
  },
  {
    sequelize,
    tableName: 'promotion_sales_details',
    timestamps: true,
    createdAt: 'createdTime',
    updatedAt: 'updatedTime',
    indexes: [
      {
        fields: ['mall_id'],
      },
      {
        fields: ['mall_name'],
      },
      {
        unique: true,
        fields: ['sku_id'],
      },
    ],
  }
);

export default PromotionSalesDetail;
