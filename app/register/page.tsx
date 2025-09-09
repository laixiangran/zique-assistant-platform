'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Form, Input, Button, Card, message } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  PhoneOutlined,
  MailOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { authAPI } from '@/app/services';
import './page.scss';

interface RegisterFormData {
  username: string;
  password: string;
  confirmPassword: string;
  phone: string;
  email: string;
  invitationCode?: string;
}

interface ValidationStatus {
  status: string;
  message: string;
  checking: boolean;
}

type FieldType = 'username' | 'phone' | 'email';

type ValidationStatusMap = {
  [K in FieldType]: ValidationStatus;
};

type DebounceTimersMap = {
  [K in FieldType]?: NodeJS.Timeout;
};

// 内部组件处理useSearchParams
function RegisterForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [registerForm] = Form.useForm();

  // 实时验证状态
  const [validationStatus, setValidationStatus] = useState<ValidationStatusMap>(
    {
      username: { status: '', message: '', checking: false },
      phone: { status: '', message: '', checking: false },
      email: { status: '', message: '', checking: false },
    }
  );

  // 防抖定时器
  const [debounceTimers, setDebounceTimers] = useState<DebounceTimersMap>({});

  // 检查可用性的函数
  const checkAvailability = useCallback(
    async (type: FieldType, value: string) => {
      if (!value) {
        setValidationStatus((prev) => ({
          ...prev,
          [type]: { status: '', message: '', checking: false },
        }));
        return;
      }

      // 设置检查中状态
      setValidationStatus((prev) => ({
        ...prev,
        [type]: { status: '', message: '', checking: true },
      }));

      try {
      const response = await authAPI.checkAvailability({ type, value });
      const data = response.data;
      
      setValidationStatus(prev => ({
        ...prev,
        [type]: {
          status: data.available ? 'success' : 'error',
          message: data.message,
          checking: false
        }
      }));
      } catch (error: any) {
        setValidationStatus((prev) => ({
          ...prev,
          [type]: {
            status: 'error',
            message: error.message || '网络错误，请稍后重试',
            checking: false,
          },
        }));
      }
    },
    []
  );

  // 防抖处理函数
  const handleFieldChange = useCallback(
    (type: FieldType, value: string) => {
      // 清除之前的定时器
      if (debounceTimers[type]) {
        clearTimeout(debounceTimers[type]);
      }

      // 设置新的定时器
      const timer = setTimeout(() => {
        checkAvailability(type, value);
      }, 500); // 500ms 防抖

      setDebounceTimers((prev) => ({
        ...prev,
        [type]: timer,
      }));
    },
    [checkAvailability, debounceTimers]
  );

  // 获取字段状态图标
  const getFieldSuffix = (type: FieldType) => {
    const status = validationStatus[type];
    if (status.checking) {
      return <LoadingOutlined style={{ color: '#1890ff' }} />;
    }
    if (status.status === 'success') {
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    }
    if (status.status === 'error') {
      return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    }
    return null;
  };

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
      const response = await authAPI.register({ ...values, remember: true });
      const data = response.data;
      
      message.success('注册成功');
      // 注册后默认记住用户信息（类似大多数网站的注册后自动登录）
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('accountType', 'main');
      localStorage.setItem('token', data.token);

      // 跳转到主页面
      router.push('/main/home');
    } catch (error: any) {
      console.error('注册错误:', error);
      // 错误信息已在services中处理，这里不需要再显示
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='register-wrapper'>
      <Card>
        <div>
          <h1>{process.env.NEXT_PUBLIC_APP_NAME}</h1>
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
              validateStatus={
                validationStatus.username.status === 'error'
                  ? 'error'
                  : validationStatus.username.status === 'success'
                  ? 'success'
                  : ''
              }
              help={validationStatus.username.message}
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
              <Input
                prefix={<UserOutlined />}
                suffix={getFieldSuffix('username')}
                placeholder='请输入用户名'
                onBlur={(e) => handleFieldChange('username', e.target.value)}
              />
            </Form.Item>

            <Form.Item
              name='phone'
              validateStatus={
                validationStatus.phone.status === 'error'
                  ? 'error'
                  : validationStatus.phone.status === 'success'
                  ? 'success'
                  : ''
              }
              help={validationStatus.phone.message}
              rules={[
                { required: true, message: '请输入手机号' },
                { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式' },
              ]}
            >
              <Input
                prefix={<PhoneOutlined />}
                suffix={getFieldSuffix('phone')}
                placeholder='请输入手机号'
                onBlur={(e) => handleFieldChange('phone', e.target.value)}
              />
            </Form.Item>

            <Form.Item
              name='email'
              validateStatus={
                validationStatus.email.status === 'error'
                  ? 'error'
                  : validationStatus.email.status === 'success'
                  ? 'success'
                  : ''
              }
              help={
                validationStatus.email.message ||
                '用于找回密码，请务必输入正确的邮箱地址'
              }
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                suffix={getFieldSuffix('email')}
                placeholder='请输入邮箱地址'
                onBlur={(e) => handleFieldChange('email', e.target.value)}
              />
            </Form.Item>

            <Form.Item
              name='password'
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6个字符' },
                { max: 20, message: '密码最多20个字符' },
                {
                  pattern: /^(?=.*[A-Za-z])(?=.*\d)/,
                  message: '密码必须包含字母和数字',
                },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder='请输入密码'
              />
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
                placeholder='请确认密码'
              />
            </Form.Item>

            <Form.Item
              name='invitationCode'
              rules={[{ len: 6, message: '邀请码为6位字符' }]}
            >
              <Input placeholder='请输入邀请码（可选）' />
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
          <p>© 2025 {process.env.NEXT_PUBLIC_APP_NAME}. 保留所有权利.</p>
        </div>
      </Card>
    </div>
  );
}

// 主组件用Suspense包装
export default function RegisterPage() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
