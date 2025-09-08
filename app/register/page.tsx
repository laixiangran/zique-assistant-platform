'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Form, Input, Button, Card, message } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  PhoneOutlined,
  MailOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import './page.scss';

interface RegisterFormData {
  username: string;
  password: string;
  confirmPassword: string;
  phone: string;
  email: string;
  invitationCode?: string;
}

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [registerForm] = Form.useForm();

  // 页面加载时检查是否已登录
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

    // 从URL参数中获取邀请码并填入表单
    const invitationCode = searchParams.get('invitationCode');
    if (invitationCode) {
      registerForm.setFieldsValue({ invitationCode });
    }
  }, [router, searchParams, registerForm]);

  const handleRegister = async (values: RegisterFormData) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...values, remember: true }), // 注册后默认记住
      });

      const data = await response.json();

      if (response.ok) {
        message.success(data.message || '注册成功');
        // 注册后默认记住用户信息（类似大多数网站的注册后自动登录）
        localStorage.setItem('user', JSON.stringify(data.data.user));
        localStorage.setItem('accountType', 'main');
        localStorage.setItem('token', data.data.token);

        // 跳转到主页面
        router.push('/main/home');
      } else {
        message.error(data.message || '注册失败');
      }
    } catch (error) {
      console.error('注册错误:', error);
      message.error('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='register-wrapper'>
      <Card>
        <div>
          <h1>紫雀跨境运营平台</h1>
          <h2>用户注册</h2>
        </div>

        <div>
          <Form
            form={registerForm}
            name='register'
            onFinish={handleRegister}
            layout='vertical'
            requiredMark={false}
            size='large'
          >
            <Form.Item
              name='username'
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 3, message: '用户名至少3个字符' },
                { max: 20, message: '用户名最多20个字符' },
                {
                  pattern: /^[a-zA-Z0-9_]+$/,
                  message: '用户名只能包含字母、数字和下划线',
                },
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder='用户名' />
            </Form.Item>

            <Form.Item
              name='phone'
              rules={[
                { required: true, message: '请输入手机号' },
                { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' },
              ]}
            >
              <Input prefix={<PhoneOutlined />} placeholder='手机号' />
            </Form.Item>

            <Form.Item
              name='email'
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder='邮箱' />
            </Form.Item>

            <Form.Item
              name='password'
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6个字符' },
                { max: 20, message: '密码最多20个字符' },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder='密码' />
            </Form.Item>

            <Form.Item
              name='confirmPassword'
              dependencies={['password']}
              rules={[
                { required: true, message: '请确认密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder='确认密码'
              />
            </Form.Item>

            <Form.Item
              name='invitationCode'
              rules={[{ len: 6, message: '邀请码为6位字符' }]}
            >
              <Input placeholder='邀请码（可选）' />
            </Form.Item>

            <Form.Item>
              <Button type='primary' htmlType='submit' loading={loading}>
                <span>注册</span>
              </Button>
            </Form.Item>

            <div>
              <Link href='/login'>
                <Button type='link' size='small'>
                  已有账户？去登录
                </Button>
              </Link>
            </div>
          </Form>
        </div>

        <div>
          <p>© 2025 紫雀跨境运营平台. 保留所有权利.</p>
        </div>
      </Card>
    </div>
  );
}
