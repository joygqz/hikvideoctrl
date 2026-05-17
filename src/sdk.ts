import { HikError } from './errors'

/**
 * 海康 `window.WebVideoCtrl` 的最小可用类型。
 *
 * 仅声明本封装实际调用的方法；其余接口仍可通过索引签名访问。
 * 命名沿用 SDK 原始 `I_*` / `I2_*` 风格以对照官方文档。
 */
export interface WebVideoCtrlSDK {
  /** 浏览器是否支持无插件模式（Chromium 内核 ≥ 91）。 */
  I_SupportNoPlugin: () => boolean

  /** 初始化插件；无插件模式下 `bNoPlugin / bWndFull / iPlayMode` 由封装层固化。 */
  I_InitPlugin: (
    width: number | string,
    height: number | string,
    options: SdkInitOptions,
  ) => void

  /** 将插件挂载到指定 DOM 容器；`0` 成功，`-1` 失败。 */
  I_InsertOBJECTPlugin: (containerId: string) => number

  /** 释放底层 Worker / WebSocket 资源。 */
  I_DestroyWorker?: () => void

  /** 调整插件渲染尺寸（像素）。 */
  I_Resize?: (width: number, height: number) => void

  /** 切换分屏布局。 */
  I_ChangeWndNum: (layout: number) => Promise<void>

  /** 查询窗口状态；未播放或越界返回 null。 */
  I_GetWindowStatus: (windowIndex?: number) => SdkWindowInfo | null

  /** 获取全部窗口集合。 */
  I_GetWndSet: () => SdkWindowInfo[]

  // ─── 设备 ───
  I_Login: (
    host: string,
    protocol: 1 | 2,
    port: number,
    username: string,
    password: string,
    options: SdkAjaxOptions,
  ) => number
  I_Logout: (deviceIdentify: string) => number
  I_GetDeviceInfo: (deviceIdentify: string, options: SdkAjaxOptions) => void
  I_GetDevicePort: (deviceIdentify: string) => SdkDevicePort | null
  I_GetAnalogChannelInfo: (deviceIdentify: string, options: SdkAjaxOptions) => void
  I_GetDigitalChannelInfo: (deviceIdentify: string, options: SdkAjaxOptions) => void
  I_GetZeroChannelInfo: (deviceIdentify: string, options: SdkAjaxOptions) => void
  I_GetAudioInfo: (deviceIdentify: string, options: SdkAjaxOptions) => void
  I_RecordSearch: (
    deviceIdentify: string,
    channelId: number,
    startTime: string,
    endTime: string,
    options: SdkAjaxOptions & { iStreamType?: number, iSearchPos?: number },
  ) => void

  // ─── 播放 / 控制 ───
  I_StartRealPlay: (deviceIdentify: string, options: SdkAjaxOptions & Record<string, unknown>) => void
  I_StartPlayback: (deviceIdentify: string, options: SdkAjaxOptions & Record<string, unknown>) => void
  I_Stop: (options: SdkAjaxOptions & { iWndIndex?: number }) => void
  I_StopAll: () => Promise<void>
  I_Pause: (options: SdkAjaxOptions & { iWndIndex?: number }) => void
  I_Resume: (options: SdkAjaxOptions & { iWndIndex?: number }) => void
  I_PlayFast: (options: SdkAjaxOptions & { iWndIndex?: number }) => void
  I_PlaySlow: (options: SdkAjaxOptions & { iWndIndex?: number }) => void
  I_GetOSDTime: (options: SdkAjaxOptions & { iWndIndex?: number }) => void
  I_OpenSound: (windowIndex?: number) => Promise<void>
  I_CloseSound: (windowIndex?: number) => Promise<void>
  I_SetVolume: (volume: number, windowIndex?: number) => Promise<void>
  I_SetSecretKey: (secretKey: string, windowIndex?: number) => Promise<void> | number
  I_FullScreen: (enable: boolean) => Promise<void>
  I_EnableEZoom: (windowIndex?: number) => Promise<unknown>
  I_DisableEZoom: (windowIndex?: number) => Promise<unknown>
  I_Enable3DZoom: (windowIndex?: number, callback?: (info: unknown) => void) => Promise<unknown>
  I_Disable3DZoom: (windowIndex?: number) => Promise<unknown>

  // ─── 抓拍 / 录像 ───
  I2_CapturePic: (
    fileName: string,
    options: { iWndIndex?: number, cbCallback?: (data: Uint8Array) => void },
  ) => PromiseLike<unknown> | number
  I_StartRecord: (
    fileName: string,
    options: SdkAjaxOptions & { iWndIndex?: number, bDateDir?: boolean },
  ) => void
  I_StopRecord: (options: SdkAjaxOptions & { iWndIndex?: number }) => void
  I_StartDownloadRecord: (
    deviceIdentify: string,
    playbackUri: string,
    fileName: string,
    options: { bDateDir?: boolean },
  ) => Promise<unknown>
  I_StartDownloadRecordByTime: (
    deviceIdentify: string,
    playbackUri: string,
    fileName: string,
    startTime: string,
    endTime: string,
    options: { bDateDir?: boolean },
  ) => Promise<unknown>

  // ─── PTZ ───
  I_PTZControl: (
    action: number,
    stop: boolean,
    options: SdkAjaxOptions & { iWndIndex?: number, iPTZSpeed?: number },
  ) => void
  I_SetPreset: (presetId: number, options: SdkAjaxOptions & { iWndIndex?: number }) => void
  I_GoPreset: (presetId: number, options: SdkAjaxOptions & { iWndIndex?: number }) => void

  // ─── 维护 ───
  I_ExportDeviceConfig: (deviceIdentify: string, password: string) => Promise<unknown>
  I_ImportDeviceConfig: (
    deviceIdentify: string,
    fileName: string,
    password?: string,
    file?: File,
  ) => Promise<unknown>
  I_RestoreDefault: (
    deviceIdentify: string,
    mode: 'basic' | 'full',
    options: SdkAjaxOptions,
  ) => void
  I_Restart: (deviceIdentify: string, options: SdkAjaxOptions) => void
  I_Reconnect: (deviceIdentify: string, options: SdkAjaxOptions) => void
  I2_StartUpgrade: (deviceIdentify: string, fileName: string, file?: File) => Promise<unknown>
  I_UpgradeProgress: (deviceIdentify: string) => Promise<{ percent: number, upgrading: boolean }>

  // ─── 透传 ───
  I_SendHTTPRequest: (
    deviceIdentify: string,
    uri: string,
    options: SdkAjaxOptions & SdkHttpOptions,
  ) => void
  I_GetTextOverlay: (
    uri: string,
    deviceIdentify: string,
    options: SdkAjaxOptions,
  ) => void
  I2_OpenFileDlg: (type: 0 | 1) => Promise<{ szFileName: string, file: File | null }>

  /** 未列出的 `I_*` 方法仍可通过索引签名调用。 */
  [method: string]: unknown
}

/** `I_InitPlugin` 透传参数。 */
export interface SdkInitOptions {
  iWndowType?: number
  bWndFull?: boolean
  bNoPlugin?: boolean
  iPlayMode?: number
  szColorProperty?: string
  bDebugMode?: boolean
  cbSelWnd?: (xmlDoc: Document) => void
  cbDoubleClickWnd?: (windowIndex: number, fullScreen: boolean) => void
  cbEvent?: (eventType: number, windowIndex: number, param2: number) => void
  cbInitPluginComplete?: () => void
  cbPluginErrorHandler?: (windowIndex: number, errorCode: number, error: unknown) => void
  cbPerformanceLack?: () => void
  cbSecretKeyError?: (windowIndex: number) => void
  [key: string]: unknown
}

/** SDK 风格的 success / error 回调容器，所有 options 形式的 API 共享此形态。 */
export interface SdkAjaxOptions {
  async?: boolean
  /** data 可能是 Document、string、jqXHR-like 或 SDK 自定义对象。 */
  success?: (data: unknown) => void
  /** 首个参数为 HTTP 状态码，第二个为设备 XML（若可获取）。 */
  error?: (status?: number, xmlDoc?: Document | null, nativeError?: unknown) => void
  [key: string]: unknown
}

/** `I_SendHTTPRequest` 扩展字段。 */
export interface SdkHttpOptions {
  type?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: string
  /** `true` 携带已登录设备认证；字符串则直接透传。 */
  auth?: boolean | string
}

/** `I_GetWindowStatus` / `I_GetWndSet` 返回的窗口信息。 */
export interface SdkWindowInfo {
  iIndex: number
  szIP: string
  szDeviceIdentify?: string
  iChannelID: number
  iPlayStatus: number
  [key: string]: unknown
}

/** `I_GetDevicePort` 返回的端口信息。 */
export interface SdkDevicePort {
  iDevicePort: number
  iRtspPort: number
  iHttpPort?: number
  iWebSocketPort?: number
  iWebSocketsPort?: number
  [key: string]: unknown
}

// ─────────────────────────── 调用桥接 ───────────────────────────

/** 同步调用：直接转发 SDK 方法返回值（用于 `I_GetWindowStatus` 等立即返回的 API）。 */
export function callSync<T>(sdk: WebVideoCtrlSDK, method: string, ...args: unknown[]): T {
  const fn = resolveMethod(sdk, method)
  try {
    return fn.apply(sdk, args) as T
  }
  catch (error) {
    throw new HikError('SDK_CALL_FAILED', `调用 ${method} 失败`, { method }, error)
  }
}

/**
 * Promise 风格调用：SDK 方法本身返回 Promise / thenable。
 * 同步异常与 Promise reject 均收敛为 `HikError`；非 thenable 直接 resolve。
 */
export function callPromise<T>(sdk: WebVideoCtrlSDK, method: string, ...args: unknown[]): Promise<T> {
  const fn = resolveMethod(sdk, method)
  let raw: unknown
  try {
    raw = fn.apply(sdk, args)
  }
  catch (error) {
    return Promise.reject(new HikError('SDK_CALL_FAILED', `调用 ${method} 失败`, { method }, error))
  }
  if (!isThenable(raw))
    return Promise.resolve(raw as T)
  return Promise.resolve(raw).then(
    value => value as T,
    (cause) => {
      throw new HikError('SDK_CALL_FAILED', `调用 ${method} 失败`, { method }, cause)
    },
  )
}

/**
 * 回调式调用：SDK 方法通过 `options.success / options.error` 通知结果。
 *
 * - callback 挂载到 `args` 中最后一个 plain object 上，缺失时自动追加。
 * - 用户预先填的 `success / error` 仍会被调用，但其异常不会污染 Promise 状态。
 * - SDK 同步返回 `-1` 视为立即失败，避免 Promise 永久 pending。
 */
export function callWithCallback<T>(
  sdk: WebVideoCtrlSDK,
  method: string,
  ...args: unknown[]
): Promise<T> {
  const fn = resolveMethod(sdk, method)

  return new Promise<T>((resolve, reject) => {
    let settled = false
    const finishOk = (data: T) => {
      if (settled)
        return
      settled = true
      resolve(data)
    }
    const finishErr = (err: HikError) => {
      if (settled)
        return
      settled = true
      reject(err)
    }

    let bag: Record<string, unknown> | null = null
    for (let i = args.length - 1; i >= 0; i -= 1) {
      if (isPlainObject(args[i])) {
        bag = args[i] as Record<string, unknown>
        break
      }
    }
    if (!bag) {
      bag = {}
      args.push(bag)
    }

    const userSuccess = bag.success as ((data: unknown) => void) | undefined
    const userError = bag.error as
      | ((status?: number, xml?: Document | null, native?: unknown) => void)
      | undefined

    bag.success = (data: unknown) => {
      try {
        userSuccess?.(data)
      }
      catch (err) {
        console.error(`[hikvideoctrl] ${method} success 用户回调异常`, err)
      }
      finishOk(data as T)
    }

    bag.error = (status?: number, xmlDoc?: Document | null, native?: unknown) => {
      try {
        userError?.(status, xmlDoc, native)
      }
      catch (err) {
        console.error(`[hikvideoctrl] ${method} error 用户回调异常`, err)
      }
      finishErr(buildCallbackError(method, status, xmlDoc, native))
    }

    try {
      const ret = fn.apply(sdk, args)
      if (!settled && typeof ret === 'number' && ret === -1) {
        finishErr(new HikError('SDK_CALL_FAILED', `${method} 同步返回 -1`, {
          method,
          returnValue: ret,
        }))
      }
    }
    catch (error) {
      finishErr(new HikError('SDK_CALL_FAILED', `调用 ${method} 失败`, { method }, error))
    }
  })
}

// ─────────────────────────── 加载器 ───────────────────────────

export interface LoadWebVideoCtrlOptions {
  /** 等待 `window.WebVideoCtrl` 出现的超时时间（毫秒），默认 15000。 */
  timeout?: number
  /**
   * 同源脚本处理策略。
   * - `'reuse'`（默认）：相同 src 已加载则等待其完成
   * - `'fresh'`：每次插入新 script 节点
   */
  strategy?: 'reuse' | 'fresh'
}

/**
 * 异步加载 `webVideoCtrl.js`，返回 SDK 实例。
 *
 * 已存在 `window.WebVideoCtrl` 时直接复用；否则注入 `<script>` 并等待就绪。
 *
 * 注：SDK 依赖同目录下的 `playctrl/`、`encryption/` 等子资源（相对路径请求），
 * 调用者需保证 `scriptUrl` 同级可访问。
 */
export function loadWebVideoCtrl(
  scriptUrl: string,
  options: LoadWebVideoCtrlOptions = {},
): Promise<WebVideoCtrlSDK> {
  if (typeof window === 'undefined') {
    return Promise.reject(
      new HikError('SCRIPT_LOAD_FAILED', 'loadWebVideoCtrl 仅可在浏览器环境中调用'),
    )
  }

  const existing = (window as { WebVideoCtrl?: WebVideoCtrlSDK }).WebVideoCtrl
  if (existing)
    return Promise.resolve(existing)

  const timeout = options.timeout ?? 15_000
  const strategy = options.strategy ?? 'reuse'

  return new Promise<WebVideoCtrlSDK>((resolve, reject) => {
    const cleanupTimer = window.setTimeout(() => {
      reject(new HikError('SCRIPT_LOAD_FAILED', `加载 ${scriptUrl} 超时（${timeout}ms）`))
    }, timeout)

    const onReady = () => {
      window.clearTimeout(cleanupTimer)
      const sdk = (window as { WebVideoCtrl?: WebVideoCtrlSDK }).WebVideoCtrl
      if (sdk)
        resolve(sdk)
      else
        reject(new HikError('SCRIPT_LOAD_FAILED', `${scriptUrl} 已加载，但未检测到 window.WebVideoCtrl`))
    }

    const onFail = (cause: unknown) => {
      window.clearTimeout(cleanupTimer)
      reject(new HikError('SCRIPT_LOAD_FAILED', `加载 ${scriptUrl} 失败`, { url: scriptUrl }, cause))
    }

    if (strategy === 'reuse') {
      const reused = document.querySelector<HTMLScriptElement>(`script[src="${scriptUrl}"]`)
      if (reused) {
        reused.addEventListener('load', onReady, { once: true })
        reused.addEventListener('error', onFail, { once: true })
        return
      }
    }

    const script = document.createElement('script')
    script.src = scriptUrl
    script.async = true
    script.addEventListener('load', onReady, { once: true })
    script.addEventListener('error', onFail, { once: true })
    document.head.appendChild(script)
  })
}

// ─────────────────────────── 私有工具 ───────────────────────────

function resolveMethod(sdk: WebVideoCtrlSDK, method: string): (...args: unknown[]) => unknown {
  const fn = (sdk as Record<string, unknown>)[method]
  if (typeof fn !== 'function') {
    throw new HikError('SDK_METHOD_MISSING', `WebVideoCtrl.${method} 不存在或不是函数`, {
      method,
    })
  }
  return fn as (...args: unknown[]) => unknown
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === 'object'
    && value !== null
    && typeof (value as { then?: unknown }).then === 'function'
  )
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function buildCallbackError(
  method: string,
  status?: number,
  xmlDoc?: Document | null,
  native?: unknown,
): HikError {
  const message
    = typeof status === 'number'
      ? `${method} 调用失败（HTTP ${status}）`
      : `${method} 调用失败`
  return new HikError(
    'SDK_CALL_FAILED',
    message,
    {
      method,
      status,
      ...(xmlDoc ? { responseXml: serializeXml(xmlDoc) } : null),
    },
    native,
  )
}

function serializeXml(doc: Document): string {
  if (typeof XMLSerializer === 'undefined')
    return ''
  try {
    return new XMLSerializer().serializeToString(doc)
  }
  catch {
    return ''
  }
}
