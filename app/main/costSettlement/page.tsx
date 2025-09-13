'use client';

import {
  Table,
  message,
  Modal,
  Form,
  Input,
  Button,
  Space,
  Select,
  Typography,
  Card,
} from 'antd';
import { useState, useEffect, useRef } from 'react';
import { dataManagementAPI } from '@/app/services';
import { formatVolume, formatAmount, formatRate } from '@/lib/utils';

interface CostSettlementRecord {
  id: number;
  skuId: string;
  productName: string;
  costPrice: number;
  mallName: string;
  costStatus: string;
  [key: string]: any;
}

interface FilterValues {
  mallName?: string;
  skuId?: string;
  costStatus?: string;
}

export default function CostSettlement() {
  const [messageApi] = message.useMessage();
  const { Paragraph } = Typography;
  const tableContainerRef = useRef(null);
  const [tableHeight, setTableHeight] = useState(0);
  const [data, setData] = useState<CostSettlementRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [total, setTotal] = useState(0);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] =
    useState<CostSettlementRecord | null>(null);
  const [form] = Form.useForm();
  const [form2] = Form.useForm();
  const [filters, setFilters] = useState({
    mallName: '',
    skuId: '',
    costStatus: '', // 添加成本状态筛选
  });
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState('');

  useEffect(() => {
    fetchData(pageIndex, pageSize);
  }, [pageIndex, pageSize, filters, sortField, sortOrder]);

  const fetchData = async (pageIndex: number, pageSize: number) => {
    setLoading(true);
    try {
      const params = {
        pageIndex,
        pageSize,
        ...filters,
        sortField,
        sortOrder,
      };
      const response = await dataManagementAPI.costSettlement.getList(params);
      const result = response.data;
      setData(result.data);
      setTotal(result.total || 0);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record: CostSettlementRecord) => {
    setEditingRecord(record);
    form2.setFieldsValue({
      productName: record.productName,
      costPrice: +record.costPrice,
    });
    setEditModalVisible(true);
  };

  const handleSave = async (values: any) => {
    try {
      const response = await dataManagementAPI.costSettlement.updateCostPrice({
        sku_id: editingRecord!.skuId,
        product_name: values.productName,
        cost_price: parseFloat(values.costPrice),
      });
      const result = response.data;

      if (result.success) {
        messageApi.open({
          type: 'success',
          content: '更新成功',
        });
        setEditModalVisible(false);
        fetchData(pageIndex, pageSize);
      } else {
        messageApi.open({
          type: 'error',
          content: result.error || '更新失败',
        });
      }
    } catch (error) {
      console.error('error: ', error);
      messageApi.open({
        type: 'error',
        content: '更新失败',
      });
    }
  };

  // 处理筛选表单提交
  const handleFilter = () => {
    const values = form.getFieldsValue();
    setFilters({
      mallName: values.mallName || '',
      skuId: values.skuId || '',
      costStatus: values.costStatus || '',
    });
    setPageIndex(1); // 重置到第一页
  };

  const updateCostData = async () => {
    try {
      await dataManagementAPI.costSettlement.updatePending();
      await dataManagementAPI.costSettlement.updateArrival();
      handleReset();
      messageApi.open({
        type: 'success',
        content: '刷新成功',
      });
    } catch (error) {
      console.error('error: ', error);
      messageApi.open({
        type: 'error',
        content: '刷新失败，请重试',
      });
    }
  };

  // 处理重置
  const handleReset = () => {
    form.resetFields();
    setFilters({
      mallName: '',
      skuId: '',
      costStatus: '',
    });
    setPageIndex(1);
  };

  const columns = [
    {
      title: '序号',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      fixed: 'left' as const,
      render: (value: any, record: CostSettlementRecord, index: number) => {
        return index + 1;
      },
    },
    {
      title: '店铺信息',
      key: 'mall_info',
      width: 180,
      fixed: 'left' as const,
      render: (text: any, record: CostSettlementRecord) => (
        <div>
          <div>{record.mallName}</div>
          <Paragraph copyable={{ text: record.mallId }}>
            <span style={{ fontSize: '12px', color: '#666' }}>
              {record.mallId}
            </span>
          </Paragraph>
        </div>
      ),
    },
    {
      title: '货品名称',
      dataIndex: 'goodsName',
      key: 'goodsName',
      width: 300,
      fixed: 'left' as const,
      render: (value: string) => (
        <Paragraph
          ellipsis={{
            rows: 2,
            expandable: 'collapsible',
          }}
        >
          {value}
        </Paragraph>
      ),
    },
    {
      title: 'SKU ID',
      dataIndex: 'skuId',
      key: 'skuId',
      width: 150,
      fixed: 'left' as const,
      render: (text: string) => <Paragraph copyable>{text}</Paragraph>,
    },
    {
      title: 'SKU货号',
      dataIndex: 'skuCode',
      key: 'skuCode',
      width: 150,
      render: (value: any) => formatVolume(value),
    },
    {
      title: 'SKU属性',
      dataIndex: 'skuProperty',
      key: 'skuProperty',
      width: 150,
      render: (value: any) => formatVolume(value),
    },
    {
      title: '产品名称',
      dataIndex: 'productName',
      key: 'productName',
      width: 150,
      render: (value: any) => formatVolume(value),
    },
    {
      title: '产品成本',
      dataIndex: 'costPrice',
      key: 'costPrice',
      width: 120,
      sorter: true,
      render: (value: number) => formatAmount(value),
    },
    {
      title: '待结算均价',
      dataIndex: 'pendingAveragePrice',
      key: 'pendingAveragePrice',
      width: 120,
      sorter: true,
      render: (value: number) => formatAmount(value),
    },
    {
      title: '待结算销量',
      dataIndex: 'pendingSalesVolume',
      key: 'pendingSalesVolume',
      width: 120,
      sorter: true,
      render: (value: number) => formatVolume(value),
    },
    {
      title: '待结算销售额',
      dataIndex: 'pendingSalesAmount',
      key: 'pendingSalesAmount',
      width: 150,
      sorter: true,
      render: (value: number) => formatAmount(value),
    },
    {
      title: '待结算毛利',
      dataIndex: 'pendingGrossProfit',
      key: 'pendingGrossProfit',
      width: 150,
      sorter: true,
      render: (value: number) => formatAmount(value),
    },
    {
      title: '待结算毛利率',
      dataIndex: 'pendingProfitRate',
      key: 'pendingProfitRate',
      width: 150,
      sorter: true,
      render: (value: number) => formatRate(value),
    },
    {
      title: '待结算更新时间',
      dataIndex: 'pendingUpdatedTime',
      key: 'pendingUpdatedTime',
      sorter: true,
      width: 150,
    },
    {
      title: '30天到账均价',
      dataIndex: 'd30ArrivalAveragePrice',
      key: 'd30ArrivalAveragePrice',
      width: 150,
      sorter: true,
      render: (value: number) => formatAmount(value),
    },
    {
      title: '30天到账销量',
      dataIndex: 'd30ArrivalSalesVolume',
      key: 'd30ArrivalSalesVolume',
      width: 150,
      sorter: true,
      render: (value: number) => formatVolume(value),
    },
    {
      title: '30天到账销售额',
      dataIndex: 'd30ArrivalSalesAmount',
      key: 'd30ArrivalSalesAmount',
      width: 160,
      sorter: true,
      render: (value: number) => formatAmount(value),
    },
    {
      title: '30天到账毛利',
      dataIndex: 'd30ArrivalGrossProfit',
      key: 'd30ArrivalGrossProfit',
      width: 160,
      sorter: true,
      render: (value: number) => formatAmount(value),
    },
    {
      title: '30天到账毛利率',
      dataIndex: 'd30ArrivalProfitRate',
      key: 'd30ArrivalProfitRate',
      width: 160,
      sorter: true,
      render: (value: number) => formatRate(value),
    },
    {
      title: '30天到账更新时间',
      dataIndex: 'arrivalUpdatedTime',
      key: 'arrivalUpdatedTime',
      sorter: true,
      width: 170,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedTime',
      key: 'updatedTime',
      sorter: true,
      width: 120,
    },
    {
      title: '操作',
      key: 'action',
      width: 130,
      fixed: 'right' as const,
      render: (text: any, record: CostSettlementRecord) => (
        <Button type='link' onClick={() => handleEdit(record)}>
          编辑产品信息
        </Button>
      ),
    },
  ];

  // 监听容器高度变化
  useEffect(() => {
    const updateTableHeight = () => {
      if (tableContainerRef.current) {
        const headerHeight = 64; // 导航标题高度
        const formHeight = 48; // 表单的高度
        const tableHeaderHeight = 55; // 表格标题高度
        const paginationHeight = 64; // 分页的高度
        const paddingHeight = 72; // 内边距高度
        const availableHeight =
          window.innerHeight -
          headerHeight -
          formHeight -
          tableHeaderHeight -
          paginationHeight -
          paddingHeight;
        setTableHeight(availableHeight);
      }
    };

    updateTableHeight();
    window.addEventListener('resize', updateTableHeight);

    return () => {
      window.removeEventListener('resize', updateTableHeight);
    };
  }, []);

  return (
    <Card>
      <div className='table-container' ref={tableContainerRef}>
        {/* 添加筛选表单 */}
        <div style={{ marginBottom: 16 }}>
          <Form form={form} layout='inline' onFinish={handleFilter}>
            <Form.Item label='店铺名称' name='mallName'>
              <Input placeholder='请输入店铺名称' />
            </Form.Item>
            <Form.Item label='SKU ID' name='skuId'>
              <Input placeholder='请输入SKU ID，多个用逗号分隔' />
            </Form.Item>
            <Form.Item label='成本状态' name='costStatus'>
              <Select
                style={{ width: 120 }}
                placeholder='请选择状态'
                allowClear
                options={[
                  { value: 'completed', label: '已完善' },
                  { value: 'incomplete', label: '未完善' },
                ]}
              />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button htmlType='submit' type='primary'>
                  查询
                </Button>
                <Button onClick={handleReset}>重置</Button>
              </Space>
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type='primary' onClick={updateCostData}>
                  刷新成本结算明细
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </div>
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey='id'
          scroll={{ x: 1000, y: tableHeight }}
          onChange={(pagination, filters, sorter) => {
            if (Array.isArray(sorter)) {
              // Handle multiple sorters if needed
              return;
            }
            const newSortField = String(sorter?.field || '');
            const newSortOrder = sorter?.order
              ? sorter.order === 'ascend'
                ? 'asc'
                : 'desc'
              : '';

            // 设置排序状态
            setSortField(newSortField);
            setSortOrder(newSortOrder);

            // 当排序变化时，重置到第一页
            if (newSortField !== sortField || newSortOrder !== sortOrder) {
              setPageIndex(1);
            }
          }}
          pagination={{
            showSizeChanger: true,
            pageSizeOptions: [50, 100, 150, 200],
            showQuickJumper: true,
            total: total,
            showTotal: (total) => `共 ${total} 条记录`,
            pageSize: pageSize,
            current: pageIndex,
            onChange: (page, pageSize) => {
              setPageIndex(page);
              setPageSize(pageSize);
            },
            onShowSizeChange: (current, size) => {
              setPageIndex(current);
              setPageSize(size);
            },
            showLessItems: true,
          }}
        />
      </div>

      <Modal
        title='编辑产品信息'
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          form2.resetFields();
        }}
        footer={null}
      >
        <Form form={form2} layout='vertical' onFinish={handleSave}>
          <Form.Item
            label='产品名称'
            name='productName'
            rules={[{ required: true, message: '请输入产品名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label='产品成本'
            name='costPrice'
            rules={[{ required: true, message: '请输入产品成本价' }]}
          >
            <Input type='number' step='0.01' />
          </Form.Item>
          <Form.Item>
            <Button type='primary' htmlType='submit'>
              保存
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
