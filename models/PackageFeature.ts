import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../lib/database';
import MembershipPackage from './MembershipPackage';
import Feature from './Feature';

interface PackageFeatureAttributes {
  id: number;
  packageId: number;
  featureId: number;
  createdTime: Date;
  updatedTime: Date;
}

interface PackageFeatureCreationAttributes
  extends Optional<
    PackageFeatureAttributes,
    'id' | 'createdTime' | 'updatedTime'
  > {}

class PackageFeature
  extends Model<PackageFeatureAttributes, PackageFeatureCreationAttributes>
  implements PackageFeatureAttributes
{
  public id!: number;
  public packageId!: number;
  public featureId!: number;
  public createdTime!: Date;
  public updatedTime!: Date;
}

PackageFeature.init(
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
      references: {
        model: MembershipPackage,
        key: 'id',
      },
    },
    featureId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'feature_id',
      comment: '功能ID',
      references: {
        model: Feature,
        key: 'id',
      },
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
    tableName: 'package_features',
    timestamps: true,
    createdAt: 'createdTime',
    updatedAt: 'updatedTime',
    indexes: [
      {
        fields: ['package_id'],
      },
      {
        fields: ['feature_id'],
      },
    ],
  }
);

// 定义关联关系
PackageFeature.belongsTo(MembershipPackage, {
  foreignKey: 'packageId',
  as: 'package',
});

PackageFeature.belongsTo(Feature, {
  foreignKey: 'featureId',
  as: 'feature',
});

export default PackageFeature;