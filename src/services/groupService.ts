import { ApiResponse } from '@/types/api';
import { request } from '@/utils/request';

// 群组基础信息接口
export interface Group {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  characters?: Character[];
}

// AI角色接口
export interface Character {
  id: number;
  name: string;
  personality: string;
  model: string;
  avatar?: string;
  custom_prompt?: string;
}

// 创建群组请求参数
export interface CreateGroupRequest {
  name: string;
  description?: string;
}

// 更新群组请求参数
export interface UpdateGroupRequest {
  name?: string;
  description?: string;
}

// 获取群组列表请求参数
export interface GetGroupsRequest {
  page?: number;
  page_size?: number;
  name?: string;
}

// 群组列表响应（根据实际API结构：data 字段直接是 Group[] 数组）
export type GetGroupsResponse = Group[];

// 通用请求处理函数，复用 request.ts 的逻辑
const handleRequest = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  try {
    const response = await request(url, options);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// 群组管理服务类
export class GroupService {
  /**
   * 创建群组
   */
  static async createGroup(request: CreateGroupRequest): Promise<ApiResponse<Group>> {
    return handleRequest<Group>('/api/groups', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * 获取群组列表
   */
  static async getGroups(request: GetGroupsRequest = {}): Promise<ApiResponse<GetGroupsResponse>> {
    const params = new URLSearchParams();
    
    if (request.page) params.append('page', request.page.toString());
    if (request.page_size) params.append('page_size', request.page_size.toString());
    if (request.name) params.append('name', request.name);

    const queryString = params.toString();
    const url = queryString ? `/api/groups?${queryString}` : '/api/groups';

    return handleRequest<GetGroupsResponse>(url, {
      method: 'GET'
    });
  }

  /**
   * 获取单个群组详情
   */
  static async getGroup(id: number): Promise<ApiResponse<Group>> {
    return handleRequest<Group>(`/api/groups/${id}`, {
      method: 'GET'
    });
  }

  /**
   * 更新群组信息
   */
  static async updateGroup(id: number, request: UpdateGroupRequest): Promise<ApiResponse<Group>> {
    return handleRequest<Group>(`/api/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request)
    });
  }

  /**
   * 删除群组
   */
  static async deleteGroup(id: number): Promise<ApiResponse<void>> {
    return handleRequest<void>(`/api/groups/${id}`, {
      method: 'DELETE'
    });
  }
}

// 导出默认服务实例
export default GroupService;
