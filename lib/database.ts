import { Sequelize } from 'sequelize';
import mysql2 from 'mysql2';

const sequelize = new Sequelize({
  host: process.env.DB_HOST || '127.0.0.1',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'ldh20250806&SHOP',
  database: process.env.DB_NAME || 'zique_assistant_db',
  port: parseInt(process.env.DB_PORT || '3306'),
  dialect: 'mysql',
  dialectModule: mysql2,
  dialectOptions: {
    connectTimeout: 60000,
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});

export default sequelize;

// 测试数据库连接
export async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');
    return true;
  } catch (error) {
    console.error('数据库连接失败:', error);
    return false;
  }
}

// 同步数据库模型
export async function syncDatabase() {
  try {
    await sequelize.sync({ alter: true });
    console.log('数据库模型同步成功');
    return true;
  } catch (error) {
    console.error('数据库模型同步失败:', error);
    return false;
  }
}
