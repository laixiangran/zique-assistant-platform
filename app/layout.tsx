import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ConfigProvider } from 'antd'
import theme from '../lib/theme'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '紫鹊助手平台',
  description: '基于 Next.js 的后台管理系统',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <ConfigProvider theme={theme}>
          {children}
        </ConfigProvider>
      </body>
    </html>
  )
}