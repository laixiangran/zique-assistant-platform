'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Form, Input, Button, Card, message } from 'antd';
import {
  LockOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
} from '@ant-design/icons';
import { authAPI } from '@/app/services';
import './page.scss';

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

// 内部组件处理useSearchParams
function ResetPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form] = Form.useForm();
  const token = searchParams.get('token');

  // 验证令牌有效性
  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      return;
    }

    const validateToken = async () => {
      try {
        await authAPI.validateResetToken(token);
        setTokenValid(true);
      } catch (error) {
        setTokenValid(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (values: ResetPasswordFormData) => {
    if (!token) {
      message.error('重置令牌无效');
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword(token, values.password);
      setResetSuccess(true);
      message.success('密码重置成功');
      // 3秒后跳转到登录页
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.push('/login');
  };

  // 令牌验证中
  if (tokenValid === null) {
    return (
      <div className='reset-password-wrapper'>
        <Card>
          <div className='loading-state'>
            <div className='loading-icon'>⏳</div>
            <h3>验证重置链接...</h3>
            <p>请稍候，正在验证您的重置链接。</p>
          </div>
        </Card>
      </div>
    );
  }

  // 令牌无效
  if (!tokenValid) {
    return (
      <div className='reset-password-wrapper'>
        <Card>
          <div className='error-state'>
            <div className='error-icon'>❌</div>
            <h3>链接无效或已过期</h3>
            <p>重置密码链接无效或已过期，请重新申请重置密码。</p>
            <div className='actions'>
              <Button
                type='primary'
                onClick={() => router.push('/forgot-password')}
              >
                重新申请
              </Button>
              <Button type='link' onClick={handleBackToLogin}>
                返回登录
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // 重置成功
  if (resetSuccess) {
    return (
      <div className='reset-password-wrapper'>
        <Card>
          <div className='success-state'>
            <div className='success-icon'>✅</div>
            <h3>密码重置成功</h3>
            <p>您的密码已成功重置，即将跳转到登录页面。</p>
            <div className='actions'>
              <Button type='primary' onClick={handleBackToLogin}>
                立即登录
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // 重置密码表单
  return (
    <div className='reset-password-wrapper'>
      <Card>
        <div>
          <h1>重置密码</h1>
        </div>

        <div>
          <p className='description'>请输入您的新密码。</p>

          <Form
            form={form}
            name='reset-password'
            onFinish={handleSubmit}
            layout='vertical'
            requiredMark={false}
            size='large'
          >
            <Form.Item
              name='password'
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '密码至少6个字符' },
                {
                  pattern: /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/,
                  message: '密码必须包含字母和数字',
                },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder='新密码'
                iconRender={(visible) =>
                  visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                }
              />
            </Form.Item>

            <Form.Item
              name='confirmPassword'
              dependencies={['password']}
              rules={[
                { required: true, message: '请确认新密码' },
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
                placeholder='确认新密码'
                iconRender={(visible) =>
                  visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                }
              />
            </Form.Item>

            <Form.Item>
              <Button type='primary' htmlType='submit' loading={loading}>
                <span>重置密码</span>
              </Button>
            </Form.Item>
          </Form>

          <div className='back-to-login'>
            <Button type='link' onClick={handleBackToLogin}>
              返回登录
            </Button>
          </div>
        </div>

        <div>
          <p>© 2025 {process.env.NEXT_PUBLIC_APP_NAME}. 保留所有权利.</p>
        </div>
      </Card>
    </div>
  );
}

// 主组件用Suspense包装
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
