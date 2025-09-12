import { ErrorCodes, StreamType, WindowType } from '../utils/constants'
import { WebVideoCtrl } from './WebVideoCtrl'

/**
 * 设备信息接口
 */
export interface DeviceInfo {
  ip: string
  port: number
  username: string
  password: string
  protocol?: number
}

/**
 * 初始化参数接口
 */
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

/**
 * 通道信息接口
 */
export interface ChannelInfo {
  id: string
  name: string
  isZero?: boolean
  isOnline?: boolean
}

/**
 * 录像搜索参数接口
 */
export interface RecordSearchParams {
  deviceId: string
  channelId: number
  startTime: string
  endTime: string
  streamType?: number
  searchPos?: number
}

/**
 * 录像文件信息接口
 */
export interface RecordFileInfo {
  fileName: string
  startTime: string
  endTime: string
  playbackURI: string
}

/**
 * 预览参数接口
 */
export interface PreviewParams {
  deviceId: string
  channelId: number
  streamType?: number
  windowIndex?: number
  isZeroChannel?: boolean
  useProxy?: boolean
}

/**
 * 回放参数接口
 */
export interface PlaybackParams {
  deviceId: string
  channelId: number
  startTime: string
  endTime: string
  streamType?: number
  windowIndex?: number
  useProxy?: boolean
}

/**
 * PTZ控制参数接口
 */
export interface PTZControlParams {
  windowIndex?: number
  ptzIndex: number
  speed?: number
}

/**
 * 抓图参数接口
 */
export interface CaptureParams {
  windowIndex?: number
  fileName?: string
  format?: 'jpg' | 'jpeg' | 'bmp'
  callback?: (imageData: Uint8Array) => void
}

/**
 * 录像参数接口
 */
export interface RecordParams {
  windowIndex?: number
  fileName?: string
  useDateDir?: boolean
}

/**
 * 海康视频控制器类
 * 封装了海康威视WebSDK的主要功能，提供现代化的API接口
 */
export class Controller {
  private webVideoCtrl: any
  private currentWindowIndex = 0
  private loggedDevices: Set<string> = new Set()
  private eventCallbacks: Map<string, Function[]> = new Map()

  constructor() {
    // 初始化WebVideoCtrl实例
    this.webVideoCtrl = new (WebVideoCtrl as any)()
  }

  /**
   * 检查浏览器是否支持无插件模式
   */
  static isSupportNoPlugin(): boolean {
    const webVideoCtrl = new (WebVideoCtrl as any)()
    return webVideoCtrl.I_SupportNoPlugin()
  }

  /**
   * 初始化插件
   */
  async initPlugin(options: InitOptions): Promise<void> {
    return new Promise((resolve, reject) => {
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

      // 检查容器是否存在
      const container = document.getElementById(containerId)
      if (!container) {
        reject(new Error(`Container with id '${containerId}' not found`))
        return
      }

      // 初始化插件参数
      this.webVideoCtrl.I_InitPlugin(width, height, {
        bWndFull: true,
        iPackageType: packageType,
        iWndowType: windowType,
        bNoPlugin: noPlugin,
        cbSelWnd: (xmlDoc: any) => {
          const selectWnd = this.parseXMLValue(xmlDoc, 'SelectWnd')
          this.currentWindowIndex = Number.parseInt(selectWnd, 10)
          onWindowSelect?.(this.currentWindowIndex)
          this.emit('windowSelect', this.currentWindowIndex)
        },
        cbDoubleClickWnd: (windowIndex: number, isFullScreen: boolean) => {
          onWindowDoubleClick?.(windowIndex, isFullScreen)
          this.emit('windowDoubleClick', { windowIndex, isFullScreen })
        },
        cbEvent: (eventType: number, param1: number, param2: number) => {
          onEvent?.(eventType, param1, param2)
          this.emit('event', { eventType, param1, param2 })
          
          // 处理特殊事件
          if (eventType === 2) {
            this.emit('playbackEnd', param1)
          } else if (eventType === -1) {
            this.emit('networkError', param1)
          }
        },
        cbInitPluginComplete: () => {
          // 插入插件
          const result = this.webVideoCtrl.I_InsertOBJECTPlugin(containerId)
          if (result === 0) {
            resolve()
          } else {
            reject(new Error('Failed to insert plugin'))
          }
        },
        cbPluginErrorHandler: (windowIndex: number, errorCode: number, error: any) => {
          onError?.(windowIndex, errorCode, error)
          this.emit('error', { windowIndex, errorCode, error, message: ErrorCodes[errorCode] })
        },
        cbPerformanceLack: () => {
          onPerformanceLack?.()
          this.emit('performanceLack')
        },
        cbSecretKeyError: (windowIndex: number) => {
          onSecretKeyError?.(windowIndex)
          this.emit('secretKeyError', windowIndex)
        },
      })
    })
  }

  /**
   * 登录设备
   */
  async login(deviceInfo: DeviceInfo): Promise<void> {
    const { ip, port, username, password, protocol = 1 } = deviceInfo
    const deviceId = `${ip}_${port}`

    // 检查是否已登录
    if (this.loggedDevices.has(deviceId)) {
      throw new Error('Device already logged in')
    }

    return new Promise((resolve, reject) => {
      const result = this.webVideoCtrl.I_Login(ip, protocol, port, username, password, {
        success: () => {
          this.loggedDevices.add(deviceId)
          this.emit('loginSuccess', { deviceId, ip, port })
          resolve()
        },
        error: (status: number) => {
          const error = new Error(`Login failed: ${status}`)
          this.emit('loginError', { deviceId, status, error })
          reject(error)
        },
      })

      if (result === -1) {
        const error = new Error('Device already logged in')
        this.emit('loginError', { deviceId, error })
        reject(error)
      }
    })
  }

  /**
   * 登出设备
   */
  async logout(deviceId: string): Promise<void> {
    if (!this.loggedDevices.has(deviceId)) {
      throw new Error('Device not logged in')
    }

    return new Promise((resolve, reject) => {
      // 先停止所有相关的播放
      this.stopAllPlayForDevice(deviceId)

      const result = this.webVideoCtrl.I_Logout(deviceId)
      if (result === 0) {
        this.loggedDevices.delete(deviceId)
        this.emit('logoutSuccess', deviceId)
        resolve()
      } else {
        const error = new Error('Logout failed')
        this.emit('logoutError', { deviceId, error })
        reject(error)
      }
    })
  }

  /**
   * 获取设备信息
   */
  async getDeviceInfo(deviceId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.webVideoCtrl.I_GetDeviceInfo(deviceId, {
        success: (xmlDoc: any) => {
          const deviceInfo = this.parseDeviceInfoXML(xmlDoc)
          resolve(deviceInfo)
        },
        error: (status: number) => {
          reject(new Error(`Failed to get device info: ${status}`))
        },
      })
    })
  }

  /**
   * 获取通道信息
   */
  async getChannels(deviceId: string): Promise<ChannelInfo[]> {
    const channels: ChannelInfo[] = []

    // 获取模拟通道
    try {
      const analogChannels = await this.getAnalogChannels(deviceId)
      channels.push(...analogChannels)
    } catch (error) {
      console.warn('Failed to get analog channels:', error)
    }

    // 获取数字通道
    try {
      const digitalChannels = await this.getDigitalChannels(deviceId)
      channels.push(...digitalChannels)
    } catch (error) {
      console.warn('Failed to get digital channels:', error)
    }

    // 获取零通道
    try {
      const zeroChannels = await this.getZeroChannels(deviceId)
      channels.push(...zeroChannels)
    } catch (error) {
      console.warn('Failed to get zero channels:', error)
    }

    return channels
  }

  /**
   * 开始预览
   */
  async startPreview(params: PreviewParams): Promise<void> {
    const {
      deviceId,
      channelId,
      streamType = StreamType.MainStream,
      windowIndex = this.currentWindowIndex,
      isZeroChannel = false,
      useProxy = false,
    } = params

    return new Promise((resolve, reject) => {
      this.webVideoCtrl.I_StartRealPlay(deviceId, {
        iWndIndex: windowIndex,
        iStreamType: streamType,
        iChannelID: channelId,
        bZeroChannel: isZeroChannel,
        bProxy: useProxy,
        success: () => {
          this.emit('previewStart', { deviceId, channelId, windowIndex })
          resolve()
        },
        error: (status: number) => {
          const error = new Error(`Preview failed: ${status}`)
          this.emit('previewError', { deviceId, channelId, error })
          reject(error)
        },
      })
    })
  }

  /**
   * 停止预览
   */
  async stopPreview(windowIndex: number = this.currentWindowIndex): Promise<void> {
    return new Promise((resolve, reject) => {
      this.webVideoCtrl.I_Stop({
        iWndIndex: windowIndex,
        success: () => {
          this.emit('previewStop', windowIndex)
          resolve()
        },
        error: () => {
          const error = new Error('Stop preview failed')
          this.emit('previewStopError', { windowIndex, error })
          reject(error)
        },
      })
    })
  }

  /**
   * 停止所有预览
   */
  async stopAllPreview(): Promise<void> {
    try {
      await this.webVideoCtrl.I_StopAll()
      this.emit('allPreviewStop')
    } catch (error) {
      this.emit('allPreviewStopError', error)
      throw error
    }
  }

  /**
   * 开始回放
   */
  async startPlayback(params: PlaybackParams): Promise<void> {
    const {
      deviceId,
      channelId,
      startTime,
      endTime,
      streamType = StreamType.MainStream,
      windowIndex = this.currentWindowIndex,
      useProxy = false,
    } = params

    return new Promise((resolve, reject) => {
      this.webVideoCtrl.I_StartPlayback(deviceId, {
        iWndIndex: windowIndex,
        iStreamType: streamType,
        iChannelID: channelId,
        szStartTime: startTime,
        szEndTime: endTime,
        bProxy: useProxy,
        success: () => {
          this.emit('playbackStart', { deviceId, channelId, windowIndex, startTime, endTime })
          resolve()
        },
        error: (status: number) => {
          const error = new Error(`Playback failed: ${status}`)
          this.emit('playbackError', { deviceId, channelId, error })
          reject(error)
        },
      })
    })
  }

  /**
   * 暂停回放
   */
  async pausePlayback(windowIndex: number = this.currentWindowIndex): Promise<void> {
    return new Promise((resolve, reject) => {
      this.webVideoCtrl.I_Pause({
        iWndIndex: windowIndex,
        success: () => {
          this.emit('playbackPause', windowIndex)
          resolve()
        },
        error: () => {
          reject(new Error('Pause playback failed'))
        },
      })
    })
  }

  /**
   * 恢复回放
   */
  async resumePlayback(windowIndex: number = this.currentWindowIndex): Promise<void> {
    return new Promise((resolve, reject) => {
      this.webVideoCtrl.I_Resume({
        iWndIndex: windowIndex,
        success: () => {
          this.emit('playbackResume', windowIndex)
          resolve()
        },
        error: () => {
          reject(new Error('Resume playback failed'))
        },
      })
    })
  }

  /**
   * 快进
   */
  async playFast(windowIndex: number = this.currentWindowIndex): Promise<void> {
    return new Promise((resolve, reject) => {
      this.webVideoCtrl.I_PlayFast({
        iWndIndex: windowIndex,
        success: () => {
          this.emit('playbackFast', windowIndex)
          resolve()
        },
        error: () => {
          reject(new Error('Play fast failed'))
        },
      })
    })
  }

  /**
   * 慢放
   */
  async playSlow(windowIndex: number = this.currentWindowIndex): Promise<void> {
    return new Promise((resolve, reject) => {
      this.webVideoCtrl.I_PlaySlow({
        iWndIndex: windowIndex,
        success: () => {
          this.emit('playbackSlow', windowIndex)
          resolve()
        },
        error: () => {
          reject(new Error('Play slow failed'))
        },
      })
    })
  }

  /**
   * PTZ控制
   */
  async ptzControl(params: PTZControlParams, isStop: boolean = false): Promise<void> {
    const { windowIndex = this.currentWindowIndex, ptzIndex, speed = 4 } = params

    return new Promise((resolve, reject) => {
      this.webVideoCtrl.I_PTZControl(ptzIndex, isStop, {
        iWndIndex: windowIndex,
        iPTZSpeed: speed,
        success: () => {
          this.emit('ptzControl', { windowIndex, ptzIndex, isStop, speed })
          resolve()
        },
        error: (status: number) => {
          reject(new Error(`PTZ control failed: ${status}`))
        },
      })
    })
  }

  /**
   * 设置预置点
   */
  async setPreset(presetId: number, windowIndex: number = this.currentWindowIndex): Promise<void> {
    return new Promise((resolve, reject) => {
      this.webVideoCtrl.I_SetPreset(presetId, {
        iWndIndex: windowIndex,
        success: () => {
          this.emit('presetSet', { windowIndex, presetId })
          resolve()
        },
        error: (status: number) => {
          reject(new Error(`Set preset failed: ${status}`))
        },
      })
    })
  }

  /**
   * 调用预置点
   */
  async goPreset(presetId: number, windowIndex: number = this.currentWindowIndex): Promise<void> {
    return new Promise((resolve, reject) => {
      this.webVideoCtrl.I_GoPreset(presetId, {
        iWndIndex: windowIndex,
        success: () => {
          this.emit('presetGo', { windowIndex, presetId })
          resolve()
        },
        error: (status: number) => {
          reject(new Error(`Go preset failed: ${status}`))
        },
      })
    })
  }

  /**
   * 搜索录像
   */
  async searchRecord(params: RecordSearchParams): Promise<RecordFileInfo[]> {
    const { deviceId, channelId, startTime, endTime, streamType = StreamType.MainStream, searchPos = 0 } = params

    return new Promise((resolve, reject) => {
      this.webVideoCtrl.I_RecordSearch(deviceId, channelId, startTime, endTime, {
        iStreamType: streamType,
        iSearchPos: searchPos,
        success: (xmlDoc: any) => {
          const records = this.parseRecordSearchXML(xmlDoc)
          this.emit('recordSearch', { deviceId, channelId, records })
          resolve(records)
        },
        error: (status: number) => {
          reject(new Error(`Record search failed: ${status}`))
        },
      })
    })
  }

  /**
   * 抓图
   */
  async capturePicture(params: CaptureParams = {}): Promise<void> {
    const { windowIndex = this.currentWindowIndex, fileName, format = 'jpg', callback } = params

    const finalFileName = fileName || `capture_${Date.now()}.${format}`

    try {
      await this.webVideoCtrl.I2_CapturePic(finalFileName, {
        iWndIndex: windowIndex,
        cbCallback: callback,
      })
      this.emit('captureSuccess', { windowIndex, fileName: finalFileName })
    } catch (error) {
      this.emit('captureError', { windowIndex, error })
      throw new Error('Capture picture failed')
    }
  }

  /**
   * 开始录像
   */
  async startRecord(params: RecordParams = {}): Promise<void> {
    const { windowIndex = this.currentWindowIndex, fileName, useDateDir = true } = params

    const finalFileName = fileName || `record_${Date.now()}`

    return new Promise((resolve, reject) => {
      this.webVideoCtrl.I_StartRecord(finalFileName, {
        iWndIndex: windowIndex,
        bDateDir: useDateDir,
        success: () => {
          this.emit('recordStart', { windowIndex, fileName: finalFileName })
          resolve()
        },
        error: () => {
          const error = new Error('Start record failed')
          this.emit('recordError', { windowIndex, error })
          reject(error)
        },
      })
    })
  }

  /**
   * 停止录像
   */
  async stopRecord(windowIndex: number = this.currentWindowIndex): Promise<void> {
    return new Promise((resolve, reject) => {
      this.webVideoCtrl.I_StopRecord({
        iWndIndex: windowIndex,
        success: () => {
          this.emit('recordStop', windowIndex)
          resolve()
        },
        error: () => {
          const error = new Error('Stop record failed')
          this.emit('recordError', { windowIndex, error })
          reject(error)
        },
      })
    })
  }

  /**
   * 打开声音
   */
  async openSound(windowIndex: number = this.currentWindowIndex): Promise<void> {
    try {
      await this.webVideoCtrl.I_OpenSound(windowIndex)
      this.emit('soundOpen', windowIndex)
    } catch (error) {
      this.emit('soundError', { windowIndex, error })
      throw new Error('Open sound failed')
    }
  }

  /**
   * 关闭声音
   */
  async closeSound(windowIndex: number = this.currentWindowIndex): Promise<void> {
    try {
      await this.webVideoCtrl.I_CloseSound(windowIndex)
      this.emit('soundClose', windowIndex)
    } catch (error) {
      this.emit('soundError', { windowIndex, error })
      throw new Error('Close sound failed')
    }
  }

  /**
   * 设置音量
   */
  async setVolume(volume: number, windowIndex: number = this.currentWindowIndex): Promise<void> {
    if (volume < 0 || volume > 100) {
      throw new Error('Volume must be between 0 and 100')
    }

    try {
      await this.webVideoCtrl.I_SetVolume(volume, windowIndex)
      this.emit('volumeSet', { windowIndex, volume })
    } catch (error) {
      this.emit('volumeError', { windowIndex, error })
      throw new Error('Set volume failed')
    }
  }

  /**
   * 切换窗口数量
   */
  async changeWindowCount(count: number): Promise<void> {
    try {
      await this.webVideoCtrl.I_ChangeWndNum(count)
      this.emit('windowCountChange', count)
    } catch (error) {
      this.emit('windowCountError', error)
      throw new Error('Change window count failed')
    }
  }

  /**
   * 全屏显示
   */
  fullScreen(): void {
    this.webVideoCtrl.I_FullScreen(true)
    this.emit('fullScreen')
  }

  /**
   * 启用电子放大
   */
  async enableEZoom(windowIndex: number = this.currentWindowIndex): Promise<void> {
    try {
      await this.webVideoCtrl.I_EnableEZoom(windowIndex)
      this.emit('eZoomEnable', windowIndex)
    } catch (error) {
      this.emit('eZoomError', { windowIndex, error })
      throw new Error('Enable eZoom failed')
    }
  }

  /**
   * 禁用电子放大
   */
  async disableEZoom(windowIndex: number = this.currentWindowIndex): Promise<void> {
    try {
      await this.webVideoCtrl.I_DisableEZoom(windowIndex)
      this.emit('eZoomDisable', windowIndex)
    } catch (error) {
      this.emit('eZoomError', { windowIndex, error })
      throw new Error('Disable eZoom failed')
    }
  }

  /**
   * 启用3D放大
   */
  async enable3DZoom(windowIndex: number = this.currentWindowIndex, callback?: (zoomInfo: any) => void): Promise<void> {
    try {
      await this.webVideoCtrl.I_Enable3DZoom(windowIndex, callback)
      this.emit('3DZoomEnable', windowIndex)
    } catch (error) {
      this.emit('3DZoomError', { windowIndex, error })
      throw new Error('Enable 3D zoom failed')
    }
  }

  /**
   * 禁用3D放大
   */
  disable3DZoom(windowIndex: number = this.currentWindowIndex): void {
    const result = this.webVideoCtrl.I_Disable3DZoom(windowIndex)
    if (result === 0) {
      this.emit('3DZoomDisable', windowIndex)
    } else {
      const error = new Error('Disable 3D zoom failed')
      this.emit('3DZoomError', { windowIndex, error })
      throw error
    }
  }

  /**
   * 获取OSD时间
   */
  async getOSDTime(windowIndex: number = this.currentWindowIndex): Promise<string> {
    return new Promise((resolve, reject) => {
      this.webVideoCtrl.I_GetOSDTime({
        iWndIndex: windowIndex,
        success: (time: string) => {
          resolve(time)
        },
        error: () => {
          reject(new Error('Get OSD time failed'))
        },
      })
    })
  }

  /**
   * 下载录像
   */
  async downloadRecord(deviceId: string, playbackURI: string, fileName?: string): Promise<void> {
    const finalFileName = fileName || `download_${Date.now()}.mp4`

    try {
      await this.webVideoCtrl.I_StartDownloadRecord(deviceId, playbackURI, finalFileName)
      this.emit('downloadSuccess', { deviceId, fileName: finalFileName })
    } catch (error) {
      this.emit('downloadError', { deviceId, error })
      throw new Error('Download record failed')
    }
  }

  /**
   * 按时间段下载录像
   */
  async downloadRecordByTime(
    deviceId: string,
    playbackURI: string,
    startTime: string,
    endTime: string,
    fileName?: string,
  ): Promise<void> {
    const finalFileName = fileName || `download_${Date.now()}.mp4`

    try {
      await this.webVideoCtrl.I_StartDownloadRecordByTime(deviceId, playbackURI, finalFileName, startTime, endTime)
      this.emit('downloadSuccess', { deviceId, fileName: finalFileName })
    } catch (error) {
      this.emit('downloadError', { deviceId, error })
      throw new Error('Download record by time failed')
    }
  }

  /**
   * 事件监听
   */
  on(event: string, callback: Function): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, [])
    }
    this.eventCallbacks.get(event)!.push(callback)
  }

  /**
   * 移除事件监听
   */
  off(event: string, callback?: Function): void {
    if (!this.eventCallbacks.has(event)) return

    if (callback) {
      const callbacks = this.eventCallbacks.get(event)!
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    } else {
      this.eventCallbacks.delete(event)
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, data?: any): void {
    const callbacks = this.eventCallbacks.get(event)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }

  /**
   * 格式化时间
   */
  static formatDate(date: Date, format: string): string {
    const o: Record<string, number> = {
      'M+': date.getMonth() + 1, // 月份
      'd+': date.getDate(), // 日
      'h+': date.getHours(), // 小时
      'm+': date.getMinutes(), // 分
      's+': date.getSeconds(), // 秒
      'q+': Math.floor((date.getMonth() + 3) / 3), // 季度
      'S': date.getMilliseconds(), // 毫秒
    }

    if (/(y+)/.test(format)) {
      format = format.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length))
    }

    for (const k in o) {
      if (new RegExp('(' + k + ')').test(format)) {
        format = format.replace(RegExp.$1, (RegExp.$1.length === 1) ? String(o[k]) : (('00' + o[k]).substr(('' + o[k]).length)))
      }
    }
    return format
  }

  /**
   * 获取当前时间字符串
   */
  static getCurrentTimeString(): string {
    return Controller.formatDate(new Date(), 'yyyy-MM-dd hh:mm:ss')
  }

  /**
   * 获取今天的开始和结束时间
   */
  static getTodayTimeRange(): { startTime: string; endTime: string } {
    const today = Controller.formatDate(new Date(), 'yyyy-MM-dd')
    return {
      startTime: `${today} 00:00:00`,
      endTime: `${today} 23:59:59`,
    }
  }

  // 私有辅助方法

  /**
   * 解析XML值
   */
  private parseXMLValue(_xmlDoc: any, _tagName: string): string {
    // 这里需要根据实际的XML解析实现
    // 暂时返回空字符串，实际应用中需要实现XML解析逻辑
    return ''
  }

  /**
   * 解析设备信息XML
   */
  private parseDeviceInfoXML(_xmlDoc: any): any {
    // 实现设备信息XML解析
    return {}
  }

  /**
   * 解析录像搜索结果XML
   */
  private parseRecordSearchXML(_xmlDoc: any): RecordFileInfo[] {
    // 实现录像搜索结果XML解析
    return []
  }

  /**
   * 获取模拟通道
   */
  private async getAnalogChannels(deviceId: string): Promise<ChannelInfo[]> {
    return new Promise((resolve, reject) => {
      this.webVideoCtrl.I_GetAnalogChannelInfo(deviceId, {
        success: () => {
          // 解析模拟通道信息
          resolve([])
        },
        error: (status: number) => {
          reject(new Error(`Get analog channels failed: ${status}`))
        },
      })
    })
  }

  /**
   * 获取数字通道
   */
  private async getDigitalChannels(deviceId: string): Promise<ChannelInfo[]> {
    return new Promise((resolve, reject) => {
      this.webVideoCtrl.I_GetDigitalChannelInfo(deviceId, {
        success: () => {
          // 解析数字通道信息
          resolve([])
        },
        error: (status: number) => {
          reject(new Error(`Get digital channels failed: ${status}`))
        },
      })
    })
  }

  /**
   * 获取零通道
   */
  private async getZeroChannels(deviceId: string): Promise<ChannelInfo[]> {
    return new Promise((resolve, reject) => {
      this.webVideoCtrl.I_GetZeroChannelInfo(deviceId, {
        success: () => {
          // 解析零通道信息
          resolve([])
        },
        error: (status: number) => {
          reject(new Error(`Get zero channels failed: ${status}`))
        },
      })
    })
  }

  /**
   * 停止指定设备的所有播放
   */
  private stopAllPlayForDevice(deviceId: string): void {
    // 获取所有窗口状态并停止相关设备的播放
    const windowSet = this.webVideoCtrl.I_GetWndSet()
    windowSet?.forEach((window: any) => {
      if (window.szDeviceIdentify === deviceId) {
        this.webVideoCtrl.I_Stop({
          iIndex: window.iIndex,
          success: () => {},
          error: () => {},
        })
      }
    })
  }
}
