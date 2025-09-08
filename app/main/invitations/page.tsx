'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  message,
  Statistic,
  Row,
  Col,
  Alert,
  Tabs,
} from 'antd';
import {
  UserAddOutlined,
  ShareAltOutlined,
  CopyOutlined,
  ShopOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { invitationsAPI } from '../../services';

export default function InvitationsPage() {
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [userInvitationInfo, setUserInvitationInfo] = useState<any>({
    invitationCode: '',
    invitationLink: '',
    totalInvitees: 0,
    rewardMallCount: 0,
  });
  const [infoLoading, setInfoLoading] = useState(false);
  const [invitationPagination, setInvitationPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 获取用户邀请信息
  const fetchUserInvitationInfo = async () => {
    try {
      setInfoLoading(true);
      const response = await invitationsAPI.getInvitationsInfo();
      const data = response.data;
      const baseUrl = window.location.origin;
      const invitationLink = `${baseUrl}/register?invitationCode=${data.invitationCode}`;
      setUserInvitationInfo({
        ...data,
        invitationLink,
      });
    } finally {
      setInfoLoading(false);
    }
  };

  // 获取邀请记录
  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const response = await invitationsAPI.getInvitations({
        pageIndex: invitationPagination.current,
        pageSize: invitationPagination.pageSize,
      });

      const data = response.data;
      setInvitations(data.invitations);
      setInvitationPagination((prev) => ({
        ...prev,
        total: data.pagination.total,
      }));
    } finally {
      setLoading(false);
    }
  };

  // 复制邀请链接
  const copyInvitationLink = () => {
    navigator.clipboard.writeText(userInvitationInfo.invitationLink);
    message.success('邀请链接已复制到剪贴板');
  };

  // 复制邀请码
  const copyInvitationCode = () => {
    navigator.clipboard.writeText(userInvitationInfo.invitationCode);
    message.success('邀请码已复制到剪贴板');
  };

  useEffect(() => {
    fetchUserInvitationInfo();
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [invitationPagination.current]);

  // 邀请记录表格列
  const invitationColumns = [
    {
      title: '邀请用户',
      dataIndex: 'invitee',
      key: 'invitee',
      render: (invitee: any) => invitee?.username || '-',
    },
    {
      title: '邀请时间',
      dataIndex: 'createdTime',
      key: 'createdTime',
    },
  ];

  return (
    <>
      {/* 用户邀请信息展示 */}
      <Card style={{ marginBottom: 16 }} loading={infoLoading}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title='邀请用户数'
              value={userInvitationInfo.totalInvitees}
              prefix={<UserAddOutlined />}
              suffix='人'
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title='奖励店铺数'
              value={userInvitationInfo.rewardMallCount}
              prefix={<ShopOutlined />}
              suffix='个'
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title='我的邀请码'
              value={userInvitationInfo.invitationCode}
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
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}
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
      <Card>
        <Table
          columns={invitationColumns}
          dataSource={invitations}
          rowKey='id'
          loading={loading}
          pagination={{
            current: invitationPagination.current,
            pageSize: invitationPagination.pageSize,
            total: invitationPagination.total,
            onChange: (page, pageSize) => {
              setInvitationPagination((prev) => ({
                ...prev,
                current: page,
                pageSize: pageSize || 10,
              }));
            },
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
        />
      </Card>
    </>
  );
}
