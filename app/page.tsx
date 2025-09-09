'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';
import { authAPI } from '@/app/services';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // 检查用户是否已登录
    const checkAuth = async () => {
      try {
        await authAPI.me();
        // 响应拦截器已经处理了success检查，能执行到这里说明已登录
        router.push('/main/home');
      } catch (error) {
        // 未登录或网络错误，跳转到登录页
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
