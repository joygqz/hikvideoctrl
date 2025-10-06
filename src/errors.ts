/**
 * 海康 SDK 错误码类型定义
 */
export type HikSDKErrorCode
  = | 'sdk-not-found' // SDK 未找到
    | 'sdk-method-missing' // SDK 方法缺失
    | 'sdk-call-failed' // SDK 调用失败
    | 'sdk-initialization' // SDK 初始化失败
    | 'validation' // 参数验证失败
    | 'not-initialized' // 未初始化
    | 'device-not-found' // 设备未找到
    | 'window-state' // 窗口状态错误
    | 'operation-failed' // 操作失败

/**
 * 海康 SDK 自定义错误类
 * @example
 * ```typescript
 * throw new HikSDKError('device-not-found', '设备未连接', { deviceId: 'xxx' })
 * ```
 */
export class HikSDKError extends Error {
  /** 错误名称 */
  readonly name = 'HikSDKError'

  /** 错误码 */
  readonly code: HikSDKErrorCode

  /** 错误详情 */
  readonly details?: unknown

  /**
   * 构造函数
   * @param code 错误码
   * @param message 错误信息
   * @param details 错误详情
   */
  constructor(code: HikSDKErrorCode, message: string, details?: unknown) {
    super(message)
    this.code = code
    this.details = details
    // 修复原型链，确保 instanceof 正常工作
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * 断言函数，条件不满足时抛出错误
 * @param condition 条件表达式
 * @param error 要抛出的错误
 * @example
 * ```typescript
 * ensure(device, new HikSDKError('device-not-found', '设备未找到'))
 * ```
 */
export function ensure(condition: unknown, error: HikSDKError): asserts condition {
  if (!condition)
    throw error
}

/**
 * 创建操作失败错误
 * @param message 错误信息
 * @param details 错误详情
 * @returns 操作失败错误实例
 * @example
 * ```typescript
 * throw createOperationError('连接设备失败', { host: '192.168.1.1' })
 * ```
 */
export function createOperationError(message: string, details?: unknown): HikSDKError {
  return new HikSDKError('operation-failed', message, details)
}
