import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../lib/database';

interface PackageHistoryAttributes {
  id: number;
  packageId: number;
  packageName: string;
  packageDesc: string;
  packageType: string;
  originalPrice: number;
  durationMonths: number;
  maxBindMall: number;
  discountPercent?: number;
  discountStartTime?: Date;
  discountEndTime?: Date;
  createdTime: Date;
  updatedTime: Date;
}

interface PackageHistoryCreationAttributes
  extends Optional<
    PackageHistoryAttributes,
    | 'id'
    | 'discountPercent'
    | 'discountStartTime'
    | 'discountEndTime'
    | 'createdTime'
    | 'updatedTime'
  > {}

class PackageHistory
  extends Model<PackageHistoryAttributes, PackageHistoryCreationAttributes>
  implements PackageHistoryAttributes
{
  public id!: number;
  public packageId!: number;
  public packageName!: string;
  public packageDesc!: string;
  public packageType!: string;
  public originalPrice!: number;
  public durationMonths!: number;
  public maxBindMall!: number;
  public discountPercent?: number;
  public discountStartTime?: Date;
  public discountEndTime?: Date;
  public createdTime!: Date;
  public updatedTime!: Date;
}

PackageHistory.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    packageId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'package_id',
      comment: '套餐ID',
    },
    packageName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'package_name',
      comment: '套餐名称',
    },
    packageDesc: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'package_desc',
      comment: '套餐描述',
    },
    packageType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'package_type',
      comment: '套餐类型',
    },
    originalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'original_price',
      comment: '原价',
    },
    durationMonths: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'duration_months',
      comment: '持续月数',
    },
    maxBindMall: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'max_bind_mall',
      comment: '最大绑定商城数',
    },
    discountPercent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'discount_percent',
      comment: '折扣百分比',
    },
    discountStartTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'discount_start_time',
      comment: '折扣开始时间',
    },
    discountEndTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'discount_end_time',
      comment: '折扣结束时间',
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
    tableName: 'package_history',
    timestamps: true,
    createdAt: 'createdTime',
    updatedAt: 'updatedTime',
    indexes: [
      {
        fields: ['package_id'],
      },
    ],
  }
);

export default PackageHistory;