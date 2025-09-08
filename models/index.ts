import sequelize from '../lib/database';
import User from './User';
import SubAccount from './SubAccount';
import UserMallBinding from './UserMallBinding';
import MembershipPackage from './MembershipPackage';
import UserPackage from './UserPackage';
import Feature from './Feature';
import Invitation from './Invitation';
import InvitationReward from './InvitationReward';
import UserOperationLog from './UserOperationLog';
import PasswordResetToken from './PasswordResetToken';

// 设置模型关联
SubAccount.belongsTo(User, {
  foreignKey: 'parentUserId',
  as: 'parentUser',
});

User.hasMany(SubAccount, {
  foreignKey: 'parentUserId',
  as: 'subAccounts',
});

// 导出所有模型
export {
  sequelize,
  User,
  SubAccount,
  UserMallBinding,
  MembershipPackage,
  UserPackage,
  Feature,
  Invitation,
  InvitationReward,
  UserOperationLog,
  PasswordResetToken,
};

// 初始化数据库连接和模型同步
export async function initDatabase() {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 同步所有模型到数据库
    await sequelize.sync({ alter: true });
    console.log('数据库模型同步成功');

    return true;
  } catch (error) {
    console.error('数据库初始化失败:', error);
    return false;
  }
}

// 关闭数据库连接
export async function closeDatabase() {
  try {
    await sequelize.close();
    console.log('数据库连接已关闭');
  } catch (error) {
    console.error('关闭数据库连接失败:', error);
  }
}

export default {
  sequelize,
  User,
  SubAccount,
  UserMallBinding,
  MembershipPackage,
  UserPackage,
  Feature,
  Invitation,
  InvitationReward,
  UserOperationLog,
  PasswordResetToken,
  initDatabase,
  closeDatabase,
};
