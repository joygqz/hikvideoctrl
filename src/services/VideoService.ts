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

function ensureVolume(volume: number): void {
  if (Number.isNaN(volume) || volume < 0 || volume > 100)
    throw new HikSDKError('validation', '音量取值范围应在 0 - 100 之间')
}

function resolveWindowIndex(plugin: PluginHost, windowIndex?: number): number {
  if (windowIndex !== undefined)
    return windowIndex
  return plugin.activeWindow
}

export class VideoService {
  private readonly bridge: WebVideoBridge
  private readonly plugin: PluginHost
  private readonly events: EventBus<HikVideoEventMap>

  constructor(bridge: WebVideoBridge, plugin: PluginHost, events: EventBus<HikVideoEventMap>) {
    this.bridge = bridge
    this.plugin = plugin
    this.events = events
  }

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

  async stopAll(): Promise<void> {
    await this.bridge.exec('I_StopAll')
    this.events.emit('preview:stopped-all', undefined)
  }

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

  async pause(windowIndex?: number): Promise<void> {
    await this.bridge.exec('I_Pause', { iWndIndex: resolveWindowIndex(this.plugin, windowIndex) })
  }

  async resume(windowIndex?: number): Promise<void> {
    await this.bridge.exec('I_Resume', { iWndIndex: resolveWindowIndex(this.plugin, windowIndex) })
  }

  async playFast(windowIndex?: number): Promise<void> {
    await this.bridge.exec('I_PlayFast', { iWndIndex: resolveWindowIndex(this.plugin, windowIndex) })
  }

  async playSlow(windowIndex?: number): Promise<void> {
    await this.bridge.exec('I_PlaySlow', { iWndIndex: resolveWindowIndex(this.plugin, windowIndex) })
  }

  async openSound(windowIndex?: number): Promise<void> {
    await this.bridge.exec('I_OpenSound', resolveWindowIndex(this.plugin, windowIndex))
  }

  async closeSound(windowIndex?: number): Promise<void> {
    await this.bridge.exec('I_CloseSound', resolveWindowIndex(this.plugin, windowIndex))
  }

  async setVolume(volume: number, windowIndex?: number): Promise<void> {
    ensureVolume(volume)
    await this.bridge.exec('I_SetVolume', volume, resolveWindowIndex(this.plugin, windowIndex))
  }

  toggleFullScreen(enable: boolean = true): void {
    this.bridge.call('I_FullScreen', enable)
  }

  async enableEZoom(windowIndex?: number): Promise<void> {
    await this.bridge.exec('I_EnableEZoom', resolveWindowIndex(this.plugin, windowIndex))
  }

  async disableEZoom(windowIndex?: number): Promise<void> {
    await this.bridge.exec('I_DisableEZoom', resolveWindowIndex(this.plugin, windowIndex))
  }

  async enable3DZoom(windowIndex?: number, callback?: (info: unknown) => void): Promise<void> {
    await this.bridge.exec('I_Enable3DZoom', resolveWindowIndex(this.plugin, windowIndex), callback)
  }

  disable3DZoom(windowIndex?: number): boolean {
    const result = this.bridge.call<number>('I_Disable3DZoom', resolveWindowIndex(this.plugin, windowIndex))
    return result === 0
  }

  changeWindowLayout(layout: number): void {
    this.plugin.changeWindowLayout(layout)
  }

  getWindowStatus(windowIndex?: number): any {
    return this.plugin.getWindowStatus(resolveWindowIndex(this.plugin, windowIndex))
  }

  getWindowSet(): any[] {
    return this.plugin.getWindowSet()
  }

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
