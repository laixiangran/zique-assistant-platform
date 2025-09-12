import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../lib/database';

interface ArrivalDataDetailAttributes {
  id: number;
  mallId: string;
  mallName: string;
  regionCode?: string;
  regionName?: string;
  accountingTime?: Date;
  skuId: string;
  skuCode?: string;
  goodsName?: string;
  skuProperty?: string;
  salesVolume?: number;
  salesAmount?: number;
  currency?: string;
  createdTime: Date;
  updatedTime: Date;
}

interface ArrivalDataDetailCreationAttributes
  extends Optional<
    ArrivalDataDetailAttributes,
    | 'id'
    | 'regionCode'
    | 'regionName'
    | 'accountingTime'
    | 'skuCode'
    | 'goodsName'
    | 'skuProperty'
    | 'salesVolume'
    | 'salesAmount'
    | 'currency'
    | 'createdTime'
    | 'updatedTime'
  > {}

class ArrivalDataDetail
  extends Model<ArrivalDataDetailAttributes, ArrivalDataDetailCreationAttributes>
  implements ArrivalDataDetailAttributes
{
  public id!: number;
  public mallId!: string;
  public mallName!: string;
  public regionCode?: string;
  public regionName?: string;
  public accountingTime?: Date;
  public skuId!: string;
  public skuCode?: string;
  public goodsName?: string;
  public skuProperty?: string;
  public salesVolume?: number;
  public salesAmount?: number;
  public currency?: string;
  public createdTime!: Date;
  public updatedTime!: Date;
}

ArrivalDataDetail.init(
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
    regionCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'region_code',
      comment: '地区代码',
    },
    regionName: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'region_name',
      comment: '地区名称',
    },
    accountingTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'accounting_time',
      comment: '核算时间',
    },
    skuId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'sku_id',
      comment: 'SKU ID',
    },
    skuCode: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'sku_code',
      comment: 'SKU编码',
    },
    goodsName: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'goods_name',
      comment: '商品名称',
    },
    skuProperty: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'sku_property',
      comment: 'SKU属性',
    },
    salesVolume: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'sales_volume',
      comment: '销售数量',
    },
    salesAmount: {
      type: DataTypes.DECIMAL(10, 5),
      allowNull: true,
      field: 'sales_amount',
      comment: '销售金额',
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
    tableName: 'arrival_data_details',
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
        fields: ['region_code'],
      },
      {
        fields: ['region_name'],
      },
      {
        fields: ['accounting_time'],
      },
      {
        fields: ['sku_id'],
      },
    ],
  }
);

export default ArrivalDataDetail;