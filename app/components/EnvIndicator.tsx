'use client';

import React from 'react';
import { Tag } from 'antd';
import { ENV_CONFIG } from '@/lib/env';

/**
 * 环境指示器组件
 * 显示当前运行环境（仅在开发环境显示）
 */
const EnvIndicator: React.FC = () => {
  // 仅在开发环境显示
  if (!ENV_CONFIG.isDevelopment) {
    return null;
  }

  return (
    <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 9999 }}>
      <Tag color={ENV_CONFIG.isDevelopment ? 'blue' : 'green'}>
        {ENV_CONFIG.environment.toUpperCase()}
      </Tag>
      <Tag color="default">
        {ENV_CONFIG.apiBaseUrl}
      </Tag>
    </div>
  );
};

export default EnvIndicator;