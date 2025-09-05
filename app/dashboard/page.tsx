'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Layout, Menu, Avatar, Dropdown, Button, Card, Row, Col, Statistic, Table, Tag, message } from 'antd'
import {
  DashboardOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  BarChartOutlined,
  TeamOutlined,
  GiftOutlined,
  SettingOutlined,
  LogoutOutlined,
  PlusOutlined,
  ShareAltOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'

const { Header, Sider, Content } = Layout

interface UserInfo {
  id: number
  username: string
  phone?: string
  email?: string
  free_shop_count?: number
  used_shop_count?: number
  accountType: 'user' | 'sub_account'
}

export default function DashboardPage() {
  const [collapsed, setCollapsed] = useState(false)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setUserInfo(data.data)
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('认证检查失败:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      localStorage.removeItem('user')
      localStorage.removeItem('accountType')
      message.success('退出成功')
      router.push('/login')
    } catch (error) {
      console.error('退出失败:', error)
      message.error('退出失败')
    }
  }

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ]

  const sideMenuItems: MenuProps['items'] = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: 'shops',
      icon: <ShopOutlined />,
      label: '店铺管理',
    },
    {
      key: 'sub-accounts',
      icon: <TeamOutlined />,
      label: '子账户管理',
      disabled: userInfo?.accountType === 'sub_account',
    },
    {
      key: 'packages',
      icon: <GiftOutlined />,
      label: '会员套餐',
    },
    {
      key: 'invitations',
      icon: <ShareAltOutlined />,
      label: '邀请奖励',
      disabled: userInfo?.accountType === 'sub_account',
    },
    {
      key: 'logs',
      icon: <FileTextOutlined />,
      label: '操作日志',
    },
  ]

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
        <Tag color={platform === 'taobao' ? 'orange' : platform === 'tmall' ? 'red' : 'blue'}>
          {platform === 'taobao' ? '淘宝' : platform === 'tmall' ? '天猫' : '其他'}
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
  ]

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
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    )
  }

  return (
    <Layout className="min-h-screen">
      <Sider trigger={null} collapsible collapsed={collapsed} theme="light">
        <div className="p-4 text-center border-b">
          <h2 className={`font-bold text-blue-600 ${collapsed ? 'text-sm' : 'text-lg'}`}>
            {collapsed ? '紫雀' : '紫雀助手平台'}
          </h2>
        </div>
        <Menu
          mode="inline"
          defaultSelectedKeys={['dashboard']}
          items={sideMenuItems}
          className="border-r-0"
          onClick={({ key }) => {
            if (key === 'shops') {
              router.push('/dashboard/shops')
            } else if (key === 'sub-accounts') {
              router.push('/dashboard/sub-accounts')
            } else if (key === 'packages') {
              router.push('/dashboard/packages')
            } else if (key === 'invitations') {
              router.push('/dashboard/invitations')
            } else if (key === 'logs') {
              router.push('/dashboard/logs')
            }
          }}
        />
      </Sider>

      <Layout>
        <Header className="bg-white px-4 flex justify-between items-center border-b">
          <Button
            type="text"
            onClick={() => setCollapsed(!collapsed)}
            className="text-lg"
          >
            {collapsed ? '☰' : '✕'}
          </Button>

          <div className="flex items-center space-x-4">
            <span className="text-gray-600">
              欢迎，{userInfo?.username}
              {userInfo?.accountType === 'sub_account' && (
                <Tag color="blue" className="ml-2">子账户</Tag>
              )}
            </span>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Avatar icon={<UserOutlined />} className="cursor-pointer" />
            </Dropdown>
          </div>
        </Header>

        <Content className="p-6 bg-gray-50">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">仪表盘</h1>
            <p className="text-gray-600">欢迎使用紫雀助手平台</p>
          </div>

          {/* 统计卡片 */}
          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="总店铺数"
                  value={userInfo?.used_shop_count || 0}
                  suffix={`/ ${userInfo?.free_shop_count || 0}`}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="免费店铺"
                  value={userInfo?.free_shop_count || 0}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="已使用"
                  value={userInfo?.used_shop_count || 0}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="剩余可用"
                  value={(userInfo?.free_shop_count || 0) - (userInfo?.used_shop_count || 0)}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </Row>

          {/* 店铺列表 */}
          <Card
            title="我的店铺"
            extra={
              <Button type="primary" icon={<PlusOutlined />}>
                绑定店铺
              </Button>
            }
          >
            <Table
              columns={shopColumns}
              dataSource={shopData}
              pagination={false}
              locale={{ emptyText: '暂无店铺数据' }}
            />
          </Card>
        </Content>
      </Layout>
    </Layout>
  )
}