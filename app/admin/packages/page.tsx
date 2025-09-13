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
  Row,
  Col,
  Switch,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { adminPackagesAPI } from '@/app/services';

const { TextArea } = Input;
const { Option } = Select;

interface MembershipPackage {
  id: number;
  packageName: string;
  packageDesc?: string;
  packageType?: 'trial' | 'official';
  originalPrice?: number;
  durationMonths?: number;
  maxBindMall?: number;
  discountPercent?: number;
  discountStartTime?: string;
  discountEndTime?: string;
  isActive?: boolean;
  createdTime: string;
  updatedTime: string;
  userBindingCount?: number;
  canEdit?: boolean;
  canDelete?: boolean;
}

interface PackageFormData {
  packageName: string;
  packageDesc?: string;
  packageType?: 'trial' | 'official';
  originalPrice?: number;
  durationMonths?: number;
  maxBindMall?: number;
  discountPercent?: number;
  discountStartTime?: string;
  discountEndTime?: string;
  isActive?: boolean;
}

const AdminPackagesPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<MembershipPackage[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPackage, setEditingPackage] =
    useState<MembershipPackage | null>(null);

  const [form] = Form.useForm();

  // 获取套餐列表
  const fetchPackages = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        pageSize: pageSize,
        ...(searchText && { search: searchText }),
        ...(typeFilter && { packageType: typeFilter }),
      };

      const response = await adminPackagesAPI.getPackages(params);
      if (response.data?.success) {
        setPackages(response.data.data.list || []);
        setTotal(response.data.data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, [currentPage, pageSize, searchText, typeFilter]);

  // 打开模态框
  const openModal = (packageData?: MembershipPackage) => {
    setEditingPackage(packageData || null);
    setModalVisible(true);
    if (packageData) {
      // 编辑模式
      form.setFieldsValue({
        packageName: packageData.packageName,
        packageDesc: packageData.packageDesc,
        packageType: packageData.packageType,
        originalPrice: packageData.originalPrice,
        durationMonths: packageData.durationMonths,
        maxBindMall: packageData.maxBindMall,
        discountPercent: packageData.discountPercent,
        isActive: packageData.isActive,
      });
    } else {
      // 新增模式
      form.setFieldsValue({
        packageType: 'official',
        isActive: true,
      });
    }
  };

  // 关闭模态框
  const closeModal = () => {
    setModalVisible(false);
    setEditingPackage(null);
    form.resetFields();
  };

  // 提交表单
  const handleSubmit = async (values: PackageFormData) => {
    const response = editingPackage
      ? await adminPackagesAPI.updatePackage(editingPackage.id, values)
      : await adminPackagesAPI.createPackage(values);
    
    if (response.data?.success) {
      message.success(editingPackage ? '套餐更新成功' : '套餐创建成功');
      closeModal();
      fetchPackages();
    }
  };

  // 修改套餐状态
  const handleStatusChange = async (packageData: MembershipPackage) => {
    const response = await adminPackagesAPI.updatePackage(packageData.id, { isActive: !packageData.isActive });
    
    if (response.data?.success) {
      message.success(`套餐${!packageData.isActive ? '启用' : '禁用'}成功`);
      fetchPackages();
    }
  };

  // 删除套餐
  const handleDelete = async (id: number) => {
    const response = await adminPackagesAPI.deletePackage(id);
    
    if (response.data?.success) {
      message.success('删除套餐成功');
      fetchPackages();
    }
  };

  // 状态映射
  const getTypeInfo = (type: MembershipPackage['packageType']) => {
    const typeMap = {
      trial: { text: '试用版', color: 'blue' },
      official: { text: '正式版', color: 'green' },
    };
    return typeMap[type || 'official'] || { text: '正式版', color: 'green' };
  };

  // 表格列定义
  const columns: ColumnsType<MembershipPackage> = [
    {
      title: '套餐名称',
      dataIndex: 'packageName',
      key: 'packageName',
    },
    {
      title: '套餐类型',
      dataIndex: 'packageType',
      key: 'packageType',
      render: (type: MembershipPackage['packageType']) => {
        const typeInfo = getTypeInfo(type);
        return <Tag color={typeInfo.color}>{typeInfo.text}</Tag>;
      },
    },
    {
      title: '价格',
      dataIndex: 'originalPrice',
      key: 'price',
      render: (originalPrice: number, record: MembershipPackage) => {
        if (!originalPrice) return '-';

        // 计算现价
        const discountPercent = record.discountPercent || 0;
        const currentPrice =
          discountPercent > 0
            ? Number(originalPrice) * (1 - discountPercent / 100)
            : Number(originalPrice);

        return (
          <div style={{ lineHeight: '1.2' }}>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: discountPercent > 0 ? '#ff4d4f' : '#000',
              }}
            >
              ¥{currentPrice.toFixed(2)}
              {discountPercent > 0 && (
                <span
                  style={{
                    fontSize: '12px',
                    color: '#ff4d4f',
                    marginLeft: '8px',
                    fontWeight: 'normal',
                  }}
                >
                  {((100 - discountPercent) / 10).toFixed(1)}折
                </span>
              )}
            </div>
            {discountPercent > 0 && (
              <div
                style={{
                  fontSize: '12px',
                  color: '#999',
                  textDecoration: 'line-through',
                }}
              >
                ¥{Number(originalPrice).toFixed(2)}
              </div>
            )}
          </div>
        );
      },
    },

    {
      title: '时长(月)',
      dataIndex: 'durationMonths',
      key: 'durationMonths',
      render: (months: number) => (months ? `${months}个月` : '-'),
    },
    {
      title: '最大绑定店铺',
      dataIndex: 'maxBindMall',
      key: 'maxBindMall',
      render: (count: number) => count || '-',
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '绑定用户数',
      dataIndex: 'userBindingCount',
      key: 'userBindingCount',
      render: (count: number) => (
        <Tag color={count > 0 ? 'blue' : 'default'}>{count || 0}</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdTime',
      key: 'createdTime',
      render: (time: string) => new Date(time).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: MembershipPackage) => (
        <Space>
          {record.canEdit !== false && (
            <Button
              type='link'
              icon={<EditOutlined />}
              onClick={() => openModal(record)}
            >
              编辑
            </Button>
          )}
          <Popconfirm
            title={`确定要${record.isActive ? '禁用' : '启用'}这个套餐吗？`}
            onConfirm={() => handleStatusChange(record)}
            okText='确定'
            cancelText='取消'
          >
            <Button type='link' icon={<EditOutlined />}>
              {record.isActive ? '禁用' : '启用'}
            </Button>
          </Popconfirm>
          {record.canDelete !== false && (
            <Popconfirm
              title='确定要删除这个套餐吗？'
              onConfirm={() => handleDelete(record.id)}
              okText='确定'
              cancelText='取消'
            >
              <Button type='link' danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
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
          <Button
            type='primary'
            icon={<PlusOutlined />}
            onClick={() => openModal()}
          >
            新增套餐
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={packages}
          rowKey='id'
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size || 10);
            },
          }}
        />
      </Card>

      {/* 创建/编辑模态框 */}
      <Modal
        title={editingPackage ? '编辑套餐' : '新增套餐'}
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
            packageType: 'official',
            isActive: true,
          }}
        >
          <>
            <Form.Item
              name='packageName'
              label='套餐名称'
              rules={[{ required: true, message: '请输入套餐名称' }]}
            >
              <Input placeholder='请输入套餐名称' />
            </Form.Item>

            <Form.Item name='packageDesc' label='套餐描述'>
              <TextArea rows={3} placeholder='请输入套餐描述' />
            </Form.Item>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name='packageType'
                  label='套餐类型'
                  rules={[{ required: true, message: '请选择套餐类型' }]}
                  extra='新用户注册时会自动绑定最新启用的试用套餐'
                >
                  <Select>
                    <Option value='trial'>试用版</Option>
                    <Option value='official'>正式版</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name='originalPrice'
                  label='原价'
                  rules={[{ required: true, message: '请输入原价' }]}
                >
                  <InputNumber
                    min={0}
                    precision={2}
                    style={{ width: '100%' }}
                    placeholder='请输入原价'
                    addonAfter='元'
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name='durationMonths'
                  label='时长(月)'
                  rules={[{ required: true, message: '请输入时长' }]}
                >
                  <InputNumber
                    min={1}
                    style={{ width: '100%' }}
                    placeholder='请输入时长'
                    addonAfter='月'
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name='maxBindMall'
                  label='最大绑定店铺数'
                  rules={[{ required: true, message: '请输入最大绑定店铺数' }]}
                >
                  <InputNumber
                    min={1}
                    style={{ width: '100%' }}
                    placeholder='请输入最大绑定店铺数'
                    addonAfter='个'
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item name='discountPercent' label='折扣百分比'>
                  <InputNumber
                    min={0}
                    max={100}
                    precision={2}
                    style={{ width: '100%' }}
                    placeholder='请输入折扣百分比'
                    addonAfter='%'
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name='isActive'
                  label='是否启用'
                  valuePropName='checked'
                >
                  <Switch checkedChildren='启用' unCheckedChildren='禁用' />
                </Form.Item>
              </Col>
            </Row>
          </>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={closeModal}>取消</Button>
              <Button type='primary' htmlType='submit'>
                {editingPackage ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminPackagesPage;
