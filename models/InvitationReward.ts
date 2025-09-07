import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../lib/database';
import User from './User';
import Invitation from './Invitation';

interface InvitationRewardAttributes {
  id: number;
  invitationId: number;
  userId: number;
  rewardType: 'free_malls' | 'discount' | 'cash' | 'points';
  rewardCount: number;
  usedCount: number;
  status: 'pending' | 'granted' | 'expired';
  createdTime: Date;
  updatedTime: Date;
}

interface InvitationRewardCreationAttributes
  extends Optional<
    InvitationRewardAttributes,
    'id' | 'createdTime' | 'updatedTime'
  > {}

class InvitationReward
  extends Model<InvitationRewardAttributes, InvitationRewardCreationAttributes>
  implements InvitationRewardAttributes
{
  public id!: number;
  public inviterId!: number;
  public userId!: number;
  public invitationId!: number;
  public rewardType!: 'free_malls' | 'discount' | 'cash' | 'points';
  public rewardCount!: number;
  public usedCount!: number;
  public status!: 'pending' | 'granted' | 'expired';
  public createdTime!: Date;
  public updatedTime!: Date;
}

InvitationReward.init(
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
      comment: '获奖用户ID',
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
      type: DataTypes.ENUM('free_malls', 'discount', 'cash', 'points'),
      allowNull: false,
      field: 'reward_type',
      comment: '奖励类型：免费店铺、折扣、现金、积分',
    },
    rewardCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'reward_count',
      comment: '奖励数量',
    },
    usedCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'used_count',
      comment: '已使用数量',
    },
    status: {
      type: DataTypes.ENUM('pending', 'granted', 'expired'),
      defaultValue: 'pending',
      comment: '奖励状态',
    },
    createdTime: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_time',
    },
    updatedTime: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_time',
    },
  },
  {
    sequelize,
    tableName: 'invitation_rewards',
    timestamps: true,
    createdAt: 'createdTime',
    updatedAt: 'updatedTime',
  }
);

// 定义关联关系
InvitationReward.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

InvitationReward.belongsTo(Invitation, {
  foreignKey: 'invitationId',
  as: 'invitation',
});

User.hasMany(InvitationReward, {
  foreignKey: 'userId',
  as: 'user',
});

Invitation.hasMany(InvitationReward, {
  foreignKey: 'invitationId',
  as: 'rewards',
});

export default InvitationReward;
