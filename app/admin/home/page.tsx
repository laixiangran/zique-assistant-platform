'use client';

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, message } from 'antd';
import { UserOutlined, ShopOutlined } from '@ant-design/icons';

interface DashboardStats {
  totalUsers: number;
  totalMallBindings: number;
}

const AdminHomePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalMallBindings: 0,
  });

  // 获取仪表板数据
  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 获取统计数据 - 依赖cookie认证，无需手动传递token
      const statsResponse = await fetch('/api/admin/dashboard/stats', {
        credentials: 'include', // 确保发送cookie
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
      }
    } catch (error) {
      console.error('获取仪表板数据失败:', error);
      message.error('获取仪表板数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={12}>
          <Card>
            <Statistic
              title='总用户数'
              value={stats.totalUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={12}>
          <Card>
            <Statistic
              title='总绑定店铺数'
              value={stats.totalMallBindings}
              prefix={<ShopOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminHomePage;
