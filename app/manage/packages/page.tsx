'use client';

import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Tag, Statistic, Row, Col, Modal, Form, Input, Select, message, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ShoppingCartOutlined, ReloadOutlined } from '@ant-design/icons';
import { packagesAPI, userPackagesAPI } from '../../services';

import { useRouter } from 'next/navigation'

interface Package {
  id: number
  name: string
  description: string
  price: number
  duration_months: number
  shop_limit: number
  features: string[]
  enabled: boolean
  created_at: string
  updated_at: string
}

interface UserPackage {
  id: number
  package_id: number
  package_name: string
  order_number: string
  price: number
  status: string
  start_date: string
  end_date: string
  created_at: string
}

interface PackageStats {
  totalPackages: number
  enabledPackages: number
  totalOrders: number
  activeOrders: number
}

export default function PackagesPage() {
  const router = useRouter()
  const [packages, setPackages] = useState<Package[]>([])
  const [userPackages, setUserPackages] = useState<UserPackage[]>([])
  const [stats, setStats] = useState<PackageStats>({
    totalPackages: 0,
    enabledPackages: 0,
    totalOrders: 0,
    activeOrders: 0,
  })
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [orderModalVisible, setOrderModalVisible] = useState(false)
  const [editingPackage, setEditingPackage] = useState<Package | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [form] = Form.useForm()
  const [orderForm] = Form.useForm()
  const [activeTab, setActiveTab] = useState('packages')

  // 获取套餐列表
  const fetchPackages = async () => {
    setLoading(true)
    try {
      const response = await packagesAPI.getPackages({});
      const data = response.data;
      
      if (data.success) {
        setPackages(data.data)
        
        // 计算统计数据
        const totalPackages = data.data.length
        const enabledPackages = data.data.filter((pkg: Package) => pkg.enabled).length
        setStats(prev => ({ ...prev, totalPackages, enabledPackages }))
      } else {
        message.error(data.message || '获取套餐列表失败')
      }
    } catch (error) {
      console.error('获取套餐列表失败:', error)
      message.error('获取套餐列表失败')
    } finally {
      setLoading(false)
    }
  }

  // 获取用户套餐订购记录
  const fetchUserPackages = async () => {
    try {
      const response = await userPackagesAPI.getUserPackages({});
      const data = response.data;
      
      if (data.success) {
        setUserPackages(data.data.userPackages)
        
        // 计算统计数据
        const totalOrders = data.data.userPackages.length
        const activeOrders = data.data.userPackages.filter((order: UserPackage) => order.status === 'active').length
        setStats(prev => ({ ...prev, totalOrders, activeOrders }))
      } else {
        message.error(data.message || '获取订购记录失败')
      }
    } catch (error) {
      console.error('获取订购记录失败:', error)
      message.error('获取订购记录失败')
    }
  }

  // 创建/更新套餐
  const handleSubmitPackage = async (values: any) => {
    try {
      const submitData = {
        ...values,
        features: values.features ? values.features.split('\n').filter((f: string) => f.trim()) : [],
      }

      const url = editingPackage ? `/api/packages/${editingPackage.id}` : '/api/packages'
      const method = editingPackage ? 'PUT' : 'POST'

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
        message.success(editingPackage ? '套餐更新成功' : '套餐创建成功')
        setModalVisible(false)
        form.resetFields()
        fetchPackages()
      } else {
        message.error(data.message || '操作失败')
      }
    } catch (error) {
      console.error('操作失败:', error)
      message.error('操作失败')
    }
  }

  // 订购套餐
  const handleOrderPackage = async (values: any) => {
    try {
      const response = await userPackagesAPI.createUserPackage({
        package_id: selectedPackage?.id,
        ...values,
      });
      const data = response.data;
      
      if (data.success) {
        message.success('套餐订购成功')
        setOrderModalVisible(false)
        orderForm.resetFields()
        fetchUserPackages()
      } else {
        message.error(data.message || '订购失败')
      }
    } catch (error) {
      console.error('订购失败:', error)
      message.error('订购失败')
    }
  }

  // 编辑套餐
  const handleEditPackage = (pkg: Package) => {
    setEditingPackage(pkg)
    form.setFieldsValue({
      ...pkg,
      features: pkg.features.join('\n'),
    })
    setModalVisible(true)
  }

  // 订购套餐
  const handleOrderClick = (pkg: Package) => {
    setSelectedPackage(pkg)
    orderForm.setFieldsValue({
      package_name: pkg.name,
      price: pkg.price,
    })
    setOrderModalVisible(true)
  }

  // 套餐表格列定义
  const packageColumns = [
    {
      title: '套餐名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <Space>
          <GiftOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `¥${price.toFixed(2)}`,
    },
    {
      title: '时长',
      dataIndex: 'duration_months',
      key: 'duration_months',
      render: (months: number) => `${months} 个月`,
    },
    {
      title: '店铺限制',
      dataIndex: 'shop_limit',
      key: 'shop_limit',
      render: (limit: number) => `${limit} 个店铺`,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'green' : 'red'}>
          {enabled ? '启用' : '禁用'}
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
      render: (_: any, record: Package) => (
        <Space>
          <Button
            type="link"
            onClick={() => handleOrderClick(record)}
            disabled={!record.enabled}
          >
            订购
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditPackage(record)}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ]

  // 订购记录表格列定义
  const orderColumns = [
    {
      title: '订单号',
      dataIndex: 'order_number',
      key: 'order_number',
    },
    {
      title: '套餐名称',
      dataIndex: 'package_name',
      key: 'package_name',
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `¥${price.toFixed(2)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusColors: { [key: string]: string } = {
          active: 'green',
          expired: 'red',
          pending: 'orange',
        }
        const statusNames: { [key: string]: string } = {
          active: '生效中',
          expired: '已过期',
          pending: '待生效',
        }
        return <Tag color={statusColors[status]}>{statusNames[status]}</Tag>
      },
    },
    {
      title: '开始时间',
      dataIndex: 'start_date',
      key: 'start_date',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: '结束时间',
      dataIndex: 'end_date',
      key: 'end_date',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: '订购时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString(),
    },
  ]

  useEffect(() => {
    fetchPackages()
    fetchUserPackages()
  }, [])

  return (
    <div style={{ padding: '24px' }}>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总套餐数"
              value={stats.totalPackages}
              prefix={<GiftOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="启用套餐"
              value={stats.enabledPackages}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总订单数"
              value={stats.totalOrders}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="生效订单"
              value={stats.activeOrders}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 标签页 */}
      <Card
        tabList={[
          { key: 'packages', tab: '套餐管理' },
          { key: 'orders', tab: '我的订购' },
        ]}
        activeTabKey={activeTab}
        onTabChange={setActiveTab}
        tabBarExtraContent={
          activeTab === 'packages' ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingPackage(null)
                form.resetFields()
                setModalVisible(true)
              }}
            >
              创建套餐
            </Button>
          ) : null
        }
      >
        {activeTab === 'packages' && (
          <Table
            columns={packageColumns}
            dataSource={packages}
            rowKey="id"
            loading={loading}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            }}
          />
        )}

        {activeTab === 'orders' && (
          <Table
            columns={orderColumns}
            dataSource={userPackages}
            rowKey="id"
            loading={loading}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            }}
          />
        )}
      </Card>

      {/* 创建/编辑套餐弹窗 */}
      <Modal
        title={editingPackage ? '编辑套餐' : '创建套餐'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingPackage(null)
          form.resetFields()
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitPackage}
        >
          <Form.Item
            label="套餐名称"
            name="name"
            rules={[
              { required: true, message: '请输入套餐名称' },
              { min: 2, max: 50, message: '套餐名称长度应在2-50个字符之间' },
            ]}
          >
            <Input placeholder="请输入套餐名称" />
          </Form.Item>

          <Form.Item
            label="套餐描述"
            name="description"
            rules={[{ max: 200, message: '描述不能超过200个字符' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入套餐描述" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="价格（元）"
                name="price"
                rules={[
                  { required: true, message: '请输入价格' },
                  { type: 'number', min: 0, message: '价格不能为负数' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入价格"
                  precision={2}
                  min={0}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="时长（月）"
                name="duration_months"
                rules={[
                  { required: true, message: '请输入时长' },
                  { type: 'number', min: 1, message: '时长至少为1个月' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入时长"
                  min={1}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="店铺限制"
            name="shop_limit"
            rules={[
              { required: true, message: '请输入店铺限制' },
              { type: 'number', min: 1, message: '店铺限制至少为1个' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="请输入店铺限制"
              min={1}
            />
          </Form.Item>

          <Form.Item
            label="套餐特性（每行一个）"
            name="features"
          >
            <Input.TextArea
              rows={4}
              placeholder="请输入套餐特性，每行一个特性"
            />
          </Form.Item>

          <Form.Item
            label="启用状态"
            name="enabled"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => {
                  setModalVisible(false)
                  setEditingPackage(null)
                  form.resetFields()
                }}
              >
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingPackage ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 订购套餐弹窗 */}
      <Modal
        title="订购套餐"
        open={orderModalVisible}
        onCancel={() => {
          setOrderModalVisible(false)
          setSelectedPackage(null)
          orderForm.resetFields()
        }}
        footer={null}
        width={500}
      >
        {selectedPackage && (
          <>
            <Descriptions
              title="套餐信息"
              bordered
              column={1}
              style={{ marginBottom: 24 }}
            >
              <Descriptions.Item label="套餐名称">{selectedPackage.name}</Descriptions.Item>
              <Descriptions.Item label="价格">¥{selectedPackage.price.toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="时长">{selectedPackage.duration_months} 个月</Descriptions.Item>
              <Descriptions.Item label="店铺限制">{selectedPackage.shop_limit} 个店铺</Descriptions.Item>
              <Descriptions.Item label="套餐特性">
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {selectedPackage.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </Descriptions.Item>
            </Descriptions>

            <Form
              form={orderForm}
              layout="vertical"
              onFinish={handleOrderPackage}
            >
              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Space>
                  <Button
                    onClick={() => {
                      setOrderModalVisible(false)
                      setSelectedPackage(null)
                      orderForm.resetFields()
                    }}
                  >
                    取消
                  </Button>
                  <Button type="primary" htmlType="submit">
                    确认订购
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  )
}