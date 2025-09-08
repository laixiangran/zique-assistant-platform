'use client';

import { Card, Row, Col, Statistic, Table, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Button } from 'antd';

export default function HomePage() {
  // 模拟店铺数据
  const shopColumns = [
    {
      title: '店铺名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      render: (platform: string) => (
        <Tag
          color={
            platform === 'taobao'
              ? 'orange'
              : platform === 'tmall'
              ? 'red'
              : 'blue'
          }
        >
          {platform === 'taobao'
            ? '淘宝'
            : platform === 'tmall'
            ? '天猫'
            : '其他'}
        </Tag>
      ),
    },
    {
      title: '绑定类型',
      dataIndex: 'binding_type',
      key: 'binding_type',
      render: (type: string) => (
        <Tag color={type === 'free' ? 'green' : 'blue'}>
          {type === 'free' ? '免费' : '付费'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '正常' : '已停用'}
        </Tag>
      ),
    },
  ];

  const shopData = [
    {
      key: '1',
      name: '示例店铺1',
      platform: 'taobao',
      binding_type: 'free',
      status: 'active',
    },
    {
      key: '2',
      name: '示例店铺2',
      platform: 'tmall',
      binding_type: 'paid',
      status: 'active',
    },
  ];

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title='总店铺数'
              value={0}
              suffix={`/ 0`}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title='免费店铺'
              value={0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title='已使用'
              value={0}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title='剩余可用'
              value={0}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 店铺列表 */}
      <Card title='我的店铺'>
        <Table
          columns={shopColumns}
          dataSource={shopData}
          pagination={false}
          locale={{ emptyText: '暂无店铺数据' }}
          style={{ marginTop: 16 }}
        />
      </Card>
    </div>
  );
}
