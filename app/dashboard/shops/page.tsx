'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Space,
  Tag,
  Popconfirm,
  Row,
  Col,
  Statistic,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ShopOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'

const { Option } = Select

interface Shop {
  id: number
  shop_name: string
  platform: string
  shop_url: string
  status: string
  created_at: string
  updated_at: string
}

interface ShopStats {
  total: number
  active: number
  inactive: number
}

export default function ShopsPage() {
  const router = useRouter()
  const [shops, setShops] = useState<Shop[]>([])
  const [stats, setStats] = useState<ShopStats>({ total: 0, active: 0, inactive: 0 })
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingShop, setEditingShop] = useState<Shop | null>(null)
  const [form] = Form.useForm()
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })

  // 获取店铺列表
  const fetchShops = async (page = 1, pageSize = 10) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/shops?page=${page}&limit=${pageSize}`, {
        credentials: 'include',
      })
      const data = await response.json()

      if (data.success) {
        setShops(data.data.shops)
        setPagination({
          current: page,
          pageSize,
          total: data.data.pagination.total,
        })
        
        // 计算统计数据
        const total = data.data.shops.length
        const active = data.data.shops.filter((shop: Shop) => shop.status === 'active').length
        const inactive = total - active
        setStats({ total, active, inactive })
      } else {
        message.error(data.message || '获取店铺列表失败')
      }
    } catch (error) {
      console.error('获取店铺列表失败:', error)
      message.error('获取店铺列表失败')
    } finally {
      setLoading(false)
    }
  }

  // 绑定店铺
  const handleBindShop = async (values: any) => {
    try {
      const response = await fetch('/api/shops', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(values),
      })
      const data = await response.json()

      if (data.success) {
        message.success('店铺绑定成功')
        setModalVisible(false)
        form.resetFields()
        fetchShops(pagination.current, pagination.pageSize)
      } else {
        message.error(data.message || '店铺绑定失败')
      }
    } catch (error) {
      console.error('店铺绑定失败:', error)
      message.error('店铺绑定失败')
    }
  }

  // 编辑店铺
  const handleEditShop = (shop: Shop) => {
    setEditingShop(shop)
    form.setFieldsValue({
      shop_name: shop.shop_name,
      platform: shop.platform,
      shop_url: shop.shop_url,
    })
    setModalVisible(true)
  }

  // 删除店铺
  const handleDeleteShop = async (shopId: number) => {
    try {
      const response = await fetch(`/api/shops/${shopId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json()

      if (data.success) {
        message.success('店铺删除成功')
        fetchShops(pagination.current, pagination.pageSize)
      } else {
        message.error(data.message || '店铺删除失败')
      }
    } catch (error) {
      console.error('店铺删除失败:', error)
      message.error('店铺删除失败')
    }
  }

  // 表格列定义
  const columns = [
    {
      title: '店铺名称',
      dataIndex: 'shop_name',
      key: 'shop_name',
      render: (text: string) => (
        <Space>
          <ShopOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      render: (platform: string) => {
        const platformColors: { [key: string]: string } = {
          taobao: 'orange',
          tmall: 'red',
          jd: 'blue',
          pdd: 'green',
          douyin: 'purple',
        }
        return <Tag color={platformColors[platform] || 'default'}>{platform.toUpperCase()}</Tag>
      },
    },
    {
      title: '店铺链接',
      dataIndex: 'shop_url',
      key: 'shop_url',
      render: (url: string) => (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {url.length > 50 ? `${url.substring(0, 50)}...` : url}
        </a>
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
      title: '绑定时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Shop) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditShop(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个店铺吗？"
            onConfirm={() => handleDeleteShop(record.id)}
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

  useEffect(() => {
    fetchShops()
  }, [])

  return (
    <div style={{ padding: '24px' }}>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="总店铺数"
              value={stats.total}
              prefix={<ShopOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="正常店铺"
              value={stats.active}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="停用店铺"
              value={stats.inactive}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 店铺列表 */}
      <Card
        title="店铺管理"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingShop(null)
              form.resetFields()
              setModalVisible(true)
            }}
          >
            绑定店铺
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={shops}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            onChange: (page, pageSize) => {
              fetchShops(page, pageSize)
            },
          }}
        />
      </Card>

      {/* 绑定/编辑店铺弹窗 */}
      <Modal
        title={editingShop ? '编辑店铺' : '绑定店铺'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingShop(null)
          form.resetFields()
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleBindShop}
        >
          <Form.Item
            label="店铺名称"
            name="shop_name"
            rules={[
              { required: true, message: '请输入店铺名称' },
              { min: 2, max: 50, message: '店铺名称长度应在2-50个字符之间' },
            ]}
          >
            <Input placeholder="请输入店铺名称" />
          </Form.Item>

          <Form.Item
            label="平台类型"
            name="platform"
            rules={[{ required: true, message: '请选择平台类型' }]}
          >
            <Select placeholder="请选择平台类型">
              <Option value="taobao">淘宝</Option>
              <Option value="tmall">天猫</Option>
              <Option value="jd">京东</Option>
              <Option value="pdd">拼多多</Option>
              <Option value="douyin">抖音</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="店铺链接"
            name="shop_url"
            rules={[
              { required: true, message: '请输入店铺链接' },
              { type: 'url', message: '请输入有效的URL' },
            ]}
          >
            <Input placeholder="请输入店铺链接" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => {
                  setModalVisible(false)
                  setEditingShop(null)
                  form.resetFields()
                }}
              >
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingShop ? '更新' : '绑定'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}