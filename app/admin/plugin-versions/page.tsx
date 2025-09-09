'use client';

import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  message,
  Popconfirm,
  Upload,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UploadOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

interface PluginVersion {
  id: number;
  version: string;
  releaseDate: string;
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  description?: string;
  changelog?: string;
  isLatest: boolean;
  status: 'active' | 'inactive' | 'deprecated';
  createdTime: string;
  updatedTime: string;
}

interface PluginFormData {
  version: string;
  releaseDate: string;
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  description?: string;
  changelog?: string;
  isLatest: boolean;
  status: 'active' | 'inactive' | 'deprecated';
}

const AdminPluginVersionsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [plugins, setPlugins] = useState<PluginVersion[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlugin, setEditingPlugin] = useState<PluginVersion | null>(
    null
  );
  const [form] = Form.useForm();

  // 获取插件列表
  const fetchPlugins = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(searchText && { search: searchText }),
        ...(statusFilter && { status: statusFilter }),
      });

      // 获取token，优先从localStorage，然后从sessionStorage
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await fetch(`/api/admin/plugins?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPlugins(data.data.items || []);
        setTotal(data.data.total || 0);
      } else {
        message.error('获取插件列表失败');
      }
    } catch (error) {
      console.error('获取插件列表失败:', error);
      message.error('获取插件列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlugins();
  }, [currentPage, pageSize, searchText, statusFilter]);

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchText(value);
    setCurrentPage(1);
  };

  // 处理状态筛选
  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  // 打开创建/编辑模态框
  const openModal = (plugin?: PluginVersion) => {
    setEditingPlugin(plugin || null);
    setModalVisible(true);
    if (plugin) {
      form.setFieldsValue({
        ...plugin,
        releaseDate: dayjs(plugin.releaseDate),
      });
    } else {
      form.resetFields();
    }
  };

  // 关闭模态框
  const closeModal = () => {
    setModalVisible(false);
    setEditingPlugin(null);
    form.resetFields();
  };

  // 提交表单
  const handleSubmit = async (values: any) => {
    try {
      const formData: PluginFormData = {
        ...values,
        releaseDate: values.releaseDate.format('YYYY-MM-DD'),
      };

      const url = editingPlugin
        ? `/api/admin/plugins/${editingPlugin.id}`
        : '/api/admin/plugins';

      const method = editingPlugin ? 'PUT' : 'POST';

      // 获取token，优先从localStorage，然后从sessionStorage
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        message.success(editingPlugin ? '更新插件成功' : '创建插件成功');
        closeModal();
        fetchPlugins();
      } else {
        const errorData = await response.json();
        message.error(errorData.message || '操作失败');
      }
    } catch (error) {
      console.error('提交失败:', error);
      message.error('操作失败');
    }
  };

  // 删除插件
  const handleDelete = async (id: number) => {
    try {
      // 获取token，优先从localStorage，然后从sessionStorage
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await fetch('/api/admin/plugins', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: [id] }),
      });

      if (response.ok) {
        message.success('删除插件成功');
        fetchPlugins();
      } else {
        const errorData = await response.json();
        message.error(errorData.message || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败');
    }
  };

  // 状态映射
  const getStatusInfo = (status: PluginVersion['status']) => {
    const statusMap = {
      active: { text: '活跃', color: 'success' },
      inactive: { text: '非活跃', color: 'default' },
      deprecated: { text: '已弃用', color: 'error' },
    };
    return statusMap[status] || { text: '未知', color: 'default' };
  };

  // 文件上传配置
  const uploadProps: UploadProps = {
    name: 'file',
    action: '/api/admin/upload',
    headers: {
      authorization: `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`,
    },
    onChange(info) {
      if (info.file.status === 'done') {
        const { response } = info.file;
        if (response.success) {
          form.setFieldsValue({
            downloadUrl: response.data.url,
            fileName: response.data.fileName,
            fileSize: response.data.fileSize,
          });
          message.success('文件上传成功');
        } else {
          message.error(response.message || '文件上传失败');
        }
      } else if (info.file.status === 'error') {
        message.error('文件上传失败');
      }
    },
  };

  // 表格列定义
  const columns: ColumnsType<PluginVersion> = [
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      render: (version: string, record: PluginVersion) => (
        <Space>
          {version}
          {record.isLatest && <Tag color='gold'>最新</Tag>}
        </Space>
      ),
    },
    {
      title: '文件名',
      dataIndex: 'fileName',
      key: 'fileName',
    },
    {
      title: '文件大小',
      dataIndex: 'fileSize',
      key: 'fileSize',
      render: (size: number) => {
        const mb = (size / (1024 * 1024)).toFixed(2);
        return `${mb} MB`;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: PluginVersion['status']) => {
        const info = getStatusInfo(status);
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '发布时间',
      dataIndex: 'releaseDate',
      key: 'releaseDate',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: '创建时间',
      dataIndex: 'createdTime',
      key: 'createdTime',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: PluginVersion) => (
        <Space size='middle'>
          <Button
            type='link'
            icon={<DownloadOutlined />}
            onClick={() => window.open(record.downloadUrl, '_blank')}
          >
            下载
          </Button>
          <Button
            type='link'
            icon={<EditOutlined />}
            onClick={() => openModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title='确定要删除这个插件版本吗？'
            onConfirm={() => handleDelete(record.id)}
            okText='确定'
            cancelText='取消'
          >
            <Button type='link' danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div
          style={{
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
            插件版本管理
          </h1>
          <Space>
            <Button
              type='primary'
              icon={<PlusOutlined />}
              onClick={() => openModal()}
            >
              新增插件版本
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchPlugins}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        </div>

        {/* 搜索和筛选 */}
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col xs={24} sm={12} md={8}>
            <Input.Search
              placeholder='搜索版本号'
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={handleSearch}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              placeholder='筛选状态'
              allowClear
              style={{ width: '100%' }}
              onChange={handleStatusFilter}
            >
              <Option value='active'>活跃</Option>
              <Option value='inactive'>非活跃</Option>
              <Option value='deprecated'>已弃用</Option>
            </Select>
          </Col>
        </Row>

        {/* 插件列表表格 */}
        <Table
          columns={columns}
          dataSource={plugins}
          rowKey='id'
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size || 10);
            },
          }}
        />
      </Card>

      {/* 创建/编辑模态框 */}
      <Modal
        title={editingPlugin ? '编辑插件版本' : '新增插件版本'}
        open={modalVisible}
        onCancel={closeModal}
        footer={null}
        width={800}
      >
        <Form form={form} layout='vertical' onFinish={handleSubmit}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name='version'
                label='版本号'
                rules={[{ required: true, message: '请输入版本号' }]}
              >
                <Input placeholder='如：1.0.0' />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name='releaseDate'
                label='发布日期'
                rules={[{ required: true, message: '请选择发布日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name='fileName'
                label='文件名'
                rules={[{ required: true, message: '请输入文件名' }]}
              >
                <Input placeholder='插件文件名' />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name='fileSize'
                label='文件大小（字节）'
                rules={[{ required: true, message: '请输入文件大小' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder='文件大小'
                  min={0}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name='downloadUrl'
            label='下载地址'
            rules={[{ required: true, message: '请输入下载地址' }]}
          >
            <Input.Group compact>
              <Input
                style={{ width: 'calc(100% - 120px)' }}
                placeholder='下载链接'
              />
              <Upload {...uploadProps}>
                <Button icon={<UploadOutlined />}>上传文件</Button>
              </Upload>
            </Input.Group>
          </Form.Item>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name='status'
                label='状态'
                rules={[{ required: true, message: '请选择状态' }]}
                initialValue='active'
              >
                <Select>
                  <Option value='active'>活跃</Option>
                  <Option value='inactive'>非活跃</Option>
                  <Option value='deprecated'>已弃用</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name='isLatest'
                label='是否最新版本'
                valuePropName='checked'
                initialValue={false}
              >
                <Select>
                  <Option value={true}>是</Option>
                  <Option value={false}>否</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name='description' label='版本描述'>
            <TextArea rows={3} placeholder='版本描述信息' />
          </Form.Item>

          <Form.Item name='changelog' label='更新日志'>
            <TextArea rows={4} placeholder='更新日志内容' />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={closeModal}>取消</Button>
              <Button type='primary' htmlType='submit'>
                {editingPlugin ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminPluginVersionsPage;
