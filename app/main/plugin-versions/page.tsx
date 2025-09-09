'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  DatePicker,
  Switch,
  Upload,
  Select,
  message,
  Popconfirm,
  Tag,
  Typography,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  UploadOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { pluginVersionsAPI } from '../../services';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Text } = Typography;

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

export default function PluginVersionsPage() {
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<PluginVersion[]>([]);
  const [total, setTotal] = useState(0);
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [editingVersion, setEditingVersion] = useState<PluginVersion | null>(
    null
  );
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<any>(null);

  // 获取版本列表
  const fetchVersions = async () => {
    try {
      setLoading(true);
      const response = await pluginVersionsAPI.getVersions({
        pageIndex,
        pageSize,
      });
      const data = response.data;
      setVersions(data.list || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  };

  // 处理文件上传
  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      
      if (editingVersion) {
        // 编辑模式：只保存文件对象，不立即上传
        setUploadedFile({
          file: file,
          originalName: file.name,
          fileSize: file.size,
        });
        message.success('文件已选择，提交时将上传');
      } else {
        // 新建模式：立即上传文件
        const formData = new FormData();
        formData.append('file', file);
        const response = await pluginVersionsAPI.uploadFile(formData);
        const data = response.data;
        message.success('文件上传成功');
        setUploadedFile(data);
      }
    } finally {
      setUploading(false);
    }

    return false; // 阻止默认上传行为
  };

  // 文件上传前的验证
  const beforeUpload = (file: File) => {
    const isZip =
      file.type === 'application/zip' ||
      file.name.toLowerCase().endsWith('.zip');
    if (!isZip) {
      message.error('只能上传ZIP格式的文件!');
      return false;
    }
    const isLt100M = file.size / 1024 / 1024 < 100;
    if (!isLt100M) {
      message.error('文件大小不能超过100MB!');
      return false;
    }
    return true;
  };

  // 移除上传的文件
  const handleRemoveFile = () => {
    setUploadedFile(null);
  };

  // 创建或更新版本
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);

      // 检查是否需要上传文件信息
      if (!editingVersion && !uploadedFile) {
        message.error('请先上传插件文件');
        return;
      }

      if (editingVersion) {
        // 编辑模式：使用FormData格式支持文件上传
        const formData = new FormData();
        formData.append('id', editingVersion.id.toString());
        formData.append('version', values.version);
        formData.append('releaseNotes', values.changelog || '');
        formData.append('isLatest', values.isLatest ? 'true' : 'false');
        
        // 如果有新上传的文件，添加到FormData
        if (uploadedFile && uploadedFile.file) {
          formData.append('file', uploadedFile.file);
        }
        
        await pluginVersionsAPI.updateVersionWithFile(formData);
        message.success('更新版本成功');
      } else {
        // 新建模式：使用JSON格式
        const requestData = {
          ...values,
          releaseDate: values.releaseDate.format('YYYY-MM-DD HH:mm:ss'),
          fileName: uploadedFile.originalName,
          downloadUrl: uploadedFile.downloadUrl,
          fileSize: uploadedFile.fileSize,
        };
        
        await pluginVersionsAPI.createVersion(requestData);
        message.success('创建版本成功');
      }

      setShowModal(false);
      form.resetFields();
      setEditingVersion(null);
      setUploadedFile(null);
      fetchVersions();
    } finally {
      setLoading(false);
    }
  };

  // 删除版本
  const handleDelete = async (id: number) => {
    await pluginVersionsAPI.deleteVersion(id);
    message.success('删除版本成功');
    fetchVersions();
  };

  // 下载插件
  const handleDownload = (version: PluginVersion) => {
    const link = document.createElement('a');
    link.href = version.downloadUrl;
    link.download = version.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    message.success('下载开始');
  };

  // 打开编辑模态框
  const handleEdit = (version: PluginVersion) => {
    setEditingVersion(version);
    form.setFieldsValue({
      ...version,
      releaseDate: dayjs(version.releaseDate),
    });
    setShowModal(true);
  };

  // 打开新建模态框
  const handleAdd = () => {
    setEditingVersion(null);
    form.resetFields();
    // 清空文件列表
    form.setFieldsValue({
      releaseDate: dayjs(),
      isLatest: true,
      status: 'active',
    });
    setShowModal(true);
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 表格列定义
  const columns: ColumnsType<PluginVersion> = [
    {
      title: '版本号',
      dataIndex: 'version',
      key: 'version',
      render: (version: string, record: PluginVersion) => (
        <Space>
          <Text strong>{version}</Text>
          {record.isLatest && <Tag color='blue'>最新</Tag>}
        </Space>
      ),
    },
    {
      title: '文件信息',
      key: 'fileInfo',
      render: (_, record: PluginVersion) => (
        <Space direction='vertical' size='small'>
          <Text>{record.fileName}</Text>
          <Text type='secondary'>{formatFileSize(record.fileSize)}</Text>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig = {
          active: { color: 'green', text: '活跃' },
          inactive: { color: 'orange', text: '非活跃' },
          deprecated: { color: 'red', text: '已弃用' },
        };
        const config = statusConfig[status as keyof typeof statusConfig] || {
          color: 'default',
          text: '未知',
        };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      width: 200,
    },
    {
      title: '发布时间',
      dataIndex: 'releaseDate',
      key: 'releaseDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record: PluginVersion) => (
        <Space>
          <Button
            type='link'
            size='small'
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record)}
          >
            下载
          </Button>
          <Button
            type='link'
            size='small'
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title='确定要删除这个版本吗？'
            onConfirm={() => handleDelete(record.id)}
            okText='确定'
            cancelText='取消'
          >
            <Button type='link' size='small' danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  useEffect(() => {
    fetchVersions();
  }, [pageIndex, pageSize]);

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Button type='primary' icon={<PlusOutlined />} onClick={handleAdd}>
            上传插件
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={versions}
          rowKey='id'
          loading={loading}
          pagination={{
            current: pageIndex,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            onChange: (page, size) => {
              setPageIndex(page);
              setPageSize(size || 10);
            },
          }}
        />
      </Card>

      <Modal
        title={editingVersion ? '编辑插件' : '上传插件'}
        open={showModal}
        onCancel={() => {
          setShowModal(false);
          form.resetFields();
          setEditingVersion(null);
          setUploadedFile(null);
        }}
        onOk={() => form.submit()}
        width={800}
        destroyOnClose
      >
        <Form form={form} layout='vertical' onFinish={handleSubmit}>
          <Form.Item
            name='version'
            label='版本号'
            rules={[
              { required: true, message: '请输入版本号' },
              { pattern: /^\d+\.\d+\.\d+$/, message: '版本号格式应为 x.y.z' },
            ]}
          >
            <Input placeholder='例如：1.0.0' />
          </Form.Item>

          <Form.Item
            name='releaseDate'
            label='发布时间'
            rules={[{ required: true, message: '请选择发布时间' }]}
          >
            <DatePicker
              showTime
              format='YYYY-MM-DD HH:mm:ss'
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item label='上传文件' name='file'>
            <Upload
              beforeUpload={beforeUpload}
              customRequest={({ file }) => handleFileUpload(file as File)}
              onRemove={handleRemoveFile}
              fileList={
                uploadedFile
                  ? [
                      {
                        uid: '1',
                        name: uploadedFile.originalName,
                        status: 'done',
                        size: uploadedFile.fileSize,
                      },
                    ]
                  : []
              }
              maxCount={1}
              accept='.zip'
            >
              <Button icon={<UploadOutlined />} loading={uploading}>
                {uploading ? '上传中...' : '选择ZIP文件'}
              </Button>
            </Upload>
            <div style={{ marginTop: 8, color: '#666', fontSize: '12px' }}>
              支持ZIP格式，文件大小不超过100MB
            </div>
          </Form.Item>

          <Form.Item name='description' label='版本描述'>
            <TextArea rows={3} placeholder='简要描述这个版本的特性' />
          </Form.Item>

          <Form.Item name='changelog' label='更新日志'>
            <TextArea rows={5} placeholder='详细的更新日志，支持多行文本' />
          </Form.Item>

          <Form.Item
            name='isLatest'
            label='设为最新版本'
            valuePropName='checked'
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name='status'
            label='状态'
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder='请选择状态'>
              <Select.Option value='active'>活跃</Select.Option>
              <Select.Option value='inactive'>非活跃</Select.Option>
              <Select.Option value='deprecated'>已弃用</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
