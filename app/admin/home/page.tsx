'use client';

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Button, Space, message } from 'antd';
import {
  UserOutlined,
  AppstoreOutlined,
  DownloadOutlined,
  SettingOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface DashboardStats {
  totalUsers: number;
  totalPlugins: number;
  totalDownloads: number;
  activePlugins: number;
}

interface RecentActivity {
  id: string;
  type: 'user_register' | 'plugin_upload' | 'plugin_download' | 'system_update';
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error';
}

interface PluginVersion {
  id: number;
  version: string;
  releaseDate: string;
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  description?: string;
  isLatest: boolean;
  status: 'active' | 'inactive' | 'deprecated';
}

const AdminHomePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalPlugins: 0,
    totalDownloads: 0,
    activePlugins: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [recentPlugins, setRecentPlugins] = useState<PluginVersion[]>([]);

  // 获取仪表板数据
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 获取统计数据
      const statsResponse = await fetch('/api/admin/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
      }

      // 获取最近活动
      const activitiesResponse = await fetch('/api/admin/dashboard/activities', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });
      
      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        setRecentActivities(activitiesData.data);
      }

      // 获取最近插件
      const pluginsResponse = await fetch('/api/admin/plugins?limit=5', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });
      
      if (pluginsResponse.ok) {
        const pluginsData = await pluginsResponse.json();
        setRecentPlugins(pluginsData.data.items || []);
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

  // 活动类型映射
  const getActivityTypeInfo = (type: RecentActivity['type']) => {
    const typeMap = {
      user_register: { text: '用户注册', color: 'blue' },
      plugin_upload: { text: '插件上传', color: 'green' },
      plugin_download: { text: '插件下载', color: 'orange' },
      system_update: { text: '系统更新', color: 'purple' },
    };
    return typeMap[type] || { text: '未知', color: 'default' };
  };

  // 状态映射
  const getStatusInfo = (status: RecentActivity['status']) => {
    const statusMap = {
      success: { text: '成功', color: 'success' },
      warning: { text: '警告', color: 'warning' },
      error: { text: '错误', color: 'error' },
    };
    return statusMap[status] || { text: '未知', color: 'default' };
  };

  // 插件状态映射
  const getPluginStatusInfo = (status: PluginVersion['status']) => {
    const statusMap = {
      active: { text: '活跃', color: 'success' },
      inactive: { text: '非活跃', color: 'default' },
      deprecated: { text: '已弃用', color: 'error' },
    };
    return statusMap[status] || { text: '未知', color: 'default' };
  };

  // 最近活动表格列
  const activityColumns: ColumnsType<RecentActivity> = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: RecentActivity['type']) => {
        const info = getActivityTypeInfo(type);
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: RecentActivity['status']) => {
        const info = getStatusInfo(status);
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: string) => new Date(timestamp).toLocaleString(),
    },
  ];

  // 最近插件表格列
  const pluginColumns: ColumnsType<PluginVersion> = [
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      render: (version: string, record: PluginVersion) => (
        <Space>
          {version}
          {record.isLatest && <Tag color="gold">最新</Tag>}
        </Space>
      ),
    },
    {
      title: '文件名',
      dataIndex: 'fileName',
      key: 'fileName',
    },
    {
      title: '文件大小',
      dataIndex: 'fileSize',
      key: 'fileSize',
      render: (size: number) => {
        const mb = (size / (1024 * 1024)).toFixed(2);
        return `${mb} MB`;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: PluginVersion['status']) => {
        const info = getPluginStatusInfo(status);
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '发布时间',
      dataIndex: 'releaseDate',
      key: 'releaseDate',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>管理员仪表板</h1>
        <Button 
          type="primary" 
          icon={<ReloadOutlined />} 
          onClick={fetchDashboardData}
          loading={loading}
        >
          刷新数据
        </Button>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={stats.totalUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总插件数"
              value={stats.totalPlugins}
              prefix={<AppstoreOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总下载量"
              value={stats.totalDownloads}
              prefix={<DownloadOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="活跃插件"
              value={stats.activePlugins}
              prefix={<SettingOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 内容区域 */}
      <Row gutter={[16, 16]}>
        {/* 最近活动 */}
        <Col xs={24} lg={12}>
          <Card title="最近活动" style={{ height: '500px' }}>
            <Table
              columns={activityColumns}
              dataSource={recentActivities}
              rowKey="id"
              pagination={false}
              loading={loading}
              size="small"
              scroll={{ y: 350 }}
            />
          </Card>
        </Col>

        {/* 最近插件 */}
        <Col xs={24} lg={12}>
          <Card title="最近插件" style={{ height: '500px' }}>
            <Table
              columns={pluginColumns}
              dataSource={recentPlugins}
              rowKey="id"
              pagination={false}
              loading={loading}
              size="small"
              scroll={{ y: 350 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminHomePage;
