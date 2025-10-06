import type { HikVideoEventMap, PluginInitOptions } from '../types'
import type { EventBus } from './EventBus'
import type { WebVideoBridge } from './WebVideoBridge'
import { HikSDKError } from '../errors'

/**
 * 解析容器 ID
 *
 * @param container 容器元素或 ID
 * @returns 容器元素 ID（若传入 DOM 元素且缺少 ID，会自动生成）
 * @throws {HikSDKError} 当容器无效时抛出错误
 */
function resolveContainerId(container: string | HTMLElement): string {
  if (typeof container === 'string')
    return container

  if (typeof HTMLElement === 'undefined' || !(container instanceof HTMLElement))
    throw new HikSDKError('validation', '插件容器必须是有效的 DOM 元素或元素 ID')

  // 如果元素没有 ID，自动生成一个
  if (!container.id)
    container.id = `hik-video-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`

  return container.id
}

/**
 * 转换为 CSS 尺寸字符串
 *
 * @param value 尺寸值（数字或字符串）
 * @returns CSS 尺寸字符串
 */
function toCssSize(value?: string | number): string {
  if (value === undefined)
    return '100%'
  return typeof value === 'number' ? `${value}px` : value
}

/**
 * 从 XML 文档中解析窗口索引
 *
 * @param xmlDoc XML 文档
 * @returns 窗口索引
 */
function parseWindowIndex(xmlDoc: Document | null | undefined): number {
  const text = xmlDoc?.querySelector('SelectWnd')?.textContent ?? '0'
  return Number.parseInt(text, 10) || 0
}

/**
 * 插件宿主类，管理海康视频插件的生命周期
 *
 * 负责插件的初始化、窗口管理等核心功能
 *
 * @example
 * ```typescript
 * const host = new PluginHost(bridge, eventBus)
 * await host.init({
 *   container: 'video-container',
 *   width: 1000,
 *   height: 600,
 *   layout: 4
 * })
 * ```
 */
export class PluginHost {
  /**
   * 初始化状态标志
   */
  private initialized = false

  /**
   * 容器元素 ID
   */
  private containerId: string | null = null

  /**
   * 当前活动窗口索引
   */
  private currentWindowIndex = 0

  /**
   * SDK 桥接实例
   */
  private readonly bridge: WebVideoBridge

  /**
   * 事件总线实例
   */
  private readonly events: EventBus<HikVideoEventMap>

  /**
   * 构造函数
   *
   * @param bridge SDK 桥接实例
   * @param events 事件总线实例
   */
  constructor(bridge: WebVideoBridge, events: EventBus<HikVideoEventMap>) {
    this.bridge = bridge
    this.events = events
  }

  /**
   * 获取插件初始化状态
   */
  get isInitialized(): boolean {
    return this.initialized
  }

  /**
   * 获取当前活动窗口索引
   */
  get activeWindow(): number {
    return this.currentWindowIndex
  }

  /**
   * 获取容器 ID
   */
  get container(): string | null {
    return this.containerId
  }

  /**
   * 初始化插件
   * @param options 初始化选项
   * @throws {HikSDKError} 当插件已初始化或初始化失败时抛出错误
   * @example
   * ```typescript
   * await host.init({
   *   container: 'video-container',
   *   width: 1000,
   *   height: 600,
   *   layout: 4,
   *   onWindowSelect: (index) => console.log('选中窗口', index)
   * })
   * ```
   */
  async init(options: PluginInitOptions): Promise<void> {
    if (this.initialized)
      throw new HikSDKError('sdk-initialization', '插件已经完成初始化')

    const containerId = resolveContainerId(options.container)
    const width = toCssSize(options.width)
    const height = toCssSize(options.height)
    const windowType = options.layout ?? 1

    await new Promise<void>((resolve, reject) => {
      try {
        this.bridge.sdk.I_InitPlugin(width, height, {
          bWndFull: options.enableDoubleClickFullScreen ?? true,
          iPackageType: options.packageType ?? 2,
          iWndowType: windowType,
          bNoPlugin: options.noPlugin ?? true,
          szColorProperty: options.colorProperty,
          szOcxClassId: options.ocxClassId,
          szMimeTypes: options.mimeTypes,
          iPlayMode: options.playMode ?? 2,
          bDebugMode: options.debugMode ?? false,
          // 窗口选择回调
          cbSelWnd: (xmlDoc: Document) => {
            this.currentWindowIndex = parseWindowIndex(xmlDoc)
            this.events.emit('window:selected', { index: this.currentWindowIndex })
            options.onWindowSelect?.(this.currentWindowIndex)
          },
          // 窗口双击回调
          cbDoubleClickWnd: (index: number, isFullScreen: boolean) => {
            this.events.emit('window:dblclick', { index, isFullScreen })
            options.onWindowDoubleClick?.(index, isFullScreen)
          },
          // 通用事件回调
          cbEvent: (eventType: number, param1: number, param2: number) => {
            this.events.emit('plugin:event', { eventType, param1, param2 })
            options.onEvent?.(eventType, param1, param2)
          },
          // 初始化完成回调
          cbInitPluginComplete: () => {
            this.bridge.sdk.I_InsertOBJECTPlugin(containerId)
            this.initialized = true
            this.containerId = containerId
            this.events.emit('plugin:initialized', undefined)
            options.onInitComplete?.()
            resolve()
          },
          // 错误处理回调
          cbPluginErrorHandler: (index: number, errorCode: number, error: unknown) => {
            this.events.emit('plugin:error', { windowIndex: index, errorCode, error })
            options.onError?.(index, errorCode, error)
          },
          // 性能不足回调
          cbPerformanceLack: () => {
            this.events.emit('plugin:performance-lack', undefined)
            options.onPerformanceLack?.()
          },
          // 密钥错误回调
          cbSecretKeyError: (index: number) => {
            this.events.emit('plugin:secret-key-error', { windowIndex: index })
            options.onSecretKeyError?.(index)
          },
          // 远程配置关闭回调
          cbRemoteConfig: () => {
            options.onRemoteConfigClose?.()
          },
        })
      }
      catch (error) {
        reject(new HikSDKError('sdk-initialization', '插件初始化失败', error))
      }
    })
  }

  /**
   * 切换窗口布局
   * @param layout 窗口布局（1/4/9/16）
   * @throws {HikSDKError} 当插件未初始化时抛出错误
   * @example
   * ```typescript
   * host.changeWindowLayout(4) // 切换到 4 窗口布局
   * ```
   */
  changeWindowLayout(layout: number): void {
    if (!this.initialized)
      throw new HikSDKError('not-initialized', '插件尚未初始化')

    this.bridge.sdk.I_ChangeWndNum(layout)
  }

  /**
   * 获取窗口状态
   * @param windowIndex 窗口索引（默认为当前活动窗口）
   * @returns 窗口状态信息
   * @throws {HikSDKError} 当插件未初始化时抛出错误
   * @example
   * ```typescript
   * const status = host.getWindowStatus(0)
   * console.log('窗口状态:', status)
   * ```
   */
  getWindowStatus(windowIndex: number = this.currentWindowIndex): any {
    if (!this.initialized)
      throw new HikSDKError('not-initialized', '插件尚未初始化')

    return this.bridge.sdk.I_GetWindowStatus(windowIndex)
  }

  /**
   * 获取所有窗口信息集合
   * @returns 窗口信息数组
   * @throws {HikSDKError} 当插件未初始化时抛出错误
   * @example
   * ```typescript
   * const windows = host.getWindowSet()
   * windows.forEach(wnd => {
   *   console.log(`窗口 ${wnd.iIndex}:`, wnd)
   * })
   * ```
   */
  getWindowSet(): any[] {
    if (!this.initialized)
      throw new HikSDKError('not-initialized', '插件尚未初始化')

    const set = this.bridge.sdk.I_GetWndSet?.()
    return Array.isArray(set) ? set : []
  }
}
