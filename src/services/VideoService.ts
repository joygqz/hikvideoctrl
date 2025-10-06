import type { EventBus } from '../core/EventBus'
import type { PluginHost } from '../core/PluginHost'
import type { WebVideoBridge } from '../core/WebVideoBridge'
import type {
  HikVideoEventMap,
  PlaybackOptions,
  PreviewOptions,
} from '../types'
import { HikSDKError } from '../errors'
import { DefaultPorts } from '../utils/constants'

/**
 * 校验音量取值范围
 * @param volume 音量值
 * @throws {HikSDKError} 音量超出范围时抛出
 */
function ensureVolume(volume: number): void {
  if (Number.isNaN(volume) || volume < 0 || volume > 100)
    throw new HikSDKError('validation', '音量取值范围应在 0 - 100 之间')
}

/**
 * 获取有效的窗口索引
 * @param plugin 插件宿主实例
 * @param windowIndex 指定窗口索引
 * @returns 处理后的窗口索引
 */
function resolveWindowIndex(plugin: PluginHost, windowIndex?: number): number {
  if (windowIndex !== undefined)
    return windowIndex
  return plugin.activeWindow
}

/**
 * 视频预览与回放服务
 */
export class VideoService {
  private readonly bridge: WebVideoBridge
  private readonly plugin: PluginHost
  private readonly events: EventBus<HikVideoEventMap>

  /**
   * 构造函数
   * @param bridge SDK 桥接实例
   * @param plugin 插件宿主实例
   * @param events 事件总线实例
   */
  constructor(bridge: WebVideoBridge, plugin: PluginHost, events: EventBus<HikVideoEventMap>) {
    this.bridge = bridge
    this.plugin = plugin
    this.events = events
  }

  /**
   * 开始实时预览
   * @param deviceId 设备标识
   * @param options 预览选项
   * @returns Promise，在 SDK 完成预览启动后解析
   */
  async startPreview(deviceId: string, options: PreviewOptions): Promise<void> {
    const windowIndex = resolveWindowIndex(this.plugin, options.windowIndex)
    const rtspPort = options.rtspPort ?? options.port ?? this.pluginPort(deviceId)

    await this.bridge.exec('I_StartRealPlay', deviceId, {
      iWndIndex: windowIndex,
      iRtspPort: rtspPort,
      iPort: options.port ?? rtspPort,
      iStreamType: options.streamType ?? 1,
      iChannelID: options.channel,
      bZeroChannel: options.zeroChannel ?? false,
      bProxy: options.useProxy ?? false,
      success: options.onSuccess,
      error: options.onError,
    })

    this.events.emit('preview:started', {
      deviceId,
      channel: options.channel,
      windowIndex,
      zeroChannel: options.zeroChannel ?? false,
    })
  }

  /**
   * 停止指定窗口的预览
   * @param windowIndex 窗口索引（可选）
   * @throws {HikSDKError} 窗口未播放时抛出
   * @returns Promise，在预览停止后解析
   */
  async stopPreview(windowIndex?: number): Promise<void> {
    const target = resolveWindowIndex(this.plugin, windowIndex)
    const status = this.plugin.getWindowStatus(target)
    if (!status)
      throw new HikSDKError('window-state', `窗口 ${target} 未在播放`)

    await this.bridge.exec('I_Stop', {
      iWndIndex: target,
    })

    this.events.emit('preview:stopped', {
      deviceId: status.szDeviceIdentify,
      windowIndex: target,
    })
  }

  /**
   * 停止所有窗口的预览
   * @returns Promise，在所有预览停止后解析
   */
  async stopAll(): Promise<void> {
    await this.bridge.exec('I_StopAll')
    this.events.emit('preview:stopped-all', undefined)
  }

  /**
   * 开始录像回放
   * @param deviceId 设备标识
   * @param options 回放选项
   * @returns Promise，在 SDK 完成回放启动后解析
   */
  async startPlayback(deviceId: string, options: PlaybackOptions): Promise<void> {
    const windowIndex = resolveWindowIndex(this.plugin, options.windowIndex)
    const rtspPort = options.rtspPort ?? options.port ?? this.pluginPort(deviceId)
    const transcode = options.transcode

    await this.bridge.exec('I_StartPlayback', deviceId, {
      iWndIndex: windowIndex,
      iRtspPort: rtspPort,
      iPort: options.port ?? rtspPort,
      iStreamType: options.streamType ?? 1,
      iChannelID: options.channel,
      szStartTime: options.start,
      szEndTime: options.end,
      bZeroChannel: options.zeroChannel ?? false,
      bProxy: options.useProxy ?? false,
      oTransCodeParam: transcode
        ? {
            TransFrameRate: transcode.frameRate,
            TransResolution: transcode.resolution,
            TransBitrate: transcode.bitrate,
          }
        : undefined,
      success: options.onSuccess,
      error: options.onError,
    })

    this.events.emit('playback:started', {
      deviceId,
      channel: options.channel,
      windowIndex,
      start: options.start,
      end: options.end,
    })
  }

  /**
   * 停止录像回放
   * @param windowIndex 窗口索引（可选）
   * @throws {HikSDKError} 窗口未播放时抛出
   * @returns Promise，在回放停止后解析
   */
  async stopPlayback(windowIndex?: number): Promise<void> {
    const target = resolveWindowIndex(this.plugin, windowIndex)
    const status = this.plugin.getWindowStatus(target)
    if (!status)
      throw new HikSDKError('window-state', `窗口 ${target} 未在播放`)

    await this.bridge.exec('I_Stop', {
      iWndIndex: target,
    })

    this.events.emit('playback:stopped', {
      deviceId: status.szDeviceIdentify,
      windowIndex: target,
    })
  }

  /**
   * 暂停回放
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，在暂停完成后解析
   */
  async pause(windowIndex?: number): Promise<void> {
    await this.bridge.exec('I_Pause', { iWndIndex: resolveWindowIndex(this.plugin, windowIndex) })
  }

  /**
   * 恢复回放
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，在恢复完成后解析
   */
  async resume(windowIndex?: number): Promise<void> {
    await this.bridge.exec('I_Resume', { iWndIndex: resolveWindowIndex(this.plugin, windowIndex) })
  }

  /**
   * 快进播放
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，在命令执行完成后解析
   */
  async playFast(windowIndex?: number): Promise<void> {
    await this.bridge.exec('I_PlayFast', { iWndIndex: resolveWindowIndex(this.plugin, windowIndex) })
  }

  /**
   * 慢速播放
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，在命令执行完成后解析
   */
  async playSlow(windowIndex?: number): Promise<void> {
    await this.bridge.exec('I_PlaySlow', { iWndIndex: resolveWindowIndex(this.plugin, windowIndex) })
  }

  /**
   * 打开声音
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，在声音开启后解析
   */
  async openSound(windowIndex?: number): Promise<void> {
    await this.bridge.exec('I_OpenSound', resolveWindowIndex(this.plugin, windowIndex))
  }

  /**
   * 关闭声音
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，在声音关闭后解析
   */
  async closeSound(windowIndex?: number): Promise<void> {
    await this.bridge.exec('I_CloseSound', resolveWindowIndex(this.plugin, windowIndex))
  }

  /**
   * 设置音量
   * @param volume 音量值
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，在音量设置完成后解析
   */
  async setVolume(volume: number, windowIndex?: number): Promise<void> {
    ensureVolume(volume)
    await this.bridge.exec('I_SetVolume', volume, resolveWindowIndex(this.plugin, windowIndex))
  }

  /**
   * 切换全屏模式
   * @param enable 是否开启全屏
   */
  toggleFullScreen(enable: boolean = true): void {
    this.bridge.call('I_FullScreen', enable)
  }

  /**
   * 启用电子放大
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，在功能启用后解析
   */
  async enableEZoom(windowIndex?: number): Promise<void> {
    await this.bridge.exec('I_EnableEZoom', resolveWindowIndex(this.plugin, windowIndex))
  }

  /**
   * 禁用电子放大
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，在功能关闭后解析
   */
  async disableEZoom(windowIndex?: number): Promise<void> {
    await this.bridge.exec('I_DisableEZoom', resolveWindowIndex(this.plugin, windowIndex))
  }

  /**
   * 启用 3D 定位
   * @param windowIndex 窗口索引（可选）
   * @param callback 定位信息回调
   * @returns Promise，在功能启用后解析
   */
  async enable3DZoom(windowIndex?: number, callback?: (info: unknown) => void): Promise<void> {
    await this.bridge.exec('I_Enable3DZoom', resolveWindowIndex(this.plugin, windowIndex), callback)
  }

  /**
   * 禁用 3D 定位
   * @param windowIndex 窗口索引（可选）
   * @returns 是否执行成功
   */
  disable3DZoom(windowIndex?: number): boolean {
    const result = this.bridge.call<number>('I_Disable3DZoom', resolveWindowIndex(this.plugin, windowIndex))
    return result === 0
  }

  /**
   * 切换窗口布局
   * @param layout 窗口布局类型
   */
  changeWindowLayout(layout: number): void {
    this.plugin.changeWindowLayout(layout)
  }

  /**
   * 获取窗口状态
   * @param windowIndex 窗口索引（可选）
   * @returns 窗口状态信息
   */
  getWindowStatus(windowIndex?: number): any {
    return this.plugin.getWindowStatus(resolveWindowIndex(this.plugin, windowIndex))
  }

  /**
   * 获取所有窗口集合
   * @returns 窗口信息数组
   */
  getWindowSet(): any[] {
    return this.plugin.getWindowSet()
  }

  /**
   * 获取设备使用的端口
   * @param deviceId 设备标识
   * @returns RTSP 端口号
   */
  private pluginPort(deviceId: string): number {
    try {
      const ports = this.bridge.call<{ iRtspPort: number }>('I_GetDevicePort', deviceId)
      return ports?.iRtspPort ?? DefaultPorts.RTSP
    }
    catch (error) {
      console.warn('[hikvideoctrl] 获取设备端口失败，使用默认 RTSP 端口', error)
      return DefaultPorts.RTSP
    }
  }
}
