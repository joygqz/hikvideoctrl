import { HikSDKError } from '../errors'
import { toXMLString } from '../utils'

export type WebVideoSdk = typeof window.WebVideoCtrl

interface CallbackOptions<T> {
  success?: (data: T) => void
  error?: (status: number, xmlDoc?: Document, nativeError?: unknown) => void
  [key: string]: unknown
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

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

export class WebVideoBridge {
  readonly sdk: WebVideoSdk

  constructor(sdk: WebVideoSdk | undefined = window.WebVideoCtrl) {
    if (!sdk)
      throw new HikSDKError('sdk-not-found', '未检测到全局 WebVideoCtrl 实例')

    this.sdk = sdk
  }

  isNoPluginSupported(): boolean {
    return Boolean(this.sdk?.I_SupportNoPlugin?.())
  }

  call<T = unknown>(method: string, ...args: any[]): T {
    const fn = this.getMethod<T>(method)
    try {
      return fn.apply(this.sdk, args)
    }
    catch (error) {
      throw new HikSDKError('sdk-call-failed', `调用 ${method} 出错`, error)
    }
  }

  async exec<T = unknown>(method: string, ...args: any[]): Promise<T> {
    const fn = this.getMethod(method)

    return new Promise<T>((resolve, reject) => {
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

      const lastArg = args[args.length - 1]
      if (isPlainObject(lastArg) && ('success' in lastArg || 'error' in lastArg)) {
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
        const callback: CallbackOptions<T> = {
          success: (data: T) => resolveOnce(data),
          error: (status: number, xmlDoc?: Document, nativeError?: unknown) => rejectOnce(createBridgeError(method, status, xmlDoc, nativeError)),
        }
        args.push(callback)
      }

      try {
        const result = fn.apply(this.sdk, args)

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

  private getMethod<T = unknown>(method: string): (...params: any[]) => T {
    const fn = (this.sdk as any)?.[method]
    if (typeof fn !== 'function')
      throw new HikSDKError('sdk-method-missing', `WebVideoCtrl.${method} 不存在`)

    return fn
  }
}
