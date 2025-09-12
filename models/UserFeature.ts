import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../lib/database';
import User from './User';
import Feature from './Feature';

interface UserFeatureAttributes {
  id: number;
  userId: number;
  featureId: number;
  grantedTime: Date;
  expireTime?: Date;
  createdTime: Date;
  updatedTime: Date;
}

interface UserFeatureCreationAttributes
  extends Optional<
    UserFeatureAttributes,
    'id' | 'grantedTime' | 'expireTime' | 'createdTime' | 'updatedTime'
  > {}

class UserFeature
  extends Model<UserFeatureAttributes, UserFeatureCreationAttributes>
  implements UserFeatureAttributes
{
  public id!: number;
  public userId!: number;
  public featureId!: number;
  public grantedTime!: Date;
  public expireTime?: Date;
  public createdTime!: Date;
  public updatedTime!: Date;
}

UserFeature.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'user_id',
      comment: '用户ID',
      references: {
        model: User,
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
    grantedTime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'granted_time',
      comment: '授权时间',
      defaultValue: DataTypes.NOW,
    },
    expireTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expire_time',
      comment: '过期时间',
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
    tableName: 'user_features',
    timestamps: true,
    createdAt: 'createdTime',
    updatedAt: 'updatedTime',
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['feature_id'],
      },
      {
        unique: true,
        fields: ['user_id', 'feature_id'],
      },
    ],
  }
);

// 定义关联关系
UserFeature.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

UserFeature.belongsTo(Feature, {
  foreignKey: 'featureId',
  as: 'feature',
});

export default UserFeature;