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
  Alert,
  Statistic,
  Row,
  Col,
  Select,
} from 'antd';
import { sendMessageToPlugin } from '@/lib/utils';
import { DeleteOutlined, PlusOutlined, ShopOutlined } from '@ant-design/icons';
import { mallsAPI } from '../../services';

interface Mall {
  id: number;
  userId: number;
  mallId: string;
  mallName: string;
  createdTime: string;
  updatedTime: string;
}

interface QuotaInfo {
  totalQuota: number;
  currentBindCount: number;
  remainingQuota: number;
  packageQuota: number;
  rewardQuota: number;
  canBind: boolean;
  packageInfo: {
    id: number;
    packageName: string;
    expireTime: string;
  } | null;
}

export default function MallsPage() {
  const [malls, setMalls] = useState<Mall[]>([]);
  const [pluginInstalled, setPluginInstalled] = useState(true);
  const [temuLogined, setTemuLogined] = useState(true);
  const [temuPlatformMalls, setTemuPlatformMalls] = useState<Mall[]>([]);
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
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(false);

  // 获取店铺配额信息
  const fetchQuotaInfo = async () => {
    setQuotaLoading(true);
    try {
      const response = await mallsAPI.getMallQuota();
      const data = response.data;
      setQuotaInfo(data);
    } finally {
      setQuotaLoading(false);
    }
  };

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
      setMalls(data.malls);
      setPagination({
        current: pageIndex,
        pageSize,
        total: data.pagination.total,
      });
    } finally {
      setLoading(false);
    }
  };

  // 删除店铺
  const handleDeleteMall = async (mallId: number) => {
    await mallsAPI.deleteMall(mallId);
    message.success('店铺删除成功');
    fetchMalls(pagination.current, pagination.pageSize, searchParams);
    fetchQuotaInfo(); // 刷新配额信息
  };

  // 绑定店铺
  const handleAddMall = async (values: any) => {
    const selectedOption = temuPlatformMalls.find(
      (mall) => mall.mallId === values.selectedMall
    );
    if (selectedOption) {
      await mallsAPI.createMall({
        mallId: selectedOption.mallId,
        mallName: selectedOption.mallName,
      });
      message.success('店铺绑定成功');
      setModalVisible(false);
      form.resetFields();
      fetchMalls(pagination.current, pagination.pageSize, searchParams);
      fetchQuotaInfo(); // 刷新配额信息
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

  const getTemutemuPlatformMalls = async () => {
    const pluginCheckRes = await sendMessageToPlugin('PLUGIN_CHECK');
    if (!pluginCheckRes.success) {
      setPluginInstalled(false);
      return;
    }
    const getTemuPlatformMallsRes = await sendMessageToPlugin(
      'GET_TEMU_PLATFORM_MALLS'
    );
    if (!getTemuPlatformMallsRes.success) {
      setTemuLogined(false);
      return;
    }
    setTemuPlatformMalls(getTemuPlatformMallsRes?.data || []);
  };

  useEffect(() => {
    fetchMalls();
    fetchQuotaInfo();
    getTemutemuPlatformMalls();
  }, []);

  return (
    <>
      {/* 配额信息展示 */}
      <Card style={{ marginBottom: 16 }} loading={quotaLoading}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title='总共可绑定'
              value={quotaInfo?.totalQuota || 0}
              prefix={<ShopOutlined />}
              suffix='个'
            />
          </Col>
          <Col span={6}>
            <Statistic
              title='已绑定'
              value={quotaInfo?.currentBindCount || 0}
              prefix={<ShopOutlined />}
              suffix='个'
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title='剩余可绑定'
              value={quotaInfo?.remainingQuota || 0}
              prefix={<ShopOutlined />}
              suffix='个'
              valueStyle={{ color: quotaInfo?.canBind ? '#52c41a' : '#ff4d4f' }}
            />
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  marginBottom: '4px',
                  color: 'rgba(0, 0, 0, 0.45)',
                  fontSize: '14px',
                }}
              >
                可绑店铺数明细
              </div>
              <div style={{ fontSize: '12px', color: '#999' }}>
                会员套餐：{quotaInfo?.packageQuota || 0}个
                <br />
                邀请奖励：{quotaInfo?.rewardQuota || 0}个
              </div>
            </div>
          </Col>
        </Row>
        {quotaInfo && !quotaInfo.canBind && (
          <Alert
            message='店铺绑定数量已达上限'
            description='您当前已绑定的店铺数量已达到套餐配额上限，如需绑定更多店铺，请升级套餐或通过邀请好友获得更多配额。'
            type='warning'
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Card>

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
            onClick={async () => {
              setModalVisible(true);
            }}
            disabled={!quotaInfo?.canBind || temuPlatformMalls.length === 0}
          >
            绑定店铺
          </Button>
          {quotaInfo && !quotaInfo?.canBind && (
            <span style={{ marginLeft: 8, color: '#ff4d4f', fontSize: '12px' }}>
              剩余可绑定店铺数为0，无法绑定店铺！
            </span>
          )}
          {!pluginInstalled && (
            <span style={{ marginLeft: 8, color: '#ff4d4f', fontSize: '12px' }}>
              检测到未安装紫雀插件，无法绑定店铺！
              <a href='/zique-assistant_0.0.1.zip' target='_blank'>
                下载紫雀插件
              </a>
            </span>
          )}
          {!temuLogined && (
            <span style={{ marginLeft: 8, color: '#ff4d4f', fontSize: '12px' }}>
              检测到未登录 TEMU 平台，无法绑定店铺！
              <a
                href='https://agentseller.temu.com/main/authentication'
                target='_blank'
              >
                登录 TEMU 平台
              </a>
            </span>
          )}
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
        title='绑定店铺'
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
            label='选择店铺'
            name='selectedMall'
            rules={[{ required: true, message: '请选择店铺' }]}
          >
            <Select
              placeholder='请选择店铺'
              showSearch
              optionFilterProp='children'
              filterOption={(input, option) =>
                (option?.label ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={temuPlatformMalls.map((mall) => ({
                value: mall.mallId,
                label: `${mall.mallName} (${mall.mallId})`,
                mall: mall,
              }))}
              onChange={(value, option: any) => {
                const selectedMall = option?.mall;
                if (selectedMall) {
                  form.setFieldsValue({
                    mallId: selectedMall.mallId,
                    mallName: selectedMall.mallName,
                  });
                }
              }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
