'use client';

import {
  Table,
  message,
  Form,
  Input,
  Button,
  Space,
  Typography,
  Card,
} from 'antd';
import { useState, useEffect, useRef } from 'react';
import { formatAmount, formatVolume } from '@/lib/utils';
import { dataManagementAPI } from '@/app/services';

export default function PendingSettlement() {
  const { Paragraph } = Typography;
  const tableContainerRef = useRef(null);
  const [tableHeight, setTableHeight] = useState(0);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [total, setTotal] = useState(0);
  const [form] = Form.useForm();
  const [filters, setFilters] = useState<any>({
    mall_name: '',
    region_name: '',
    sku_id: '',
    sku_code: '',
    goods_name: '',
  });
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [totalInfo, setTotalInfo] = useState<any>();

  useEffect(() => {
    fetchData(pageIndex, pageSize);
  }, [pageIndex, pageSize, filters, sortField, sortOrder]);

  const fetchData = async (pageIndex: number, pageSize: number) => {
    setLoading(true);
    try {
      // 构建查询参数
      const params = {
        pageIndex,
        pageSize,
        ...filters,
        sortField,
        sortOrder,
      };

      const response = await dataManagementAPI.pendingSettlement.getList(
        params
      );
      const result = response.data;
      const data: any[] = result.data || [];
      setData(data);
      setTotal(result.total);

      // 计算合计值
      const totalInfo = calculateTotals(result.data);
      setTotalInfo(totalInfo);
    } finally {
      setLoading(false);
    }
  };

  // 处理筛选表单提交
  const handleFilter = () => {
    const values = form.getFieldsValue();
    setFilters({
      mall_name: values.mall_name || '',
      region_name: values.region_name || '',
      sku_id: values.sku_id || '',
      sku_code: values.sku_code || '',
      goods_name: values.goods_name || '',
    });
    setPageIndex(1); // 重置到第一页
  };

  // 处理重置
  const handleReset = () => {
    form.resetFields();
    setFilters({
      mall_name: '',
      region_name: '',
      sku_id: '',
    });
    setPageIndex(1);
  };

  // 计算当前页合计
  const calculateTotals = (data: any[]) => {
    // 检查是否为同一店铺
    const isSameMallId =
      data?.length > 0 &&
      data.every((item) => item.mall_id === data[0].mall_id);

    if (!isSameMallId) {
      return null;
    }

    return data.reduce(
      (totals: any, item: any) => {
        totals.currency = item.currency || 'CNY';
        totals.salesVolume += +item.sales_volume || 0;
        totals.pendingAmount += +item.sales_amount || 0;
        return totals;
      },
      { salesVolume: 0, pendingAmount: 0, currency: 'CNY' }
    );
  };

  const columns = [
    {
      title: '序号',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      fixed: 'left' as const,
      render: (value: any, record: any, index: number) => {
        return index + 1;
      },
    },
    {
      title: '店铺信息',
      key: 'mall_info',
      width: 180,
      fixed: 'left',
      render: (text: any, record: any) => (
        <div>
          <div>{record.mall_name}</div>
          <Paragraph copyable={{ text: record.mall_id }}>
            <span style={{ fontSize: '12px', color: '#666' }}>
              {record.mall_id}
            </span>
          </Paragraph>
        </div>
      ),
    },
    {
      title: '地区',
      dataIndex: 'region_name',
      key: 'region_name',
      width: 120,
      fixed: 'left',
    },
    {
      title: 'SKU ID',
      dataIndex: 'sku_id',
      key: 'sku_id',
      width: 150,
      fixed: 'left',
      render: (text: any) => <Paragraph copyable>{text}</Paragraph>,
    },
    {
      title: 'SKU货号',
      dataIndex: 'sku_code',
      key: 'sku_code',
      width: 150,
      render: (value: any) => value || '-',
    },
    {
      title: '货品名称',
      dataIndex: 'goods_name',
      key: 'goods_name',
      width: 300,
      render: (value: any) => (
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
      title: 'SKU属性',
      dataIndex: 'sku_property',
      key: 'sku_property',
      width: 150,
    },
    {
      title: '产品名称',
      dataIndex: 'product_name',
      key: 'product_name',
      width: 150,
      render: (value: any, record: any) => value || '-',
    },
    {
      title: '产品成本',
      dataIndex: 'cost_price',
      key: 'cost_price',
      width: 120,
      render: (value: any, record: any) => formatAmount(value, record.currency),
    },
    {
      title: '待结算均价',
      dataIndex: 'pending_average_price',
      key: 'pending_average_price',
      width: 120,
      render: (value: any, record: any) => formatAmount(value, record.currency),
    },
    {
      title: '销量',
      dataIndex: 'sales_volume',
      key: 'sales_volume',
      width: 100,
      sorter: true,
    },
    {
      title: '待结算金额',
      dataIndex: 'sales_amount',
      key: 'sales_amount',
      width: 120,
      sorter: true,
      render: (value: any, record: any) => formatAmount(value, record.currency),
    },
    {
      title: '币种',
      dataIndex: 'currency',
      key: 'currency',
      width: 100,
    },
    {
      title: '更新时间',
      dataIndex: 'updated_time',
      key: 'updated_time',
      width: 120,
      sorter: true,
    },
  ];

  // 监听容器高度变化
  useEffect(() => {
    const updateTableHeight = () => {
      if (tableContainerRef.current) {
        const headerHeight = 64; // 导航标题高度
        const formHeight = 48; // 表单的高度
        const tableHeaderHeight = 55; // 表格标题高度
        const tableFooterHeight = 54; // 表格底部高度
        const paginationHeight = 64; // 分页的高度
        const paddingHeight = 72; // 内边距高度
        const availableHeight =
          window.innerHeight -
          headerHeight -
          formHeight -
          tableHeaderHeight -
          tableFooterHeight -
          paginationHeight -
          paddingHeight;
        setTableHeight(availableHeight);
      }
    };

    updateTableHeight();
    // window.addEventListener('resize', updateTableHeight);

    // return () => {
    //   window.removeEventListener('resize', updateTableHeight);
    // };
  }, []);

  return (
    <Card>
      <div className='table-container' ref={tableContainerRef}>
        {/* 添加筛选表单 */}
        <div style={{ marginBottom: 16 }}>
          <Form form={form} layout='inline' onFinish={handleFilter}>
            <Form.Item name='mall_name' label='店铺名称'>
              <Input placeholder='请输入店铺名称' />
            </Form.Item>
            <Form.Item name='region_name' label='地区'>
              <Input placeholder='请输入地区' />
            </Form.Item>
            <Form.Item name='sku_id' label='SKU ID'>
              <Input placeholder='请输入SKU ID，多个用逗号分隔' />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button htmlType='submit' type='primary'>
                  查询
                </Button>
                <Button onClick={handleReset}>重置</Button>
              </Space>
            </Form.Item>
          </Form>
        </div>

        <Table
          columns={columns as any}
          dataSource={data}
          loading={loading}
          rowKey='id'
          scroll={{ x: 1000, y: tableHeight }}
          onChange={(pagination: any, filters: any, sorter: any) => {
            const newSortField = sorter?.field || '';
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
          footer={() =>
            totalInfo ? (
              <div style={{ textAlign: 'left', fontWeight: 'bold' }}>
                当前页合计：销量&nbsp;&nbsp;{totalInfo.salesVolume}
                ，待结算金额&nbsp;&nbsp;
                {formatAmount(totalInfo.pendingAmount, totalInfo.currency)}
              </div>
            ) : (
              <div style={{ textAlign: 'left', fontWeight: 'bold' }}>
                当前页包含多个店铺，不显示合计数据
              </div>
            )
          }
        />
      </div>
    </Card>
  );
}
