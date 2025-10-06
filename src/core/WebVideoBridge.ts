import { HikSDKError } from '../errors'
import { toXMLString } from '../utils'

/**
 * 海康 WebVideoCtrl SDK 类型定义
 */
export type WebVideoSdk = typeof window.WebVideoCtrl

/**
 * 回调选项接口
 */
interface CallbackOptions<T> {
  /** 成功回调 */
  success?: (data: T) => void
  /** 失败回调 */
  error?: (status: number, xmlDoc?: Document, nativeError?: unknown) => void
  /** 其他参数 */
  [key: string]: unknown
}

/**
 * 判断是否为普通对象
 * @param value 待检查的值
 * @returns 是否为普通对象
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * 创建桥接错误
 * @param method 方法名
 * @param status 状态码
 * @param xmlDoc XML 文档
 * @param nativeError 原生错误
 * @returns SDK 错误实例
 */
function createBridgeError(
  method: string,
  status?: number,
  xmlDoc?: Document,
  nativeError?: unknown,
): HikSDKError {
  const message = status && status < 0
    ? `调用 ${method} 失败，错误码 ${status}`
    : `调用 ${method} 失败`

  const details = {
    status,
    xml: xmlDoc ? toXMLString(xmlDoc) : undefined,
    nativeError,
  }

  return new HikSDKError('sdk-call-failed', message, details)
}

/**
 * @example
 * ```typescript
 * const bridge = new WebVideoBridge()
 * const result = await bridge.exec('I_Login', host, protocol, port, username, password)
 * ```
 */
export class WebVideoBridge {
  /**
   * SDK 实例
   */
  readonly sdk: WebVideoSdk

  /**
   * 构造函数
   * @param sdk SDK 实例（默认使用 window.WebVideoCtrl）
   * @throws {HikSDKError} 当 SDK 未找到时抛出错误
   */
  constructor(sdk: WebVideoSdk | undefined = window.WebVideoCtrl) {
    if (!sdk)
      throw new HikSDKError('sdk-not-found', '未检测到全局 WebVideoCtrl 实例')

    this.sdk = sdk
  }

  /**
   * 检查是否支持无插件模式
   * @returns 是否支持
   * @example
   * ```typescript
   * if (bridge.isNoPluginSupported()) {
   *   console.log('支持无插件模式')
   * }
   * ```
   */
  isNoPluginSupported(): boolean {
    return Boolean(this.sdk?.I_SupportNoPlugin?.())
  }

  /**
   * 同步调用 SDK 方法
   * @param method 方法名
   * @param args 方法参数
   * @returns 方法返回值
   * @throws {HikSDKError} 当调用失败时抛出错误
   * @example
   * ```typescript
   * const result = bridge.call('I_GetDevicePort', deviceId)
   * ```
   */
  call<T = unknown>(method: string, ...args: any[]): T {
    const fn = this.getMethod<T>(method)
    try {
      return fn.apply(this.sdk, args)
    }
    catch (error) {
      throw new HikSDKError('sdk-call-failed', `调用 ${method} 出错`, error)
    }
  }

  /**
   * 异步调用 SDK 方法（支持 Promise）
   * @param method 方法名
   * @param args 方法参数
   * @returns Promise 返回值
   * @throws {HikSDKError} 当调用失败时抛出错误
   * @example
   * ```typescript
   * await bridge.exec('I_Login', host, protocol, port, username, password, {
   *   success: (data) => console.log('登录成功'),
   *   error: (status, xmlDoc) => console.error('登录失败')
   * })
   * ```
   */
  async exec<T = unknown>(method: string, ...args: any[]): Promise<T> {
    const fn = this.getMethod(method)

    return new Promise<T>((resolve, reject) => {
      // 使用标志位防止 Promise 重复 resolve/reject
      let settled = false
      const resolveOnce = (payload: T) => {
        if (!settled) {
          settled = true
          resolve(payload)
        }
      }
      const rejectOnce = (error: unknown) => {
        if (!settled) {
          settled = true
          reject(error)
        }
      }

      // 检查最后一个参数是否包含回调函数
      const lastArg = args[args.length - 1]
      if (isPlainObject(lastArg) && ('success' in lastArg || 'error' in lastArg)) {
        // 如果已有回调，则包装它们
        const options = lastArg as CallbackOptions<T>
        args[args.length - 1] = {
          ...options,
          success: (data: T) => {
            options.success?.(data)
            resolveOnce(data)
          },
          error: (status: number, xmlDoc?: Document, nativeError?: unknown) => {
            options.error?.(status, xmlDoc, nativeError)
            rejectOnce(createBridgeError(method, status, xmlDoc, nativeError))
          },
        }
      }
      else {
        // 如果没有回调，则添加新的回调
        const callback: CallbackOptions<T> = {
          success: (data: T) => resolveOnce(data),
          error: (status: number, xmlDoc?: Document, nativeError?: unknown) => rejectOnce(createBridgeError(method, status, xmlDoc, nativeError)),
        }
        args.push(callback)
      }

      try {
        const result = fn.apply(this.sdk, args)

        // 某些方法会直接返回数值结果
        if (!settled && typeof result === 'number') {
          if (result === -1)
            rejectOnce(createBridgeError(method, result))
          else
            resolveOnce(result as T)
        }
        else if (!settled && result !== undefined) {
          resolveOnce(result as T)
        }
      }
      catch (error) {
        rejectOnce(createBridgeError(method, undefined, undefined, error))
      }
    })
  }

  /**
   * 获取 SDK 方法
   *
   * @param method 方法名
   * @returns SDK 方法函数
   * @throws {HikSDKError} 当方法不存在时抛出错误
   */
  private getMethod<T = unknown>(method: string): (...params: any[]) => T {
    const fn = (this.sdk as any)?.[method]
    if (typeof fn !== 'function')
      throw new HikSDKError('sdk-method-missing', `WebVideoCtrl.${method} 不存在`)

    return fn
  }
}
