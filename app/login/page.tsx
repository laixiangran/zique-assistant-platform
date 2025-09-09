'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Input, Button, Card, message, Checkbox } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { authAPI } from '@/app/services';
import './page.scss';

interface LoginFormData {
  username: string;
  password: string;
  remember?: boolean;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [loginForm] = Form.useForm();

  // 页面加载时检查是否有记住的登录信息
  useEffect(() => {
    // 检查localStorage中是否有用户信息（记住我）
    const userFromLocalStorage = localStorage.getItem('user');
    const tokenFromLocalStorage = localStorage.getItem('token');

    if (userFromLocalStorage && tokenFromLocalStorage) {
      // 存在记住的登录信息，直接跳转到主页
      router.push('/main/home');
      return;
    }

    // 检查sessionStorage中是否有用户信息
    const userFromSessionStorage = sessionStorage.getItem('user');
    const tokenFromSessionStorage = sessionStorage.getItem('token');

    if (userFromSessionStorage && tokenFromSessionStorage) {
      // 存在会话登录信息，直接跳转到主页
      router.push('/main/home');
      return;
    }
  }, [router]);

  const handleLogin = async (values: LoginFormData) => {
    setLoading(true);
    try {
      // 调用登录API，后端会自动判断主账户或子账户
      const response = await authAPI.login({
        username: values.username,
        password: values.password,
      });
      const data = response.data;

      // 响应拦截器已经处理了success检查，直接使用返回的数据
      message.success('登录成功');

      // 根据"记住我"选项决定是否存储用户信息到localStorage
      if (values.remember) {
        // 存储用户信息到localStorage实现持久化登录
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('accountType', data.accountType);
        localStorage.setItem('token', data.token);
      } else {
        // 仅存储到sessionStorage，关闭浏览器后失效
        sessionStorage.setItem('user', JSON.stringify(data.user));
        sessionStorage.setItem('accountType', data.accountType);
        sessionStorage.setItem('token', data.token);
      }

      // 跳转到主页面
      router.push('/main/home');
    } catch (error) {
      console.error('登录错误:', error);
      message.error('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='login-wrapper'>
      <Card>
        <div>
          <h1>{process.env.NEXT_PUBLIC_APP_NAME}</h1>
        </div>

        <div>
          <Form
            form={loginForm}
            name='login'
            onFinish={handleLogin}
            layout='vertical'
            requiredMark={false}
            size='large'
          >
            <Form.Item
              name='username'
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 3, message: '用户名至少3个字符' },
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder='请输入用户名' />
            </Form.Item>

            <Form.Item
              name='password'
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6个字符' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder='请输入密码'
              />
            </Form.Item>

            <Form.Item>
              <div>
                <Form.Item name='remember' valuePropName='checked' noStyle>
                  <Checkbox>记住我</Checkbox>
                </Form.Item>
                <Link href='/forgot-password'>忘记密码？</Link>
              </div>
            </Form.Item>

            <Form.Item>
              <Button type='primary' htmlType='submit' loading={loading}>
                <span>登录</span>
              </Button>
            </Form.Item>

            <div>
              <Link href='/register'>
                <Button type='link' size='small'>
                  没有账户？立即注册
                </Button>
              </Link>
            </div>
          </Form>
        </div>

        <div>
          <p>© 2025 {process.env.NEXT_PUBLIC_APP_NAME}. 保留所有权利.</p>
        </div>
      </Card>
    </div>
  );
}
