const { Sequelize } = require('sequelize');
require('dotenv').config({ path: '.env.development' });

const sequelize = new Sequelize({
  host: process.env.DB_HOST,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306'),
  dialect: 'mysql',
  logging: false,
});

async function checkTables() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');
    
    // 获取所有表名
    const [results] = await sequelize.query('SHOW TABLES');
    console.log('\n数据库中的表:');
    results.forEach((row, index) => {
      const tableName = Object.values(row)[0];
      console.log(`${index + 1}. ${tableName}`);
    });
    
    // 获取每个表的结构
    console.log('\n表结构详情:');
    for (const row of results) {
      const tableName = Object.values(row)[0];
      console.log(`\n=== ${tableName} ===`);
      const [columns] = await sequelize.query(`DESCRIBE ${tableName}`);
      columns.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''} ${col.Default !== null ? `DEFAULT ${col.Default}` : ''}`);
      });
    }
    
  } catch (error) {
    console.error('数据库连接失败:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkTables();