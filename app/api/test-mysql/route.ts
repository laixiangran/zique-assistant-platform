import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET() {
  try {
    console.log('Testing direct MySQL connection...');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'ldh20250806&SHOP',
      database: process.env.DB_NAME || 'zique_assistant_db',
      port: parseInt(process.env.DB_PORT || '3306'),
    });
    
    console.log('MySQL connection created successfully');
    
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('Query executed successfully:', rows);
    
    await connection.end();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Direct MySQL connection successful',
      result: rows
    });
  } catch (error) {
    console.error('Direct MySQL connection error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Direct MySQL connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}