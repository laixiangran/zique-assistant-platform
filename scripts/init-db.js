const { syncDatabase, testConnection } = require('../lib/database.ts');
const models = require('../models/index.ts');

async function initDatabase() {
  console.log('开始初始化数据库...');
  
  try {
    // 测试数据库连接
    const connected = await testConnection();
    if (!connected) {
      console.error('数据库连接失败，请检查配置');
      process.exit(1);
    }
    
    // 同步数据库模型
    const synced = await syncDatabase();
    if (!synced) {
      console.error('数据库模型同步失败');
      process.exit(1);
    }
    
    console.log('数据库初始化完成！');
    process.exit(0);
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

initDatabase();