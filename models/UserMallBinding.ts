import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../lib/database'
import User from './User'

interface UserMallBindingAttributes {
  id: number
  userId: number
  mallId: number
  mallName: string
  bindTime?: Date
  createdTime: Date
  updatedTime: Date
}

interface UserMallBindingCreationAttributes extends Optional<UserMallBindingAttributes, 'id' | 'bindTime' | 'createdTime' | 'updatedTime'> {}

class UserMallBinding extends Model<UserMallBindingAttributes, UserMallBindingCreationAttributes> implements UserMallBindingAttributes {
  public id!: number
  public userId!: number
  public mallId!: number
  public mallName!: string
  public bindTime?: Date
  public createdTime!: Date
  public updatedTime!: Date
}

UserMallBinding.init(
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
    mallId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'mall_id',
    },
    mallName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'mall_name',
    },
    bindTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'bind_time',
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
    tableName: 'user_mall_bindings',
    timestamps: true,
    createdAt: 'createdTime',
    updatedAt: 'updatedTime',
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'shop_id', 'shop_platform'],
        name: 'unique_user_shop_binding',
      },
    ],
  }
)

// 定义关联关系
UserMallBinding.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
})

User.hasMany(UserMallBinding, {
  foreignKey: 'userId',
  as: 'shopBindings',
})

export default UserMallBinding