'use client';

import React, { useState, useEffect } from 'react';
import { Card, Table, Button, message, Statistic, Row, Col, Alert } from 'antd';
import {
  UserAddOutlined,
  ShareAltOutlined,
  CopyOutlined,
  ShopOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { invitationsAPI, invitationRewardsAPI } from '../../services';
import { useRouter } from 'next/navigation';

interface Invitation {
  id: number;
  invitation_code: string;
  type: string;
  status: string;
  invitee_id?: number;
  invitee?: {
    id: number;
    username: string;
    phone?: string;
    email?: string;
  };
  created_at: string;
  used_at?: string;
}

interface InvitationReward {
  id: number;
  reward_type: string;
  reward_value: number;
  status: string;
  invitee?: {
    id: number;
    username: string;
    phone?: string;
    email?: string;
  };
  created_at: string;
  claimed_at?: string;
}

interface CombinedRecord {
  id: string;
  type: 'invitation' | 'reward';
  invitation_code?: string;
  invitation_type?: string;
  invitation_status?: string;
  reward_type?: string;
  reward_value?: number;
  reward_status?: string;
  invitee?: {
    id: number;
    username: string;
    phone?: string;
    email?: string;
  };
  created_at: string;
  used_at?: string;
  claimed_at?: string;
  original_data: Invitation | InvitationReward;
}

interface InvitationStats {
  total: number;
  used: number;
  pending: number;
}

interface RewardStats {
  total: number;
  claimed: number;
  pending: number;
}

interface UserInvitationInfo {
  invitationCode: string;
  invitationLink: string;
  totalInvitees: number;
  rewardShopCount: number;
}

export default function InvitationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [rewards, setRewards] = useState<InvitationReward[]>([]);
  const [invitationStats, setInvitationStats] = useState<InvitationStats>({
    total: 0,
    used: 0,
    pending: 0,
  });
  const [rewardStats, setRewardStats] = useState<RewardStats>({
    total: 0,
    claimed: 0,
    pending: 0,
  });
  const [userInvitationInfo, setUserInvitationInfo] =
    useState<UserInvitationInfo>({
      invitationCode: '',
      invitationLink: '',
      totalInvitees: 0,
      rewardShopCount: 0,
    });
  const [infoLoading, setInfoLoading] = useState(false);
  const [invitationPagination, setInvitationPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [rewardPagination, setRewardPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [invitationFilters, setInvitationFilters] = useState({
    type: '',
    status: '',
  });
  const [rewardFilters, setRewardFilters] = useState({
    status: '',
    reward_type: '',
  });

  const [combinedRecords, setCombinedRecords] = useState<CombinedRecord[]>([]);
  const [combinedPagination, setCombinedPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [combinedFilters, setCombinedFilters] = useState({
    type: undefined as string | undefined,
    status: undefined as string | undefined,
  });

  // 获取用户邀请信息
  const fetchUserInvitationInfo = async () => {
    try {
      setInfoLoading(true);
      
      // 获取token用于身份验证
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await fetch('/api/invitations/user-info', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();

      if (data.success) {
        const baseUrl = window.location.origin;
        const invitationLink = `${baseUrl}/register?invitation_code=${data.data.invitationCode}`;
        setUserInvitationInfo({
          ...data.data,
          invitationLink,
        });
      } else {
        message.error(data.message || '获取邀请信息失败');
      }
    } catch (error) {
      console.error('获取邀请信息失败:', error);
      message.error('获取邀请信息失败');
    } finally {
      setInfoLoading(false);
    }
  };

  // 获取邀请记录
  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const response = await invitationsAPI.getInvitations({
        page: invitationPagination.current,
        pageSize: invitationPagination.pageSize,
        ...invitationFilters,
      });

      const data = response.data;
      if (data.success) {
        setInvitations(data.data.invitations);
        setInvitationStats(data.data.stats);
        setInvitationPagination((prev) => ({
          ...prev,
          total: data.data.pagination.total,
        }));
      } else {
        message.error(data.message || '获取邀请记录失败');
      }
    } catch (error) {
      console.error('获取邀请记录失败:', error);
      message.error('获取邀请记录失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取奖励记录
  const fetchRewards = async () => {
    try {
      setLoading(true);
      const response = await invitationRewardsAPI.getInvitationRewards({
        page: rewardPagination.current,
        pageSize: rewardPagination.pageSize,
        ...rewardFilters,
      });

      const data = response.data;
      if (data.success) {
        setRewards(data.data.rewards);
        setRewardStats(data.data.stats);
        setRewardPagination((prev) => ({
          ...prev,
          total: data.data.pagination.total,
        }));
      } else {
        message.error(data.message || '获取奖励记录失败');
      }
    } catch (error) {
      console.error('获取奖励记录失败:', error);
      message.error('获取奖励记录失败');
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

  // 领取奖励
  const claimReward = async (rewardId: number) => {
    try {
      setLoading(true);
      const response = await fetch('/api/invitation-rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reward_id: rewardId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        message.success('奖励领取成功');
        fetchRewards(); // 刷新奖励记录
        getCombinedRecords(); // 刷新合并记录
      } else {
        message.error(data.message || '领取奖励失败');
      }
    } catch (error) {
      console.error('领取奖励失败:', error);
      message.error('领取奖励失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取合并记录
  const getCombinedRecords = async () => {
    try {
      setLoading(true);
      const combined: CombinedRecord[] = [];

      // 添加邀请记录
      invitations.forEach((invitation: Invitation) => {
        combined.push({
          id: `invitation-${invitation.id}`,
          type: 'invitation',
          invitation_code: invitation.invitation_code,
          invitation_type: invitation.type,
          invitation_status: invitation.status,
          invitee: invitation.invitee,
          created_at: invitation.created_at,
          used_at: invitation.used_at,
          original_data: invitation,
        });
      });

      // 添加奖励记录
      rewards.forEach((reward: InvitationReward) => {
        combined.push({
          id: `reward-${reward.id}`,
          type: 'reward',
          reward_type: reward.reward_type,
          reward_value: reward.reward_value,
          reward_status: reward.status,
          invitee: reward.invitee,
          created_at: reward.created_at,
          claimed_at: reward.claimed_at,
          original_data: reward,
        });
      });

      // 按创建时间排序
      combined.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // 应用筛选
      let filteredRecords = combined;
      if (combinedFilters.type) {
        filteredRecords = filteredRecords.filter(
          (record) => record.type === combinedFilters.type
        );
      }
      if (combinedFilters.status) {
        filteredRecords = filteredRecords.filter((record) => {
          if (record.type === 'invitation') {
            return record.invitation_status === combinedFilters.status;
          } else {
            return record.reward_status === combinedFilters.status;
          }
        });
      }

      // 分页处理
      const startIndex =
        (combinedPagination.current - 1) * combinedPagination.pageSize;
      const endIndex = startIndex + combinedPagination.pageSize;
      const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

      setCombinedRecords(paginatedRecords);
      setCombinedPagination((prev) => ({
        ...prev,
        total: filteredRecords.length,
      }));
    } catch (error: any) {
      message.error(error.message || '获取记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserInvitationInfo();
    fetchInvitations();
    fetchRewards();
  }, []);

  useEffect(() => {
    getCombinedRecords();
  }, [combinedPagination.current, combinedFilters]);

  useEffect(() => {
    getCombinedRecords();
  }, [invitations, rewards, combinedFilters, combinedPagination.current]);

  const columns = [
    {
      title: '被邀请用户',
      dataIndex: 'inviteeName',
      key: 'inviteeName',
      render: (inviteeName: string) => inviteeName,
    },
    {
      title: '奖励类型',
      dataIndex: 'rewardType',
      key: 'rewardType',
      render: (rewardType: string) => rewardType,
    },
    {
      title: '奖励数量',
      dataIndex: 'rewardCount',
      key: 'rewardCount',
      render: (rewardCount: number) => rewardCount,
    },
    {
      title: '奖励时间',
      dataIndex: 'createdTime',
      key: 'createdTime',
      render: (date: string) => date,
    },
  ];

  return (
    <>
      {/* 用户邀请信息展示 */}
      <Card style={{ marginBottom: 16 }} loading={infoLoading}>
        <Row gutter={16}>
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
              value={userInvitationInfo.rewardShopCount}
              prefix={<ShopOutlined />}
              suffix='个'
              valueStyle={{ color: '#52c41a' }}
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
          description='邀请好友成功注册后，您将获得免费店铺绑定配额奖励。邀请越多，奖励越丰富！'
          type='info'
          showIcon
          style={{ marginTop: 16 }}
        />
      </Card>
      <Card>
        <Table
          columns={columns}
          dataSource={combinedRecords}
          rowKey='id'
          loading={loading}
          pagination={{
            current: combinedPagination.current,
            pageSize: combinedPagination.pageSize,
            total: combinedPagination.total,
            onChange: (page, pageSize) => {
              setCombinedPagination((prev) => ({
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
