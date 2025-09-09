import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../lib/database';

interface AdminAttributes {
  id: number;
  username: string;
  password: string;
  email: string;
  phone?: string;
  realName?: string;
  salt?: string;
  status: 'active' | 'inactive' | 'suspended';
  role: 'super_admin' | 'admin';
  lastLoginTime?: Date;
  lastLoginIp?: string;
  createdTime: Date;
  updatedTime: Date;
}

interface AdminCreationAttributes
  extends Optional<
    AdminAttributes,
    | 'id'
    | 'phone'
    | 'realName'
    | 'salt'
    | 'lastLoginTime'
    | 'lastLoginIp'
    | 'createdTime'
    | 'updatedTime'
  > {}

class Admin
  extends Model<AdminAttributes, AdminCreationAttributes>
  implements AdminAttributes
{
  public id!: number;
  public username!: string;
  public password!: string;
  public email!: string;
  public phone?: string;
  public realName?: string;
  public salt?: string;
  public status!: 'active' | 'inactive' | 'suspended';
  public role!: 'super_admin' | 'admin';
  public lastLoginTime?: Date;
  public lastLoginIp?: string;
  public createdTime!: Date;
  public updatedTime!: Date;
}

Admin.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: '管理员用户名',
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '密码',
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: '邮箱',
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '手机号',
    },
    realName: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'real_name',
      comment: '真实姓名',
    },
    salt: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '密码盐值',
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended'),
      allowNull: false,
      defaultValue: 'active',
      comment: '状态：active-活跃，inactive-非活跃，suspended-已停用',
    },
    role: {
      type: DataTypes.ENUM('super_admin', 'admin'),
      allowNull: false,
      defaultValue: 'admin',
      comment: '角色：super_admin-超级管理员，admin-普通管理员',
    },
    lastLoginTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login_time',
      comment: '最后登录时间',
    },
    lastLoginIp: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'last_login_ip',
      comment: '最后登录IP',
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
    modelName: 'Admin',
    tableName: 'admins',
    timestamps: true,
    createdAt: 'createdTime',
    updatedAt: 'updatedTime',
    indexes: [
      {
        fields: ['username'],
        unique: true,
      },
      {
        fields: ['email'],
        unique: true,
      },
      {
        fields: ['status'],
      },
      {
        fields: ['role'],
      },
    ],
  }
);

export default Admin;
