import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/lib/database';
import User from './User';
import Invitation from './Invitation';

interface InvitationRewardAttributes {
  id: number;
  inviterId: number; // 邀请人
  inviteeId: number; // 被邀请人
  mallId?: string;
  mallName?: string;
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
  public inviteeId!: number;
  public mallId?: string;
  public mallName?: string;
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
    inviterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      field: 'inviter_id',
      comment: '邀请者ID',
    },
    inviteeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      field: 'invitee_id',
      comment: '被邀请者ID',
    },
    mallId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'mall_id',
      comment: '对方绑定店铺ID',
    },
    mallName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'mall_name',
      comment: '对方绑定店铺名称',
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

// 关联定义
InvitationReward.belongsTo(User, {
  foreignKey: 'inviterId',
  as: 'inviter',
});

InvitationReward.belongsTo(User, {
  foreignKey: 'inviteeId',
  as: 'invitee',
});

User.hasMany(InvitationReward, {
  foreignKey: 'inviterId',
  as: 'inviterRewards',
});

User.hasMany(InvitationReward, {
  foreignKey: 'inviteeId',
  as: 'inviteeRewards',
});

export default InvitationReward;
