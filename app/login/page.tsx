'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Form, Input, Button, Card, Tabs, message, Checkbox } from 'antd'
import { UserOutlined, LockOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons'
import Link from 'next/link'

const { TabPane } = Tabs

interface LoginFormData {
  username: string
  password: string
  accountType: 'user' | 'sub_account'
  remember?: boolean
}

interface RegisterFormData {
  username: string
  password: string
  confirmPassword: string
  phone: string
  email: string
  invitationCode?: string
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('login')
  const router = useRouter()
  const [loginForm] = Form.useForm()
  const [registerForm] = Form.useForm()

  const handleLogin = async (values: LoginFormData) => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (response.ok) {
        message.success(data.message || '登录成功')
        // 存储用户信息到localStorage
        localStorage.setItem('user', JSON.stringify(data.data.user))
        localStorage.setItem('accountType', data.data.accountType)
        
        // 跳转到仪表盘
        router.push('/dashboard')
      } else {
        message.error(data.message || '登录失败')
      }
    } catch (error) {
      console.error('登录错误:', error)
      message.error('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (values: RegisterFormData) => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (response.ok) {
        message.success(data.message || '注册成功')
        // 存储用户信息到localStorage
        localStorage.setItem('user', JSON.stringify(data.data.user))
        localStorage.setItem('accountType', 'user')
        
        // 跳转到仪表盘
        router.push('/dashboard')
      } else {
        message.error(data.message || '注册失败')
      }
    } catch (error) {
      console.error('注册错误:', error)
      message.error('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">紫雀助手平台</h1>
          <p className="text-gray-600">店铺管理与会员服务平台</p>
        </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab} centered>
          <TabPane tab="登录" key="login">
            <Form
              form={loginForm}
              name="login"
              onFinish={handleLogin}
              layout="vertical"
              requiredMark={false}
            >
              <Form.Item
                name="accountType"
                initialValue="user"
              >
                <Tabs size="small" centered>
                  <TabPane tab="主账户" key="user" />
                  <TabPane tab="子账户" key="sub_account" />
                </Tabs>
              </Form.Item>

              <Form.Item
                name="username"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, message: '用户名至少3个字符' },
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="用户名"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码至少6个字符' },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="密码"
                  size="large"
                />
              </Form.Item>

              <Form.Item>
                <div className="flex justify-between items-center">
                  <Form.Item name="remember" valuePropName="checked" noStyle>
                    <Checkbox>记住我</Checkbox>
                  </Form.Item>
                  <Link href="/forgot-password" className="text-blue-600 hover:text-blue-800">
                    忘记密码？
                  </Link>
                </div>
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size="large"
                  className="w-full"
                >
                  登录
                </Button>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab="注册" key="register">
            <Form
              form={registerForm}
              name="register"
              onFinish={handleRegister}
              layout="vertical"
              requiredMark={false}
            >
              <Form.Item
                name="username"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, message: '用户名至少3个字符' },
                  { max: 20, message: '用户名最多20个字符' },
                  { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' },
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="用户名"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="phone"
                rules={[
                  { required: true, message: '请输入手机号' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' },
                ]}
              >
                <Input
                  prefix={<PhoneOutlined />}
                  placeholder="手机号"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' },
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="邮箱"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码至少6个字符' },
                  { max: 20, message: '密码最多20个字符' },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="密码"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                dependencies={['password']}
                rules={[
                  { required: true, message: '请确认密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve()
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'))
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="确认密码"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="invitationCode"
                rules={[
                  { len: 8, message: '邀请码为8位字符' },
                ]}
              >
                <Input
                  placeholder="邀请码（可选）"
                  size="large"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size="large"
                  className="w-full"
                >
                  注册
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>

        <div className="text-center mt-4 text-sm text-gray-500">
          <p>© 2024 紫雀助手平台. 保留所有权利.</p>
        </div>
      </Card>
    </div>
  )
}