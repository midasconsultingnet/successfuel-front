// Services API
export { HttpClient, type HttpRequestConfig, type ApiError } from './HttpClient';
export { apiService, type BaseEntity, type PaginatedResponse, type User, type Customer, type Product, type Sale, type Inventory } from './ApiService';
export { customerService, type CustomerFormData } from './CustomerService';
export { 
  AppErrorCode, 
  type AppError, 
  transformApiError, 
  handleError, 
  getValidationErrorDetails 
} from './ErrorHandler';