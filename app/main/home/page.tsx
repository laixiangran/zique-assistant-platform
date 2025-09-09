'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  message,
  Alert,
  Divider,
} from 'antd';
import {
  ShopOutlined,
  TeamOutlined,
  UserAddOutlined,
  LinkOutlined,
  CopyOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { mallsAPI, subAccountsAPI, invitationsAPI } from '../../services';

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [mallQuota, setMallQuota] = useState<any>({
    totalQuota: 0,
    currentBindCount: 0,
    remainingQuota: 0,
    packageQuota: 0,
    rewardQuota: 0,
  });
  const [subAccountStats, setSubAccountStats] = useState<any>({
    total: 0,
    active: 0,
    inactive: 0,
  });
  const [invitationInfo, setInvitationInfo] = useState<any>({
    invitationCode: '',
    invitationLink: '',
    totalInvitees: 0,
    rewardMallCount: 0,
  });

  // 获取店铺配额信息
  const fetchMallQuota = async () => {
    try {
      const response = await mallsAPI.getMallQuota();
      setMallQuota(response.data);
    } catch (error) {
      console.error('获取店铺配额失败:', error);
    }
  };

  // 获取子账户统计
  const fetchSubAccountStats = async () => {
    try {
      const response = await subAccountsAPI.getSubAccounts({
        page: 1,
        pageSize: 1,
      });
      // 这里需要根据实际API返回的数据结构调整
      setSubAccountStats({
        total: response.data.pagination?.total || 0,
        active: response.data.pagination?.total || 0,
        inactive: 0,
      });
    } catch (error) {
      console.error('获取子账户统计失败:', error);
    }
  };

  // 获取邀请信息
  const fetchInvitationInfo = async () => {
    try {
      const response = await invitationsAPI.getInvitationsInfo();
      const data = response.data;
      const baseUrl = window.location.origin;
      const invitationLink = `${baseUrl}/register?invitationCode=${data.invitationCode}`;
      setInvitationInfo({
        ...data,
        invitationLink,
      });
    } catch (error) {
      console.error('获取邀请信息失败:', error);
    }
  };

  // 复制邀请链接
  const copyInvitationLink = () => {
    navigator.clipboard.writeText(invitationInfo.invitationLink);
    message.success('邀请链接已复制到剪贴板');
  };

  // 复制邀请码
  const copyInvitationCode = () => {
    navigator.clipboard.writeText(invitationInfo.invitationCode);
    message.success('邀请码已复制到剪贴板');
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchMallQuota(),
          fetchSubAccountStats(),
          fetchInvitationInfo(),
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div>
      {/* 店铺数据卡片 */}
      <Card
        title={
          <span>
            <ShopOutlined style={{ marginRight: 8 }} />
            我的店铺
          </span>
        }
        style={{ marginBottom: 24 }}
        loading={loading}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title='总共可绑定'
              value={mallQuota.totalQuota}
              prefix={<ShopOutlined />}
              suffix='个'
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title='已绑定'
              value={mallQuota.currentBindCount}
              prefix={<ShopOutlined />}
              suffix='个'
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title='剩余可绑定'
              value={mallQuota.remainingQuota}
              prefix={<ShopOutlined />}
              suffix='个'
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  marginBottom: '4px',
                  color: 'rgba(0, 0, 0, 0.45)',
                  fontSize: '14px',
                }}
              >
                可绑店铺数明细
              </div>
              <div style={{ fontSize: '12px', color: '#999' }}>
                会员套餐：{mallQuota?.packageQuota || 0}个
                <br />
                邀请奖励：{mallQuota?.rewardQuota || 0}个
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 子账户数据卡片 */}
      <Card
        title={
          <span>
            <TeamOutlined style={{ marginRight: 8 }} />
            我的团队
          </span>
        }
        style={{ marginBottom: 24 }}
        loading={loading}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <Statistic
              title='子账户总数'
              value={subAccountStats.total}
              prefix={<TeamOutlined />}
              suffix='个'
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Statistic
              title='活跃账户'
              value={subAccountStats.active}
              prefix={<TeamOutlined />}
              suffix='个'
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Statistic
              title='停用账户'
              value={subAccountStats.inactive}
              prefix={<TeamOutlined />}
              suffix='个'
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Col>
        </Row>
      </Card>

      {/* 邀请数据卡片 */}
      <Card
        title={
          <span>
            <UserAddOutlined style={{ marginRight: 8 }} />
            我的邀请
          </span>
        }
        loading={loading}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title='邀请用户数'
              value={invitationInfo.totalInvitees}
              prefix={<UserAddOutlined />}
              suffix='人'
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title='奖励店铺数'
              value={invitationInfo.rewardMallCount}
              prefix={<ShopOutlined />}
              suffix='个'
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title='我的邀请码'
              value={invitationInfo.invitationCode}
              prefix={<LinkOutlined />}
              suffix={
                <Button
                  type='link'
                  size='small'
                  icon={<CopyOutlined />}
                  onClick={copyInvitationCode}
                >
                  复制
                </Button>
              }
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '14px',
                  color: '#666',
                  marginBottom: '8px',
                }}
              >
                邀请链接
              </div>
              <Button
                type='primary'
                icon={<ShareAltOutlined />}
                onClick={copyInvitationLink}
                block
              >
                复制邀请链接
              </Button>
            </div>
          </Col>
        </Row>
        <Alert
          message='邀请奖励说明'
          description='邀请好友成功注册并绑定店铺，您将获得免费店铺绑定配额奖励。好友绑定多少个店铺就奖励多少个免费店铺绑定配额！'
          type='info'
          showIcon
          style={{ marginTop: 16 }}
        />
      </Card>
    </div>
  );
}
