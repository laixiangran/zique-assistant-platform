'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  message,
  Statistic,
  Row,
  Col,
  Tag,
  Modal,
  Input,
  Typography,
  Tabs,
  Select,
  Tooltip,
} from 'antd'
import {
  GiftOutlined,
  ShareAltOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserAddOutlined,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'

const { Title, Text } = Typography
const { TabPane } = Tabs
const { Option } = Select

interface Invitation {
  id: number
  invitation_code: string
  type: string
  status: string
  invitee_id?: number
  invitee?: {
    id: number
    username: string
    phone?: string
    email?: string
  }
  created_at: string
  used_at?: string
}

interface InvitationReward {
  id: number
  reward_type: string
  reward_value: number
  status: string
  invitee?: {
    id: number
    username: string
    phone?: string
    email?: string
  }
  created_at: string
  claimed_at?: string
}

interface InvitationStats {
  total: number
  used: number
  pending: number
}

interface RewardStats {
  total: number
  claimed: number
  pending: number
}

export default function InvitationsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [rewards, setRewards] = useState<InvitationReward[]>([])
  const [invitationStats, setInvitationStats] = useState<InvitationStats>({
    total: 0,
    used: 0,
    pending: 0,
  })
  const [rewardStats, setRewardStats] = useState<RewardStats>({
    total: 0,
    claimed: 0,
    pending: 0,
  })
  const [invitationPagination, setInvitationPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })
  const [rewardPagination, setRewardPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })
  const [invitationFilters, setInvitationFilters] = useState({
    type: '',
    status: '',
  })
  const [rewardFilters, setRewardFilters] = useState({
    status: '',
    reward_type: '',
  })
  const [shareModalVisible, setShareModalVisible] = useState(false)
  const [invitationLink, setInvitationLink] = useState('')
  const [activeTab, setActiveTab] = useState('invitations')

  // 获取邀请记录
  const fetchInvitations = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: invitationPagination.current.toString(),
        limit: invitationPagination.pageSize.toString(),
        ...(invitationFilters.type && { type: invitationFilters.type }),
        ...(invitationFilters.status && { status: invitationFilters.status }),
      })

      const response = await fetch(`/api/invitations?${params}`)
      const data = await response.json()

      if (data.success) {
        setInvitations(data.data.invitations)
        setInvitationStats(data.data.stats)
        setInvitationPagination(prev => ({
          ...prev,
          total: data.data.pagination.total,
        }))
      } else {
        message.error(data.message || '获取邀请记录失败')
      }
    } catch (error) {
      console.error('获取邀请记录失败:', error)
      message.error('获取邀请记录失败')
    } finally {
      setLoading(false)
    }
  }

  // 获取奖励记录
  const fetchRewards = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: rewardPagination.current.toString(),
        limit: rewardPagination.pageSize.toString(),
        ...(rewardFilters.status && { status: rewardFilters.status }),
        ...(rewardFilters.reward_type && { reward_type: rewardFilters.reward_type }),
      })

      const response = await fetch(`/api/invitation-rewards?${params}`)
      const data = await response.json()

      if (data.success) {
        setRewards(data.data.rewards)
        setRewardStats(data.data.stats)
        setRewardPagination(prev => ({
          ...prev,
          total: data.data.pagination.total,
        }))
      } else {
        message.error(data.message || '获取奖励记录失败')
      }
    } catch (error) {
      console.error('获取奖励记录失败:', error)
      message.error('获取奖励记录失败')
    } finally {
      setLoading(false)
    }
  }

  // 生成邀请链接
  const generateInvitationLink = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'registration',
        }),
      })

      const data = await response.json()

      if (data.success) {
        const baseUrl = window.location.origin
        const link = `${baseUrl}/register?invitation_code=${data.data.invitation_code}`
        setInvitationLink(link)
        setShareModalVisible(true)
        fetchInvitations() // 刷新邀请记录
      } else {
        message.error(data.message || '生成邀请链接失败')
      }
    } catch (error) {
      console.error('生成邀请链接失败:', error)
      message.error('生成邀请链接失败')
    } finally {
      setLoading(false)
    }
  }

  // 复制邀请链接
  const copyInvitationLink = () => {
    navigator.clipboard.writeText(invitationLink)
    message.success('邀请链接已复制到剪贴板')
  }

  // 领取奖励
  const claimReward = async (rewardId: number) => {
    try {
      setLoading(true)
      const response = await fetch('/api/invitation-rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reward_id: rewardId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        message.success('奖励领取成功')
        fetchRewards() // 刷新奖励记录
      } else {
        message.error(data.message || '领取奖励失败')
      }
    } catch (error) {
      console.error('领取奖励失败:', error)
      message.error('领取奖励失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'invitations') {
      fetchInvitations()
    } else {
      fetchRewards()
    }
  }, [activeTab, invitationPagination.current, rewardPagination.current, invitationFilters, rewardFilters])

  // 邀请记录表格列
  const invitationColumns = [
    {
      title: '邀请码',
      dataIndex: 'invitation_code',
      key: 'invitation_code',
      render: (code: string) => (
        <Text code copyable={{ text: code }}>
          {code}
        </Text>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'registration' ? 'blue' : 'green'}>
          {type === 'registration' ? '注册邀请' : '其他'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig = {
          pending: { color: 'orange', icon: <ClockCircleOutlined />, text: '待使用' },
          used: { color: 'green', icon: <CheckCircleOutlined />, text: '已使用' },
          expired: { color: 'red', icon: <ClockCircleOutlined />, text: '已过期' },
        }
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        )
      },
    },
    {
      title: '被邀请人',
      dataIndex: 'invitee',
      key: 'invitee',
      render: (invitee: any) => (
        invitee ? (
          <div>
            <div>{invitee.username}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {invitee.phone || invitee.email}
            </Text>
          </div>
        ) : (
          <Text type="secondary">-</Text>
        )
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '使用时间',
      dataIndex: 'used_at',
      key: 'used_at',
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
  ]

  // 奖励记录表格列
  const rewardColumns = [
    {
      title: '奖励类型',
      dataIndex: 'reward_type',
      key: 'reward_type',
      render: (type: string) => (
        <Tag color={type === 'free_shop' ? 'blue' : 'green'}>
          {type === 'free_shop' ? '免费店铺' : '其他奖励'}
        </Tag>
      ),
    },
    {
      title: '奖励数量',
      dataIndex: 'reward_value',
      key: 'reward_value',
      render: (value: number) => <Text strong>{value}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig = {
          pending: { color: 'orange', icon: <ClockCircleOutlined />, text: '待领取' },
          claimed: { color: 'green', icon: <CheckCircleOutlined />, text: '已领取' },
          expired: { color: 'red', icon: <ClockCircleOutlined />, text: '已过期' },
        }
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        )
      },
    },
    {
      title: '被邀请人',
      dataIndex: 'invitee',
      key: 'invitee',
      render: (invitee: any) => (
        invitee ? (
          <div>
            <div>{invitee.username}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {invitee.phone || invitee.email}
            </Text>
          </div>
        ) : (
          <Text type="secondary">-</Text>
        )
      ),
    },
    {
      title: '获得时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '领取时间',
      dataIndex: 'claimed_at',
      key: 'claimed_at',
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: InvitationReward) => (
        <Space>
          {record.status === 'pending' && (
            <Button
              type="primary"
              size="small"
              icon={<GiftOutlined />}
              onClick={() => claimReward(record.id)}
              loading={loading}
            >
              领取
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>邀请奖励</Title>
        <Text type="secondary">管理您的邀请记录和奖励</Text>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="邀请记录" key="invitations">
          {/* 邀请统计 */}
          <Row gutter={16} style={{ marginBottom: '24px' }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="总邀请数"
                  value={invitationStats.total}
                  prefix={<UserAddOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="已使用"
                  value={invitationStats.used}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="待使用"
                  value={invitationStats.pending}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Button
                  type="primary"
                  icon={<ShareAltOutlined />}
                  onClick={generateInvitationLink}
                  loading={loading}
                  block
                >
                  生成邀请链接
                </Button>
              </Card>
            </Col>
          </Row>

          {/* 筛选器 */}
          <Card style={{ marginBottom: '16px' }}>
            <Space>
              <Select
                placeholder="选择类型"
                style={{ width: 120 }}
                value={invitationFilters.type}
                onChange={(value) => setInvitationFilters(prev => ({ ...prev, type: value }))}
                allowClear
              >
                <Option value="registration">注册邀请</Option>
              </Select>
              <Select
                placeholder="选择状态"
                style={{ width: 120 }}
                value={invitationFilters.status}
                onChange={(value) => setInvitationFilters(prev => ({ ...prev, status: value }))}
                allowClear
              >
                <Option value="pending">待使用</Option>
                <Option value="used">已使用</Option>
                <Option value="expired">已过期</Option>
              </Select>
            </Space>
          </Card>

          {/* 邀请记录表格 */}
          <Card>
            <Table
              columns={invitationColumns}
              dataSource={invitations}
              rowKey="id"
              loading={loading}
              pagination={{
                current: invitationPagination.current,
                pageSize: invitationPagination.pageSize,
                total: invitationPagination.total,
                onChange: (page, pageSize) => {
                  setInvitationPagination(prev => ({
                    ...prev,
                    current: page,
                    pageSize: pageSize || 10,
                  }))
                },
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
              }}
            />
          </Card>
        </TabPane>

        <TabPane tab="奖励记录" key="rewards">
          {/* 奖励统计 */}
          <Row gutter={16} style={{ marginBottom: '24px' }}>
            <Col span={8}>
              <Card>
                <Statistic
                  title="总奖励数"
                  value={rewardStats.total}
                  prefix={<GiftOutlined />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="已领取"
                  value={rewardStats.claimed}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="待领取"
                  value={rewardStats.pending}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
          </Row>

          {/* 筛选器 */}
          <Card style={{ marginBottom: '16px' }}>
            <Space>
              <Select
                placeholder="选择奖励类型"
                style={{ width: 120 }}
                value={rewardFilters.reward_type}
                onChange={(value) => setRewardFilters(prev => ({ ...prev, reward_type: value }))}
                allowClear
              >
                <Option value="free_shop">免费店铺</Option>
              </Select>
              <Select
                placeholder="选择状态"
                style={{ width: 120 }}
                value={rewardFilters.status}
                onChange={(value) => setRewardFilters(prev => ({ ...prev, status: value }))}
                allowClear
              >
                <Option value="pending">待领取</Option>
                <Option value="claimed">已领取</Option>
                <Option value="expired">已过期</Option>
              </Select>
            </Space>
          </Card>

          {/* 奖励记录表格 */}
          <Card>
            <Table
              columns={rewardColumns}
              dataSource={rewards}
              rowKey="id"
              loading={loading}
              pagination={{
                current: rewardPagination.current,
                pageSize: rewardPagination.pageSize,
                total: rewardPagination.total,
                onChange: (page, pageSize) => {
                  setRewardPagination(prev => ({
                    ...prev,
                    current: page,
                    pageSize: pageSize || 10,
                  }))
                },
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
              }}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* 分享邀请链接模态框 */}
      <Modal
        title="邀请链接"
        open={shareModalVisible}
        onCancel={() => setShareModalVisible(false)}
        footer={[
          <Button key="copy" type="primary" icon={<CopyOutlined />} onClick={copyInvitationLink}>
            复制链接
          </Button>,
          <Button key="close" onClick={() => setShareModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        <div style={{ marginBottom: '16px' }}>
          <Text>分享以下链接邀请好友注册：</Text>
        </div>
        <Input.TextArea
          value={invitationLink}
          readOnly
          rows={3}
          style={{ marginBottom: '16px' }}
        />
        <div>
          <Text type="secondary">
            好友通过此链接注册成功后，您将获得相应的邀请奖励。
          </Text>
        </div>
      </Modal>
    </div>
  )
}