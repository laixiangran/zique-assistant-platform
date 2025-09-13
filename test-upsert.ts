import { MallState, sequelize } from './models';

async function testUpsert() {
  try {
    console.log('Testing MallState upsert behavior...');

    // 测试数据
    const testData = {
      mallId: 'test_mall_123',
      mallName: 'Test Mall',
      regionCode: 'test_region',
      regionName: 'Test Region',
      stateType: 'pending_settlement',
      state: 'updated',
      lastCollectTime: new Date(),
    };

    // 清理测试数据
    await MallState.destroy({
      where: {
        mallId: testData.mallId,
        regionCode: testData.regionCode,
        stateType: testData.stateType,
      },
    });

    console.log('\n1. First upsert (should create):');
    const [instance1, created1] = await MallState.upsert(testData);
    console.log('Created:', created1);
    console.log('Record ID:', instance1.id);

    // 查询当前记录数
    const count1 = await MallState.count({
      where: {
        mallId: testData.mallId,
        regionCode: testData.regionCode,
        stateType: testData.stateType,
      },
    });
    console.log('Total records with same key:', count1);

    console.log('\n2. Second upsert (should update):');
    const updatedData = { ...testData, mallName: 'Updated Mall Name' };
    const [instance2, created2] = await MallState.upsert(updatedData);
    console.log('Created:', created2);
    console.log('Record ID:', instance2.id);

    // 查询当前记录数
    const count2 = await MallState.count({
      where: {
        mallId: testData.mallId,
        regionCode: testData.regionCode,
        stateType: testData.stateType,
      },
    });
    console.log('Total records with same key:', count2);

    // 查看所有相关记录
    const allRecords = await MallState.findAll({
      where: {
        mallId: testData.mallId,
        regionCode: testData.regionCode,
        stateType: testData.stateType,
      },
    });

    console.log('\nAll matching records:');
    allRecords.forEach((record, index) => {
      console.log(`Record ${index + 1}:`, {
        id: record.id,
        mallName: record.mallName,
        createdTime: record.createdTime,
        updatedTime: record.updatedTime,
      });
    });

    // 清理测试数据
    await MallState.destroy({
      where: {
        mallId: testData.mallId,
        regionCode: testData.regionCode,
        stateType: testData.stateType,
      },
    });

    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await sequelize.close();
    process.exit();
  }
}

testUpsert();
