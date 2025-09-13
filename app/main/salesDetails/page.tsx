'use client';

import { Table, Form, Input, Button, Space, Typography, Card } from 'antd';
import { useState, useEffect, useRef } from 'react';
import { formatVolume, formatAmount, formatRate } from '@/lib/utils';
import { dataManagementAPI } from '@/app/services';

export default function CostSettlement() {
  const { Paragraph } = Typography;
  const tableContainerRef = useRef(null);
  const [tableHeight, setTableHeight] = useState(0);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [total, setTotal] = useState(0);
  const [form] = Form.useForm();
  const [form2] = Form.useForm();
  const [filters, setFilters] = useState({
    mall_name: '',
    sku_id: '',
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

      const response = await dataManagementAPI.salesDetails.getList(params);
      const result = response.data;
      setData(result.data);
      setTotal(result.total);

      // 计算合计值
      const totalInfo = calculateTotals(result.data);
      setTotalInfo(totalInfo);
    } finally {
      setLoading(false);
    }
  };

  // 处理重置
  const handleReset = () => {
    form.resetFields();
    setFilters({
      mall_name: '',
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
        totals.todaySalesVolume += +item.today_sales_volume || 0;
        totals.todaySalesAmount += +item.today_sales_amount || 0;
        totals.todayPromotionSalesVolume +=
          +item.today_promotion_sales_volume || 0;
        totals.todayPromotionSalesAmount +=
          +item.today_promotion_sales_amount || 0;
        return totals;
      },
      {
        todaySalesVolume: 0,
        todaySalesAmount: 0,
        todayPromotionSalesVolume: 0,
        todayPromotionSalesAmount: 0,
        currency: 'CNY',
      }
    );
  };

  const columns = [
    {
      title: '序号',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      fixed: 'left' as const,
      render: (value: any, record: any, index: number) => {
        return index + 1;
      },
    },
    {
      title: '店铺信息',
      key: 'mall_info',
      width: 180,
      fixed: 'left' as const,
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
      title: 'SPU ID',
      dataIndex: 'spu_id',
      key: 'spu_id',
      width: 150,
      fixed: 'left',
      render: (text: string) => <Paragraph copyable>{text}</Paragraph>,
    },
    {
      title: 'SKC ID',
      dataIndex: 'skc_id',
      key: 'skc_id',
      width: 150,
      fixed: 'left',
      render: (text: any) => <Paragraph copyable>{text}</Paragraph>,
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
      title: '产品名称',
      dataIndex: 'product_name',
      key: 'product_name',
      width: 150,
      render: (value: any) => formatVolume(value),
    },
    {
      title: '产品成本',
      dataIndex: 'cost_price',
      key: 'cost_price',
      width: 120,
      sorter: true,
      render: (value: any) => formatAmount(value),
    },
    {
      title: '今日均价',
      dataIndex: 'today_average_price',
      key: 'today_average_price',
      width: 120,
      sorter: true,
      render: (value: any) => formatAmount(value),
    },
    {
      title: '今日毛利',
      dataIndex: 'today_gross_profit',
      key: 'today_gross_profit',
      width: 120,
      sorter: true,
      render: (value: any) => formatAmount(value),
    },
    {
      title: '今日毛利率',
      dataIndex: 'today_profit_rate',
      key: 'today_profit_rate',
      width: 150,
      sorter: true,
      render: (value: any) => formatRate(value),
    },
    {
      title: '今日销量',
      dataIndex: 'today_sales_volume',
      key: 'today_sales_volume',
      width: 150,
      sorter: true,
      render: (value: any) => formatVolume(value),
    },
    {
      title: '今日销售额',
      dataIndex: 'today_sales_amount',
      key: 'today_sales_amount',
      width: 160,
      sorter: true,
      render: (value: any) => formatAmount(value),
    },
    {
      title: '今日活动销量',
      dataIndex: 'today_promotion_sales_volume',
      key: 'today_promotion_sales_volume',
      width: 160,
      sorter: true,
      render: (value: any) => formatVolume(value),
    },
    {
      title: '今日活动销售额',
      dataIndex: 'today_promotion_sales_amount',
      key: 'today_promotion_sales_amount',
      width: 160,
      sorter: true,
      render: (value: any) => formatAmount(value),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_time',
      key: 'updated_time',
      width: 120,
      sorter: true,
    },
  ];

  // 处理筛选表单提交
  const handleFilter = () => {
    const values = form.getFieldsValue();
    setFilters({
      mall_name: values.mall_name || '',
      sku_id: values.sku_id || '',
    });
    setPageIndex(1); // 重置到第一页
  };

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
            <Form.Item label='店铺名称' name='mall_name'>
              <Input placeholder='请输入店铺名称' />
            </Form.Item>
            <Form.Item label='SKU ID' name='sku_id'>
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
                当前页合计：今日销量&nbsp;&nbsp;
                {formatVolume(totalInfo.todaySalesVolume)}
                ，今日销售额&nbsp;&nbsp;
                {formatAmount(totalInfo.todaySalesAmount, totalInfo.currency)}
                ，今日活动销量&nbsp;&nbsp;
                {formatVolume(totalInfo.todayPromotionSalesVolume)}
                ，今日活动销售额&nbsp;&nbsp;
                {formatAmount(
                  totalInfo.todayPromotionSalesAmount,
                  totalInfo.currency
                )}
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
