'use client';

import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Tag, Statistic, Row, Col, Modal, Form, Input, Select, message, Popconfirm } from 'antd';
import { UserAddOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { subAccountsAPI, mallsAPI } from '../../services';

import { useRouter } from 'next/navigation'

const { Option } = Select

interface SubAccount {
  id: number
  username: string
  role: string
  responsible_shops: number[]
  permissions: string[]
  status: string
  created_at: string
  updated_at: string
}

interface SubAccountStats {
  total: number
  active: number
  inactive: number
}

interface Shop {
  id: number
  shop_name: string
  platform: string
}

export default function SubAccountsPage() {
  const router = useRouter()
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([])
  const [shops, setShops] = useState<Shop[]>([])
  const [stats, setStats] = useState<SubAccountStats>({ total: 0, active: 0, inactive: 0 })
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingAccount, setEditingAccount] = useState<SubAccount | null>(null)
  const [form] = Form.useForm()
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })
  const [targetKeys, setTargetKeys] = useState<string[]>([])
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

  // 权限选项
  const permissionOptions = [
    { label: '查看店铺数据', value: 'view_shop_data' },
    { label: '管理店铺', value: 'manage_shops' },
    { label: '查看订单', value: 'view_orders' },
    { label: '管理订单', value: 'manage_orders' },
    { label: '查看客户', value: 'view_customers' },
    { label: '管理客户', value: 'manage_customers' },
    { label: '查看报表', value: 'view_reports' },
    { label: '导出数据', value: 'export_data' },
  ]

  // 获取子账户列表
  const fetchSubAccounts = async (page = 1, pageSize = 10) => {
    setLoading(true)
    try {
      const response = await subAccountsAPI.getSubAccounts({
        page,
        pageSize,
      });
      
      const data = response.data;
      if (data.success) {
        setSubAccounts(data.data.subAccounts)
        setPagination({
          current: page,
          pageSize,
          total: data.data.pagination.total,
        })
        
        // 计算统计数据
        const total = data.data.subAccounts.length
        const active = data.data.subAccounts.filter((account: SubAccount) => account.status === 'active').length
        const inactive = total - active
        setStats({ total, active, inactive })
      } else {
        message.error(data.message || '获取子账户列表失败')
      }
    } catch (error) {
      console.error('获取子账户列表失败:', error)
      message.error('获取子账户列表失败')
    } finally {
      setLoading(false)
    }
  }

  // 获取店铺列表
  const fetchShops = async () => {
    try {
      const response = await mallsAPI.getMalls({ pageSize: 1000 });
      const data = response.data;
      if (data.success) {
        setShops(data.data.shops)
      }
    } catch (error) {
      console.error('获取店铺列表失败:', error)
    }
  }

  // 创建/更新子账户
  const handleSubmit = async (values: any) => {
    try {
      const submitData = {
        ...values,
        responsible_shops: targetKeys.map(key => parseInt(key)),
        permissions: selectedPermissions,
      }

      const url = editingAccount ? `/api/sub-accounts/${editingAccount.id}` : '/api/sub-accounts'
      const method = editingAccount ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(submitData),
      })
      const data = await response.json()

      if (data.success) {
        message.success(editingAccount ? '子账户更新成功' : '子账户创建成功')
        setModalVisible(false)
        form.resetFields()
        setTargetKeys([])
        setSelectedPermissions([])
        fetchSubAccounts(pagination.current, pagination.pageSize)
      } else {
        message.error(data.message || '操作失败')
      }
    } catch (error) {
      console.error('操作失败:', error)
      message.error('操作失败')
    }
  }

  // 编辑子账户
  const handleEdit = (account: SubAccount) => {
    setEditingAccount(account)
    form.setFieldsValue({
      username: account.username,
      role: account.role,
      status: account.status,
    })
    setTargetKeys(account.responsible_shops.map(id => id.toString()))
    setSelectedPermissions(account.permissions)
    setModalVisible(true)
  }

  // 删除子账户
  const handleDelete = async (accountId: number) => {
    try {
      const response = await fetch(`/api/sub-accounts/${accountId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json()

      if (data.success) {
        message.success('子账户删除成功')
        fetchSubAccounts(pagination.current, pagination.pageSize)
      } else {
        message.error(data.message || '删除失败')
      }
    } catch (error) {
      console.error('删除失败:', error)
      message.error('删除失败')
    }
  }

  // 表格列定义
  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (text: string) => (
        <Space>
          <UserOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const roleColors: { [key: string]: string } = {
          admin: 'red',
          manager: 'blue',
          operator: 'green',
        }
        const roleNames: { [key: string]: string } = {
          admin: '管理员',
          manager: '经理',
          operator: '操作员',
        }
        return <Tag color={roleColors[role]}>{roleNames[role]}</Tag>
      },
    },
    {
      title: '负责店铺',
      dataIndex: 'responsible_shops',
      key: 'responsible_shops',
      render: (shopIds: number[]) => {
        const shopNames = shopIds.map(id => {
          const shop = shops.find(s => s.id === id)
          return shop ? shop.shop_name : `店铺${id}`
        })
        return shopNames.length > 0 ? shopNames.join(', ') : '无'
      },
    },
    {
      title: '权限数量',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions: string[]) => (
        <Tag color="blue">{permissions.length} 项权限</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '正常' : '停用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: SubAccount) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个子账户吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // Transfer 数据源
  const transferDataSource = shops.map(shop => ({
    key: shop.id.toString(),
    title: `${shop.shop_name} (${shop.platform.toUpperCase()})`,
  }))

  useEffect(() => {
    fetchSubAccounts()
    fetchShops()
  }, [])

  return (
    <div style={{ padding: '24px' }}>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="总子账户数"
              value={stats.total}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="正常账户"
              value={stats.active}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="停用账户"
              value={stats.inactive}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 子账户列表 */}
      <Card
        title="子账户管理"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingAccount(null)
              form.resetFields()
              setTargetKeys([])
              setSelectedPermissions([])
              setModalVisible(true)
            }}
          >
            创建子账户
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={subAccounts}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            onChange: (page, pageSize) => {
              fetchSubAccounts(page, pageSize)
            },
          }}
        />
      </Card>

      {/* 创建/编辑子账户弹窗 */}
      <Modal
        title={editingAccount ? '编辑子账户' : '创建子账户'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingAccount(null)
          form.resetFields()
          setTargetKeys([])
          setSelectedPermissions([])
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="用户名"
                name="username"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, max: 20, message: '用户名长度应在3-20个字符之间' },
                  { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' },
                ]}
              >
                <Input placeholder="请输入用户名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="密码"
                name="password"
                rules={[
                  { required: !editingAccount, message: '请输入密码' },
                  { min: 6, max: 20, message: '密码长度应在6-20个字符之间' },
                ]}
              >
                <Input.Password placeholder={editingAccount ? '留空则不修改密码' : '请输入密码'} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="角色"
                name="role"
                rules={[{ required: true, message: '请选择角色' }]}
              >
                <Select placeholder="请选择角色">
                  <Option value="admin">管理员</Option>
                  <Option value="manager">经理</Option>
                  <Option value="operator">操作员</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="状态"
                name="status"
                initialValue="active"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select placeholder="请选择状态">
                  <Option value="active">正常</Option>
                  <Option value="inactive">停用</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="负责店铺">
            <Transfer
              dataSource={transferDataSource}
              targetKeys={targetKeys}
              onChange={(keys) => setTargetKeys(keys as string[])}
              render={item => item.title}
              titles={['可选店铺', '负责店铺']}
              style={{ marginBottom: 16 }}
            />
          </Form.Item>

          <Form.Item label="权限设置">
            <Checkbox.Group
              options={permissionOptions}
              value={selectedPermissions}
              onChange={setSelectedPermissions}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => {
                  setModalVisible(false)
                  setEditingAccount(null)
                  form.resetFields()
                  setTargetKeys([])
                  setSelectedPermissions([])
                }}
              >
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingAccount ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}