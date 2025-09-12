import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../lib/database';

interface CostSettlementAttributes {
  id: number;
  mallId: string;
  mallName: string;
  skuId: string;
  skuCode?: string;
  skuProperty?: string;
  productName?: string;
  goodsName?: string;
  costPrice?: number;
  pendingAveragePrice?: number;
  pendingSalesVolume?: number;
  pendingSalesAmount?: number;
  pendingProfitRate?: number;
  pendingGrossProfit?: number;
  d30ArrivalAveragePrice?: number;
  d30ArrivalSalesVolume?: number;
  d30ArrivalSalesAmount?: number;
  d30ArrivalProfitRate?: number;
  d30ArrivalGrossProfit?: number;
  createdTime: Date;
  pendingUpdatedTime?: Date;
  arrivalUpdatedTime?: Date;
  updatedTime: Date;
}

interface CostSettlementCreationAttributes
  extends Optional<
    CostSettlementAttributes,
    | 'id'
    | 'skuCode'
    | 'skuProperty'
    | 'productName'
    | 'goodsName'
    | 'costPrice'
    | 'pendingAveragePrice'
    | 'pendingSalesVolume'
    | 'pendingSalesAmount'
    | 'pendingProfitRate'
    | 'pendingGrossProfit'
    | 'd30ArrivalAveragePrice'
    | 'd30ArrivalSalesVolume'
    | 'd30ArrivalSalesAmount'
    | 'd30ArrivalProfitRate'
    | 'd30ArrivalGrossProfit'
    | 'createdTime'
    | 'pendingUpdatedTime'
    | 'arrivalUpdatedTime'
    | 'updatedTime'
  > {}

class CostSettlement
  extends Model<CostSettlementAttributes, CostSettlementCreationAttributes>
  implements CostSettlementAttributes
{
  public id!: number;
  public mallId!: string;
  public mallName!: string;
  public skuId!: string;
  public skuCode?: string;
  public skuProperty?: string;
  public productName?: string;
  public goodsName?: string;
  public costPrice?: number;
  public pendingAveragePrice?: number;
  public pendingSalesVolume?: number;
  public pendingSalesAmount?: number;
  public pendingProfitRate?: number;
  public pendingGrossProfit?: number;
  public d30ArrivalAveragePrice?: number;
  public d30ArrivalSalesVolume?: number;
  public d30ArrivalSalesAmount?: number;
  public d30ArrivalProfitRate?: number;
  public d30ArrivalGrossProfit?: number;
  public createdTime!: Date;
  public pendingUpdatedTime?: Date;
  public arrivalUpdatedTime?: Date;
  public updatedTime!: Date;
}

CostSettlement.init(
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
    skuId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: 'sku_id',
      comment: 'SKU ID',
    },
    skuCode: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'sku_code',
      comment: 'SKU编码',
    },
    skuProperty: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'sku_property',
      comment: 'SKU属性',
    },
    productName: {
      type: DataTypes.STRING(510),
      allowNull: true,
      field: 'product_name',
      comment: '产品名称',
    },
    goodsName: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'goods_name',
      comment: '商品名称',
    },
    costPrice: {
      type: DataTypes.DECIMAL(10, 5),
      allowNull: true,
      field: 'cost_price',
      comment: '成本价格',
    },
    pendingAveragePrice: {
      type: DataTypes.DECIMAL(10, 5),
      allowNull: true,
      field: 'pending_average_price',
      comment: '待结算平均价格',
    },
    pendingSalesVolume: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'pending_sales_volume',
      comment: '待结算销售数量',
    },
    pendingSalesAmount: {
      type: DataTypes.DECIMAL(10, 5),
      allowNull: true,
      field: 'pending_sales_amount',
      comment: '待结算销售金额',
    },
    pendingProfitRate: {
      type: DataTypes.DECIMAL(10, 5),
      allowNull: true,
      field: 'pending_profit_rate',
      comment: '待结算利润率',
    },
    pendingGrossProfit: {
      type: DataTypes.DECIMAL(10, 5),
      allowNull: true,
      field: 'pending_gross_profit',
      comment: '待结算毛利润',
    },
    d30ArrivalAveragePrice: {
      type: DataTypes.DECIMAL(10, 5),
      allowNull: true,
      field: 'd30_arrival_average_price',
      comment: '30天到货平均价格',
    },
    d30ArrivalSalesVolume: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'd30_arrival_sales_volume',
      comment: '30天到货销售数量',
    },
    d30ArrivalSalesAmount: {
      type: DataTypes.DECIMAL(10, 5),
      allowNull: true,
      field: 'd30_arrival_sales_amount',
      comment: '30天到货销售金额',
    },
    d30ArrivalProfitRate: {
      type: DataTypes.DECIMAL(10, 5),
      allowNull: true,
      field: 'd30_arrival_profit_rate',
      comment: '30天到货利润率',
    },
    d30ArrivalGrossProfit: {
      type: DataTypes.DECIMAL(10, 5),
      allowNull: true,
      field: 'd30_arrival_gross_profit',
      comment: '30天到货毛利润',
    },
    createdTime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_time',
    },
    pendingUpdatedTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'pending_updated_time',
      comment: '待结算更新时间',
    },
    arrivalUpdatedTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'arrival_updated_time',
      comment: '到货更新时间',
    },
    updatedTime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_time',
    },
  },
  {
    sequelize,
    tableName: 'cost_settlement',
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
        fields: ['sku_id'],
        unique: true,
      },
      {
        fields: ['cost_price'],
      },
    ],
  }
);

export default CostSettlement;