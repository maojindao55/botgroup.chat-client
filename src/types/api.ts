// 通用API响应接口
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  total?: number;
}

// 错误响应接口
export interface ApiError {
  success: false;
  message: string;
  error?: string;
  details?: any;
}

// 分页参数接口
export interface PaginationParams {
  page?: number;
  page_size?: number;
}

// 通用查询参数接口
export interface QueryParams extends PaginationParams {
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}
