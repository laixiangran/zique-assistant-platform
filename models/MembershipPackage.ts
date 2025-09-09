import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../lib/database';

interface MembershipPackageAttributes {
  id: number;
  packageName: string;
  packageDesc?: string;
  packageType?: 'try' | 'official';
  originalPrice?: number;
  durationMonths?: number;
  maxBindMall?: number;
  discountPercent?: number;
  discountStartTime?: Date;
  discountEndTime?: Date;
  isActive?: boolean;
  createdTime: Date;
  updatedTime: Date;
}

interface MembershipPackageCreationAttributes
  extends Optional<
    MembershipPackageAttributes,
    | 'id'
    | 'packageDesc'
    | 'packageType'
    | 'originalPrice'
    | 'durationMonths'
    | 'maxBindMall'
    | 'discountPercent'
    | 'discountStartTime'
    | 'discountEndTime'
    | 'isActive'
    | 'createdTime'
    | 'updatedTime'
  > {}

class MembershipPackage
  extends Model<
    MembershipPackageAttributes,
    MembershipPackageCreationAttributes
  >
  implements MembershipPackageAttributes
{
  public id!: number;
  public packageName!: string;
  public packageDesc?: string;
  public packageType?: 'try' | 'official';
  public originalPrice?: number;
  public durationMonths?: number;
  public maxBindMall?: number;
  public discountPercent?: number;
  public discountStartTime?: Date;
  public discountEndTime?: Date;
  public isActive?: boolean;
  public createdTime!: Date;
  public updatedTime!: Date;
}

MembershipPackage.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    packageName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'package_name',
    },
    packageDesc: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'package_desc',
    },
    packageType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'package_type',
    },
    originalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'original_price',
    },
    durationMonths: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'duration_months',
    },
    maxBindMall: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'max_bind_mall',
    },
    discountPercent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'discount_percent',
    },
    discountStartTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'discount_start_time',
    },
    discountEndTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'discount_end_time',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
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
    tableName: 'membership_packages',
    timestamps: true,
    createdAt: 'createdTime',
    updatedAt: 'updatedTime',
  }
);

export default MembershipPackage;
