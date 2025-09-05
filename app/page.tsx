'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Spin } from 'antd'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // 检查用户是否已登录
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          // 已登录，跳转到仪表盘
          router.push('/dashboard')
        } else {
          // 未登录，跳转到登录页
          router.push('/login')
        }
      } catch (error) {
        // 网络错误，跳转到登录页
        router.push('/login')
      }
    }

    checkAuth()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <Spin size="large" />
        <div className="mt-4 text-lg text-gray-600">正在加载...</div>
        <div className="mt-2 text-sm text-gray-500">紫雀助手平台</div>
      </div>
    </div>
  )
}