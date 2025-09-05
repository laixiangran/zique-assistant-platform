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
  DatePicker,
  Select,
  Typography,
  Tooltip,
  Popconfirm,
  Input,
} from 'antd'
import {
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { Option } = Select

interface OperationLog {
  id: number
  operation_type: string
  operation_description: string
  target_type: string
  target_id: number
  request_data: string
  response_data?: string
  ip_address: string
  user_agent: string
  status: string
  error_message?: string
  created_at: string
  user?: {
    id: number
    username: string
    phone?: string
    email?: string
    account_type: string
  }
}

interface LogStats {
  total: number
  success: number
  failed: number
  operationTypes: Array<{
    operation_type: string
    count: number
  }>
}

export default function OperationLogsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<OperationLog[]>([])
  const [stats, setStats] = useState<LogStats>({
    total: 0,
    success: 0,
    failed: 0,
    operationTypes: [],
  })
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })
  const [filters, setFilters] = useState({
    operation_type: '',
    status: '',
    start_date: '',
    end_date: '',
  })
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedLog, setSelectedLog] = useState<OperationLog | null>(null)
  const [cleanupModalVisible, setCleanupModalVisible] = useState(false)
  const [cleanupDays, setCleanupDays] = useState(30)

  // 获取操作日志
  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.current.toString(),
        limit: pagination.pageSize.toString(),
        ...(filters.operation_type && { operation_type: filters.operation_type }),
        ...(filters.status && { status: filters.status }),
        ...(filters.start_date && { start_date: filters.start_date }),
        ...(filters.end_date && { end_date: filters.end_date }),
      })

      const response = await fetch(`/api/operation-logs?${params}`)
      const data = await response.json()

      if (data.success) {
        setLogs(data.data.logs)
        setStats(data.data.stats)
        setPagination(prev => ({
          ...prev,
          total: data.data.pagination.total,
        }))
      } else {
        message.error(data.message || '获取操作日志失败')
      }
    } catch (error) {
      console.error('获取操作日志失败:', error)
      message.error('获取操作日志失败')
    } finally {
      setLoading(false)
    }
  }

  // 清理操作日志
  const cleanupLogs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/operation-logs', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          days: cleanupDays,
        }),
      })

      const data = await response.json()

      if (data.success) {
        message.success(`成功清理 ${data.data.deletedCount} 条操作日志`)
        setCleanupModalVisible(false)
        fetchLogs() // 刷新日志列表
      } else {
        message.error(data.message || '清理操作日志失败')
      }
    } catch (error) {
      console.error('清理操作日志失败:', error)
      message.error('清理操作日志失败')
    } finally {
      setLoading(false)
    }
  }

  // 查看日志详情
  const viewLogDetail = (log: OperationLog) => {
    setSelectedLog(log)
    setDetailModalVisible(true)
  }

  // 导出日志
  const exportLogs = () => {
    const csvContent = [
      ['时间', '用户', '操作类型', '操作描述', '状态', 'IP地址'].join(','),
      ...logs.map(log => [
        new Date(log.created_at).toLocaleString(),
        log.user?.username || '-',
        log.operation_type,
        log.operation_description,
        log.status === 'success' ? '成功' : '失败',
        log.ip_address,
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `operation_logs_${dayjs().format('YYYY-MM-DD')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 处理日期范围变化
  const handleDateRangeChange = (dates: any) => {
    if (dates && dates.length === 2) {
      setFilters(prev => ({
        ...prev,
        start_date: dates[0].format('YYYY-MM-DD'),
        end_date: dates[1].format('YYYY-MM-DD'),
      }))
    } else {
      setFilters(prev => ({
        ...prev,
        start_date: '',
        end_date: '',
      }))
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [pagination.current, pagination.pageSize, filters])

  // 操作类型映射
  const operationTypeMap: { [key: string]: { text: string; color: string } } = {
    login: { text: '登录', color: 'blue' },
    logout: { text: '登出', color: 'default' },
    register: { text: '注册', color: 'green' },
    shop_bind: { text: '店铺绑定', color: 'orange' },
    shop_update: { text: '店铺更新', color: 'orange' },
    shop_delete: { text: '店铺删除', color: 'red' },
    package_order: { text: '套餐订购', color: 'purple' },
    sub_account_create: { text: '创建子账户', color: 'cyan' },
    sub_account_update: { text: '更新子账户', color: 'cyan' },
    sub_account_delete: { text: '删除子账户', color: 'red' },
    invitation_generate: { text: '生成邀请', color: 'lime' },
    invitation_reward_claim: { text: '领取奖励', color: 'gold' },
  }

  // 表格列定义
  const columns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => (
        <Tooltip title={new Date(date).toLocaleString()}>
          <Text>{dayjs(date).format('MM-DD HH:mm')}</Text>
        </Tooltip>
      ),
    },
    {
      title: '用户',
      dataIndex: 'user',
      key: 'user',
      width: 120,
      render: (user: any) => (
        user ? (
          <div>
            <div>{user.username}</div>
            <Tag color={user.account_type === 'user' ? 'blue' : 'orange'}>
              {user.account_type === 'user' ? '主账户' : '子账户'}
            </Tag>
          </div>
        ) : (
          <Text type="secondary">-</Text>
        )
      ),
    },
    {
      title: '操作类型',
      dataIndex: 'operation_type',
      key: 'operation_type',
      width: 120,
      render: (type: string) => {
        const config = operationTypeMap[type] || { text: type, color: 'default' }
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    {
      title: '操作描述',
      dataIndex: 'operation_description',
      key: 'operation_description',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text>{text}</Text>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => (
        <Tag
          color={status === 'success' ? 'green' : 'red'}
          icon={status === 'success' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
        >
          {status === 'success' ? '成功' : '失败'}
        </Tag>
      ),
    },
    {
      title: 'IP地址',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 120,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: any, record: OperationLog) => (
        <Button
          type="link"
          size="small"
          icon={<SearchOutlined />}
          onClick={() => viewLogDetail(record)}
        >
          详情
        </Button>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>操作日志</Title>
        <Text type="secondary">查看系统操作记录和统计信息</Text>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总操作数"
              value={stats.total}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="成功操作"
              value={stats.success}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="失败操作"
              value={stats.failed}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="成功率"
              value={stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : 0}
              suffix="%"
              valueStyle={{ color: stats.total > 0 && (stats.success / stats.total) > 0.9 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选器 */}
      <Card style={{ marginBottom: '16px' }}>
        <Row gutter={16} align="middle">
          <Col>
            <Select
              placeholder="选择操作类型"
              style={{ width: 150 }}
              value={filters.operation_type}
              onChange={(value) => setFilters(prev => ({ ...prev, operation_type: value }))}
              allowClear
            >
              {Object.entries(operationTypeMap).map(([key, config]) => (
                <Option key={key} value={key}>{config.text}</Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Select
              placeholder="选择状态"
              style={{ width: 120 }}
              value={filters.status}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              allowClear
            >
              <Option value="success">成功</Option>
              <Option value="failed">失败</Option>
            </Select>
          </Col>
          <Col>
            <RangePicker
              placeholder={['开始日期', '结束日期']}
              onChange={handleDateRangeChange}
              value={filters.start_date && filters.end_date ? [
                dayjs(filters.start_date),
                dayjs(filters.end_date)
              ] : null}
            />
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchLogs}
                loading={loading}
              >
                刷新
              </Button>
              <Button
                icon={<ExportOutlined />}
                onClick={exportLogs}
                disabled={logs.length === 0}
              >
                导出
              </Button>
              <Button
                icon={<DeleteOutlined />}
                danger
                onClick={() => setCleanupModalVisible(true)}
              >
                清理日志
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 操作日志表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: (page, pageSize) => {
              setPagination(prev => ({
                ...prev,
                current: page,
                pageSize: pageSize || 10,
              }))
            },
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* 日志详情模态框 */}
      <Modal
        title="操作日志详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {selectedLog && (
          <div>
            <Row gutter={16} style={{ marginBottom: '16px' }}>
              <Col span={12}>
                <Text strong>操作时间：</Text>
                <Text>{new Date(selectedLog.created_at).toLocaleString()}</Text>
              </Col>
              <Col span={12}>
                <Text strong>操作用户：</Text>
                <Text>{selectedLog.user?.username || '-'}</Text>
              </Col>
            </Row>
            <Row gutter={16} style={{ marginBottom: '16px' }}>
              <Col span={12}>
                <Text strong>操作类型：</Text>
                <Tag color={operationTypeMap[selectedLog.operation_type]?.color || 'default'}>
                  {operationTypeMap[selectedLog.operation_type]?.text || selectedLog.operation_type}
                </Tag>
              </Col>
              <Col span={12}>
                <Text strong>操作状态：</Text>
                <Tag
                  color={selectedLog.status === 'success' ? 'green' : 'red'}
                  icon={selectedLog.status === 'success' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                >
                  {selectedLog.status === 'success' ? '成功' : '失败'}
                </Tag>
              </Col>
            </Row>
            <Row gutter={16} style={{ marginBottom: '16px' }}>
              <Col span={24}>
                <Text strong>操作描述：</Text>
                <div style={{ marginTop: '8px' }}>
                  <Text>{selectedLog.operation_description}</Text>
                </div>
              </Col>
            </Row>
            <Row gutter={16} style={{ marginBottom: '16px' }}>
              <Col span={12}>
                <Text strong>IP地址：</Text>
                <Text>{selectedLog.ip_address}</Text>
              </Col>
              <Col span={12}>
                <Text strong>目标类型：</Text>
                <Text>{selectedLog.target_type}</Text>
              </Col>
            </Row>
            {selectedLog.request_data && (
              <Row gutter={16} style={{ marginBottom: '16px' }}>
                <Col span={24}>
                  <Text strong>请求数据：</Text>
                  <div style={{ marginTop: '8px' }}>
                    <Input.TextArea
                      value={JSON.stringify(JSON.parse(selectedLog.request_data), null, 2)}
                      readOnly
                      rows={4}
                    />
                  </div>
                </Col>
              </Row>
            )}
            {selectedLog.response_data && (
              <Row gutter={16} style={{ marginBottom: '16px' }}>
                <Col span={24}>
                  <Text strong>响应数据：</Text>
                  <div style={{ marginTop: '8px' }}>
                    <Input.TextArea
                      value={JSON.stringify(JSON.parse(selectedLog.response_data), null, 2)}
                      readOnly
                      rows={4}
                    />
                  </div>
                </Col>
              </Row>
            )}
            {selectedLog.error_message && (
              <Row gutter={16} style={{ marginBottom: '16px' }}>
                <Col span={24}>
                  <Text strong>错误信息：</Text>
                  <div style={{ marginTop: '8px' }}>
                    <Text type="danger">{selectedLog.error_message}</Text>
                  </div>
                </Col>
              </Row>
            )}
            <Row gutter={16}>
              <Col span={24}>
                <Text strong>用户代理：</Text>
                <div style={{ marginTop: '8px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {selectedLog.user_agent}
                  </Text>
                </div>
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      {/* 清理日志模态框 */}
      <Modal
        title="清理操作日志"
        open={cleanupModalVisible}
        onCancel={() => setCleanupModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setCleanupModalVisible(false)}>
            取消
          </Button>,
          <Popconfirm
            key="confirm"
            title={`确定要清理 ${cleanupDays} 天前的操作日志吗？`}
            description="此操作不可恢复，请谨慎操作。"
            onConfirm={cleanupLogs}
            okText="确定"
            cancelText="取消"
          >
            <Button type="primary" danger loading={loading}>
              确定清理
            </Button>
          </Popconfirm>,
        ]}
      >
        <div>
          <Text>清理多少天前的操作日志：</Text>
          <div style={{ marginTop: '16px' }}>
            <Input
              type="number"
              value={cleanupDays}
              onChange={(e) => setCleanupDays(Number(e.target.value))}
              min={1}
              max={365}
              suffix="天"
              style={{ width: '200px' }}
            />
          </div>
          <div style={{ marginTop: '16px' }}>
            <Text type="secondary">
              将清理 {dayjs().subtract(cleanupDays, 'day').format('YYYY-MM-DD')} 之前的所有操作日志。
            </Text>
          </div>
        </div>
      </Modal>
    </div>
  )
}