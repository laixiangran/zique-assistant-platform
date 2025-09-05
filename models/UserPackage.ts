import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../lib/database';
import User from './User';
import MembershipPackage from './MembershipPackage';

interface UserPackageAttributes {
  id: number;
  userId: number;
  packageId: number;
  orderTime?: Date;
  expireTime?: Date;
  isActive?: boolean;
  createdTime: Date;
  updatedTime: Date;
}

interface UserPackageCreationAttributes
  extends Optional<
    UserPackageAttributes,
    | 'id'
    | 'orderTime'
    | 'expireTime'
    | 'isActive'
    | 'createdTime'
    | 'updatedTime'
  > {}

class UserPackage
  extends Model<UserPackageAttributes, UserPackageCreationAttributes>
  implements UserPackageAttributes
{
  public id!: number;
  public userId!: number;
  public packageId!: number;
  public orderTime?: Date;
  public expireTime?: Date;
  public isActive?: boolean;
  public createdTime!: Date;
  public updatedTime!: Date;
}

UserPackage.init(
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
    packageId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: MembershipPackage,
        key: 'id',
      },
      field: 'package_id',
    },
    orderTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'order_time',
    },
    expireTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expire_time',
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
    tableName: 'user_packages',
    timestamps: true,
    createdAt: 'createdTime',
    updatedAt: 'updatedTime',
  }
);

// 定义关联关系
UserPackage.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

UserPackage.belongsTo(MembershipPackage, {
  foreignKey: 'packageId',
  as: 'package',
});

User.hasMany(UserPackage, {
  foreignKey: 'userId',
  as: 'packages',
});

MembershipPackage.hasMany(UserPackage, {
  foreignKey: 'packageId',
  as: 'userPackages',
});

export default UserPackage;
