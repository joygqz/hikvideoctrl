/**
 * 海康威视 WebVideoCtrl 封装类
 * 提供了设备管理、视频播放、PTZ控制、录像管理等完整功能
 */

import {
  DefaultPorts,
  ErrorCodes,
  FileFormat,
  ProtocolType,
  StreamType,
  WindowType,
} from '../utils/constants'
import {
  formatDate,
  generateDeviceIdentify,
  generateUniqueFileName,
  getCurrentTimeString,
  getTodayTimeRange,
  isValidIP,
  isValidPort,
  isValidTimeRange,
  parseDeviceIdentify,
  promisify,
} from '../utils/index'

// 类型定义
export interface InitOptions {
  containerId: string
  width?: string
  height?: string
  windowType?: number
  packageType?: number
  noPlugin?: boolean
  onWindowSelect?: (windowIndex: number) => void
  onWindowDoubleClick?: (windowIndex: number, isFullScreen: boolean) => void
  onEvent?: (eventType: number, param1: number, param2: number) => void
  onError?: (windowIndex: number, errorCode: number, error: any) => void
  onPerformanceLack?: () => void
  onSecretKeyError?: (windowIndex: number) => void
}

export interface DeviceInfo {
  ip: string
  port: number
  username: string
  password: string
  protocol?: number
}

export interface PreviewOptions {
  deviceId: string
  channelId: number
  streamType?: number
  windowIndex?: number
  isZeroChannel?: boolean
  useProxy?: boolean
}

export interface PlaybackOptions extends PreviewOptions {
  startTime: string
  endTime: string
}

export interface PTZOptions {
  windowIndex?: number
  ptzIndex: number
  speed?: number
}

export interface RecordOptions {
  windowIndex?: number
  fileName?: string
  useDateDir?: boolean
}

export interface CaptureOptions {
  windowIndex?: number
  fileName?: string
  format?: string
  callback?: (imageData: Uint8Array) => void
}

export interface SearchRecordOptions {
  deviceId: string
  channelId: number
  startTime: string
  endTime: string
  streamType?: number
}

export interface DownloadRecordOptions {
  useDateDir?: boolean
}

export interface CallbackOptions {
  success?: (xmlDoc?: any) => void
  error?: (status?: number, xmlDoc?: any) => void
  timeout?: number
}

export interface EventCallback {
  (data?: any): void
}

declare global {
  interface Window {
    WebVideoCtrl: any
  }
}

export class HikVideoController {
  private currentWindowIndex = 0
  private callbacks: Map<string, EventCallback[]> = new Map()
  private isInitialized = false

  constructor() {
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
            this.emit('windowSelect', selectedIndex)
            onWindowSelect?.(selectedIndex)
          },
          cbDoubleClickWnd: (windowIndex: number, isFullScreen: boolean) => {
            this.emit('windowDoubleClick', { windowIndex, isFullScreen })
            onWindowDoubleClick?.(windowIndex, isFullScreen)
          },
          cbEvent: (eventType: number, param1: number, param2: number) => {
            this.emit('event', { eventType, param1, param2 })

            // 处理特殊事件
            if (eventType === 2) {
              this.emit('playbackEnd', param1)
            }
            else if (eventType === -1) {
              this.emit('networkError', param1)
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
            this.emit('error', { windowIndex, errorCode, error, message: errorMessage })
            onError?.(windowIndex, errorCode, error)
          },
          cbPerformanceLack: () => {
            this.emit('performanceLack')
            onPerformanceLack?.()
          },
          cbSecretKeyError: (windowIndex: number) => {
            this.emit('secretKeyError', windowIndex)
            onSecretKeyError?.(windowIndex)
          },
        })
      }
      catch (error) {
        reject(error)
      }
    })
  }

  /**
   * 登录设备
   */
  async login(deviceInfo: DeviceInfo): Promise<void> {
    const { ip, port, username, password, protocol = ProtocolType.HTTP } = deviceInfo

    if (!isValidIP(ip)) {
      throw new Error('无效的IP地址')
    }

    if (!isValidPort(port)) {
      throw new Error('无效的端口号')
    }

    const deviceId = generateDeviceIdentify(ip, port)

    return promisify(
      window.WebVideoCtrl.I_Login,
      ip,
      protocol,
      port,
      username,
      password,
      {
        success: () => {
          this.emit('loginSuccess', { deviceId, ip, port })
        },
        error: (status: number, _xmlDoc: Document) => {
          throw new Error(`登录失败: ${status}`)
        },
      },
    )
  }

  /**
   * 登出设备
   */
  async logout(deviceId: string): Promise<void> {
    const result = window.WebVideoCtrl.I_Logout(deviceId)

    if (result === 0) {
      // 停止相关窗口的播放
      const windowSet = window.WebVideoCtrl.I_GetWndSet()
      windowSet.forEach((wnd: any) => {
        if (wnd.szDeviceIdentify === deviceId) {
          this.stopPreview(wnd.iIndex)
          window.WebVideoCtrl.I_SetSecretKey('', wnd.iIndex)
        }
      })

      this.emit('logoutSuccess', { deviceId })
    }
    else {
      throw new Error('登出失败')
    }
  }

  /**
   * 获取设备信息
   */
  async getDeviceInfo(deviceId: string): Promise<any> {
    return promisify(
      window.WebVideoCtrl.I_GetDeviceInfo,
      deviceId,
    )
  }

  /**
   * 获取设备端口信息
   */
  getDevicePort(deviceId: string): any {
    return window.WebVideoCtrl.I_GetDevicePort(deviceId)
  }

  /**
   * 获取通道信息
   */
  async getChannels(deviceId: string): Promise<any[]> {
    const channels: any[] = []

    try {
      // 获取模拟通道
      const analogChannels = await promisify(
        window.WebVideoCtrl.I_GetAnalogChannelInfo,
        deviceId,
      )
      if (analogChannels) {
        const videoChannels = analogChannels.querySelectorAll('VideoInputChannel')
        videoChannels.forEach((channel: Element, index: number) => {
          const id = channel.querySelector('id')?.textContent
          let name = channel.querySelector('name')?.textContent
          if (!name) {
            name = `Camera ${index < 9 ? `0${index + 1}` : (index + 1)}`
          }
          channels.push({ id, name, type: 'analog', isZero: false })
        })
      }
    }
    catch (error) {
      console.warn('获取模拟通道失败:', error)
    }

    try {
      // 获取数字通道
      const digitalChannels = await promisify(
        window.WebVideoCtrl.I_GetDigitalChannelInfo,
        deviceId,
      )
      if (digitalChannels) {
        const proxyChannels = digitalChannels.querySelectorAll('InputProxyChannelStatus')
        proxyChannels.forEach((channel: Element, index: number) => {
          const id = channel.querySelector('id')?.textContent
          const online = channel.querySelector('online')?.textContent
          let name = channel.querySelector('name')?.textContent

          if (online === 'true') {
            if (!name) {
              name = `IPCamera ${index < 9 ? `0${index + 1}` : (index + 1)}`
            }
            channels.push({ id, name, type: 'digital', isZero: false })
          }
        })
      }
    }
    catch (error) {
      console.warn('获取数字通道失败:', error)
    }

    try {
      // 获取零通道
      const zeroChannels = await promisify(
        window.WebVideoCtrl.I_GetZeroChannelInfo,
        deviceId,
      )
      if (zeroChannels) {
        const videoChannels = zeroChannels.querySelectorAll('ZeroVideoChannel')
        videoChannels.forEach((channel: Element, index: number) => {
          const id = channel.querySelector('id')?.textContent
          const enabled = channel.querySelector('enabled')?.textContent
          let name = channel.querySelector('name')?.textContent

          if (enabled === 'true') {
            if (!name) {
              name = `Zero Channel ${index < 9 ? `0${index + 1}` : (index + 1)}`
            }
            channels.push({ id, name, type: 'zero', isZero: true })
          }
        })
      }
    }
    catch (error) {
      console.warn('获取零通道失败:', error)
    }

    return channels
  }

  /**
   * 获取对讲通道信息
   */
  async getAudioInfo(deviceId: string): Promise<any> {
    return promisify(
      window.WebVideoCtrl.I_GetAudioInfo,
      deviceId,
    )
  }

  /**
   * 开始预览
   */
  async startPreview(options: PreviewOptions): Promise<void> {
    const {
      deviceId,
      channelId,
      streamType = StreamType.MainStream,
      windowIndex = this.currentWindowIndex,
      isZeroChannel = false,
      useProxy = false,
    } = options

    // 获取设备端口信息
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
          this.emit('previewStart', { deviceId, channelId, windowIndex, isZeroChannel })
        },
      },
    )
  }

  /**
   * 停止预览
   */
  async stopPreview(windowIndex?: number): Promise<void> {
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
          this.emit('previewStop', { deviceId: windowInfo.szDeviceIdentify, windowIndex: index })
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
  async startPlayback(options: PlaybackOptions): Promise<void> {
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

    // 获取设备端口信息
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
          this.emit('playbackStart', { deviceId, channelId, windowIndex, startTime, endTime, isZeroChannel })
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
   * PTZ控制
   */
  async ptzControl(options: PTZOptions, stop: boolean = false): Promise<void> {
    const {
      windowIndex = this.currentWindowIndex,
      ptzIndex,
      speed = 4,
    } = options

    return promisify(
      window.WebVideoCtrl.I_PTZControl,
      ptzIndex,
      stop,
      {
        iWndIndex: windowIndex,
        iPTZSpeed: speed,
      },
    )
  }

  /**
   * 设置预置点
   */
  async setPreset(presetId: number): Promise<void> {
    return promisify(window.WebVideoCtrl.I_SetPreset, presetId)
  }

  /**
   * 调用预置点
   */
  async goPreset(presetId: number): Promise<void> {
    return promisify(window.WebVideoCtrl.I_GoPreset, presetId)
  }

  /**
   * 搜索录像
   */
  async searchRecord(options: SearchRecordOptions): Promise<any[]> {
    const {
      deviceId,
      channelId,
      startTime,
      endTime,
      streamType = StreamType.MainStream,
    } = options

    if (!isValidTimeRange(startTime, endTime)) {
      throw new Error('无效的时间范围')
    }

    return promisify(
      window.WebVideoCtrl.I_RecordSearch,
      deviceId,
      channelId,
      startTime,
      endTime,
      {
        iStreamType: streamType,
      },
    )
  }

  /**
   * 开始录像
   */
  async startRecord(options: RecordOptions): Promise<void> {
    const {
      fileName,
      useDateDir = true,
    } = options

    const finalFileName = fileName || generateUniqueFileName('record', 'mp4')

    return promisify(
      window.WebVideoCtrl.I_StartRecord,
      finalFileName,
      {
        bDateDir: useDateDir,
        success: () => {
          this.emit('recordStart', { fileName: finalFileName })
        },
      },
    )
  }

  /**
   * 停止录像
   */
  async stopRecord(): Promise<void> {
    return promisify(
      window.WebVideoCtrl.I_StopRecord,
      {
        success: () => {
          this.emit('recordStop')
        },
      },
    )
  }

  /**
   * 抓图
   */
  async capturePicture(options: CaptureOptions): Promise<void> {
    const {
      fileName,
      format = FileFormat.JPEG,
      callback,
    } = options

    const finalFileName = fileName || generateUniqueFileName('capture', format)

    return promisify(
      window.WebVideoCtrl.I2_CapturePic,
      finalFileName,
      callback ? { cbCallback: callback } : undefined,
    )
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
   * 启用3D放大
   */
  async enable3DZoom(windowIndex?: number, callback?: (zoomInfo: any) => void): Promise<void> {
    const index = windowIndex ?? this.currentWindowIndex
    return promisify(window.WebVideoCtrl.I_Enable3DZoom, index, callback)
  }

  /**
   * 禁用3D放大
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
   * 切换窗口数量
   */
  changeWindowCount(windowType: number): void {
    window.WebVideoCtrl.I_ChangeWndNum(windowType)
  }

  /**
   * 设置码流加密秘钥
   */
  async setSecretKey(secretKey: string, windowIndex?: number): Promise<void> {
    const index = windowIndex ?? this.currentWindowIndex
    return promisify(window.WebVideoCtrl.I_SetSecretKey, secretKey, index)
  }

  /**
   * 获取OSD时间
   */
  async getOSDTime(): Promise<string> {
    return promisify(window.WebVideoCtrl.I_GetOSDTime)
  }

  /**
   * 获取窗口状态
   */
  getWindowStatus(windowIndex?: number): any {
    const index = windowIndex ?? this.currentWindowIndex
    return window.WebVideoCtrl.I_GetWindowStatus(index)
  }

  /**
   * 获取本地配置
   */
  getLocalConfig(): any {
    return window.WebVideoCtrl.I_GetLocalCfg()
  }

  /**
   * 设置本地配置
   */
  setLocalConfig(config: string): boolean {
    return window.WebVideoCtrl.I_SetLocalCfg(config) === 0
  }

  // ==================== 下载功能 ====================

  /**
   * 开始下载录像文件
   */
  async startDownloadRecord(
    deviceIdentify: string,
    playbackURI: string,
    fileName: string,
    options: { bDateDir?: boolean } = {},
  ): Promise<void> {
    return promisify(
      window.WebVideoCtrl.I_StartDownloadRecord,
      deviceIdentify,
      playbackURI,
      fileName,
      options,
    )
  }

  /**
   * 按时间下载录像文件
   */
  async startDownloadRecordByTime(
    deviceIdentify: string,
    playbackURI: string,
    fileName: string,
    startTime: string,
    endTime: string,
    options: { bDateDir?: boolean } = {},
  ): Promise<void> {
    return promisify(
      window.WebVideoCtrl.I_StartDownloadRecordByTime,
      deviceIdentify,
      playbackURI,
      fileName,
      startTime,
      endTime,
      options,
    )
  }

  // ==================== 设备配置功能 ====================

  /**
   * 导出设备配置
   */
  async exportDeviceConfig(deviceIdentify: string, password: string): Promise<void> {
    return promisify(window.WebVideoCtrl.I_ExportDeviceConfig, deviceIdentify, password)
  }

  /**
   * 导入设备配置
   */
  async importDeviceConfig(deviceIdentify: string, fileName: string, password: string, file: File): Promise<void> {
    return promisify(window.WebVideoCtrl.I_ImportDeviceConfig, deviceIdentify, fileName, password, file)
  }

  /**
   * 重启设备
   */
  async restart(deviceIdentify: string, options: CallbackOptions = {}): Promise<void> {
    return promisify(window.WebVideoCtrl.I_Restart, deviceIdentify, options)
  }

  /**
   * 重新连接设备
   */
  async reconnect(deviceIdentify: string, options: CallbackOptions = {}): Promise<void> {
    return promisify(window.WebVideoCtrl.I_Reconnect, deviceIdentify, options)
  }

  /**
   * 恢复设备默认设置
   */
  async restoreDefault(
    deviceIdentify: string,
    mode: 'basic' | 'full',
    options: CallbackOptions & { timeout?: number } = {},
  ): Promise<void> {
    return promisify(window.WebVideoCtrl.I_RestoreDefault, deviceIdentify, mode, options)
  }

  // ==================== 升级功能 ====================

  /**
   * 开始设备升级
   */
  async startUpgrade(deviceIdentify: string, fileName: string, file: File): Promise<void> {
    return promisify(window.WebVideoCtrl.I2_StartUpgrade, deviceIdentify, fileName, file)
  }

  /**
   * 获取升级进度
   */
  async getUpgradeProgress(deviceIdentify: string): Promise<{ percent: number, upgrading: boolean }> {
    return promisify(window.WebVideoCtrl.I_UpgradeProgress, deviceIdentify)
  }

  // ==================== 文件操作 ====================

  /**
   * 打开文件选择对话框
   */
  async openFileDlg(type: 0 | 1): Promise<{ szFileName: string, file: File }> {
    return promisify(window.WebVideoCtrl.I2_OpenFileDlg, type)
  }

  // ==================== HTTP请求功能 ====================

  /**
   * 发送HTTP请求
   */
  async sendHTTPRequest(deviceIdentify: string, url: string, options: any): Promise<any> {
    return promisify(window.WebVideoCtrl.I_SendHTTPRequest, deviceIdentify, url, options)
  }

  /**
   * 获取文字叠加配置
   */
  async getTextOverlay(url: string, deviceIdentify: string, options: CallbackOptions = {}): Promise<any> {
    return promisify(window.WebVideoCtrl.I_GetTextOverlay, url, deviceIdentify, options)
  }

  // ==================== 窗口管理 ====================

  /**
   * 获取窗口集合
   */
  getWndSet(): any[] {
    return window.WebVideoCtrl.I_GetWndSet()
  }

  // 事件系统
  on(event: string, callback: EventCallback): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, [])
    }
    this.callbacks.get(event)!.push(callback)
  }

  off(event: string, callback?: EventCallback): void {
    if (!this.callbacks.has(event))
      return

    if (callback) {
      const callbacks = this.callbacks.get(event)!
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
    else {
      this.callbacks.delete(event)
    }
  }

  private emit(event: string, data?: any): void {
    const callbacks = this.callbacks.get(event)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }

  private initEventHandlers(): void {
    // 初始化窗口大小调整事件
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        // 可以在这里处理窗口大小调整
      })
    }
  }

  // 工具方法
  static formatDate = formatDate
  static getCurrentTimeString = getCurrentTimeString
  static getTodayTimeRange = getTodayTimeRange
  static generateDeviceIdentify = generateDeviceIdentify
  static parseDeviceIdentify = parseDeviceIdentify
  static isValidIP = isValidIP
  static isValidPort = isValidPort
  static isValidTimeRange = isValidTimeRange
}
