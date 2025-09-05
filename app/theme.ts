import { ThemeConfig } from 'antd';

const theme: ThemeConfig = {
  token: {
    // 主色调
    colorPrimary: '#8b5cf6',
    // 成功色
    colorSuccess: '#52c41a',
    // 警告色
    colorWarning: '#faad14',
    // 错误色
    colorError: '#ff4d4f',
    // 信息色
    colorInfo: '#8b5cf6',
    // 边框圆角
    borderRadius: 6,
    // 字体大小
    fontSize: 14,
  },
  components: {
    Button: {
      colorPrimary: '#8b5cf6',
      algorithm: true,
    },
    Menu: {
      itemSelectedBg: '#f3f1ff',
      itemSelectedColor: '#8b5cf6',
      itemHoverBg: '#ebe5ff',
    },
    Layout: {
      siderBg: '#ffffff',
      headerBg: '#ffffff',
    },
    Table: {
      headerBg: '#fafafa',
    },
  },
};

export default theme;
