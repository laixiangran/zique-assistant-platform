import { message } from 'antd';
import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import { getApiBaseUrl, ENV_CONFIG } from '@/lib/env';

// 创建axios实例
const apiClient = axios.create({
  baseURL: ENV_CONFIG.isDevelopment ? '/api' : getApiBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 根据请求路径智能选择token
    let token: string | null = null;
    
    // 如果是管理员相关的API，使用admin_token
    if (config.url && config.url.startsWith('/admin')) {
      token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
    } else {
      // 普通用户API使用普通token
      token = localStorage.getItem('token') || sessionStorage.getItem('token');
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data } = response;

    // 检查业务逻辑是否成功
    if (data && typeof data === 'object' && 'success' in data) {
      if (!data.success) {
        // 业务逻辑失败，抛出错误
        const errorMessage = data.message || '请求失败，请稍后重试';
        console.error(data);
        message.error(errorMessage);
        throw new Error(errorMessage);
      }
      // 业务逻辑成功，返回data.data，减少一层嵌套
      return {
        ...response,
        data: data.data || data,
      };
    }

    // 如果响应格式不符合预期，直接返回原始data
    return response;
  },
  (error) => {
    // 统一错误处理
    console.error('API Error:', error);

    // 处理HTTP错误
    if (error.response) {
      const { data } = error.response;
      if (data && data.message) {
        console.error(data);
        message.error(data.message || '请求失败，请稍后重试');
        throw new Error(data.message);
      }
    }

    // 处理网络错误或其他错误
    const errorMessage = error.message || '请求失败，请稍后重试';
    console.error(error);
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
);

// 通用请求方法
const request = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) =>
    apiClient.get<T>(url, config),
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.post<T>(url, data, config),
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.put<T>(url, data, config),
  delete: <T = any>(url: string, config?: AxiosRequestConfig) =>
    apiClient.delete<T>(url, config),
};

// 认证相关API
export const authAPI = {
  // 获取当前用户信息
  getCurrentUser: (signal?: AbortSignal) => request.get('/auth/me', { signal }),

  // 登录
  login: (loginData: { username: string; password: string }) =>
    request.post('/auth/login', loginData),

  // 获取当前用户信息
  me: () => request.get('/auth/me'),

  // 注册
  register: (userData: {
    username: string;
    password: string;
    email: string;
    phone: string;
    invitationCode?: string;
  }) => request.post('/auth/register', userData),

  // 检查可用性
  checkAvailability: (data: {
    type: 'username' | 'email' | 'phone';
    value: string;
  }) => request.post('/auth/check-availability', data),

  // 登出
  logout: () => request.post('/auth/logout'),

  // 忘记密码
  forgotPassword: (email: string) =>
    request.post('/auth/forgot-password', { email }),

  // 验证重置密码令牌
  validateResetToken: (token: string) =>
    request.post('/auth/validate-reset-token', { token }),

  // 重置密码
  resetPassword: (token: string, password: string) =>
    request.post('/auth/reset-password', { token, password }),
};

// 管理员认证API
export const adminAuthAPI = {
  // 管理员登录
  login: (loginData: { username: string; password: string }) =>
    request.post('/admin/login', loginData),

  // 管理员登出
  logout: () => request.post('/admin/logout'),

  // 获取管理员个人信息
  profile: (signal?: AbortSignal) => request.get('/admin/profile', { signal }),
};

// 店铺相关API
export const mallsAPI = {
  // 获取店铺列表
  getMalls: (params: Record<string, any>, signal?: AbortSignal) => {
    const queryParams = new URLSearchParams(params);
    return request.get(`/malls?${queryParams.toString()}`, { signal });
  },

  // 创建店铺
  createMall: (data: any) => request.post('/malls', data),

  // 删除店铺
  deleteMall: (id: number) => request.delete(`/malls?id=${id}`),

  // 获取店铺配额信息
  getMallQuota: (signal?: AbortSignal) =>
    request.get('/malls/quota', { signal }),
};

// 邀请相关API
export const invitationsAPI = {
  // 获取当前用户邀请数据
  getInvitationsInfo: (signal?: AbortSignal) => {
    return request.get('/invitations/info', { signal });
  },

  // 获取当前用户邀请列表
  getInvitations: (
    params: {
      pageIndex?: number;
      pageSize?: number;
      search?: string;
    },
    signal?: AbortSignal
  ) => {
    const queryParams = new URLSearchParams();
    if (params.pageIndex)
      queryParams.append('pageIndex', params.pageIndex.toString());
    if (params.pageSize)
      queryParams.append('pageSize', params.pageSize.toString());
    if (params.search) queryParams.append('search', params.search);

    return request.get(`/invitations?${queryParams.toString()}`, { signal });
  },
};

// 子账户相关API
export const subAccountsAPI = {
  // 获取子账户列表
  getSubAccounts: (
    params: {
      page?: number;
      pageSize?: number;
      search?: string;
    },
    signal?: AbortSignal
  ) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize)
      queryParams.append('pageSize', params.pageSize.toString());
    if (params.search) queryParams.append('search', params.search);

    return request.get(`/sub-accounts?${queryParams.toString()}`, { signal });
  },

  // 创建子账户
  createSubAccount: (data: any) => request.post('/sub-accounts', data),

  // 更新子账户
  updateSubAccount: (id: string, data: any) =>
    request.put(`/sub-accounts/${id}`, data),

  // 删除子账户
  deleteSubAccount: (id: string) => request.delete(`/sub-accounts/${id}`),

  // 获取单个子账户
  getSubAccount: (id: string) => request.get(`/sub-accounts/${id}`),

  // 重置子账户密码
  resetSubAccountPassword: (id: string) =>
    request.post(`/sub-accounts/${id}/reset-password`),
};

// 套餐相关API
export const packagesAPI = {
  // 获取套餐列表
  getPackages: (
    params: {
      page?: number;
      pageSize?: number;
      search?: string;
    },
    signal?: AbortSignal
  ) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize)
      queryParams.append('pageSize', params.pageSize.toString());
    if (params.search) queryParams.append('search', params.search);

    return request.get(`/packages?${queryParams.toString()}`, { signal });
  },
};

// 用户套餐相关API
export const userPackagesAPI = {
  // 获取用户套餐列表
  getUserPackages: (
    params: {
      page?: number;
      pageSize?: number;
      search?: string;
    },
    signal?: AbortSignal
  ) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize)
      queryParams.append('pageSize', params.pageSize.toString());
    if (params.search) queryParams.append('search', params.search);

    return request.get(`/user-packages?${queryParams.toString()}`, { signal });
  },
};

// 操作日志相关API
export const operationLogsAPI = {
  // 获取操作日志列表
  getOperationLogs: (
    params: {
      page?: number;
      pageSize?: number;
      search?: string;
    },
    signal?: AbortSignal
  ) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize)
      queryParams.append('pageSize', params.pageSize.toString());
    if (params.search) queryParams.append('search', params.search);

    return request.get(`/operation-logs?${queryParams.toString()}`, { signal });
  },
};

// 邀请奖励相关API
export const invitationRewardsAPI = {
  // 获取邀请奖励列表
  getInvitationRewards: (
    params: {
      page?: number;
      pageSize?: number;
      search?: string;
    },
    signal?: AbortSignal
  ) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize)
      queryParams.append('pageSize', params.pageSize.toString());
    if (params.search) queryParams.append('search', params.search);

    return request.get(`/invitation-rewards?${queryParams.toString()}`, {
      signal,
    });
  },
};

// 插件版本管理API
export const pluginVersionsAPI = {
  // 检查版本更新
  checkUpdate: (currentVersion?: string, signal?: AbortSignal) => {
    const queryParams = new URLSearchParams();
    queryParams.append('action', 'check');
    if (currentVersion) {
      queryParams.append('currentVersion', currentVersion);
    }
    return request.get(`/plugin-versions?${queryParams.toString()}`, {
      signal,
    });
  },

  // 获取版本列表
  getVersions: (
    params: {
      pageIndex?: number;
      pageSize?: number;
      status?: string;
    } = {},
    signal?: AbortSignal
  ) => {
    const queryParams = new URLSearchParams();
    if (params.pageIndex)
      queryParams.append('pageIndex', params.pageIndex.toString());
    if (params.pageSize)
      queryParams.append('pageSize', params.pageSize.toString());
    if (params.status) queryParams.append('status', params.status);

    return request.get(`/plugin-versions?${queryParams.toString()}`, {
      signal,
    });
  },

  // 创建新版本
  createVersion: (versionData: {
    version: string;
    releaseDate: string;
    downloadUrl: string;
    fileName: string;
    fileSize: number;
    description?: string;
    changelog?: string;
    isLatest?: boolean;
  }) => request.post('/plugin-versions', versionData),

  // 更新版本信息
  updateVersion: (id: number, updateData: any) =>
    request.put('/plugin-versions', { id, ...updateData }),

  // 更新版本信息（支持文件上传）
  updateVersionWithFile: (formData: FormData) =>
    request.put('/plugin-versions', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  // 删除版本
  deleteVersion: (id: number) => request.delete(`/plugin-versions?id=${id}`),

  // 上传插件文件
  uploadFile: (formData: FormData) =>
    request.post('/plugin-versions/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  // 记录下载统计
  recordDownload: (data: {
    versionId: number;
    userAgent?: string;
    ip?: string;
  }) => request.post('/plugin-versions/download', data),
};

export default apiClient;
