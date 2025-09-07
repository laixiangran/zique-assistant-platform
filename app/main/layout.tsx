'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Layout, Menu, Avatar, Dropdown, Button, message, Tag } from 'antd';
import {
  ShopOutlined,
  UserOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  ShareAltOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { authAPI } from '../services';

const { Header, Sider, Content } = Layout;

interface UserInfo {
  id: number;
  username: string;
  phone?: string;
  email?: string;
  free_shop_count?: number;
  used_shop_count?: number;
  accountType: 'user' | 'sub_account';
}

export default function mainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // 根据当前路径获取选中的菜单项
  const getSelectedKey = () => {
    if (pathname.startsWith('/main/home')) return ['home'];
    if (pathname.startsWith('/main/malls')) return ['malls'];
    if (pathname.startsWith('/main/teams')) return ['teams'];
    if (pathname.startsWith('/main/invitations')) return ['invitations'];
    return ['home'];
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      setUserInfo(response.data.data);
    } catch (error) {
      console.error('认证检查失败:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      localStorage.removeItem('user');
      localStorage.removeItem('accountType');
      message.success('退出成功');
      router.push('/login');
    } catch (error) {
      console.error('退出失败:', error);
      message.error('退出失败');
    }
  };

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
  ];

  const sideMenuItems: MenuProps['items'] = [
    {
      key: 'home',
      icon: <DashboardOutlined />,
      label: '首页',
    },
    {
      key: 'malls',
      icon: <ShopOutlined />,
      label: '店铺管理',
    },
    {
      key: 'teams',
      icon: <TeamOutlined />,
      label: '团队管理',
    },
    {
      key: 'invitations',
      icon: <ShareAltOutlined />,
      label: '邀请奖励',
    },
  ];

  if (loading) {
    return (
      <div>
        <div>加载中...</div>
      </div>
    );
  }

  return (
    <Layout style={{ height: '100vh' }}>
      <Layout>
        <Header
          style={{
            backgroundColor: 'white',
            padding: '0 24px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: '64px',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#262626',
                margin: 0,
              }}
            >
              紫雀跨境运营平台
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span
              style={{ color: '#666', fontWeight: 500, whiteSpace: 'nowrap' }}
            >
              欢迎，{userInfo?.username || '用户'}
              {userInfo?.accountType === 'sub_account' && (
                <Tag color='blue' style={{ marginLeft: '8px' }}>
                  子账户
                </Tag>
              )}
            </span>
            <Dropdown menu={{ items: userMenuItems }} placement='bottomRight'>
              <Avatar
                icon={<UserOutlined />}
                style={{ cursor: 'pointer', backgroundColor: '#8b5cf6' }}
              />
            </Dropdown>
          </div>
        </Header>

        <Layout>
          <Sider
            trigger={null}
            collapsible
            collapsed={collapsed}
            theme='light'
            style={{ height: 'calc(100vh - 64px)', overflow: 'auto' }}
          >
            <Menu
              mode='inline'
              selectedKeys={getSelectedKey()}
              items={sideMenuItems}
              style={{
                height: 'calc(100vh - 64px - 42px)',
                borderRight: 0,
              }}
              onClick={({ key }) => {
                if (key === 'home') {
                  router.push('/main/home');
                } else if (key === 'malls') {
                  router.push('/main/malls');
                } else if (key === 'teams') {
                  router.push('/main/teams');
                } else if (key === 'invitations') {
                  router.push('/main/invitations');
                }
              }}
            />
            <div
              style={{
                padding: '4px',
                borderTop: '1px solid #f0f0f0',
                textAlign: 'center',
              }}
            >
              <Button
                type='text'
                onClick={() => setCollapsed(!collapsed)}
                style={{ fontSize: '16px', width: '100%' }}
              >
                {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              </Button>
            </div>
          </Sider>

          <Content
            style={{
              height: 'calc(100vh - 64px)',
              overflow: 'auto',
              backgroundColor: '#f5f5f5',
              padding: '12px',
            }}
          >
            {children}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}
