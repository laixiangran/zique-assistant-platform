'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Input, Button, Card, message } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { authAPI } from '../services';
import './page.scss';

interface ForgotPasswordFormData {
  email: string;
}

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();
  const [form] = Form.useForm();

  const handleSubmit = async (values: ForgotPasswordFormData) => {
    setLoading(true);
    try {
      await authAPI.forgotPassword(values.email);
      setEmailSent(true);
      message.success('重置密码邮件已发送，请检查您的邮箱');
    } catch (error) {
      console.error('Forgot password error:', error);
      // 错误消息已在services中处理，这里不需要再显示
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.push('/login');
  };

  const handleResendEmail = () => {
    setEmailSent(false);
    form.resetFields();
  };

  return (
    <div className='forgot-password-wrapper'>
      <Card>
        <div>
          <h1>忘记密码</h1>
        </div>

        {!emailSent ? (
          <div>
            <p className='description'>
              请输入您的邮箱地址，我们将向您发送重置密码的链接。
            </p>
            
            <Form
              form={form}
              name='forgot-password'
              onFinish={handleSubmit}
              layout='vertical'
              requiredMark={false}
              size='large'
            >
              <Form.Item
                name='email'
                rules={[
                  { required: true, message: '请输入邮箱地址' },
                  { type: 'email', message: '请输入有效的邮箱地址' },
                ]}
              >
                <Input 
                  prefix={<MailOutlined />} 
                  placeholder='邮箱地址' 
                />
              </Form.Item>

              <Form.Item>
                <Button type='primary' htmlType='submit' loading={loading}>
                  <span>发送重置链接</span>
                </Button>
              </Form.Item>
            </Form>

            <div className='back-to-login'>
              <Button 
                type='link' 
                icon={<ArrowLeftOutlined />} 
                onClick={handleBackToLogin}
              >
                返回登录
              </Button>
            </div>
          </div>
        ) : (
          <div className='email-sent'>
            <div className='success-icon'>✉️</div>
            <h3>邮件已发送</h3>
            <p>
              我们已向您的邮箱发送了重置密码的链接，请检查您的邮箱（包括垃圾邮件文件夹）。
            </p>
            <p className='note'>
              如果您在几分钟内没有收到邮件，请检查邮箱地址是否正确。
            </p>
            
            <div className='actions'>
              <Button type='primary' onClick={handleBackToLogin}>
                返回登录
              </Button>
              <Button type='link' onClick={handleResendEmail}>
                重新发送
              </Button>
            </div>
          </div>
        )}

        <div>
          <p>© 2025 紫雀跨境运营平台. 保留所有权利.</p>
        </div>
      </Card>
    </div>
  );
}