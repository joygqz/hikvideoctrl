import type { HikVideoEventMap, PluginInitOptions } from '../types'
import type { EventBus } from './EventBus'
import type { WebVideoBridge } from './WebVideoBridge'
import { HikSDKError } from '../errors'

function resolveContainerId(container: string | HTMLElement): string {
  if (typeof container === 'string')
    return container

  if (typeof HTMLElement === 'undefined' || !(container instanceof HTMLElement))
    throw new HikSDKError('validation', '插件容器必须是有效的 DOM 元素或元素 ID')

  if (!container.id)
    container.id = `hik-video-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`

  return container.id
}

function toCssSize(value?: string | number): string {
  if (value === undefined)
    return '100%'
  return typeof value === 'number' ? `${value}px` : value
}

function parseWindowIndex(xmlDoc: Document | null | undefined): number {
  const text = xmlDoc?.querySelector('SelectWnd')?.textContent ?? '0'
  return Number.parseInt(text, 10) || 0
}

export class PluginHost {
  private initialized = false
  private containerId: string | null = null
  private currentWindowIndex = 0
  private readonly bridge: WebVideoBridge
  private readonly events: EventBus<HikVideoEventMap>

  constructor(bridge: WebVideoBridge, events: EventBus<HikVideoEventMap>) {
    this.bridge = bridge
    this.events = events
  }

  get isInitialized(): boolean {
    return this.initialized
  }

  get activeWindow(): number {
    return this.currentWindowIndex
  }

  get container(): string | null {
    return this.containerId
  }

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
          cbSelWnd: (xmlDoc: Document) => {
            this.currentWindowIndex = parseWindowIndex(xmlDoc)
            this.events.emit('window:selected', { index: this.currentWindowIndex })
            options.onWindowSelect?.(this.currentWindowIndex)
          },
          cbDoubleClickWnd: (index: number, isFullScreen: boolean) => {
            this.events.emit('window:dblclick', { index, isFullScreen })
            options.onWindowDoubleClick?.(index, isFullScreen)
          },
          cbEvent: (eventType: number, param1: number, param2: number) => {
            this.events.emit('plugin:event', { eventType, param1, param2 })
            options.onEvent?.(eventType, param1, param2)
          },
          cbInitPluginComplete: () => {
            this.bridge.sdk.I_InsertOBJECTPlugin(containerId)
            this.initialized = true
            this.containerId = containerId
            this.events.emit('plugin:initialized', undefined)
            options.onInitComplete?.()
            resolve()
          },
          cbPluginErrorHandler: (index: number, errorCode: number, error: unknown) => {
            this.events.emit('plugin:error', { windowIndex: index, errorCode, error })
            options.onError?.(index, errorCode, error)
          },
          cbPerformanceLack: () => {
            this.events.emit('plugin:performance-lack', undefined)
            options.onPerformanceLack?.()
          },
          cbSecretKeyError: (index: number) => {
            this.events.emit('plugin:secret-key-error', { windowIndex: index })
            options.onSecretKeyError?.(index)
          },
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

  changeWindowLayout(layout: number): void {
    if (!this.initialized)
      throw new HikSDKError('not-initialized', '插件尚未初始化')

    this.bridge.sdk.I_ChangeWndNum(layout)
  }

  getWindowStatus(windowIndex: number = this.currentWindowIndex): any {
    if (!this.initialized)
      throw new HikSDKError('not-initialized', '插件尚未初始化')

    return this.bridge.sdk.I_GetWindowStatus(windowIndex)
  }

  getWindowSet(): any[] {
    if (!this.initialized)
      throw new HikSDKError('not-initialized', '插件尚未初始化')

    const set = this.bridge.sdk.I_GetWndSet?.()
    return Array.isArray(set) ? set : []
  }
}
