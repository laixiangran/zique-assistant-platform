'use client';

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, message } from 'antd';
import { UserOutlined, ShopOutlined } from '@ant-design/icons';
import { adminDashboardAPI } from '@/app/services';

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
      const response = await adminDashboardAPI.getStats();
      if (response.data?.success) {
        setStats(response.data.data);
      }
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
