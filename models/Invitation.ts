import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../lib/database';
import User from './User';

interface InvitationAttributes {
  id: number;
  inviterId: number;
  inviteeId?: number;
  status?: string;
  createdTime: Date;
  updatedTime: Date;
}

interface InvitationCreationAttributes
  extends Optional<
    InvitationAttributes,
    'id' | 'inviteeId' | 'status' | 'createdTime' | 'updatedTime'
  > {}

class Invitation
  extends Model<InvitationAttributes, InvitationCreationAttributes>
  implements InvitationAttributes
{
  public id!: number;
  public inviterId!: number;
  public inviteeId?: number;
  public status?: string;
  public createdTime!: Date;
  public updatedTime!: Date;
}

Invitation.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    inviterId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      field: 'inviter_id',
    },
    inviteeId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: User,
        key: 'id',
      },
      field: 'invitee_id',
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: true,
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
    tableName: 'invitations',
    timestamps: true,
    createdAt: 'createdTime',
    updatedAt: 'updatedTime',
  }
);

// 定义关联关系
Invitation.belongsTo(User, {
  foreignKey: 'inviterId',
  as: 'inviter',
});

Invitation.belongsTo(User, {
  foreignKey: 'inviteeId',
  as: 'invitee',
});

User.hasMany(Invitation, {
  foreignKey: 'inviterId',
  as: 'sentInvitations',
});

User.hasMany(Invitation, {
  foreignKey: 'inviteeId',
  as: 'receivedInvitations',
});

export default Invitation;
