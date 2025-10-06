/**
 * 视频播放模块
 * 负责预览、回放、播放控制等功能
 */

import type { PlaybackOptions, PreviewOptions } from '../types'
import { isValidTimeRange, promisify } from '../utils'
import { DefaultPorts, StreamType } from '../utils/constants'

export class VideoPlayer {
  private currentWindowIndex: number

  constructor(currentWindowIndex: number = 0) {
    this.currentWindowIndex = currentWindowIndex
  }

  /**
   * 设置当前窗口索引
   */
  setCurrentWindowIndex(index: number): void {
    this.currentWindowIndex = index
  }

  /**
   * 获取当前窗口索引
   */
  getCurrentWindowIndex(): number {
    return this.currentWindowIndex
  }

  /**
   * 获取窗口索引（支持传入参数或使用默认）
   */
  private getWindowIndex(windowIndex?: number): number {
    return windowIndex ?? this.currentWindowIndex
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
        iWndIndex: windowIndex,
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
  async pausePlayback(windowIndex?: number): Promise<void> {
    return promisify(window.WebVideoCtrl.I_Pause, {
      iWndIndex: this.getWindowIndex(windowIndex),
    })
  }

  /**
   * 恢复回放
   */
  async resumePlayback(windowIndex?: number): Promise<void> {
    return promisify(window.WebVideoCtrl.I_Resume, {
      iWndIndex: this.getWindowIndex(windowIndex),
    })
  }

  /**
   * 快进回放
   */
  async playFast(windowIndex?: number): Promise<void> {
    return promisify(window.WebVideoCtrl.I_PlayFast, {
      iWndIndex: this.getWindowIndex(windowIndex),
    })
  }

  /**
   * 慢放回放
   */
  async playSlow(windowIndex?: number): Promise<void> {
    return promisify(window.WebVideoCtrl.I_PlaySlow, {
      iWndIndex: this.getWindowIndex(windowIndex),
    })
  }

  /**
   * 打开声音
   */
  async openSound(windowIndex?: number): Promise<void> {
    return promisify(window.WebVideoCtrl.I_OpenSound, this.getWindowIndex(windowIndex))
  }

  /**
   * 关闭声音
   */
  async closeSound(windowIndex?: number): Promise<void> {
    return promisify(window.WebVideoCtrl.I_CloseSound, this.getWindowIndex(windowIndex))
  }

  /**
   * 设置音量
   * @param volume 音量大小，范围 0-100
   * @param windowIndex 窗口索引
   */
  async setVolume(volume: number, windowIndex?: number): Promise<void> {
    if (volume < 0 || volume > 100) {
      throw new Error('音量范围应在0-100之间')
    }
    return promisify(window.WebVideoCtrl.I_SetVolume, volume, this.getWindowIndex(windowIndex))
  }

  /**
   * 启用电子放大
   * 开启后，在窗口中鼠标左键拖动从左上到右下是放大，右下到左上是缩小
   */
  async enableEZoom(windowIndex?: number): Promise<void> {
    return promisify(window.WebVideoCtrl.I_EnableEZoom, this.getWindowIndex(windowIndex))
  }

  /**
   * 禁用电子放大
   */
  async disableEZoom(windowIndex?: number): Promise<void> {
    return promisify(window.WebVideoCtrl.I_DisableEZoom, this.getWindowIndex(windowIndex))
  }

  /**
   * 启用 3D 放大
   * 开启后，在窗口中鼠标左键拖动方向从左上到右下是放大，右下到左上是缩小
   */
  async enable3DZoom(windowIndex?: number, callback?: (zoomInfo: any) => void): Promise<void> {
    return promisify(window.WebVideoCtrl.I_Enable3DZoom, this.getWindowIndex(windowIndex), callback)
  }

  /**
   * 禁用 3D 放大
   */
  disable3DZoom(windowIndex?: number): boolean {
    return window.WebVideoCtrl.I_Disable3DZoom(this.getWindowIndex(windowIndex)) === 0
  }

  /**
   * 全屏显示/退出全屏
   * @param enable true-全屏, false-退出全屏
   */
  fullScreen(enable: boolean = true): void {
    window.WebVideoCtrl.I_FullScreen(enable)
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
