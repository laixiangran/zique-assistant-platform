'use client';

import { useState, useEffect } from 'react';
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
  Modal,
  Descriptions,
} from 'antd';
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
  CrownOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { authAPI, userPackagesAPI } from '../services';
import logo from '../../public/logo.png';

const { Header, Sider, Content } = Layout;

interface UserInfo {
  id: number;
  username: string;
  phone?: string;
  email?: string;
  free_mall_count?: number;
  used_mall_count?: number;
  accountType: 'main' | 'sub';
}

export default function mainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [userPackage, setUserPackage] = useState<any>({});
  const [packageModalVisible, setPackageModalVisible] = useState(false);
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
      // 获取用户套餐信息
      fetchUserPackages();
    } catch (error) {
      console.error('认证检查失败:', error);
      // 认证失败时清理所有存储的认证信息
      localStorage.removeItem('user');
      localStorage.removeItem('accountType');
      localStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('accountType');
      sessionStorage.removeItem('token');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  // 获取用户套餐信息
  const fetchUserPackages = async () => {
    try {
      const response = await userPackagesAPI.getUserPackages({
        page: 1,
        pageSize: 10,
      });
      if (response.data.success) {
        setUserPackage(response.data.data?.userPackages[0] || {});
      }
    } catch (error) {
      console.error('获取用户套餐信息失败:', error);
    }
  };

  // 显示套餐详情
  const showPackageDetails = () => {
    setPackageModalVisible(true);
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      // 清理所有存储的认证信息
      localStorage.removeItem('user');
      localStorage.removeItem('accountType');
      localStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('accountType');
      sessionStorage.removeItem('token');
      message.success('退出成功');
      router.push('/login');
    } catch (error) {
      console.error('退出失败:', error);
      // 即使退出API失败，也要清理本地存储
      localStorage.removeItem('user');
      localStorage.removeItem('accountType');
      localStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('accountType');
      sessionStorage.removeItem('token');
      message.error('退出失败');
      router.push('/login');
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
              紫雀跨境运营平台
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span
              style={{ color: '#666', fontWeight: 500, whiteSpace: 'nowrap' }}
            >
              欢迎，{userInfo?.username || '用户'}
              {userInfo?.accountType === 'sub' && (
                <Tag color='blue' style={{ marginLeft: '8px' }}>
                  子账户
                </Tag>
              )}
            </span>
            <Tag
              icon={<CrownOutlined />}
              color='gold'
              style={{ cursor: 'pointer' }}
              onClick={() => showPackageDetails()}
            >
              {userPackage.package?.packageName || '套餐名称'}
            </Tag>
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

      {/* 套餐详情弹窗 */}
      <Modal
        title='套餐详情'
        open={packageModalVisible}
        onCancel={() => setPackageModalVisible(false)}
        footer={[
          <Button key='close' onClick={() => setPackageModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={600}
      >
        {userPackage && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label='套餐名称'>
              {userPackage.package?.packageName}
            </Descriptions.Item>
            <Descriptions.Item label='套餐描述'>
              {userPackage.package?.packageDesc || '暂无描述'}
            </Descriptions.Item>
            <Descriptions.Item label='套餐原价'>
              ¥{userPackage.package?.originalPrice || 0}
            </Descriptions.Item>
            <Descriptions.Item label='当前价格'>
              ¥
              {(userPackage.package?.originalPrice *
                (100 - userPackage.package?.discountPercent)) /
                100 || 0}
              （
              {+userPackage.package?.discountPercent === 100
                ? '免费'
                : `${+(
                    (100 - +userPackage.package?.discountPercent) /
                    100
                  ).toFixed(1)}折`}
              ）
            </Descriptions.Item>
            <Descriptions.Item label='套餐时长'>
              {userPackage.package?.durationMonths || 0} 个月
            </Descriptions.Item>
            <Descriptions.Item label='最多绑定店铺数'>
              {userPackage.package?.maxBindMall || 0} 个
            </Descriptions.Item>
            <Descriptions.Item label='到期时间'>
              {(() => {
                if (!userPackage.expireTime) {
                  return '暂无';
                }
                const expireDate = new Date(userPackage.expireTime);
                const now = new Date();
                const isExpired = expireDate < now;
                return (
                  <span style={{ color: isExpired ? '#ff4d4f' : '#8b5cf6' }}>
                    {userPackage.expireTime}
                    {isExpired && ' (已过期)'}
                  </span>
                );
              })()}
            </Descriptions.Item>
            <Descriptions.Item label='状态'>
              <Tag color={userPackage.package?.isActive ? 'green' : 'red'}>
                {userPackage.package?.isActive ? '已激活' : '待激活'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Layout>
  );
}
