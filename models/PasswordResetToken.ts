import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../lib/database';
import User from './User';

interface PasswordResetTokenAttributes {
  id: number;
  userId: number;
  token: string;
  email: string;
  expiresTime: Date;
  used: boolean;
  createdTime: Date;
  updatedTime: Date;
}

interface PasswordResetTokenCreationAttributes
  extends Optional<
    PasswordResetTokenAttributes,
    'id' | 'used' | 'createdTime' | 'updatedTime'
  > {}

class PasswordResetToken
  extends Model<
    PasswordResetTokenAttributes,
    PasswordResetTokenCreationAttributes
  >
  implements PasswordResetTokenAttributes
{
  public id!: number;
  public userId!: number;
  public token!: string;
  public email!: string;
  public expiresTime!: Date;
  public used!: boolean;
  public createdTime!: Date;
  public updatedTime!: Date;
}

PasswordResetToken.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      field: 'user_id',
    },
    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    expiresTime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_time',
    },
    used: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    tableName: 'password_reset_tokens',
    timestamps: true,
    createdAt: 'createdTime',
    updatedAt: 'updatedTime',
    indexes: [
      {
        fields: ['token'],
        unique: true,
      },
      {
        fields: ['email'],
      },
      {
        fields: ['expires_at'],
      },
    ],
  }
);

// 定义关联关系
PasswordResetToken.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

User.hasMany(PasswordResetToken, {
  foreignKey: 'userId',
  as: 'passwordResetTokens',
});

export default PasswordResetToken;
