'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // 检查用户是否已登录
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          // 已登录，跳转到仪表盘
          router.push('/main/home');
        } else {
          // 未登录，跳转到登录页
          router.push('/login');
        }
      } catch (error) {
        // 网络错误，跳转到登录页
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div>
      <div>
        <Spin size='large' />
        <div>正在加载...</div>
      </div>
    </div>
  );
}
