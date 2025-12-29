// Services API
export { HttpClient, type HttpRequestConfig, type ApiError } from './HttpClient';
export { apiService, type BaseEntity, type PaginatedResponse, type User, type Customer, type Product, type Sale, type Inventory } from './ApiService';
export { customerService, type CustomerFormData } from './CustomerService';
export { pumpService, type Pump, type CreatePump, type UpdatePump } from './PumpService';
export { employeeService, type Employee, type CreateEmployeeData, type UpdateEmployeeData } from './EmployeeService';
export {
  AppErrorCode,
  type AppError,
  transformApiError,
  handleError,
  getValidationErrorDetails
} from './ErrorHandler';