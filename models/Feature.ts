import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../lib/database';

interface FeatureAttributes {
  id: number;
  featureCode: string;
  featureName: string;
  featureType?: 'data' | 'tool' | 'custom';
  description?: string;
  createdTime: Date;
  updatedTime: Date;
}

interface FeatureCreationAttributes
  extends Optional<
    FeatureAttributes,
    'id' | 'featureType' | 'description' | 'createdTime' | 'updatedTime'
  > {}

class Feature
  extends Model<FeatureAttributes, FeatureCreationAttributes>
  implements FeatureAttributes
{
  public id!: number;
  public featureCode!: string;
  public featureName!: string;
  public featureType?: 'data' | 'tool' | 'custom';
  public description?: string;
  public createdTime!: Date;
  public updatedTime!: Date;
}

Feature.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    featureCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'feature_code',
    },
    featureName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'feature_name',
    },
    featureType: {
      type: DataTypes.ENUM('data', 'tool', 'custom'),
      allowNull: true,
      field: 'feature_type',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    tableName: 'features',
    timestamps: true,
    createdAt: 'createdTime',
    updatedAt: 'updatedTime',
  }
);

export default Feature;
