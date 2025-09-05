import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import theme from '@/app/theme';
import './globals.scss';

export const metadata: Metadata = {
  title: '紫鹊跨境运营平台',
  description: '紫鹊跨境运营平台',
};
const RootLayout = ({ children }: React.PropsWithChildren) => (
  <html lang='zh-CN'>
    <body>
      <AntdRegistry>
        <ConfigProvider locale={zhCN} theme={theme}>
          {children}
        </ConfigProvider>
      </AntdRegistry>
    </body>
  </html>
);

export default RootLayout;
