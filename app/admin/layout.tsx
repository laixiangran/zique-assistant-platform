'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Button,
  message,
  Tag,
  Spin,
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  LogoutOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  DashboardOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { adminAuthAPI } from '../services';
import logo from '../../public/logo.png';

const { Header, Sider, Content } = Layout;

interface UserInfo {
  id: number;
  username: string;
  phone?: string;
  email?: string;
  role: 'super_admin' | 'admin';
  status: string;
  lastLoginTime?: string;
  lastLoginIp?: string;
}

export default function mainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  // const [userPackage, setUserPackage] = useState<any>({});
  // const [packageModalVisible, setPackageModalVisible] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // 根据当前路径获取选中的菜单项
  const getSelectedKey = () => {
    if (pathname.startsWith('/admin/home')) return ['home'];
    if (pathname.startsWith('/admin/plugins')) return ['plugins'];
    return ['home'];
  };

  const checkAuth = useCallback(async () => {
    try {
      const token =
        localStorage.getItem('admin_token') ||
        sessionStorage.getItem('admin_token');

      if (!token) {
        // 没有token，直接跳转到登录页面
        router.push('/admin/login');
        return;
      }

      const response = await adminAuthAPI.profile();
      setUserInfo(response.data);
    } catch (error) {
      console.error('认证检查失败:', error);
      // 认证失败时清理所有存储的认证信息
      localStorage.removeItem('admin_user');
      localStorage.removeItem('admin_accountType');
      localStorage.removeItem('admin_token');
      sessionStorage.removeItem('admin_user');
      sessionStorage.removeItem('admin_accountType');
      sessionStorage.removeItem('admin_token');
      router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // 如果是登录页面，不执行认证检查
    if (pathname !== '/admin/login') {
      checkAuth();
    }
  }, [pathname, checkAuth]);

  // 如果是登录页面，直接渲染子组件，不应用布局
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    try {
      await adminAuthAPI.logout();
      // 清理所有存储的认证信息
      localStorage.removeItem('admin_user');
      localStorage.removeItem('admin_accountType');
      localStorage.removeItem('admin_token');
      sessionStorage.removeItem('admin_user');
      sessionStorage.removeItem('admin_accountType');
      sessionStorage.removeItem('admin_token');
      message.success('退出成功');
      router.push('/admin/login');
    } catch (error) {
      console.error('退出失败:', error);
      // 即使退出API失败，也要清理本地存储
      localStorage.removeItem('admin_user');
      localStorage.removeItem('admin_accountType');
      localStorage.removeItem('admin_token');
      sessionStorage.removeItem('admin_user');
      sessionStorage.removeItem('admin_accountType');
      sessionStorage.removeItem('admin_token');
      message.error('退出失败');
      router.push('/admin/login');
    }
  };

  const userMenuItems: MenuProps['items'] = [
    // {
    //   key: 'profile',
    //   icon: <UserOutlined />,
    //   label: '个人资料',
    // },
    // {
    //   key: 'settings',
    //   icon: <SettingOutlined />,
    //   label: '设置',
    // },
    // {
    //   type: 'divider',
    // },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  // 根据用户类型生成菜单项
  const sideMenuItems: MenuProps['items'] = [
    {
      key: 'home',
      icon: <DashboardOutlined />,
      label: '首页',
    },
    {
      key: 'plugins',
      icon: <AppstoreOutlined />,
      label: '插件管理',
    },
    {
      key: 'users',
      icon: <UserOutlined />,
      label: '用户管理',
    },
    {
      key: 'settings',
      icon: <TeamOutlined />,
      label: '系统设置',
    },
  ];

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          flexDirection: 'column',
        }}
      >
        <Spin size='large' />
        <div style={{ marginTop: 16, fontSize: 16 }}>页面加载中...</div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Image
              className='logo-img'
              src={logo}
              alt='logo'
              width={32}
              height={32}
            />
            <h1
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#262626',
                margin: 0,
              }}
            >
              紫雀管理后台
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span
              style={{ color: '#666', fontWeight: 500, whiteSpace: 'nowrap' }}
            >
              欢迎，{userInfo?.username || '管理员'}
              {userInfo?.role === 'admin' && (
                <Tag color='blue' style={{ marginLeft: '8px' }}>
                  管理员
                </Tag>
              )}
              {userInfo?.role === 'super_admin' && (
                <Tag color='red' style={{ marginLeft: '8px' }}>
                  超级管理员
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
                  router.push('/admin/home');
                } else if (key === 'plugins') {
                  router.push('/admin/plugins');
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
