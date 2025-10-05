/**
 * 海康威视无插件视频播放SDK
 * HikVideoCtrl - Hikvision WebSDK Wrapper
 *
 * @author joygqz
 * @version 1.0.0
 */

import type {
  CallbackOptions,
  CaptureOptions,
  DeviceInfo,
  EventCallback,
  InitOptions,
  PlaybackOptions,
  PreviewOptions,
  PTZOptions,
  RecordOptions,
  SearchRecordOptions,
} from './types'
import { ConfigManager } from './core/ConfigManager'
import { DeviceManager } from './core/DeviceManager'
import { EventEmitter } from './core/EventEmitter'
import { PTZController } from './core/PTZController'
import { RecordManager } from './core/RecordManager'
import { VideoPlayer } from './core/VideoPlayer'
import {
  formatDate,
  generateDeviceIdentify,
  getCurrentTimeString,
  getTodayTimeRange,
  isValidIP,
  isValidPort,
  isValidTimeRange,
  parseDeviceIdentify,
} from './utils'
import { ErrorCodes, WindowType } from './utils/constants'

/**
 * 海康威视 WebVideoCtrl 封装类
 * 提供了设备管理、视频播放、PTZ控制、录像管理等完整功能
 */
export class HikVideoController {
  private currentWindowIndex = 0
  private isInitialized = false

  // 功能模块
  private eventEmitter: EventEmitter
  private deviceManager: DeviceManager
  private videoPlayer: VideoPlayer
  private ptzController: PTZController
  private recordManager: RecordManager
  private configManager: ConfigManager

  constructor() {
    this.eventEmitter = new EventEmitter()
    this.deviceManager = new DeviceManager()
    this.videoPlayer = new VideoPlayer(this.currentWindowIndex)
    this.ptzController = new PTZController(this.currentWindowIndex)
    this.recordManager = new RecordManager()
    this.configManager = new ConfigManager(this.currentWindowIndex)

    this.initEventHandlers()
  }

  /**
   * 检查浏览器是否支持无插件模式
   */
  static isSupportNoPlugin(): boolean {
    return window.WebVideoCtrl?.I_SupportNoPlugin() || false
  }

  /**
   * 初始化插件
   */
  async initPlugin(options: InitOptions): Promise<void> {
    if (this.isInitialized) {
      throw new Error('插件已初始化')
    }

    const {
      containerId,
      width = '100%',
      height = '100%',
      windowType = WindowType.Single,
      packageType = 2,
      noPlugin = true,
      onWindowSelect,
      onWindowDoubleClick,
      onEvent,
      onError,
      onPerformanceLack,
      onSecretKeyError,
    } = options

    return new Promise((resolve, reject) => {
      try {
        window.WebVideoCtrl.I_InitPlugin(width, height, {
          bWndFull: true,
          iPackageType: packageType,
          iWndowType: windowType,
          bNoPlugin: noPlugin,
          cbSelWnd: (xmlDoc: Document) => {
            const selectedIndex = Number.parseInt(
              xmlDoc.querySelector('SelectWnd')?.textContent || '0',
              10,
            )
            this.currentWindowIndex = selectedIndex
            this.updateModulesWindowIndex(selectedIndex)
            this.eventEmitter.emit('windowSelect', selectedIndex)
            onWindowSelect?.(selectedIndex)
          },
          cbDoubleClickWnd: (windowIndex: number, isFullScreen: boolean) => {
            this.eventEmitter.emit('windowDoubleClick', { windowIndex, isFullScreen })
            onWindowDoubleClick?.(windowIndex, isFullScreen)
          },
          cbEvent: (eventType: number, param1: number, param2: number) => {
            this.eventEmitter.emit('event', { eventType, param1, param2 })

            if (eventType === 2) {
              this.eventEmitter.emit('playbackEnd', param1)
            }
            else if (eventType === -1) {
              this.eventEmitter.emit('networkError', param1)
            }

            onEvent?.(eventType, param1, param2)
          },
          cbInitPluginComplete: () => {
            window.WebVideoCtrl.I_InsertOBJECTPlugin(containerId)
            this.isInitialized = true
            resolve()
          },
          cbPluginErrorHandler: (windowIndex: number, errorCode: number, error: any) => {
            const errorMessage = ErrorCodes[errorCode as keyof typeof ErrorCodes] || '未知错误'
            this.eventEmitter.emit('error', { windowIndex, errorCode, error, message: errorMessage })
            onError?.(windowIndex, errorCode, error)
          },
          cbPerformanceLack: () => {
            this.eventEmitter.emit('performanceLack')
            onPerformanceLack?.()
          },
          cbSecretKeyError: (windowIndex: number) => {
            this.eventEmitter.emit('secretKeyError', windowIndex)
            onSecretKeyError?.(windowIndex)
          },
        })
      }
      catch (error) {
        reject(error)
      }
    })
  }

  // ==================== 设备管理 ====================

  async login(deviceInfo: DeviceInfo): Promise<void> {
    return this.deviceManager.login(deviceInfo, (deviceId, ip, port) => {
      this.eventEmitter.emit('loginSuccess', { deviceId, ip, port })
    })
  }

  async logout(deviceId: string): Promise<void> {
    return this.deviceManager.logout(deviceId, () => {
      this.eventEmitter.emit('logoutSuccess', { deviceId })
    })
  }

  async getDeviceInfo(deviceId: string): Promise<any> {
    return this.deviceManager.getDeviceInfo(deviceId)
  }

  getDevicePort(deviceId: string): any {
    return this.deviceManager.getDevicePort(deviceId)
  }

  async getChannels(deviceId: string): Promise<any[]> {
    return this.deviceManager.getChannels(deviceId)
  }

  async getAudioInfo(deviceId: string): Promise<any> {
    return this.deviceManager.getAudioInfo(deviceId)
  }

  async exportDeviceConfig(deviceIdentify: string, password: string): Promise<void> {
    return this.deviceManager.exportDeviceConfig(deviceIdentify, password)
  }

  async importDeviceConfig(deviceIdentify: string, fileName: string, password: string, file: File): Promise<void> {
    return this.deviceManager.importDeviceConfig(deviceIdentify, fileName, password, file)
  }

  async restart(deviceIdentify: string, options: CallbackOptions = {}): Promise<void> {
    return this.deviceManager.restart(deviceIdentify, options)
  }

  async reconnect(deviceIdentify: string, options: CallbackOptions = {}): Promise<void> {
    return this.deviceManager.reconnect(deviceIdentify, options)
  }

  async restoreDefault(deviceIdentify: string, mode: 'basic' | 'full', options: CallbackOptions = {}): Promise<void> {
    return this.deviceManager.restoreDefault(deviceIdentify, mode, options)
  }

  async startUpgrade(deviceIdentify: string, fileName: string, file: File): Promise<void> {
    return this.deviceManager.startUpgrade(deviceIdentify, fileName, file)
  }

  async getUpgradeProgress(deviceIdentify: string): Promise<{ percent: number, upgrading: boolean }> {
    return this.deviceManager.getUpgradeProgress(deviceIdentify)
  }

  // ==================== 视频播放 ====================

  async startPreview(options: PreviewOptions): Promise<void> {
    return this.videoPlayer.startPreview(options, (deviceId, channelId, windowIndex, isZeroChannel) => {
      this.eventEmitter.emit('previewStart', { deviceId, channelId, windowIndex, isZeroChannel })
    })
  }

  async stopPreview(windowIndex?: number): Promise<void> {
    return this.videoPlayer.stopPreview(windowIndex, (deviceId, windowIndex) => {
      this.eventEmitter.emit('previewStop', { deviceId, windowIndex })
    })
  }

  async stopAllPreview(): Promise<void> {
    return this.videoPlayer.stopAllPreview()
  }

  async startPlayback(options: PlaybackOptions): Promise<void> {
    return this.videoPlayer.startPlayback(options, (info) => {
      this.eventEmitter.emit('playbackStart', info)
    })
  }

  async pausePlayback(): Promise<void> {
    return this.videoPlayer.pausePlayback()
  }

  async resumePlayback(): Promise<void> {
    return this.videoPlayer.resumePlayback()
  }

  async playFast(): Promise<void> {
    return this.videoPlayer.playFast()
  }

  async playSlow(): Promise<void> {
    return this.videoPlayer.playSlow()
  }

  async openSound(): Promise<void> {
    return this.videoPlayer.openSound()
  }

  async closeSound(): Promise<void> {
    return this.videoPlayer.closeSound()
  }

  async setVolume(volume: number): Promise<void> {
    return this.videoPlayer.setVolume(volume)
  }

  async enableEZoom(): Promise<void> {
    return this.videoPlayer.enableEZoom()
  }

  async disableEZoom(): Promise<void> {
    return this.videoPlayer.disableEZoom()
  }

  async enable3DZoom(windowIndex?: number, callback?: (zoomInfo: any) => void): Promise<void> {
    return this.videoPlayer.enable3DZoom(windowIndex, callback)
  }

  disable3DZoom(): boolean {
    return this.videoPlayer.disable3DZoom()
  }

  fullScreen(): void {
    this.videoPlayer.fullScreen()
  }

  getWindowStatus(windowIndex?: number): any {
    return this.videoPlayer.getWindowStatus(windowIndex)
  }

  changeWindowCount(windowType: number): void {
    this.videoPlayer.changeWindowCount(windowType)
  }

  getWndSet(): any[] {
    return this.videoPlayer.getWndSet()
  }

  // ==================== PTZ控制 ====================

  async ptzControl(options: PTZOptions, stop: boolean = false): Promise<void> {
    return this.ptzController.ptzControl(options, stop)
  }

  async setPreset(presetId: number): Promise<void> {
    return this.ptzController.setPreset(presetId)
  }

  async goPreset(presetId: number): Promise<void> {
    return this.ptzController.goPreset(presetId)
  }

  // ==================== 录像和抓拍 ====================

  async searchRecord(options: SearchRecordOptions): Promise<any[]> {
    return this.recordManager.searchRecord(options)
  }

  async startRecord(options: RecordOptions): Promise<void> {
    return this.recordManager.startRecord(options, (fileName) => {
      this.eventEmitter.emit('recordStart', { fileName })
    })
  }

  async stopRecord(): Promise<void> {
    return this.recordManager.stopRecord(() => {
      this.eventEmitter.emit('recordStop')
    })
  }

  async capturePicture(options: CaptureOptions): Promise<void> {
    return this.recordManager.capturePicture(options)
  }

  async startDownloadRecord(
    deviceIdentify: string,
    playbackURI: string,
    fileName: string,
    options: { bDateDir?: boolean } = {},
  ): Promise<void> {
    return this.recordManager.startDownloadRecord(deviceIdentify, playbackURI, fileName, options)
  }

  async startDownloadRecordByTime(
    deviceIdentify: string,
    playbackURI: string,
    fileName: string,
    startTime: string,
    endTime: string,
    options: { bDateDir?: boolean } = {},
  ): Promise<void> {
    return this.recordManager.startDownloadRecordByTime(deviceIdentify, playbackURI, fileName, startTime, endTime, options)
  }

  // ==================== 配置管理 ====================

  async setSecretKey(secretKey: string, windowIndex?: number): Promise<void> {
    return this.configManager.setSecretKey(secretKey, windowIndex)
  }

  async getOSDTime(): Promise<string> {
    return this.configManager.getOSDTime()
  }

  getLocalConfig(): any {
    return this.configManager.getLocalConfig()
  }

  setLocalConfig(config: string): boolean {
    return this.configManager.setLocalConfig(config)
  }

  async openFileDlg(type: 0 | 1): Promise<{ szFileName: string, file: File }> {
    return this.configManager.openFileDlg(type)
  }

  async sendHTTPRequest(deviceIdentify: string, url: string, options: any): Promise<any> {
    return this.configManager.sendHTTPRequest(deviceIdentify, url, options)
  }

  async getTextOverlay(url: string, deviceIdentify: string, options: CallbackOptions = {}): Promise<any> {
    return this.configManager.getTextOverlay(url, deviceIdentify, options)
  }

  // ==================== 事件系统 ====================

  on(event: string, callback: EventCallback): void {
    this.eventEmitter.on(event, callback)
  }

  off(event: string, callback?: EventCallback): void {
    this.eventEmitter.off(event, callback)
  }

  // ==================== 私有方法 ====================

  private updateModulesWindowIndex(index: number): void {
    this.currentWindowIndex = index
    this.videoPlayer.setCurrentWindowIndex(index)
    this.ptzController.setCurrentWindowIndex(index)
    this.configManager.setCurrentWindowIndex(index)
  }

  private initEventHandlers(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        // 可以在这里处理窗口大小调整
      })
    }
  }

  // ==================== 静态工具方法 ====================

  static formatDate = formatDate
  static getCurrentTimeString = getCurrentTimeString
  static getTodayTimeRange = getTodayTimeRange
  static generateDeviceIdentify = generateDeviceIdentify
  static parseDeviceIdentify = parseDeviceIdentify
  static isValidIP = isValidIP
  static isValidPort = isValidPort
  static isValidTimeRange = isValidTimeRange
}

// 默认导出
export default HikVideoController

// 导出类型定义
export type {
  CallbackOptions,
  CaptureOptions,
  ChannelInfo,
  DeviceInfo,
  DownloadRecordOptions,
  EventCallback,
  InitOptions,
  PlaybackOptions,
  PreviewOptions,
  PTZOptions,
  RecordOptions,
  SearchRecordOptions,
} from './types'

// 导出常量
export {
  AudioErrorCode,
  DefaultPorts,
  ErrorCodes,
  FileFormat,
  ProtocolType,
  PTZControlType,
  RecordType,
  SEARCH_RECORDS_PER_PAGE,
  StreamType,
  WindowType,
} from './utils/constants'

// 导出工具函数
export {
  createResponseHandler,
  delay,
  encodeString,
  formatDate,
  generateDeviceIdentify,
  generateUniqueFileName,
  getCurrentTimeString,
  getTodayTimeRange,
  getWindowSize,
  isValidIP,
  isValidPort,
  isValidTimeRange,
  loadXML,
  parseDeviceIdentify,
  promisify,
  toXMLString,
  uint8ArrayToBase64,
} from './utils/index'
