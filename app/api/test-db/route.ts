import { NextRequest, NextResponse } from 'next/server';
import sequelize, { testConnection } from '@/lib/database';

export async function GET() {
  try {
    console.log('Testing database connection...');
    
    // 直接测试Sequelize连接
    await sequelize.authenticate();
    console.log('Sequelize authentication successful');
    
    // 测试数据库连接函数
    const result = await testConnection();
    console.log('testConnection result:', result);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection successful',
      sequelize: 'authenticated',
      testConnection: result
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}