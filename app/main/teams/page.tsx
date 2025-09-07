'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Transfer,
  Row,
  Col,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { subAccountsAPI, mallsAPI } from '../../services';

import { useRouter } from 'next/navigation';

const { Option } = Select;

export default function SubAccountsPage() {
  const router = useRouter();
  const [subAccounts, setSubAccounts] = useState<any[]>([]);
  const [malls, setMalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [form] = Form.useForm();
  const [targetKeys, setTargetKeys] = useState<string[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [stats, setStats] = useState<any>({
    total: 0,
    active: 0,
    inactive: 0,
  });

  // 获取子账户列表
  const fetchSubAccounts = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const response = await subAccountsAPI.getSubAccounts({
        page,
        pageSize,
      });
      const data = response.data;

      if (data.success) {
        setSubAccounts(data.data.subAccounts);
        setPagination({
          current: page,
          pageSize,
          total: data.data.pagination.total,
        });

        // 计算统计数据
        const accounts = data.data.subAccounts;
        const stats = {
          total: accounts.length,
          active: accounts.filter((acc: any) => acc.status === 'active').length,
          inactive: accounts.filter((acc: any) => acc.status === 'inactive')
            .length,
        };
        setStats(stats);
      } else {
        message.error(data.message || '获取子账户列表失败');
      }
    } catch (error: any) {
      console.error('获取子账户列表失败:', error);
      if (error.response?.status === 401) {
        message.error('登录已过期，请重新登录');
        router.push('/login');
      } else {
        message.error('获取子账户列表失败');
      }
    } finally {
      setLoading(false);
    }
  };

  // 获取店铺列表
  const fetchMalls = async () => {
    try {
      const response = await mallsAPI.getMalls({ pageSize: 1000 });
      const data = response.data;
      if (data.success) {
        setMalls(data.data.malls);
      }
    } catch (error) {
      console.error('获取店铺列表失败:', error);
    }
  };

  // 提交表单
  const handleSubmit = async (values: any) => {
    try {
      const submitData = {
        ...values,
        responsibleMalls: targetKeys.map((key) => parseInt(key)),
      };

      let response;
      if (editingAccount) {
        response = await subAccountsAPI.updateSubAccount(
          editingAccount.id.toString(),
          submitData
        );
      } else {
        response = await subAccountsAPI.createSubAccount(submitData);
      }

      const data = response.data;
      if (data.success) {
        message.success(editingAccount ? '子账户更新成功' : '子账户创建成功');
        setModalVisible(false);
        setEditingAccount(null);
        form.resetFields();
        setTargetKeys([]);
        fetchSubAccounts(pagination.current, pagination.pageSize);
      } else {
        message.error(data.message || '操作失败');
      }
    } catch (error: any) {
      console.error('操作失败:', error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('网络错误，请稍后重试');
      }
    }
  };

  // 编辑子账户
  const handleEdit = (record: any) => {
    setEditingAccount(record);
    form.setFieldsValue({
      username: record.username,
      status: record.status,
    });
    setTargetKeys(
      (record.responsibleMalls || []).map((id: any) => id.toString())
    );
    setModalVisible(true);
  };

  // 删除子账户
  const handleDelete = async (id: number) => {
    try {
      const response = await subAccountsAPI.deleteSubAccount(id.toString());
      const data = response.data;
      if (data.success) {
        message.success('子账户删除成功');
        fetchSubAccounts(pagination.current, pagination.pageSize);
      } else {
        message.error(data.message || '删除失败');
      }
    } catch (error: any) {
      console.error('删除失败:', error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('网络错误，请稍后重试');
      }
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (text: string) => (
        <Space>
          <UserOutlined style={{ color: '#1890ff' }} />
          <span style={{ fontWeight: 500 }}>{text}</span>
        </Space>
      ),
    },
    {
      title: '管理的店铺',
      dataIndex: 'responsibleMalls',
      key: 'responsibleMalls',
      render: (malls: any[]) => {
        return malls.map((mall) => {
          return (
            <Tag
              key={mall.mallId}
              color='blue'
              style={{ marginBottom: '4px', marginRight: '4px' }}
            >
              {mall.mallName}
            </Tag>
          );
        });
      },
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
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: any) => (
        <Space size='small'>
          <Button
            type='link'
            size='small'
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title='确定要删除这个子账户吗？'
            onConfirm={() => handleDelete(record.id)}
            okText='确定'
            cancelText='取消'
          >
            <Button type='link' danger size='small' icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Transfer 数据源
  const transferDataSource = malls.map((mall) => ({
    key: mall.mallId,
    title: mall.mallName,
  }));

  useEffect(() => {
    fetchSubAccounts();
    fetchMalls();
  }, []);

  return (
    <>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Button
            type='primary'
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingAccount(null);
              form.resetFields();
              setTargetKeys([]);
              setModalVisible(true);
            }}
          >
            创建子账户
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={subAccounts}
          rowKey='id'
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            onChange: (page, pageSize) => {
              fetchSubAccounts(page, pageSize);
            },
          }}
        />
      </Card>
      <Modal
        title={editingAccount ? '编辑子账户' : '创建子账户'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingAccount(null);
          form.resetFields();
          setTargetKeys([]);
        }}
        footer={null}
        width={800}
        destroyOnHidden
      >
        <Form form={form} layout='vertical' onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label='用户名'
                name='username'
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, max: 20, message: '用户名长度应在3-20个字符之间' },
                  {
                    pattern: /^[a-zA-Z0-9_]+$/,
                    message: '用户名只能包含字母、数字和下划线',
                  },
                ]}
              >
                <Input placeholder='请输入用户名' />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label='密码'
                name='password'
                rules={[
                  { required: !editingAccount, message: '请输入密码' },
                  { min: 6, max: 20, message: '密码长度应在6-20个字符之间' },
                ]}
              >
                <Input.Password
                  placeholder={
                    editingAccount ? '留空则不修改密码' : '请输入密码'
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label='负责店铺'>
            <Transfer
              dataSource={transferDataSource}
              targetKeys={targetKeys}
              onChange={(keys) => setTargetKeys(keys as string[])}
              render={(item) => item.title}
              titles={['可选店铺', '负责店铺']}
              style={{ marginBottom: 16 }}
            />
          </Form.Item>

          <Form.Item
            label='状态'
            name='status'
            initialValue='active'
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder='请选择状态'>
              <Option value='active'>正常</Option>
              <Option value='inactive'>停用</Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  setEditingAccount(null);
                  form.resetFields();
                  setTargetKeys([]);
                }}
              >
                取消
              </Button>
              <Button type='primary' htmlType='submit'>
                {editingAccount ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
