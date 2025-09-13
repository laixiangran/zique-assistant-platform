'use client';

import {
  Table,
  message,
  Form,
  Input,
  Button,
  Space,
  Typography,
  DatePicker,
  Card,
} from 'antd';
import 'dayjs/locale/zh-cn';
import dayjs from 'dayjs';
import { useState, useEffect, useRef } from 'react';
import { formatAmount } from '@/lib/utils';
import { dataManagementAPI } from '@/app/services';

// 设置 dayjs 语言为中文
dayjs.locale('zh-cn');

export default function PendingSettlement() {
  const { Paragraph } = Typography;
  const { RangePicker } = DatePicker;
  const tableContainerRef = useRef(null);
  const [tableHeight, setTableHeight] = useState(0);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [total, setTotal] = useState(0);

  // 获取默认时间范围
  const getDefaultDateRange = () => {
    const startDate = dayjs().subtract(30, 'day');
    const endDate = dayjs().subtract(1, 'day');
    return {
      start: dayjs(startDate).format('YYYY-MM-DD'),
      end: dayjs(endDate).format('YYYY-MM-DD'),
      dayjs_start: dayjs(startDate),
      dayjs_end: dayjs(endDate),
    };
  };

  const defaultDateRange = getDefaultDateRange();
  const [form] = Form.useForm();

  // 修改 filters 的初始值
  const [filters, setFilters] = useState({
    mall_name: '',
    region_name: '',
    sku_id: '',
    accounting_time_start: defaultDateRange.start,
    accounting_time_end: defaultDateRange.end,
  });
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [totalInfo, setTotalInfo] = useState<any>();

  // 设置表单的初始值
  useEffect(() => {
    form.setFieldsValue({
      accounting_time: [
        defaultDateRange.dayjs_start,
        defaultDateRange.dayjs_end,
      ],
    });
  }, []);

  // 保持单个数据获取的 useEffect
  useEffect(() => {
    fetchData(pageIndex, pageSize);
  }, [pageIndex, pageSize, filters, sortField, sortOrder]);

  const fetchData = async (pageIndex: number = 1, pageSize: number = 10) => {
    setLoading(true);
    try {
      // 构建查询参数
      const params: any = {
        pageIndex,
        pageSize,
        ...filters,
        sortField,
        sortOrder,
      };

      const response = await dataManagementAPI.arrivalData.getList(params);
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

  // 处理筛选表单提交
  const handleFilter = () => {
    const values = form.getFieldsValue();
    setFilters({
      mall_name: values.mall_name || '',
      region_name: values.region_name || '',
      sku_id: values.sku_id || '',
      // 添加财务时间筛选
      accounting_time_start: values.accounting_time
        ? values.accounting_time[0].format('YYYY-MM-DD')
        : '',
      accounting_time_end: values.accounting_time
        ? values.accounting_time[1].format('YYYY-MM-DD')
        : '',
    });
    setPageIndex(1); // 重置到第一页
  };

  // 修改重置处理函数
  const handleReset = () => {
    const defaultRange = getDefaultDateRange();
    form.resetFields();
    form.setFieldsValue({
      accounting_time: [defaultRange.dayjs_start, defaultRange.dayjs_end],
    });

    setFilters({
      mall_name: '',
      region_name: '',
      sku_id: '',
      accounting_time_start: defaultRange.start,
      accounting_time_end: defaultRange.end,
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
      (totals, item) => {
        totals.currency = item.currency || 'CNY';
        totals.salesVolume += +item.sales_volume || 0;
        totals.incomeAmount += +item.sales_amount || 0;
        return totals;
      },
      { salesVolume: 0, incomeAmount: 0, currency: 'CNY' }
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
      title: '地区',
      dataIndex: 'region_name',
      key: 'region_name',
      width: 120,
      fixed: 'left' as const,
    },
    {
      title: 'SKU ID',
      dataIndex: 'sku_id',
      key: 'sku_id',
      width: 150,
      fixed: 'left' as const,
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
      render: (value: any) => value || '-',
    },
    {
      title: '产品成本',
      dataIndex: 'cost_price',
      key: 'cost_price',
      width: 120,
      render: (value: any, record: any) => formatAmount(value, record.currency),
    },
    {
      title: '到账均价',
      dataIndex: 'd30_arrival_average_price',
      key: 'd30_arrival_average_price',
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
      title: '收入金额',
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
      title: '账务时间',
      dataIndex: 'accounting_time',
      key: 'accounting_time',
      width: 150,
      sorter: true,
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
        const formHeight = 88; // 表单的高度
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
        {/* 修改筛选表单样式 */}
        <div style={{ marginBottom: 16, background: '#fff' }}>
          <Form
            form={form}
            layout='inline'
            onFinish={handleFilter}
            style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
          >
            <Form.Item
              name='mall_name'
              label='店铺名称'
              style={{ minWidth: '250px', flex: 1 }}
            >
              <Input placeholder='请输入店铺名称' />
            </Form.Item>
            <Form.Item
              name='region_name'
              label='地区'
              style={{ minWidth: '200px', flex: 1 }}
            >
              <Input placeholder='请输入地区' />
            </Form.Item>
            <Form.Item
              name='sku_id'
              label='SKU ID'
              style={{ minWidth: '250px', flex: 1 }}
            >
              <Input placeholder='请输入SKU ID，多个用逗号分隔' />
            </Form.Item>
            <Form.Item
              name='accounting_time'
              label='财务时间'
              style={{ minWidth: '350px', flex: 1.5 }}
            >
              <RangePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item style={{ marginLeft: 'auto', minWidth: 'auto' }}>
              <Space>
                <Button type='primary' htmlType='submit'>
                  查询
                </Button>
                <Button onClick={handleReset}>重置</Button>
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
                ，收入金额&nbsp;&nbsp;
                {formatAmount(totalInfo.incomeAmount, totalInfo.currency)}
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
