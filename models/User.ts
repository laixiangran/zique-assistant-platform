import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../lib/database';

interface UserAttributes {
  id: number;
  username: string;
  password: string;
  phone: string;
  email: string;
  inviteCode: string;
  salt?: string;
  status: 'active' | 'inactive' | 'suspended';
  lastLoginTime?: Date;
  createdTime: Date;
  updatedTime: Date;
}

interface UserCreationAttributes
  extends Optional<
    UserAttributes,
    'id' | 'salt' | 'lastLoginTime' | 'createdTime' | 'updatedTime'
  > {}

class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  public id!: number;
  public username!: string;
  public password!: string;
  public phone!: string;
  public email!: string;
  public inviteCode!: string;
  public salt?: string;
  public status!: 'active' | 'inactive' | 'suspended';
  public lastLoginTime?: Date;
  public createdTime!: Date;
  public updatedTime!: Date;
}

User.init(
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
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    inviteCode: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'invite_code',
    },
    salt: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended'),
      allowNull: false,
      defaultValue: 'active',
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
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    createdAt: 'createdTime',
    updatedAt: 'updatedTime',
  }
);

export default User;
