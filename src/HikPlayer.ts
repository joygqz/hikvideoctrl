import type { RestoreMode } from './constants'
import type {
  SdkAjaxOptions,
  SdkDevicePort,
  SdkInitOptions,
  SdkWindowInfo,
  WebVideoCtrlSDK,
} from './sdk'
import type {
  CaptureOptions,
  ChannelInfo,
  DeviceCaptureOptions,
  DeviceCredentials,
  DeviceInfo,
  DevicePort,
  DeviceSession,
  DownloadByTimeOptions,
  DownloadOptions,
  HikPlayerEventMap,
  HikPlayerOptions,
  HttpRequestOptions,
  ImportDeviceConfigOptions,
  OpenFileDialogResult,
  PlaybackOptions,
  PluginInitOptions,
  PreviewOptions,
  PtzControlOptions,
  WindowStatus as PublicWindowStatus,
  RecordingOptions,
  RecordMatch,
  RecordSearchOptions,
  RecordSearchResult,
  StartUpgradeOptions,
} from './types'
import { PTZ_SPEED_RANGE, RECORD_SEARCH_PAGE_SIZE } from './constants'
import { TypedEmitter } from './emitter'
import { HikError } from './errors'
import { callPromise, callSync, callWithCallback } from './sdk'
import {
  ensureXmlDocument,
  formatDate,
  isValidHost,
  isValidTimeRange,
  makeDeviceIdentify,
  normalizePort,
  normalizeSize,
  resolveContainer,
  toProtocolValue,
  uniqueFileName,
  xmlText,
} from './utils'

/**
 * 海康无插件 WebVideoCtrl 的现代化 TypeScript 客户端。
 *
 * 一个实例对应"一个插件 + 一组登录设备 + 一组播放窗口"。
 * SDK 的同步 / Promise / 回调三种调用形态统一抽象为 `async/await`。
 * 通过 `on/off/once` 订阅强类型事件（同步派发）。
 *
 * 推荐使用 {@link createHikPlayer} 创建实例，便于注入测试 SDK 替身。
 */
export class HikPlayer {
  readonly #sdk: WebVideoCtrlSDK
  readonly #emitter = new TypedEmitter<HikPlayerEventMap>()
  readonly #devices = new Map<string, DeviceSession>()
  #initialized = false
  #initializing = false
  #containerId: string | null = null
  #containerElement: HTMLElement | null = null
  #activeWindow = 0

  constructor(options: HikPlayerOptions = {}) {
    const sdk = options.sdk ?? (globalThis as { window?: { WebVideoCtrl?: WebVideoCtrlSDK } }).window?.WebVideoCtrl
    if (!sdk) {
      throw new HikError(
        'SDK_NOT_FOUND',
        '未检测到 window.WebVideoCtrl。请先加载 webVideoCtrl.js，或通过 options.sdk 注入。',
      )
    }
    this.#sdk = sdk
  }

  // ─────────────────────────── 元信息 ───────────────────────────

  /** 是否已完成初始化。 */
  get isInitialized(): boolean {
    return this.#initialized
  }

  /** 当前选中窗口索引；未初始化时为 0。 */
  get activeWindowIndex(): number {
    return this.#activeWindow
  }

  /** 已挂载的容器 id；未初始化时为 null。 */
  get containerId(): string | null {
    return this.#containerId
  }

  /** 底层 SDK 实例，供高级扩展使用。 */
  get sdk(): WebVideoCtrlSDK {
    return this.#sdk
  }

  /** 浏览器是否支持无插件模式（Chromium 内核 ≥ 91）。 */
  supportsNoPlugin(): boolean {
    return Boolean(this.#sdk.I_SupportNoPlugin?.())
  }

  /** 检查官方播放组件版本；无插件模式固定返回 `0`。 */
  checkPluginVersion(): number {
    return callSync<number>(this.#sdk, 'I_CheckPluginVersion')
  }

  // ─────────────────────────── 生命周期 ───────────────────────────

  /**
   * 初始化播放器。
   *
   * 流程：环境校验 → `I_InitPlugin` → `cbInitPluginComplete` 内调用
   * `I_InsertOBJECTPlugin` 挂载到容器。
   */
  async init(options: PluginInitOptions): Promise<void> {
    if (this.#initialized || this.#initializing)
      throw new HikError('ALREADY_INITIALIZED', '播放器已初始化，请勿重复调用 init()')
    if (!this.supportsNoPlugin())
      throw new HikError('SDK_NOT_FOUND', '当前浏览器不支持 WebVideoCtrl 无插件模式（需 Chromium ≥ 91）')

    const { id: containerId, element } = resolveContainer(options.container)
    const width = normalizeSize(options.width, element, 'width', 800)
    const height = normalizeSize(options.height, element, 'height', 600)
    const layout = options.layout ?? 1
    ensureLayout(layout)
    const timeout = options.timeout ?? 15_000
    if (!Number.isFinite(timeout) || timeout <= 0)
      throw new HikError('INVALID_ARGUMENT', '初始化超时时间必须为正数', { timeout })

    this.#initializing = true

    await new Promise<void>((resolve, reject) => {
      const settle = { done: false }
      let timer: ReturnType<typeof setTimeout> | undefined
      const fail = (err: HikError) => {
        if (settle.done)
          return
        settle.done = true
        if (timer !== undefined)
          clearTimeout(timer)
        this.#initializing = false
        reject(err)
      }
      timer = setTimeout(() => {
        fail(new HikError(
          'INITIALIZATION_TIMEOUT',
          `底层播放组件初始化超时（${timeout}ms）`,
          { method: 'I_InitPlugin', timeout },
        ))
      }, timeout)

      const initOptions: SdkInitOptions = {
        iWndowType: layout,
        // 无插件模式：bNoPlugin 必须 true，bWndFull / iPlayMode 文档明示不可改
        bNoPlugin: true,
        bWndFull: true,
        iPlayMode: 2,
        bDebugMode: options.debugMode ?? false,
        szColorProperty: options.colorProperty,
        cbSelWnd: (xmlDoc: Document) => {
          const index = Number.parseInt(xmlText(xmlDoc, 'SelectWnd', '0'), 10) || 0
          this.#activeWindow = index
          this.#emitter.emit('window:selected', { windowIndex: index })
          options.onWindowSelect?.(index)
        },
        cbDoubleClickWnd: (index, fullScreen) => {
          this.#emitter.emit('window:dblclick', { windowIndex: index, fullScreen })
          options.onWindowDoubleClick?.(index, fullScreen)
        },
        cbEvent: (eventType, windowIndex, param2) => {
          this.#emitter.emit('plugin:event', { eventType, windowIndex, param2 })
          options.onEvent?.(eventType, windowIndex, param2)
        },
        cbPluginErrorHandler: (windowIndex, errorCode, error) => {
          this.#emitter.emit('plugin:error', { windowIndex, errorCode, error })
          options.onError?.(windowIndex, errorCode, error)
        },
        cbPerformanceLack: () => {
          this.#emitter.emit('plugin:performance-lack', undefined)
          options.onPerformanceLack?.()
        },
        cbSecretKeyError: (windowIndex) => {
          this.#emitter.emit('plugin:secret-key-error', { windowIndex })
          options.onSecretKeyError?.(windowIndex)
        },
        cbInitPluginComplete: () => {
          if (settle.done)
            return
          try {
            const result = this.#sdk.I_InsertOBJECTPlugin(containerId)
            if (result !== 0) {
              fail(new HikError('SDK_CALL_FAILED', `I_InsertOBJECTPlugin 返回 ${result}`, {
                method: 'I_InsertOBJECTPlugin',
                returnValue: result,
              }))
              return
            }
            this.#initialized = true
            this.#initializing = false
            this.#containerId = containerId
            this.#containerElement = element
            this.#emitter.emit('plugin:initialized', undefined)
            settle.done = true
            if (timer !== undefined)
              clearTimeout(timer)
            resolve()
          }
          catch (err) {
            fail(new HikError('SDK_CALL_FAILED', '插入插件 DOM 失败', { method: 'I_InsertOBJECTPlugin' }, err))
          }
        },
      }

      try {
        this.#sdk.I_InitPlugin(width, height, initOptions)
      }
      catch (err) {
        fail(new HikError('SDK_CALL_FAILED', '插件初始化失败', { method: 'I_InitPlugin' }, err))
      }
    })
  }

  /**
   * 停止全部播放、释放 Worker、清空事件订阅。
   * 重复调用安全；销毁后实例不再可用。适合 SPA 路由切换 / 组件卸载时调用。
   */
  async destroy(): Promise<void> {
    if (!this.#initialized)
      return
    // 未播放任何窗口时 I_StopAll 可能 reject，吞掉以保证销毁流程不中断
    try {
      await callPromise<void>(this.#sdk, 'I_StopAll')
    }
    catch (err) {
      console.warn('[hikvideoctrl] destroy 期间 I_StopAll 失败，已忽略', err)
    }
    try {
      this.#sdk.I_DestroyWorker?.()
    }
    catch (err) {
      console.warn('[hikvideoctrl] I_DestroyWorker 失败，已忽略', err)
    }
    this.#initialized = false
    this.#containerId = null
    this.#containerElement = null
    this.#activeWindow = 0
    this.#devices.clear()
    this.#emitter.emit('plugin:destroyed', undefined)
    this.#emitter.clear()
  }

  /** 调整插件渲染尺寸；不传按容器实际尺寸自适应。 */
  resize(width?: number | string, height?: number | string): void {
    this.#ensureInitialized()
    const w = normalizeSize(width, this.#containerElement, 'width', 0)
    const h = normalizeSize(height, this.#containerElement, 'height', 0)
    this.#sdk.I_Resize?.(w, h)
  }

  // ─────────────────────────── 事件 ───────────────────────────

  /** 订阅事件，返回取消订阅函数。 */
  on<K extends keyof HikPlayerEventMap>(
    event: K,
    handler: (payload: HikPlayerEventMap[K]) => void,
  ): () => void {
    return this.#emitter.on(event, handler)
  }

  /** 仅触发一次，触发后自动解除订阅。 */
  once<K extends keyof HikPlayerEventMap>(
    event: K,
    handler: (payload: HikPlayerEventMap[K]) => void,
  ): () => void {
    return this.#emitter.once(event, handler)
  }

  /** 取消订阅；不传 handler 则清空该事件全部监听。 */
  off<K extends keyof HikPlayerEventMap>(
    event: K,
    handler?: (payload: HikPlayerEventMap[K]) => void,
  ): void {
    this.#emitter.off(event, handler)
  }

  // ─────────────────────────── 窗口 ───────────────────────────

  /** 切换分屏布局（1=1x1 / 2=2x2 / 3=3x3 / 4=4x4）。 */
  async changeLayout(layout: number): Promise<void> {
    this.#ensureInitialized()
    ensureLayout(layout)
    await callPromise<void>(this.#sdk, 'I_ChangeWndNum', layout)
  }

  /**
   * 进入全屏播放。
   * 官方无插件接口只能进入全屏；传 `false` 时由封装层调用浏览器 Fullscreen API 退出。
   */
  async fullScreen(enable: boolean = true): Promise<void> {
    this.#ensureInitialized()
    if (!enable) {
      if (typeof document !== 'undefined' && document.fullscreenElement)
        await document.exitFullscreen()
      return
    }
    await callPromise<void>(this.#sdk, 'I_FullScreen', enable)
  }

  /** 获取窗口状态；未播放或越界返回 null。 */
  getWindowStatus(windowIndex: number = this.#activeWindow): PublicWindowStatus | null {
    this.#ensureInitialized()
    const raw = callSync<SdkWindowInfo | null>(this.#sdk, 'I_GetWindowStatus', this.#windowIndex(windowIndex))
    return raw ? toPublicWindow(raw) : null
  }

  /** 全部正在播放的窗口。 */
  getAllWindows(): PublicWindowStatus[] {
    this.#ensureInitialized()
    const list = callSync<SdkWindowInfo[]>(this.#sdk, 'I_GetWndSet') ?? []
    return list.filter(Boolean).map(toPublicWindow)
  }

  // ─────────────────────────── 设备登录 ───────────────────────────

  /**
   * 登录设备。
   *
   * 返回的 `DeviceSession.id` 即 SDK 内部的 `<host>_<port>` 标识，
   * 后续接口的 `deviceId` 参数均应使用此值。
   */
  async login(credentials: DeviceCredentials): Promise<DeviceSession> {
    this.#ensureInitialized()

    const host = credentials.host?.trim() ?? ''
    if (!host)
      throw new HikError('INVALID_ARGUMENT', '设备地址不能为空')
    if (!isValidHost(host))
      throw new HikError('INVALID_ARGUMENT', `无效的设备地址：${host}`)
    if (!credentials.username)
      throw new HikError('INVALID_ARGUMENT', '用户名不能为空')
    if (credentials.password === undefined || credentials.password === null)
      throw new HikError('INVALID_ARGUMENT', '密码不能为空')

    const protocol = credentials.protocol ?? 'http'
    if (protocol !== 'http' && protocol !== 'https')
      throw new HikError('INVALID_ARGUMENT', `不支持的设备协议：${String(protocol)}`)
    const port = normalizePort(credentials.port ?? (protocol === 'https' ? 443 : 80))

    const ajax: SdkAjaxOptions = {}
    if (credentials.login?.async !== undefined)
      ajax.async = credentials.login.async
    if (credentials.login?.cgi !== undefined)
      (ajax as Record<string, unknown>).cgi = credentials.login.cgi

    await callWithCallback<unknown>(
      this.#sdk,
      'I_Login',
      host,
      toProtocolValue(protocol),
      port,
      credentials.username,
      credentials.password,
      ajax,
    )

    const session: DeviceSession = {
      id: makeDeviceIdentify(host, port),
      host,
      port,
      protocol,
      username: credentials.username,
    }
    this.#devices.set(session.id, session)
    this.#emitter.emit('device:connected', session)
    return session
  }

  /** 登出设备，自动停止相关播放窗口并清空 SecretKey。 */
  async logout(deviceId: string): Promise<void> {
    this.#ensureInitialized()
    this.#ensureDevice(deviceId)
    await this.#stopDeviceStreams(deviceId)

    const result = callSync<number>(this.#sdk, 'I_Logout', deviceId)
    if (result !== 0) {
      throw new HikError('SDK_CALL_FAILED', `登出 ${deviceId} 失败`, {
        method: 'I_Logout',
        returnValue: result,
      })
    }
    this.#devices.delete(deviceId)
    this.#emitter.emit('device:disconnected', { deviceId })
  }

  /** 已登录设备列表。 */
  listDevices(): DeviceSession[] {
    return [...this.#devices.values()]
  }

  /** 查询设备会话；未登录时返回 undefined。 */
  getDevice(deviceId: string): DeviceSession | undefined {
    return this.#devices.get(deviceId)
  }

  // ─────────────────────────── 设备信息 / 通道 ───────────────────────────

  /** 设备基本信息（型号、序列号、版本等）。 */
  async getDeviceInfo(deviceId: string): Promise<DeviceInfo | null> {
    this.#ensureInitialized()
    this.#ensureDevice(deviceId)
    const raw = await callWithCallback<unknown>(this.#sdk, 'I_GetDeviceInfo', deviceId, {})
    const doc = ensureXmlDocument(raw)
    if (!doc)
      return null
    return {
      deviceName: xmlText(doc, 'deviceName'),
      deviceId: xmlText(doc, 'deviceID'),
      deviceType: xmlText(doc, 'deviceType'),
      model: xmlText(doc, 'model'),
      serialNumber: xmlText(doc, 'serialNumber'),
      macAddress: xmlText(doc, 'macAddress'),
      firmwareVersion: xmlText(doc, 'firmwareVersion'),
      firmwareReleasedDate: xmlText(doc, 'firmwareReleasedDate'),
      encoderVersion: xmlText(doc, 'encoderVersion'),
      encoderReleasedDate: xmlText(doc, 'encoderReleasedDate'),
      raw: doc,
    }
  }

  /** 获取设备安全能力版本 XML。 */
  async getSecurityVersion(deviceId: string): Promise<Document | null> {
    return this.#fetchXml('I_GetSecurityVersion', deviceId)
  }

  /** 同步读取设备 HTTP / RTSP 端口。 */
  getDevicePort(deviceId: string): DevicePort {
    this.#ensureInitialized()
    this.#ensureDevice(deviceId)
    const raw = callSync<SdkDevicePort | null>(this.#sdk, 'I_GetDevicePort', deviceId)
    if (!raw) {
      throw new HikError('SDK_CALL_FAILED', `获取 ${deviceId} 端口失败`, {
        method: 'I_GetDevicePort',
      })
    }
    return {
      iDevicePort: raw.iDevicePort,
      iRtspPort: raw.iRtspPort,
      iHttpPort: raw.iHttpPort,
      iWebSocketPort: raw.iWebSocketPort,
      iWebSocketsPort: raw.iWebSocketsPort,
    }
  }

  /** 模拟通道（DVR 同轴摄像头）。 */
  async getAnalogChannels(deviceId: string): Promise<ChannelInfo[]> {
    const doc = await this.#fetchXml('I_GetAnalogChannelInfo', deviceId)
    if (!doc)
      return []
    return Array.from(doc.querySelectorAll('VideoInputChannel')).map((node, idx) => ({
      id: xmlText(node, 'id', String(idx + 1)),
      name: xmlText(node, 'name', `Camera ${String(idx + 1).padStart(2, '0')}`),
      kind: 'analog',
      online: true,
      enabled: xmlText(node, 'videoInputEnabled', 'true') !== 'false',
      videoFormat: xmlText(node, 'videoFormat') || undefined,
    }))
  }

  /** 数字通道（NVR 接入的网络摄像头）。 */
  async getDigitalChannels(deviceId: string): Promise<ChannelInfo[]> {
    const doc = await this.#fetchXml('I_GetDigitalChannelInfo', deviceId)
    if (!doc)
      return []
    return Array.from(doc.querySelectorAll('InputProxyChannelStatus')).map((node, idx) => {
      const online = xmlText(node, 'online', 'false') === 'true'
      return {
        id: xmlText(node, 'id', String(idx + 1)),
        name: xmlText(node, 'name', `IPCamera ${String(idx + 1).padStart(2, '0')}`),
        kind: 'digital' as const,
        online,
        enabled: true,
      }
    })
  }

  /** 零通道（整机预览，NVR/混合 DVR 特有）。 */
  async getZeroChannels(deviceId: string): Promise<ChannelInfo[]> {
    const doc = await this.#fetchXml('I_GetZeroChannelInfo', deviceId)
    if (!doc)
      return []
    return Array.from(doc.querySelectorAll('ZeroVideoChannel'))
      .filter(node => xmlText(node, 'enabled', 'false') === 'true')
      .map((node, idx) => ({
        id: xmlText(node, 'id', String(idx + 1)),
        name: xmlText(node, 'name', `Zero Channel ${String(idx + 1).padStart(2, '0')}`),
        kind: 'zero' as const,
        online: true,
        enabled: true,
      }))
  }

  /**
   * 一次性获取设备的全部通道（合并模拟 / 数字 / 零）。
   * 任一接口失败仅丢弃该类通道，便于在能力不全的设备上降级。
   */
  async getChannels(deviceId: string): Promise<ChannelInfo[]> {
    const [analog, digital, zero] = await Promise.all([
      this.getAnalogChannels(deviceId).catch(() => [] as ChannelInfo[]),
      this.getDigitalChannels(deviceId).catch(() => [] as ChannelInfo[]),
      this.getZeroChannels(deviceId).catch(() => [] as ChannelInfo[]),
    ])
    return [...analog, ...digital, ...zero]
  }

  /** 语音对讲通道列表（保留原始 XML，业务层按需解析）。 */
  async getAudioChannels(deviceId: string): Promise<Document | null> {
    return this.#fetchXml('I_GetAudioInfo', deviceId)
  }

  // ─────────────────────────── 实时预览 ───────────────────────────

  /** 开始实时预览。 */
  async startPreview(deviceId: string, options: PreviewOptions): Promise<void> {
    this.#ensureInitialized()
    this.#ensureDevice(deviceId)

    const channel = ensurePositiveInteger(options.channel, '通道号')
    const streamType = ensureIntegerInRange(options.streamType ?? 1, 1, 3, '码流类型')
    const windowIndex = this.#windowIndex(options.windowIndex)
    await this.#stopWindowIfPlaying(windowIndex)
    const sdkOptions: Record<string, unknown> = {
      iWndIndex: windowIndex,
      iChannelID: channel,
      iStreamType: streamType,
      bZeroChannel: options.zeroChannel ?? false,
    }
    if (options.rtspPort !== undefined) {
      const rtspPort = normalizePort(options.rtspPort)
      sdkOptions.iRtspPort = rtspPort
    }
    if (options.webSocketPort !== undefined)
      sdkOptions.iWSPort = normalizePort(options.webSocketPort)
    if (options.useProxy !== undefined)
      sdkOptions.bProxy = options.useProxy

    await callWithCallback<unknown>(this.#sdk, 'I_StartRealPlay', deviceId, sdkOptions)
    this.#emitter.emit('preview:started', {
      deviceId,
      channel,
      windowIndex,
      zeroChannel: options.zeroChannel ?? false,
    })
  }

  /** 停止指定窗口的预览 / 回放，缺省为当前选中窗口。 */
  async stop(windowIndex?: number): Promise<void> {
    this.#ensureInitialized()
    const target = this.#windowIndex(windowIndex)
    const status = this.getWindowStatus(target)
    if (!status)
      throw new HikError('WINDOW_NOT_PLAYING', `窗口 ${target} 未在播放`)
    await callWithCallback<unknown>(this.#sdk, 'I_Stop', { iWndIndex: target })

    const event = status.playStatus === 2 ? 'playback:stopped' : 'preview:stopped'
    this.#emitter.emit(event, { deviceId: status.deviceId, windowIndex: target })
  }

  /** 停止全部窗口（含预览与回放）。 */
  async stopAll(): Promise<void> {
    this.#ensureInitialized()
    await callPromise<void>(this.#sdk, 'I_StopAll')
    this.#emitter.emit('preview:stopped-all', undefined)
  }

  // ─────────────────────────── 录像回放 ───────────────────────────

  /** 按时间段开始回放；时间格式必须为 `yyyy-MM-dd HH:mm:ss`。 */
  async startPlayback(deviceId: string, options: PlaybackOptions): Promise<void> {
    this.#ensureInitialized()
    this.#ensureDevice(deviceId)
    if (!isValidTimeRange(options.startTime, options.endTime))
      throw new HikError('INVALID_ARGUMENT', `回放时间区间无效：${options.startTime} ~ ${options.endTime}`)

    const channel = ensurePositiveInteger(options.channel, '通道号')
    const streamType = ensureIntegerInRange(options.streamType ?? 1, 1, 2, '回放码流类型')
    const windowIndex = this.#windowIndex(options.windowIndex)
    await this.#stopWindowIfPlaying(windowIndex)
    const sdkOptions: Record<string, unknown> = {
      iWndIndex: windowIndex,
      iChannelID: channel,
      iStreamType: streamType,
      szStartTime: options.startTime,
      szEndTime: options.endTime,
    }
    if (options.rtspPort !== undefined) {
      const rtspPort = normalizePort(options.rtspPort)
      sdkOptions.iRtspPort = rtspPort
    }
    if (options.webSocketPort !== undefined)
      sdkOptions.iWSPort = normalizePort(options.webSocketPort)
    if (options.useProxy !== undefined)
      sdkOptions.bProxy = options.useProxy
    await callWithCallback<unknown>(this.#sdk, 'I_StartPlayback', deviceId, sdkOptions)
    this.#emitter.emit('playback:started', {
      deviceId,
      channel,
      windowIndex,
      startTime: options.startTime,
      endTime: options.endTime,
    })
  }

  /** 暂停回放。 */
  async pause(windowIndex?: number): Promise<void> {
    this.#ensureInitialized()
    const target = this.#playingWindowIndex(windowIndex)
    await callWithCallback<unknown>(this.#sdk, 'I_Pause', {
      iWndIndex: target,
    })
  }

  /** 从暂停 / 单帧恢复正常回放。 */
  async resume(windowIndex?: number): Promise<void> {
    this.#ensureInitialized()
    const target = this.#playingWindowIndex(windowIndex)
    await callWithCallback<unknown>(this.#sdk, 'I_Resume', {
      iWndIndex: target,
    })
  }

  /** 加速回放（每次提升一档）。 */
  async playFast(windowIndex?: number): Promise<void> {
    this.#ensureInitialized()
    const target = this.#playingWindowIndex(windowIndex)
    await callWithCallback<unknown>(this.#sdk, 'I_PlayFast', {
      iWndIndex: target,
    })
  }

  /** 减速回放（每次降低一档）。 */
  async playSlow(windowIndex?: number): Promise<void> {
    this.#ensureInitialized()
    const target = this.#playingWindowIndex(windowIndex)
    await callWithCallback<unknown>(this.#sdk, 'I_PlaySlow', {
      iWndIndex: target,
    })
  }

  /** 当前窗口的 OSD 时间，格式 `yyyy-MM-dd HH:mm:ss`。 */
  async getOsdTime(windowIndex?: number): Promise<string> {
    this.#ensureInitialized()
    const target = this.#playingWindowIndex(windowIndex)
    const raw = await callWithCallback<unknown>(this.#sdk, 'I_GetOSDTime', {
      iWndIndex: target,
    })
    if (typeof raw === 'string')
      return raw
    if (raw instanceof Date)
      return formatDate(raw)
    return String(raw ?? '')
  }

  // ─────────────────────────── 音频 / 缩放 / 加密 ───────────────────────────

  /** 打开声音。 */
  async openSound(windowIndex?: number): Promise<void> {
    this.#ensureInitialized()
    await callPromise<void>(this.#sdk, 'I_OpenSound', this.#playingWindowIndex(windowIndex))
  }

  /** 关闭声音。 */
  async closeSound(windowIndex?: number): Promise<void> {
    this.#ensureInitialized()
    await callPromise<void>(this.#sdk, 'I_CloseSound', this.#playingWindowIndex(windowIndex))
  }

  /** 设置音量（0-100）。 */
  async setVolume(volume: number, windowIndex?: number): Promise<void> {
    this.#ensureInitialized()
    if (!Number.isInteger(volume) || volume < 0 || volume > 100)
      throw new HikError('INVALID_ARGUMENT', '音量必须是 0 - 100 的整数', { volume })
    await callPromise<void>(this.#sdk, 'I_SetVolume', volume, this.#playingWindowIndex(windowIndex))
  }

  /** 启用电子放大。 */
  async enableEZoom(windowIndex?: number): Promise<void> {
    this.#ensureInitialized()
    await callPromise<unknown>(this.#sdk, 'I_EnableEZoom', this.#playingWindowIndex(windowIndex))
  }

  /** 禁用电子放大。 */
  async disableEZoom(windowIndex?: number): Promise<void> {
    this.#ensureInitialized()
    await callPromise<unknown>(this.#sdk, 'I_DisableEZoom', this.#playingWindowIndex(windowIndex))
  }

  /**
   * 启用 3D 放大。
   * 启用后按住左键从左上拖到右下放大，反之缩小。
   */
  async enable3DZoom(windowIndex?: number, onZoomInfo?: (info: unknown) => void): Promise<void> {
    this.#ensureInitialized()
    await callPromise<unknown>(
      this.#sdk,
      'I_Enable3DZoom',
      this.#playingWindowIndex(windowIndex),
      onZoomInfo,
    )
  }

  /** 禁用 3D 放大。 */
  async disable3DZoom(windowIndex?: number): Promise<void> {
    this.#ensureInitialized()
    const result = await callPromise<unknown>(this.#sdk, 'I_Disable3DZoom', this.#playingWindowIndex(windowIndex))
    if (result === -1) {
      throw new HikError('SDK_CALL_FAILED', '关闭 3D 放大失败', {
        method: 'I_Disable3DZoom',
        returnValue: result,
      })
    }
  }

  /** 设置该窗口的码流加密密钥。 */
  async setSecretKey(secretKey: string, windowIndex?: number): Promise<void> {
    this.#ensureInitialized()
    // V3.4 返回 Promise，旧版本可能返回 number；callPromise 对非 thenable 直接 resolve
    await callPromise<unknown>(
      this.#sdk,
      'I_SetSecretKey',
      secretKey,
      this.#windowIndex(windowIndex),
    )
  }

  // ─────────────────────────── 抓拍 / 本地录像 ───────────────────────────

  /**
   * 抓拍当前画面。
   *
   * - 不传 `onData`：保存到浏览器下载文件夹（`.bmp` 抓 BMP，否则 JPEG）。
   * - 传 `onData`：仅回调原始 Uint8Array，不下载文件。
   *
   * @returns SDK 实际使用的文件名
   */
  async capture(options: CaptureOptions = {}): Promise<string> {
    this.#ensureInitialized()
    const windowIndex = this.#playingWindowIndex(options.windowIndex)
    const fileName = options.fileName ?? uniqueFileName('capture', 'jpg')
    ensureNonEmpty(fileName, '抓拍文件名')
    const onData = options.onData
    let onDataTask: Promise<void> | undefined

    const result = await callPromise<unknown>(this.#sdk, 'I2_CapturePic', fileName, {
      iWndIndex: windowIndex,
      cbCallback: onData
        ? (data: Uint8Array) => {
            try {
              onDataTask = Promise.resolve(onData(data)).then(() => undefined)
            }
            catch (err) {
              onDataTask = Promise.reject(err)
            }
          }
        : undefined,
    })
    if (result === -1) {
      throw new HikError('SDK_CALL_FAILED', '抓拍失败', {
        method: 'I2_CapturePic',
        returnValue: result,
      })
    }
    await onDataTask
    this.#emitter.emit('capture:completed', {
      fileName,
      windowIndex,
      asFile: !options.onData,
    })
    return fileName
  }

  /** 直接从设备通道抓取 JPEG，无需先在播放窗口中预览。 */
  async captureDevice(deviceId: string, options: DeviceCaptureOptions): Promise<string> {
    this.#ensureInitialized()
    this.#ensureDevice(deviceId)
    const channel = ensurePositiveInteger(options.channel, '通道号')
    const requestedFileName = options.fileName ?? uniqueFileName('device-capture', 'jpg')
    ensureNonEmpty(requestedFileName, '抓拍文件名')
    const baseFileName = requestedFileName.replace(/\.jpe?g$/i, '')
    ensureNonEmpty(baseFileName, '抓拍文件名')
    const fileName = `${baseFileName}.jpg`

    const hasWidth = options.width !== undefined
    const hasHeight = options.height !== undefined
    if (hasWidth !== hasHeight)
      throw new HikError('INVALID_ARGUMENT', '设备抓图宽度和高度必须同时传入')

    const sdkOptions: Record<string, unknown> = {
      bDateDir: options.byDateDirectory ?? true,
    }
    if (hasWidth && hasHeight) {
      sdkOptions.iResolutionWidth = ensurePositiveInteger(options.width, '图片宽度')
      sdkOptions.iResolutionHeight = ensurePositiveInteger(options.height, '图片高度')
    }

    const result = callSync<number>(
      this.#sdk,
      'I_DeviceCapturePic',
      deviceId,
      channel,
      baseFileName,
      sdkOptions,
    )
    if (result !== 0) {
      throw new HikError('SDK_CALL_FAILED', '设备抓图失败', {
        method: 'I_DeviceCapturePic',
        returnValue: result,
      })
    }
    this.#emitter.emit('device-capture:completed', { deviceId, channel, fileName })
    return fileName
  }

  /** 开始本地录像，保存到浏览器下载文件夹。 */
  async startRecording(options: RecordingOptions = {}): Promise<string> {
    this.#ensureInitialized()
    const windowIndex = this.#playingWindowIndex(options.windowIndex)
    const fileName = options.fileName ?? uniqueFileName('record', 'mp4')
    ensureNonEmpty(fileName, '录像文件名')
    await callWithCallback<unknown>(this.#sdk, 'I_StartRecord', fileName, {
      iWndIndex: windowIndex,
      bDateDir: options.byDateDirectory ?? true,
    })
    this.#emitter.emit('recording:started', { fileName, windowIndex })
    return fileName
  }

  /** 停止本地录像。 */
  async stopRecording(windowIndex?: number): Promise<void> {
    this.#ensureInitialized()
    const target = this.#playingWindowIndex(windowIndex)
    await callWithCallback<unknown>(this.#sdk, 'I_StopRecord', { iWndIndex: target })
    this.#emitter.emit('recording:stopped', { windowIndex: target })
  }

  // ─────────────────────────── 录像搜索 / 下载 ───────────────────────────

  /**
   * 搜索指定通道、时间段内的录像。
   * SDK 单次最多返回 40 条，`searchPos` 或 `page` 控制翻页；`status` 为 `MORE` 表示仍有后续数据。
   */
  async searchRecords(deviceId: string, options: RecordSearchOptions): Promise<RecordSearchResult> {
    this.#ensureInitialized()
    this.#ensureDevice(deviceId)
    if (!isValidTimeRange(options.startTime, options.endTime))
      throw new HikError('INVALID_ARGUMENT', `搜索时间区间无效：${options.startTime} ~ ${options.endTime}`)

    const channel = ensurePositiveInteger(options.channel, '通道号')
    const streamType = ensureIntegerInRange(options.streamType ?? 1, 1, 2, '录像码流类型')
    if (options.page !== undefined && (!Number.isInteger(options.page) || options.page < 1))
      throw new HikError('INVALID_ARGUMENT', '页码必须是大于等于 1 的整数', { page: options.page })
    if (
      options.searchPos !== undefined
      && (!Number.isInteger(options.searchPos)
        || options.searchPos < 0
        || options.searchPos % RECORD_SEARCH_PAGE_SIZE !== 0)
    ) {
      throw new HikError(
        'INVALID_ARGUMENT',
        `搜索起点必须是大于等于 0 且为 ${RECORD_SEARCH_PAGE_SIZE} 的倍数`,
        { searchPos: options.searchPos },
      )
    }

    const searchPos
      = options.searchPos !== undefined
        ? options.searchPos
        : Math.max(0, (options.page ?? 1) - 1) * RECORD_SEARCH_PAGE_SIZE

    const raw = await callWithCallback<unknown>(
      this.#sdk,
      'I_RecordSearch',
      deviceId,
      channel,
      options.startTime,
      options.endTime,
      {
        iStreamType: streamType,
        iSearchPos: searchPos,
      },
    )
    const doc = ensureXmlDocument(raw)
    if (!doc) {
      return {
        matches: [],
        status: 'NO MATCHES',
        count: 0,
        raw: new DOMParser().parseFromString('<CMSearchResult/>', 'text/xml'),
      }
    }
    const status = xmlText(doc, 'responseStatusStrg', 'NO MATCHES') as RecordSearchResult['status']
    const matches: RecordMatch[] = Array.from(doc.querySelectorAll('searchMatchItem'))
      .map((node): RecordMatch | null => {
        const playbackUri = xmlText(node, 'playbackURI')
        if (!playbackUri || !playbackUri.includes('name='))
          return null
        return {
          trackId: xmlText(node, 'trackID'),
          startTime: normalizeIsoLikeTime(xmlText(node, 'startTime')),
          endTime: normalizeIsoLikeTime(xmlText(node, 'endTime')),
          fileName: extractFileNameFromUri(playbackUri),
          playbackUri,
          kind: (xmlText(node, 'metadataDescriptor') || 'timing') as RecordMatch['kind'],
        }
      })
      .filter((item): item is RecordMatch => item !== null)
    const count = Number.parseInt(xmlText(doc, 'numOfMatches', String(matches.length)), 10)
    return { matches, status, count: Number.isFinite(count) ? count : matches.length, raw: doc }
  }

  /**
   * 按 `playbackURI` 下载录像。
   * V3.4.0 无插件模式通常直接触发浏览器下载并 resolve `undefined`。
   */
  async downloadRecord(
    deviceId: string,
    playbackUri: string,
    fileName: string,
    options: DownloadOptions = {},
  ): Promise<unknown> {
    this.#ensureInitialized()
    this.#ensureDevice(deviceId)
    ensureNonEmpty(playbackUri, '录像地址')
    ensureNonEmpty(fileName, '下载文件名')
    return callPromise<unknown>(
      this.#sdk,
      'I_StartDownloadRecord',
      deviceId,
      playbackUri,
      fileName,
      { bDateDir: options.byDateDirectory ?? true },
    )
  }

  /** 按时间段下载录像（需设备支持）。 */
  async downloadRecordByTime(
    deviceId: string,
    playbackUri: string,
    options: DownloadByTimeOptions,
  ): Promise<unknown> {
    this.#ensureInitialized()
    this.#ensureDevice(deviceId)
    ensureNonEmpty(playbackUri, '录像地址')
    ensureNonEmpty(options.fileName, '下载文件名')
    if (!isValidTimeRange(options.startTime, options.endTime))
      throw new HikError('INVALID_ARGUMENT', `下载时间区间无效：${options.startTime} ~ ${options.endTime}`)
    return callPromise<unknown>(
      this.#sdk,
      'I_StartDownloadRecordByTime',
      deviceId,
      playbackUri,
      options.fileName,
      options.startTime,
      options.endTime,
      { bDateDir: options.byDateDirectory ?? true },
    )
  }

  // ─────────────────────────── PTZ ───────────────────────────

  /** 开始 PTZ 动作；松开按键时务必调用 `ptzStop()`，否则球机持续运动。 */
  async ptzStart(options: PtzControlOptions): Promise<void> {
    this.#ensureInitialized()
    ensureIntegerInRange(options.action, 1, 15, 'PTZ 操作类型')
    await this.#ptzCommand(options, false)
  }

  /** 停止 PTZ 动作。 */
  async ptzStop(action: PtzControlOptions['action'], windowIndex?: number): Promise<void> {
    this.#ensureInitialized()
    ensureIntegerInRange(action, 1, 15, 'PTZ 操作类型')
    await this.#ptzCommand({ action, windowIndex }, true)
  }

  /** 保存预置位（先用 PTZ 调整画面，再调用此方法绑定到 ID）。 */
  async setPreset(presetId: number, windowIndex?: number): Promise<void> {
    this.#ensureInitialized()
    ensurePositiveInteger(presetId, '预置点 ID')
    const target = this.#playingWindowIndex(windowIndex)
    await callWithCallback<unknown>(this.#sdk, 'I_SetPreset', presetId, {
      iWndIndex: target,
    })
  }

  /** 调用预置位。 */
  async goPreset(presetId: number, windowIndex?: number): Promise<void> {
    this.#ensureInitialized()
    ensurePositiveInteger(presetId, '预置点 ID')
    const target = this.#playingWindowIndex(windowIndex)
    await callWithCallback<unknown>(this.#sdk, 'I_GoPreset', presetId, {
      iWndIndex: target,
    })
  }

  // ─────────────────────────── 设备维护 ───────────────────────────

  /** 导出设备配置文件（SDK 弹出系统保存框）。 */
  async exportDeviceConfig(deviceId: string, password: string): Promise<unknown> {
    this.#ensureInitialized()
    this.#ensureDevice(deviceId)
    ensureNonEmpty(password, '导出密码')
    return callPromise<unknown>(this.#sdk, 'I_ExportDeviceConfig', deviceId, password)
  }

  /**
   * 导入设备配置文件。
   *
   * `fileName` 与 `file` 通常来自 `openFileDialog(FILE_DIALOG.File)`。
   * V3.4.0 实际上传浏览器 File 句柄，仅传文件名通常无法完成导入。
   */
  async importDeviceConfig(
    deviceId: string,
    fileName: string,
    options: ImportDeviceConfigOptions,
  ): Promise<unknown> {
    this.#ensureInitialized()
    this.#ensureDevice(deviceId)
    ensureNonEmpty(fileName, '配置文件名')
    if (!options?.file)
      throw new HikError('INVALID_ARGUMENT', '无插件模式导入配置必须提供 File 句柄')
    return callPromise<unknown>(
      this.#sdk,
      'I_ImportDeviceConfig',
      deviceId,
      fileName,
      options.password,
      options.file,
    )
  }

  /** 恢复出厂参数（`basic` 保留网络与用户，`full` 全量重置）。 */
  async restoreDefault(deviceId: string, mode: RestoreMode): Promise<void> {
    this.#ensureInitialized()
    this.#ensureDevice(deviceId)
    await callWithCallback<unknown>(this.#sdk, 'I_RestoreDefault', deviceId, mode, {})
  }

  /** 重启设备；成功仅表示设备已收到指令。 */
  async restart(deviceId: string): Promise<void> {
    this.#ensureInitialized()
    this.#ensureDevice(deviceId)
    await callWithCallback<unknown>(this.#sdk, 'I_Restart', deviceId, {})
  }

  /** 断线重连（不会重新登录）。 */
  async reconnect(deviceId: string): Promise<void> {
    this.#ensureInitialized()
    this.#ensureDevice(deviceId)
    await callWithCallback<unknown>(this.#sdk, 'I_Reconnect', deviceId, {})
  }

  /** 开始固件异步升级；升级完成后设备需要重启。`file` 通常来自 `openFileDialog(FILE_DIALOG.File)`。 */
  async startUpgrade(
    deviceId: string,
    fileName: string,
    options: StartUpgradeOptions,
  ): Promise<unknown> {
    this.#ensureInitialized()
    this.#ensureDevice(deviceId)
    ensureNonEmpty(fileName, '升级文件名')
    if (!options?.file)
      throw new HikError('INVALID_ARGUMENT', '无插件模式升级必须提供 File 句柄')
    return callPromise<unknown>(this.#sdk, 'I2_StartUpgrade', deviceId, fileName, options.file)
  }

  /** 查询升级进度；不传 `deviceId` 时仅在单设备场景自动推断。 */
  async getUpgradeProgress(deviceId?: string): Promise<{ percent: number, upgrading: boolean }> {
    this.#ensureInitialized()
    const targetDeviceId = this.#resolveDeviceId(deviceId)
    return callPromise<{ percent: number, upgrading: boolean }>(this.#sdk, 'I_UpgradeProgress', targetDeviceId)
  }

  // ─────────────────────────── 透传 HTTP / 杂项 ───────────────────────────

  /** 透传 ISAPI 请求到设备；登录后已持有认证信息，`auth` 通常无需显式传入。 */
  async sendHttpRequest(
    deviceId: string,
    uri: string,
    options: HttpRequestOptions = {},
  ): Promise<Document | null> {
    this.#ensureInitialized()
    this.#ensureDevice(deviceId)
    ensureNonEmpty(uri, '请求 URI')
    const sdkOptions: SdkAjaxOptions & Record<string, unknown> = {
      type: options.method,
      data: options.body,
      async: options.async,
    }
    if (options.auth !== true && options.auth !== undefined)
      sdkOptions.auth = options.auth
    const raw = await callWithCallback<unknown>(this.#sdk, 'I_SendHTTPRequest', deviceId, uri, sdkOptions)
    return ensureXmlDocument(raw)
  }

  /** 通道字符叠加配置（OSD 文字）。 */
  async getTextOverlay(deviceId: string, uri: string): Promise<Document | null> {
    this.#ensureInitialized()
    this.#ensureDevice(deviceId)
    ensureNonEmpty(uri, '叠加信息 URI')
    const raw = await callWithCallback<unknown>(this.#sdk, 'I_GetTextOverlay', uri, deviceId, {})
    return ensureXmlDocument(raw)
  }

  /** 打开系统文件 / 文件夹对话框；`szFileName === '-1'` 表示用户取消。 */
  async openFileDialog(type: 0 | 1): Promise<OpenFileDialogResult> {
    this.#ensureInitialized()
    ensureIntegerInRange(type, 0, 1, '文件对话框类型')
    return callPromise<OpenFileDialogResult>(this.#sdk, 'I2_OpenFileDlg', type)
  }

  // ─────────────────────────── 内部辅助 ───────────────────────────

  #ensureInitialized(): void {
    if (!this.#initialized)
      throw new HikError('NOT_INITIALIZED', '请先调用 init() 完成插件初始化')
  }

  #ensureDevice(deviceId: string): void {
    if (!this.#devices.has(deviceId))
      throw new HikError('DEVICE_NOT_FOUND', `设备未登录或已登出：${deviceId}`)
  }

  #windowIndex(windowIndex: number | undefined): number {
    const target = windowIndex ?? this.#activeWindow
    if (!Number.isInteger(target) || target < 0 || target > 15) {
      throw new HikError('INVALID_ARGUMENT', '窗口索引必须是 0 - 15 的整数', {
        windowIndex: target,
      })
    }
    return target
  }

  #playingWindowIndex(windowIndex: number | undefined): number {
    const target = this.#windowIndex(windowIndex)
    if (!this.getWindowStatus(target))
      throw new HikError('WINDOW_NOT_PLAYING', `窗口 ${target} 未在播放`)
    return target
  }

  async #stopWindowIfPlaying(windowIndex: number): Promise<void> {
    if (this.getWindowStatus(windowIndex))
      await this.stop(windowIndex)
  }

  #resolveDeviceId(deviceId: string | undefined): string {
    if (deviceId) {
      this.#ensureDevice(deviceId)
      return deviceId
    }
    if (this.#devices.size === 1)
      return this.#devices.keys().next().value as string
    throw new HikError('INVALID_ARGUMENT', '请指定 deviceId')
  }

  /** 获取并解析 SDK XML 响应。 */
  async #fetchXml(method: string, deviceId: string): Promise<Document | null> {
    this.#ensureInitialized()
    this.#ensureDevice(deviceId)
    const raw = await callWithCallback<unknown>(this.#sdk, method, deviceId, {})
    return ensureXmlDocument(raw)
  }

  async #ptzCommand(options: PtzControlOptions, stop: boolean): Promise<void> {
    const speed = clampPtzSpeed(options.speed)
    const windowIndex = this.#playingWindowIndex(options.windowIndex)
    await callWithCallback<unknown>(this.#sdk, 'I_PTZControl', options.action, stop, {
      iWndIndex: windowIndex,
      iPTZSpeed: speed,
    })
  }

  /** 登出前关闭设备相关的全部窗口流，并清空 SecretKey。 */
  async #stopDeviceStreams(deviceId: string): Promise<void> {
    const windows = (callSync<SdkWindowInfo[]>(this.#sdk, 'I_GetWndSet') ?? []).filter((wnd): wnd is SdkWindowInfo => {
      if (!wnd)
        return false
      if (wnd.szDeviceIdentify === deviceId)
        return true
      // 兼容老版本 SDK：szDeviceIdentify 缺失时按 IP 前缀匹配
      return Boolean(wnd.szIP && deviceId.startsWith(`${wnd.szIP}_`))
    })

    await Promise.all(windows.map(async (wnd) => {
      try {
        await callWithCallback<unknown>(this.#sdk, 'I_Stop', { iWndIndex: wnd.iIndex })
      }
      catch (err) {
        console.warn(`[hikvideoctrl] 停止窗口 ${wnd.iIndex} 失败`, err)
      }
      try {
        await callPromise<unknown>(this.#sdk, 'I_SetSecretKey', '', wnd.iIndex)
      }
      catch {
        // 未启用加密的设备调用清除会返回失败，忽略
      }
    }))
  }
}

// ─────────────────────────── 工厂 / 工具 ───────────────────────────

/** 创建 `HikPlayer` 实例的工厂函数，便于注入 SDK 替身。 */
export function createHikPlayer(options: HikPlayerOptions = {}): HikPlayer {
  return new HikPlayer(options)
}

/** 不创建实例的情况下检测浏览器是否支持无插件模式。 */
export function isNoPluginSupported(): boolean {
  if (typeof window === 'undefined')
    return false
  return Boolean(window.WebVideoCtrl?.I_SupportNoPlugin?.())
}

// ─────────────────────────── 私有工具 ───────────────────────────

function clampPtzSpeed(speed: number | undefined): number {
  if (speed === undefined || !Number.isFinite(speed))
    return PTZ_SPEED_RANGE.default
  const value = Math.trunc(speed)
  if (value < PTZ_SPEED_RANGE.min || value > PTZ_SPEED_RANGE.max) {
    throw new HikError(
      'INVALID_ARGUMENT',
      `PTZ 速度取值范围应在 ${PTZ_SPEED_RANGE.min} - ${PTZ_SPEED_RANGE.max} 之间`,
      { speed },
    )
  }
  return value
}

function ensureLayout(layout: number): void {
  ensureIntegerInRange(layout, 1, 4, '分屏布局')
}

function ensureIntegerInRange(
  value: unknown,
  min: number,
  max: number,
  label: string,
): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new HikError('INVALID_ARGUMENT', `${label}必须是 ${min} - ${max} 的整数`, {
      received: value,
    })
  }
  return value as number
}

function ensurePositiveInteger(value: unknown, label: string): number {
  if (!Number.isInteger(value) || (value as number) < 1) {
    throw new HikError('INVALID_ARGUMENT', `${label}必须是正整数`, { received: value })
  }
  return value as number
}

function ensureNonEmpty(value: string, label: string): void {
  if (!value.trim())
    throw new HikError('INVALID_ARGUMENT', `${label}不能为空`)
}

function toPublicWindow(raw: SdkWindowInfo): PublicWindowStatus {
  return {
    index: raw.iIndex,
    deviceId: typeof raw.szDeviceIdentify === 'string' ? raw.szDeviceIdentify : (raw.szIP ?? ''),
    channelId: raw.iChannelID,
    playStatus: raw.iPlayStatus,
    raw,
  }
}

/** `2013-12-23T03:06:58Z` → `2013-12-23 03:06:58`。 */
function normalizeIsoLikeTime(value: string): string {
  return value.replace('T', ' ').replace('Z', '')
}

/** 抽取 `playbackURI` 中 `name=` 与 `&size=` 之间的录像文件名。 */
function extractFileNameFromUri(uri: string): string {
  const nameIdx = uri.indexOf('name=')
  if (nameIdx < 0)
    return ''
  const sizeIdx = uri.indexOf('&size=', nameIdx)
  return sizeIdx > 0 ? uri.slice(nameIdx + 5, sizeIdx) : uri.slice(nameIdx + 5)
}
