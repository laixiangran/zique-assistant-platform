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
  InputNumber,
  message,
  Popconfirm,
  Upload,
  Row,
  Col,
  Switch,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd';
import { adminPluginsAPI } from '@/app/services';

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
      const params = {
        pageIndex: currentPage,
        pageSize: pageSize,
        ...(searchText && { search: searchText }),
        ...(statusFilter && { status: statusFilter }),
      };

      const response = await adminPluginsAPI.getPlugins(params);
      
      if (response.data?.success) {
        setPlugins(response.data.data.list || []);
        setTotal(response.data.data.pagination?.total || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlugins();
  }, [currentPage, pageSize, searchText, statusFilter]);

  // 打开创建/编辑模态框
  const openModal = (plugin?: PluginVersion) => {
    setEditingPlugin(plugin || null);
    setModalVisible(true);
    if (plugin) {
      form.setFieldsValue({
        ...plugin,
      });
    } else {
      form.resetFields();
      // 设置默认值
      form.setFieldsValue({
        status: 'active',
        isLatest: true,
      });
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
    if (editingPlugin) {
      // 编辑模式：使用FormData格式
      const formData = new FormData();
      formData.append('id', editingPlugin.id.toString());
      formData.append('version', values.version);
      formData.append('description', values.description || '');
      formData.append('changelog', values.changelog || '');
      formData.append('isLatest', values.isLatest.toString());
      formData.append('status', values.status);

      // 如果有文件上传，添加文件
      if (
        values.file &&
        values.file.fileList &&
        values.file.fileList.length > 0
      ) {
        formData.append('file', values.file.fileList[0].originFileObj);
      }

      const response = await adminPluginsAPI.updatePlugin(formData);

      if (response.data?.success) {
        message.success('更新插件成功');
        closeModal();
        fetchPlugins();
      }
    } else {
      // 新增模式：使用JSON格式，发布日期由API自动生成
      const jsonData = {
        version: values.version,
        fileName: values.fileName || '',
        fileSize: values.fileSize || 0,
        downloadUrl: values.downloadUrl || '',
        description: values.description || '',
        changelog: values.changelog || '',
        isLatest: values.isLatest,
        status: values.status,
      };

      const response = await adminPluginsAPI.createPlugin(jsonData);

      if (response.data?.success) {
        message.success('创建插件成功');
        closeModal();
        fetchPlugins();
      }
    }
  };

  // 删除插件
  const handleDelete = async (id: number) => {
    const response = await adminPluginsAPI.deletePlugin(id);
    
    if (response.data?.success) {
      message.success('删除插件成功');
      fetchPlugins();
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
    action: '/api/admin/plugins/upload',
    headers: {
      authorization: `Bearer ${
        localStorage.getItem('admin_token') ||
        sessionStorage.getItem('admin_token')
      }`,
    },
    onChange(info) {
      if (info.file.status === 'done') {
        const { response } = info.file;
        if (response.success) {
          form.setFieldsValue({
            downloadUrl: response.data.downloadUrl,
            fileName: response.data.fileName,
            fileSize: response.data.fileSize,
          });
          message.success('文件上传成功');
        } else {
          message.error(response.errorMsg || '文件上传失败');
        }
      } else if (info.file.status === 'error') {
        message.error('文件上传失败');
      }
    },
    beforeUpload: (file) => {
      const isZip = file.name.toLowerCase().endsWith('.zip');
      if (!isZip) {
        message.error('只能上传 ZIP 格式的文件!');
        return false;
      }
      const isLt100M = file.size / 1024 / 1024 < 100;
      if (!isLt100M) {
        message.error('文件大小不能超过 100MB!');
        return false;
      }
      return true;
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
      title: '版本描述',
      dataIndex: 'description',
      key: 'description',
      render: (description: string) => description || '-',
    },
    {
      title: '更新日志',
      dataIndex: 'changelog',
      key: 'changelog',
      render: (changelog: string) => changelog || '-',
    },
    {
      title: '发布时间',
      dataIndex: 'releaseDate',
      key: 'releaseDate',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: PluginVersion) => (
        <Space>
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
    <div>
      <Card>
        <div
          style={{
            marginBottom: '16px',
          }}
        >
          <Space>
            <Button
              type='primary'
              icon={<PlusOutlined />}
              onClick={() => openModal()}
            >
              新增插件版本
            </Button>
          </Space>
        </div>
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
        <Form
          form={form}
          layout='vertical'
          onFinish={handleSubmit}
          initialValues={{
            status: 'active',
            isLatest: true,
          }}
        >
          <Form.Item
            name='version'
            label='版本号'
            rules={[{ required: true, message: '请输入版本号' }]}
          >
            <Input placeholder='如：1.0.0' />
          </Form.Item>

          <Form.Item
            name='file'
            label='上传插件文件'
            rules={
              editingPlugin
                ? []
                : [{ required: true, message: '请上传插件文件' }]
            }
          >
            <Upload {...uploadProps} maxCount={1}>
              <Button icon={<UploadOutlined />}>上传文件</Button>
            </Upload>
          </Form.Item>

          <Form.Item name='description' label='版本描述'>
            <TextArea rows={3} placeholder='版本描述信息' />
          </Form.Item>

          <Form.Item name='changelog' label='更新日志'>
            <TextArea rows={4} placeholder='更新日志内容' />
          </Form.Item>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name='isLatest'
                label='是否最新版本'
                valuePropName='checked'
                initialValue={true}
              >
                <Switch checkedChildren='是' unCheckedChildren='否' />
              </Form.Item>
            </Col>
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
          </Row>

          {/* 隐藏字段，用于存储自动生成的值 */}
          <Form.Item name='fileName' hidden>
            <Input />
          </Form.Item>
          <Form.Item name='fileSize' hidden>
            <InputNumber />
          </Form.Item>
          <Form.Item name='downloadUrl' hidden>
            <Input />
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
