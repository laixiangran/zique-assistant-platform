import { NextResponse } from 'next/server';
import { Sequelize } from 'sequelize';

export async function GET() {
  try {
    console.log('Creating simple Sequelize connection...');
    
    const sequelize = new Sequelize({
      host: process.env.DB_HOST || '127.0.0.1',
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'ldh20250806&SHOP',
      database: process.env.DB_NAME || 'zique_assistant_db',
      port: parseInt(process.env.DB_PORT || '3306'),
      dialect: 'mysql',
      logging: false,
    });
    
    console.log('Testing authentication...');
    await sequelize.authenticate();
    console.log('Authentication successful!');
    
    await sequelize.close();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Simple database connection successful'
    });
  } catch (error) {
    console.error('Simple database connection error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Simple database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}