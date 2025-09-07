'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Form,
  message,
  Space,
  Popconfirm,
  Modal,
  Input,
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { mallsAPI } from '../../services';

interface Mall {
  id: number;
  userId: number;
  mallId: string;
  mallName: string;
  createdTime: string;
  updatedTime: string;
}

export default function MallsPage() {
  const [malls, setMalls] = useState<Mall[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchForm] = Form.useForm();
  const [searchParams, setSearchParams] = useState<any>({});

  // 获取店铺列表
  const fetchMalls = async (pageIndex = 1, pageSize = 10, params = {}) => {
    setLoading(true);
    try {
      const response = await mallsAPI.getMalls({
        pageIndex,
        pageSize,
        ...params,
      });
      const data = response.data;

      if (data.success) {
        setMalls(data.data.malls);
        setPagination({
          current: pageIndex,
          pageSize,
          total: data.data.pagination.total,
        });
      } else {
        message.error(data.message || '获取店铺列表失败');
      }
    } catch (error) {
      console.error('获取店铺列表失败:', error);
      message.error('获取店铺列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除店铺
  const handleDeleteMall = async (mallId: number) => {
    try {
      const response = await mallsAPI.deleteMall(mallId);
      const data = response.data;

      if (data.success) {
        message.success('店铺删除成功');
        fetchMalls(pagination.current, pagination.pageSize, searchParams);
      } else {
        message.error(data.message || '店铺删除失败');
      }
    } catch (error) {
      console.error('店铺删除失败:', error);
      message.error('店铺删除失败');
    }
  };

  // 新增店铺
  const handleAddMall = async (values: any) => {
    try {
      const response = await mallsAPI.createMall(values);
      const data = response.data;

      if (data.success) {
        message.success('店铺添加成功');
        setModalVisible(false);
        form.resetFields();
        fetchMalls(pagination.current, pagination.pageSize, searchParams);
      } else {
        message.error(data.message || '店铺添加失败');
      }
    } catch (error) {
      console.error('店铺添加失败:', error);
      message.error('店铺添加失败');
    }
  };

  // 处理模态框确定
  const handleModalOk = () => {
    form.validateFields().then((values) => {
      handleAddMall(values);
    });
  };

  // 处理模态框取消
  const handleModalCancel = () => {
    setModalVisible(false);
    form.resetFields();
  };

  // 表格列定义
  const columns = [
    {
      title: '店铺ID',
      dataIndex: 'mallId',
      key: 'mallId',
    },
    {
      title: '店铺名称',
      dataIndex: 'mallName',
      key: 'mallName',
    },
    {
      title: '绑定时间',
      dataIndex: 'createdTime',
      key: 'createdTime',
      render: (text: string) => {
        return new Date(text).toLocaleString('zh-CN');
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Mall) => (
        <Space>
          <Popconfirm
            title='确定要删除这个店铺吗？'
            onConfirm={() => handleDeleteMall(record.id)}
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

  // 搜索处理
  const handleSearch = (values: any) => {
    const params = Object.keys(values).reduce((acc, key) => {
      if (values[key]) {
        acc[key] = values[key];
      }
      return acc;
    }, {} as any);
    setSearchParams(params);
    setPagination({ ...pagination, current: 1 });
    fetchMalls(1, pagination.pageSize, params);
  };

  // 重置搜索
  const handleReset = () => {
    searchForm.resetFields();
    setSearchParams({});
    setPagination({ ...pagination, current: 1 });
    fetchMalls(1, pagination.pageSize, {});
  };

  useEffect(() => {
    fetchMalls();
  }, []);

  return (
    <>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Form
            form={searchForm}
            layout='inline'
            onFinish={handleSearch}
            style={{ marginBottom: 16 }}
          >
            <Form.Item name='mallName' label='店铺名称'>
              <Input placeholder='请输入店铺名称' style={{ width: 200 }} />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type='primary' htmlType='submit'>
                  查询
                </Button>
                <Button onClick={handleReset}>重置</Button>
              </Space>
            </Form.Item>
          </Form>
          <Button
            type='primary'
            icon={<PlusOutlined />}
            onClick={() => setModalVisible(true)}
          >
            新增店铺
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={malls}
          rowKey='id'
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            onChange: (page, pageSize) => {
              fetchMalls(page, pageSize, searchParams);
            },
          }}
        />
      </Card>
      <Modal
        title='新增店铺'
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText='确定'
        cancelText='取消'
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout='vertical'
          initialValues={{
            platform: 'taobao',
            binding_type: 'free',
          }}
        >
          <Form.Item
            label='店铺ID'
            name='mallId'
            rules={[{ required: true, message: '请输入店铺ID' }]}
          >
            <Input placeholder='请输入店铺ID' />
          </Form.Item>
          <Form.Item
            label='店铺名称'
            name='mallName'
            rules={[{ required: true, message: '请输入店铺名称' }]}
          >
            <Input placeholder='请输入店铺名称' />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
