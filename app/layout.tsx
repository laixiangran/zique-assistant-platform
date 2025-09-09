import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import theme from '@/app/theme';
import './globals.scss';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_APP_NAME}`,
  description: `${process.env.NEXT_PUBLIC_APP_DESC}`,
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
