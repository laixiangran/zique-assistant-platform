import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../lib/database'
import User from './User'
import Invitation from './Invitation'

interface InvitationRewardAttributes {
  id: number
  inviterId: number
  invitationId: number
  rewardType: 'free_shops' | 'discount' | 'cash' | 'points'
  rewardValue: number
  rewardDescription: string
  status: 'pending' | 'granted' | 'expired'
  grantedAt?: Date
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
}

interface InvitationRewardCreationAttributes extends Optional<InvitationRewardAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class InvitationReward extends Model<InvitationRewardAttributes, InvitationRewardCreationAttributes> implements InvitationRewardAttributes {
  public id!: number
  public inviterId!: number
  public invitationId!: number
  public rewardType!: 'free_shops' | 'discount' | 'cash' | 'points'
  public rewardValue!: number
  public rewardDescription!: string
  public status!: 'pending' | 'granted' | 'expired'
  public grantedAt?: Date
  public expiresAt?: Date
  public createdAt!: Date
  public updatedAt!: Date
}

InvitationReward.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    inviterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      field: 'inviter_id',
      comment: '邀请人ID',
    },
    invitationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Invitation,
        key: 'id',
      },
      field: 'invitation_id',
      comment: '邀请记录ID',
    },
    rewardType: {
      type: DataTypes.ENUM('free_shops', 'discount', 'cash', 'points'),
      allowNull: false,
      field: 'reward_type',
      comment: '奖励类型：免费店铺、折扣、现金、积分',
    },
    rewardValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'reward_value',
      comment: '奖励数值',
    },
    rewardDescription: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'reward_description',
      comment: '奖励描述',
    },
    status: {
      type: DataTypes.ENUM('pending', 'granted', 'expired'),
      defaultValue: 'pending',
      comment: '奖励状态',
    },
    grantedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'granted_at',
      comment: '奖励发放时间',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at',
      comment: '奖励过期时间',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'invitation_rewards',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }
)

// 定义关联关系
InvitationReward.belongsTo(User, {
  foreignKey: 'inviterId',
  as: 'inviter',
})

InvitationReward.belongsTo(Invitation, {
  foreignKey: 'invitationId',
  as: 'invitation',
})

User.hasMany(InvitationReward, {
  foreignKey: 'inviterId',
  as: 'invitationRewards',
})

Invitation.hasMany(InvitationReward, {
  foreignKey: 'invitationId',
  as: 'rewards',
})

export default InvitationReward