/**
 * 视频播放模块
 */

import type { PlaybackOptions, PreviewOptions } from '../types'
import { isValidTimeRange, promisify } from '../utils'
import { DefaultPorts, StreamType } from '../utils/constants'

export class VideoPlayer {
  private currentWindowIndex: number

  constructor(currentWindowIndex: number = 0) {
    this.currentWindowIndex = currentWindowIndex
  }

  setCurrentWindowIndex(index: number): void {
    this.currentWindowIndex = index
  }

  getCurrentWindowIndex(): number {
    return this.currentWindowIndex
  }

  /**
   * 开始预览
   */
  async startPreview(
    options: PreviewOptions,
    onSuccess?: (deviceId: string, channelId: number, windowIndex: number, isZeroChannel: boolean) => void,
  ): Promise<void> {
    const {
      deviceId,
      channelId,
      streamType = StreamType.MainStream,
      windowIndex = this.currentWindowIndex,
      isZeroChannel = false,
      useProxy = false,
    } = options

    const devicePorts = window.WebVideoCtrl.I_GetDevicePort(deviceId)
    const rtspPort = devicePorts?.iRtspPort || DefaultPorts.RTSP

    return promisify(
      window.WebVideoCtrl.I_StartRealPlay,
      deviceId,
      {
        iWndIndex: windowIndex,
        iRtspPort: rtspPort,
        iStreamType: streamType,
        iChannelID: channelId,
        bZeroChannel: isZeroChannel,
        bProxy: useProxy,
        success: () => {
          onSuccess?.(deviceId, channelId, windowIndex, isZeroChannel)
        },
      },
    )
  }

  /**
   * 停止预览
   */
  async stopPreview(
    windowIndex?: number,
    onSuccess?: (deviceId: string, windowIndex: number) => void,
  ): Promise<void> {
    const index = windowIndex ?? this.currentWindowIndex
    const windowInfo = window.WebVideoCtrl.I_GetWindowStatus(index)

    if (!windowInfo) {
      throw new Error('窗口未在播放')
    }

    return promisify(
      window.WebVideoCtrl.I_Stop,
      {
        iIndex: index,
        success: () => {
          onSuccess?.(windowInfo.szDeviceIdentify, index)
        },
      },
    )
  }

  /**
   * 停止所有预览
   */
  async stopAllPreview(): Promise<void> {
    return promisify(window.WebVideoCtrl.I_StopAll)
  }

  /**
   * 开始回放
   */
  async startPlayback(
    options: PlaybackOptions,
    onSuccess?: (info: any) => void,
  ): Promise<void> {
    const {
      deviceId,
      channelId,
      startTime,
      endTime,
      streamType = StreamType.MainStream,
      windowIndex = this.currentWindowIndex,
      isZeroChannel = false,
      useProxy = false,
    } = options

    if (!isValidTimeRange(startTime, endTime)) {
      throw new Error('无效的时间范围')
    }

    const devicePorts = window.WebVideoCtrl.I_GetDevicePort(deviceId)
    const rtspPort = devicePorts?.iRtspPort || DefaultPorts.RTSP

    return promisify(
      window.WebVideoCtrl.I_StartPlayback,
      deviceId,
      {
        iRtspPort: rtspPort,
        iStreamType: streamType,
        iChannelID: channelId,
        szStartTime: startTime,
        szEndTime: endTime,
        bZeroChannel: isZeroChannel,
        bProxy: useProxy,
        success: () => {
          onSuccess?.({ deviceId, channelId, windowIndex, startTime, endTime, isZeroChannel })
        },
      },
    )
  }

  /**
   * 暂停回放
   */
  async pausePlayback(): Promise<void> {
    return promisify(window.WebVideoCtrl.I_Pause)
  }

  /**
   * 恢复回放
   */
  async resumePlayback(): Promise<void> {
    return promisify(window.WebVideoCtrl.I_Resume)
  }

  /**
   * 快进
   */
  async playFast(): Promise<void> {
    return promisify(window.WebVideoCtrl.I_PlayFast)
  }

  /**
   * 慢放
   */
  async playSlow(): Promise<void> {
    return promisify(window.WebVideoCtrl.I_PlaySlow)
  }

  /**
   * 打开声音
   */
  async openSound(): Promise<void> {
    return promisify(window.WebVideoCtrl.I_OpenSound)
  }

  /**
   * 关闭声音
   */
  async closeSound(): Promise<void> {
    return promisify(window.WebVideoCtrl.I_CloseSound)
  }

  /**
   * 设置音量
   */
  async setVolume(volume: number): Promise<void> {
    if (volume < 0 || volume > 100) {
      throw new Error('音量范围应在0-100之间')
    }
    return promisify(window.WebVideoCtrl.I_SetVolume, volume)
  }

  /**
   * 启用电子放大
   */
  async enableEZoom(): Promise<void> {
    return promisify(window.WebVideoCtrl.I_EnableEZoom)
  }

  /**
   * 禁用电子放大
   */
  async disableEZoom(): Promise<void> {
    return promisify(window.WebVideoCtrl.I_DisableEZoom)
  }

  /**
   * 启用 3D 放大
   */
  async enable3DZoom(windowIndex?: number, callback?: (zoomInfo: any) => void): Promise<void> {
    const index = windowIndex ?? this.currentWindowIndex
    return promisify(window.WebVideoCtrl.I_Enable3DZoom, index, callback)
  }

  /**
   * 禁用 3D 放大
   */
  disable3DZoom(): boolean {
    return window.WebVideoCtrl.I_Disable3DZoom() === 0
  }

  /**
   * 全屏显示
   */
  fullScreen(): void {
    window.WebVideoCtrl.I_FullScreen(true)
  }

  /**
   * 获取窗口状态
   */
  getWindowStatus(windowIndex?: number): any {
    const index = windowIndex ?? this.currentWindowIndex
    return window.WebVideoCtrl.I_GetWindowStatus(index)
  }

  /**
   * 切换窗口数量
   */
  changeWindowCount(windowType: number): void {
    window.WebVideoCtrl.I_ChangeWndNum(windowType)
  }

  /**
   * 获取窗口集合
   */
  getWndSet(): any[] {
    return window.WebVideoCtrl.I_GetWndSet()
  }
}
