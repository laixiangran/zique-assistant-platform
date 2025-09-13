import sequelize from '@/lib/database';
import User from './User';
import Admin from './Admin';
import SubAccount from './SubAccount';
import UserMallBinding from './UserMallBinding';
import MembershipPackage from './MembershipPackage';
import UserPackage from './UserPackage';
import Feature from './Feature';
import Invitation from './Invitation';
import InvitationReward from './InvitationReward';
import UserOperationLog from './UserOperationLog';
import PasswordResetToken from './PasswordResetToken';
import PluginVersion from './PluginVersion';
import ArrivalDataDetail from './ArrivalDataDetail';
import CostSettlement from './CostSettlement';
import MallState from './MallState';
import PackageFeature from './PackageFeature';
import PackageHistory from './PackageHistory';
import PendingSettlementDetail from './PendingSettlementDetail';
import PromotionSalesDetail from './PromotionSalesDetail';
import UserFeature from './UserFeature';

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
  Admin,
  SubAccount,
  UserMallBinding,
  MembershipPackage,
  UserPackage,
  Feature,
  Invitation,
  InvitationReward,
  UserOperationLog,
  PasswordResetToken,
  PluginVersion,
  ArrivalDataDetail,
  CostSettlement,
  MallState,
  PackageFeature,
  PackageHistory,
  PendingSettlementDetail,
  PromotionSalesDetail,
  UserFeature,
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
  Admin,
  SubAccount,
  UserMallBinding,
  MembershipPackage,
  UserPackage,
  Feature,
  Invitation,
  InvitationReward,
  UserOperationLog,
  PasswordResetToken,
  PluginVersion,
  ArrivalDataDetail,
  CostSettlement,
  MallState,
  PackageFeature,
  PackageHistory,
  PendingSettlementDetail,
  PromotionSalesDetail,
  UserFeature,
  initDatabase,
  closeDatabase,
};
