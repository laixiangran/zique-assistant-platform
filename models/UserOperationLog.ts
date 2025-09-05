import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../lib/database';
import User from './User';

interface UserOperationLogAttributes {
  id: number;
  userId: number;
  operationType: string;
  operationDesc: string;
  ipAddress?: string;
  userAgent?: string;
  createdTime: Date;
  updateTime: Date;
}

interface UserOperationLogCreationAttributes
  extends Optional<
    UserOperationLogAttributes,
    'id' | 'createdTime' | 'updateTime'
  > {}

class UserOperationLog
  extends Model<UserOperationLogAttributes, UserOperationLogCreationAttributes>
  implements UserOperationLogAttributes
{
  public id!: number;
  public userId!: number;
  public operationType!: string;
  public operationDesc!: string;
  public ipAddress?: string;
  public userAgent?: string;
  public createdTime!: Date;
  public updateTime!: Date;
}

UserOperationLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      field: 'user_id',
      comment: '操作用户ID',
    },
    operationType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'operation_type',
      comment: '操作类型',
    },
    operationDesc: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'operation_desc',
      comment: '操作描述',
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'ip_address',
      comment: 'IP地址',
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'user_agent',
      comment: '用户代理',
    },
    createdTime: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_time',
    },
    updateTime: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_time',
    },
  },
  {
    sequelize,
    tableName: 'user_operation_logs',
    timestamps: false,
    indexes: [
      {
        fields: ['user_id', 'created_at'],
        name: 'idx_user_operation_time',
      },
      {
        fields: ['operation_type'],
        name: 'idx_operation_type',
      },
    ],
  }
);

// 定义关联关系
UserOperationLog.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

User.hasMany(UserOperationLog, {
  foreignKey: 'userId',
  as: 'operationLogs',
});

export default UserOperationLog;
