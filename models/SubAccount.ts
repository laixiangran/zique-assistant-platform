import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../lib/database'
import User from './User'

interface SubAccountAttributes {
  id: number
  parentUserId: number
  username: string
  password: string
  salt?: string
  role?: string
  status?: string
  lastLoginTime?: Date
  createdTime: Date
  updatedTime: Date
}

interface SubAccountCreationAttributes extends Optional<SubAccountAttributes, 'id' | 'salt' | 'role' | 'status' | 'lastLoginTime' | 'createdTime' | 'updatedTime'> {}

class SubAccount extends Model<SubAccountAttributes, SubAccountCreationAttributes> implements SubAccountAttributes {
  public id!: number
  public parentUserId!: number
  public username!: string
  public password!: string
  public salt?: string
  public role?: string
  public status?: string
  public lastLoginTime?: Date
  public createdTime!: Date
  public updatedTime!: Date
}

SubAccount.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    parentUserId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      field: 'parent_user_id',
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    salt: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    lastLoginTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login_time',
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
    tableName: 'sub_accounts',
    timestamps: true,
    createdAt: 'createdTime',
    updatedAt: 'updatedTime',
  }
)

// 关联关系在 models/index.ts 中定义

export default SubAccount