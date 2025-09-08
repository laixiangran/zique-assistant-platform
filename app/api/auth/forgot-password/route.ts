import { NextRequest, NextResponse } from 'next/server';
import { User, PasswordResetToken } from '@/models';
import { successResponse, errorResponse } from '@/lib/utils';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

// 创建邮件传输器
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // 验证必填字段
    if (!email) {
      return NextResponse.json(errorResponse('请输入邮箱地址'), {
        status: 400,
      });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(errorResponse('请输入有效的邮箱地址'), {
        status: 400,
      });
    }

    // 查找用户
    const user = await User.findOne({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(errorResponse('该邮箱未注册'), {
        status: 404,
      });
    }

    // 检查用户状态
    if (user.status !== 'active') {
      return NextResponse.json(errorResponse('账户已被禁用'), {
        status: 401,
      });
    }

    // 生成重置令牌
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1小时后过期

    // 删除该用户之前未使用的重置令牌
    await PasswordResetToken.destroy({
      where: {
        userId: user.id,
        used: false,
      },
    });

    // 创建新的重置令牌
    await PasswordResetToken.create({
      userId: user.id,
      token: resetToken,
      email: email,
      expiresTime: expiresAt,
      used: false,
    });

    // 发送重置邮件
    try {
      const transporter = createTransporter();

      const resetUrl = `${
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      }/reset-password?token=${resetToken}`;

      const mailOptions = {
        from: `"紫雀跨境运营平台" <${process.env.SMTP_USER}>`,
        to: email,
        subject: '重置密码 - 紫雀跨境运营平台',
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #8b5cf6; margin: 0;">紫雀跨境运营平台</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #333; margin-top: 0;">重置您的密码</h2>
              <p style="color: #666; line-height: 1.6;">您好，</p>
              <p style="color: #666; line-height: 1.6;">我们收到了重置您账户密码的请求。请点击下面的按钮来重置您的密码：</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">重置密码</a>
              </div>
              
              <p style="color: #666; line-height: 1.6;">如果按钮无法点击，请复制以下链接到浏览器地址栏：</p>
              <p style="color: #8b5cf6; word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 4px;">${resetUrl}</p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                <p style="color: #999; font-size: 14px; margin: 0;">此链接将在1小时后失效。</p>
                <p style="color: #999; font-size: 14px; margin: 5px 0 0 0;">如果您没有请求重置密码，请忽略此邮件。</p>
              </div>
            </div>
            
            <div style="text-align: center; color: #999; font-size: 12px;">
              <p>© 2025 紫雀跨境运营平台. 保留所有权利.</p>
            </div>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);

      return NextResponse.json(
        successResponse('重置密码邮件已发送，请检查您的邮箱')
      );
    } catch (emailError) {
      console.error('邮件发送失败:', emailError);

      // 删除创建的令牌，因为邮件发送失败
      await PasswordResetToken.destroy({
        where: {
          token: resetToken,
        },
      });

      return NextResponse.json(errorResponse('邮件发送失败，请稍后重试'), {
        status: 500,
      });
    }
  } catch (error) {
    console.error('忘记密码处理失败:', error);
    return NextResponse.json(errorResponse('服务器错误，请稍后重试'), {
      status: 500,
    });
  }
}
