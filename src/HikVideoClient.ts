import type {
  CaptureOptions,
  ChannelInfo,
  DeviceCredentials,
  DevicePort,
  DeviceSession,
  DownloadByTimeOptions,
  DownloadOptions,
  HikVideoEventMap,
  HTTPRequestOptions,
  PlaybackOptions,
  PluginInitOptions,
  PreviewOptions,
  PTZCommandOptions,
  RecordingOptions,
  RecordSearchOptions,
} from './types'
import { EventBus } from './core/EventBus'
import { PluginHost } from './core/PluginHost'
import { WebVideoBridge } from './core/WebVideoBridge'
import { HikSDKError } from './errors'
import { ConfigService } from './services/ConfigService'
import { DeviceService } from './services/DeviceService'
import { PTZService } from './services/PTZService'
import { RecordingService } from './services/RecordingService'
import { VideoService } from './services/VideoService'

/**
 * 海康视频客户端
 * @example
 * ```typescript
 * const client = createHikVideoClient()
 *
 * // 初始化
 * await client.initialize({
 *   container: '#video-container',
 *   width: 1000,
 *   height: 600,
 *   layout: 4
 * })
 *
 * // 连接设备
 * const device = await client.connectDevice({
 *   host: '192.168.1.64',
 *   username: 'admin',
 *   password: 'password'
 * })
 *
 * // 开始预览
 * await client.startPreview(device.id, {
 *   channel: 1,
 *   windowIndex: 0
 * })
 * ```
 */
export class HikVideoClient {
  /** SDK 桥接实例 */
  private readonly bridge: WebVideoBridge

  /** 事件总线实例 */
  private readonly events: EventBus<HikVideoEventMap>

  /** 插件宿主实例 */
  private readonly plugin: PluginHost

  /** 设备管理服务 */
  private readonly devices: DeviceService

  /** 视频服务 */
  private readonly video: VideoService

  /** PTZ 控制服务 */
  private readonly ptz: PTZService

  /** 录像服务 */
  private readonly recording: RecordingService

  /** 配置服务 */
  private readonly config: ConfigService

  /**
   * 构造函数
   * @param bridge SDK 桥接实例（可选）
   */
  constructor(bridge?: WebVideoBridge) {
    this.bridge = bridge ?? new WebVideoBridge()
    this.events = new EventBus<HikVideoEventMap>()
    this.plugin = new PluginHost(this.bridge, this.events)
    this.devices = new DeviceService(this.bridge, this.plugin, this.events)
    this.video = new VideoService(this.bridge, this.plugin, this.events)
    this.ptz = new PTZService(this.bridge, this.plugin)
    this.recording = new RecordingService(this.bridge, this.plugin, this.events)
    this.config = new ConfigService(this.bridge, this.plugin)
  }

  /**
   * 获取插件初始化状态
   */
  get isInitialized(): boolean {
    return this.plugin.isInitialized
  }

  /**
   * 获取当前活动窗口索引
   */
  get activeWindow(): number {
    return this.plugin.activeWindow
  }

  /**
   * 检查是否支持无插件模式
   * @returns 是否支持
   */
  supportsNoPlugin(): boolean {
    return this.bridge.isNoPluginSupported()
  }

  /**
   * 初始化视频插件（必须首先调用）
   * @param options 初始化选项
   * @returns Promise，在插件初始化完成后解析
   * @throws {HikSDKError} 当浏览器不支持或初始化失败时抛出错误
   * @example
   * ```typescript
   * await client.initialize({
   *   container: '#video-container',
   *   width: 1000,
   *   height: 600,
   *   layout: 4
   * })
   * ```
   */
  async initialize(options: PluginInitOptions): Promise<void> {
    if (!this.supportsNoPlugin())
      throw new HikSDKError('sdk-not-found', '当前浏览器不支持 WebVideoCtrl 无插件模式')

    await this.plugin.init(options)
  }

  /**
   * 订阅事件
   * @param event 事件名称
   * @param handler 事件处理器
   * @returns 取消订阅函数
   * @example
   * ```typescript
   * const unsubscribe = client.on('device:connected', (device) => {
   *   console.log('设备已连接:', device.host)
   * })
   *
   * // 取消订阅
   * unsubscribe()
   * ```
   */
  on<K extends keyof HikVideoEventMap>(event: K, handler: (payload: HikVideoEventMap[K]) => void): () => void {
    return this.events.on(event, handler)
  }

  /**
   * 取消订阅事件
   * @param event 事件名称
   * @param handler 事件处理器（可选）
   * @example
   * ```typescript
   * // 移除特定处理器
   * client.off('device:connected', handler)
   * // 移除所有处理器
   * client.off('device:connected')
   * ```
   */
  off<K extends keyof HikVideoEventMap>(event: K, handler?: (payload: HikVideoEventMap[K]) => void): void {
    this.events.off(event, handler as any)
  }

  /**
   * 获取所有已连接设备列表
   * @returns 设备会话数组
   * @example
   * ```typescript
   * const devices = client.listDevices()
   * devices.forEach(dev => {
   *   console.log(`设备: ${dev.host}:${dev.port}`)
   * })
   * ```
   */
  listDevices(): DeviceSession[] {
    return this.devices.list()
  }

  /**
   * 获取指定设备信息
   * @param deviceId 设备 ID
   * @returns 设备会话信息或 undefined
   * @example
   * ```typescript
   * const device = client.getDevice(deviceId)
   * if (device) {
   *   console.log('设备已连接:', device.host)
   * }
   * ```
   */
  getDevice(deviceId: string): DeviceSession | undefined {
    return this.devices.get(deviceId)
  }

  /**
   * 连接海康设备
   * @param credentials 设备凭证信息
   * @returns Promise，解析为连接成功的设备会话信息
   * @throws {HikSDKError} 当连接失败时抛出错误
   * @example
   * ```typescript
   * const device = await client.connectDevice({
   *   host: '192.168.1.64',
   *   port: 80,
   *   username: 'admin',
   *   password: 'password',
   *   protocol: 'http'
   * })
   * console.log('设备ID:', device.id)
   * ```
   */
  async connectDevice(credentials: DeviceCredentials): Promise<DeviceSession> {
    this.ensureInitialized()
    return this.devices.connect(credentials)
  }

  /**
   * 断开设备连接
   * @param deviceId 设备 ID
   * @returns Promise，在断开完成后解析
   * @throws {HikSDKError} 当断开失败时抛出错误
   * @example
   * ```typescript
   * await client.disconnectDevice(device.id)
   * ```
   */
  async disconnectDevice(deviceId: string): Promise<void> {
    this.ensureInitialized()
    await this.devices.disconnect(deviceId)
  }

  /**
   * 获取设备详细信息（XML 格式）
   * @param deviceId 设备 ID
   * @returns Promise，解析为设备信息的 XML 文档
   * @throws {HikSDKError} 当获取失败时抛出错误
   * @example
   * ```typescript
   * const xmlDoc = await client.getDeviceInfo(device.id)
   * const deviceName = xmlDoc.querySelector('deviceName')?.textContent
   * const model = xmlDoc.querySelector('model')?.textContent
   * ```
   */
  async getDeviceInfo(deviceId: string): Promise<Document> {
    this.ensureInitialized()
    return this.devices.getInfo(deviceId)
  }

  /**
   * 获取设备端口信息
   * @param deviceId 设备 ID
   * @returns 端口信息
   * @throws {HikSDKError} 当获取失败时抛出错误
   * @example
   * ```typescript
   * const portInfo = client.getDevicePort(device.id)
   * console.log('设备端口:', portInfo.iDevicePort)
   * console.log('RTSP 端口:', portInfo.iRtspPort)
   * ```
   */
  getDevicePort(deviceId: string): DevicePort {
    this.ensureInitialized()
    return this.devices.getPort(deviceId)
  }

  /**
   * 获取设备所有通道信息
   * @param deviceId 设备 ID
   * @returns Promise，解析为通道信息数组
   * @throws {HikSDKError} 当获取失败时抛出错误
   * @example
   * ```typescript
   * const channels = await client.getChannels(device.id)
   * channels.forEach(ch => {
   *   console.log(`通道 ${ch.id}: ${ch.name}`)
   * })
   * ```
   */
  async getChannels(deviceId: string): Promise<ChannelInfo[]> {
    this.ensureInitialized()
    return this.devices.getChannels(deviceId)
  }

  /**
   * 获取设备音频信息
   * @param deviceId 设备 ID
   * @returns Promise，解析为音频信息的 XML 文档
   * @throws {HikSDKError} 当获取失败时抛出错误
   * @example
   * ```typescript
   * const audioDoc = await client.getAudioInfo(device.id)
   * ```
   */
  async getAudioInfo(deviceId: string): Promise<Document> {
    this.ensureInitialized()
    return this.devices.getAudioInfo(deviceId)
  }

  /**
   * 导出设备配置
   * @param deviceId 设备 ID
   * @param password 配置密码
   * @returns Promise，在配置导出完成后解析
   * @throws {HikSDKError} 当导出失败时抛出错误
   * @example
   * ```typescript
   * await client.exportDeviceConfig(device.id, 'config_password')
   * ```
   */
  async exportDeviceConfig(deviceId: string, password: string): Promise<void> {
    this.ensureInitialized()
    await this.devices.exportConfig(deviceId, password)
  }

  /**
   * 导入设备配置
   * @param deviceId 设备 ID
   * @param fileName 文件名
   * @param password 配置密码
   * @param file 配置文件
   * @returns Promise，在配置导入完成后解析
   * @throws {HikSDKError} 当导入失败时抛出错误
   * @example
   * ```typescript
   * const file = document.querySelector('input[type="file"]').files[0]
   * await client.importDeviceConfig(device.id, 'config.bin', 'password', file)
   * ```
   */
  async importDeviceConfig(deviceId: string, fileName: string, password: string, file: File): Promise<void> {
    this.ensureInitialized()
    await this.devices.importConfig(deviceId, fileName, password, file)
  }

  /**
   * 重启设备
   * @param deviceId 设备 ID
   * @returns Promise，在重启命令下发后解析
   * @throws {HikSDKError} 当重启失败时抛出错误
   * @example
   * ```typescript
   * await client.restartDevice(device.id)
   * ```
   */
  async restartDevice(deviceId: string): Promise<void> {
    this.ensureInitialized()
    await this.devices.restart(deviceId)
  }

  /**
   * 重新连接设备
   * @param deviceId 设备 ID
   * @returns Promise，在重连完成后解析
   * @throws {HikSDKError} 当重连失败时抛出错误
   * @example
   * ```typescript
   * await client.reconnectDevice(device.id)
   * ```
   */
  async reconnectDevice(deviceId: string): Promise<void> {
    this.ensureInitialized()
    await this.devices.reconnect(deviceId)
  }

  /**
   * 恢复设备出厂设置
   * @param deviceId 设备 ID
   * @param mode 恢复模式（'basic' 基本恢复 | 'full' 完全恢复）
   * @returns Promise，在命令执行完成后解析
   * @throws {HikSDKError} 当恢复失败时抛出错误
   * @example
   * ```typescript
   * // 基本恢复
   * await client.restoreDeviceDefault(device.id, 'basic')
   * // 完全恢复
   * await client.restoreDeviceDefault(device.id, 'full')
   * ```
   */
  async restoreDeviceDefault(deviceId: string, mode: 'basic' | 'full'): Promise<void> {
    this.ensureInitialized()
    await this.devices.restoreDefault(deviceId, mode)
  }

  /**
   * 开始设备固件升级
   * @param deviceId 设备 ID
   * @param fileName 固件文件名
   * @param file 固件文件
   * @returns Promise，在升级任务启动后解析
   * @throws {HikSDKError} 当升级失败时抛出错误
   * @example
   * ```typescript
   * const file = document.querySelector('input[type="file"]').files[0]
   * await client.startUpgrade(device.id, 'firmware.bin', file)
   * ```
   */
  async startUpgrade(deviceId: string, fileName: string, file: File): Promise<void> {
    this.ensureInitialized()
    await this.devices.startUpgrade(deviceId, fileName, file)
  }

  /**
   * 获取设备升级进度
   * @param deviceId 设备 ID
   * @returns Promise，解析为升级进度信息
   * @throws {HikSDKError} 当获取失败时抛出错误
   * @example
   * ```typescript
   * const progress = await client.getUpgradeProgress(device.id)
   * console.log(`升级进度: ${progress.percent}%`)
   * console.log(`升级中: ${progress.upgrading}`)
   * ```
   */
  async getUpgradeProgress(deviceId: string): Promise<{ percent: number, upgrading: boolean }> {
    this.ensureInitialized()
    return this.devices.getUpgradeProgress(deviceId)
  }

  /**
   * 开始实时视频预览
   * @param deviceId 设备 ID
   * @param options 预览选项
   * @returns Promise，在预览成功启动后解析
   * @throws {HikSDKError} 当预览失败时抛出错误
   * @example
   * ```typescript
   * await client.startPreview(device.id, {
   *   channel: 1,
   *   windowIndex: 0,
   *   streamType: 1 // 1-主码流 2-子码流
   * })
   * ```
   */
  async startPreview(deviceId: string, options: PreviewOptions): Promise<void> {
    this.ensureInitialized()
    await this.video.startPreview(deviceId, options)
  }

  /**
   * 停止视频预览
   * @param windowIndex 窗口索引（可选，默认当前窗口）
   * @returns Promise，在预览停止后解析
   * @throws {HikSDKError} 当停止失败时抛出错误
   * @example
   * ```typescript
   * // 停止指定窗口
   * await client.stopPreview(0)
   *
   * // 停止当前窗口
   * await client.stopPreview()
   * ```
   */
  async stopPreview(windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.video.stopPreview(windowIndex)
  }

  /**
   * 停止所有窗口的预览
   * @returns Promise，在所有预览窗口停止后解析
   * @throws {HikSDKError} 当停止失败时抛出错误
   * @example
   * ```typescript
   * await client.stopAllPreview()
   * ```
   */
  async stopAllPreview(): Promise<void> {
    this.ensureInitialized()
    await this.video.stopAll()
  }

  /**
   * 开始录像回放
   * @param deviceId 设备 ID
   * @param options 回放选项
   * @returns Promise，在回放成功启动后解析
   * @throws {HikSDKError} 当回放失败时抛出错误
   * @example
   * ```typescript
   * await client.startPlayback(device.id, {
   *   channel: 1,
   *   windowIndex: 0,
   *   start: '2024-01-01 00:00:00',
   *   end: '2024-01-01 23:59:59'
   * })
   * ```
   */
  async startPlayback(deviceId: string, options: PlaybackOptions): Promise<void> {
    this.ensureInitialized()
    await this.video.startPlayback(deviceId, options)
  }

  /**
   * 停止录像回放
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，在回放停止后解析
   * @throws {HikSDKError} 当停止失败时抛出错误
   * @example
   * ```typescript
   * await client.stopPlayback(0)
   * ```
   */
  async stopPlayback(windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.video.stopPlayback(windowIndex)
  }

  /**
   * 暂停录像回放
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，在暂停完成后解析
   * @throws {HikSDKError} 当暂停失败时抛出错误
   * @example
   * ```typescript
   * await client.pausePlayback()
   * ```
   */
  async pausePlayback(windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.video.pause(windowIndex)
  }

  /**
   * 恢复录像回放
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，在恢复完成后解析
   * @throws {HikSDKError} 当恢复失败时抛出错误
   * @example
   * ```typescript
   * await client.resumePlayback()
   * ```
   */
  async resumePlayback(windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.video.resume(windowIndex)
  }

  /**
   * 快进播放
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，在命令执行完成后解析
   * @throws {HikSDKError} 当快进失败时抛出错误
   * @example
   * ```typescript
   * await client.playFast()
   * ```
   */
  async playFast(windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.video.playFast(windowIndex)
  }

  /**
   * 慢速播放
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，在命令执行完成后解析
   * @throws {HikSDKError} 当慢放失败时抛出错误
   * @example
   * ```typescript
   * await client.playSlow()
   * ```
   */
  async playSlow(windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.video.playSlow(windowIndex)
  }

  /**
   * 打开声音
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，在声音开启后解析
   * @throws {HikSDKError} 当操作失败时抛出错误
   * @example
   * ```typescript
   * await client.openSound(0)
   * ```
   */
  async openSound(windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.video.openSound(windowIndex)
  }

  /**
   * 关闭声音
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，在声音关闭后解析
   * @throws {HikSDKError} 当操作失败时抛出错误
   * @example
   * ```typescript
   * await client.closeSound(0)
   * ```
   */
  async closeSound(windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.video.closeSound(windowIndex)
  }

  /**
   * 设置音量
   * @param volume 音量值（0-100）
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，在音量设置完成后解析
   * @throws {HikSDKError} 当操作失败时抛出错误
   * @example
   * ```typescript
   * await client.setVolume(50, 0)
   * ```
   */
  async setVolume(volume: number, windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.video.setVolume(volume, windowIndex)
  }

  /**
   * 切换全屏模式
   * @param enable 是否启用全屏（默认 true）
   * @example
   * ```typescript
   * // 进入全屏
   * client.toggleFullScreen(true)
   * // 退出全屏
   * client.toggleFullScreen(false)
   * ```
   */
  toggleFullScreen(enable: boolean = true): void {
    this.ensureInitialized()
    this.video.toggleFullScreen(enable)
  }

  /**
   * 启用电子放大
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，在功能启用后解析
   * @throws {HikSDKError} 当操作失败时抛出错误
   * @example
   * ```typescript
   * await client.enableEZoom(0)
   * ```
   */
  async enableEZoom(windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.video.enableEZoom(windowIndex)
  }

  /**
   * 禁用电子放大
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，在功能关闭后解析
   * @throws {HikSDKError} 当操作失败时抛出错误
   * @example
   * ```typescript
   * await client.disableEZoom(0)
   * ```
   */
  async disableEZoom(windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.video.disableEZoom(windowIndex)
  }

  /**
   * 启用 3D 定位
   * @param windowIndex 窗口索引（可选）
   * @param callback 回调函数（可选）
   * @returns Promise，在功能启用后解析
   * @throws {HikSDKError} 当操作失败时抛出错误
   * @example
   * ```typescript
   * await client.enable3DZoom(0, (info) => {
   *   console.log('3D 定位信息:', info)
   * })
   * ```
   */
  async enable3DZoom(windowIndex?: number, callback?: (info: unknown) => void): Promise<void> {
    this.ensureInitialized()
    await this.video.enable3DZoom(windowIndex, callback)
  }

  /**
   * 禁用 3D 定位
   * @param windowIndex 窗口索引（可选）
   * @returns 是否成功
   * @example
   * ```typescript
   * client.disable3DZoom(0)
   * ```
   */
  disable3DZoom(windowIndex?: number): boolean {
    this.ensureInitialized()
    return this.video.disable3DZoom(windowIndex)
  }

  /**
   * 切换窗口布局
   * @param layout 窗口布局（1/4/9/16）
   * @example
   * ```typescript
   * import { WindowType } from 'hikvideoctrl'
   * client.changeWindowLayout(WindowType.Four)
   * ```
   */
  changeWindowLayout(layout: number): void {
    this.ensureInitialized()
    this.video.changeWindowLayout(layout)
  }

  /**
   * 获取窗口状态
   * @param windowIndex 窗口索引（可选）
   * @returns 窗口状态信息
   * @example
   * ```typescript
   * const status = client.getWindowStatus(0)
   * ```
   */
  getWindowStatus(windowIndex?: number): any {
    this.ensureInitialized()
    return this.video.getWindowStatus(windowIndex)
  }

  /**
   * 获取所有窗口信息集合
   * @returns 窗口信息数组
   * @example
   * ```typescript
   * const windows = client.getWindowSet()
   * ```
   */
  getWindowSet(): any[] {
    this.ensureInitialized()
    return this.video.getWindowSet()
  }

  /**
   * PTZ 云台控制
   * @param options PTZ 控制选项
   * @param stop 是否停止动作（默认 false）
   * @returns Promise，在命令执行完成后解析
   * @throws {HikSDKError} 当操作失败时抛出错误
   * @example
   * ```typescript
   * import { PTZControlType } from 'hikvideoctrl'
   *
   * // 开始上移
   * await client.ptzControl({
   *   action: PTZControlType.Up,
   *   speed: 5
   * })
   *
   * // 停止上移
   * await client.ptzControl({
   *   action: PTZControlType.Up
   * }, true)
   * ```
   */
  async ptzControl(options: PTZCommandOptions, stop: boolean = false): Promise<void> {
    this.ensureInitialized()
    await this.ptz.control(options, stop)
  }

  /**
   * 开始 PTZ 控制
   * @param options PTZ 控制选项
   * @returns Promise，在命令执行完成后解析
   * @throws {HikSDKError} 当操作失败时抛出错误
   * @example
   * ```typescript
   * await client.ptzStart({
   *   action: PTZControlType.Right,
   *   speed: 5
   * })
   * ```
   */
  async ptzStart(options: PTZCommandOptions): Promise<void> {
    this.ensureInitialized()
    await this.ptz.start(options)
  }

  /**
   * 停止 PTZ 控制
   * @param action PTZ 动作类型
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，在停止命令执行完成后解析
   * @throws {HikSDKError} 当操作失败时抛出错误
   * @example
   * ```typescript
   * await client.ptzStop(PTZControlType.Right, 0)
   * ```
   */
  async ptzStop(action: number, windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.ptz.stop(action, windowIndex)
  }

  /**
   * 设置预置位
   * @param preset 预置位号（1-255）
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，在设置完成后解析
   * @throws {HikSDKError} 当操作失败时抛出错误
   * @example
   * ```typescript
   * await client.setPreset(1, 0)
   * ```
   */
  async setPreset(preset: number, windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.ptz.setPreset(preset, windowIndex)
  }

  /**
   * 调用预置位
   * @param preset 预置位号（1-255）
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，在调用完成后解析
   * @throws {HikSDKError} 当操作失败时抛出错误
   * @example
   * ```typescript
   * await client.goPreset(1, 0)
   * ```
   */
  async goPreset(preset: number, windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.ptz.goPreset(preset, windowIndex)
  }

  /**
   * 搜索录像文件
   * @param deviceId 设备 ID
   * @param options 搜索选项
   * @returns Promise，解析为包含录像列表的 XML 文档
   * @throws {HikSDKError} 当搜索失败时抛出错误
   * @example
   * ```typescript
   * const result = await client.searchRecords(device.id, {
   *   channel: 1,
   *   start: '2024-01-01 00:00:00',
   *   end: '2024-01-01 23:59:59',
   *   streamType: 1
   * })
   *
   * const files = result.querySelectorAll('searchMatchItem')
   * ```
   */
  async searchRecords(deviceId: string, options: RecordSearchOptions): Promise<Document> {
    this.ensureInitialized()
    return this.recording.search(deviceId, options)
  }

  /**
   * 开始本地录像
   * @param options 录像选项
   * @returns Promise，解析为实际开始录制的文件名
   * @throws {HikSDKError} 当录像失败时抛出错误
   * @example
   * ```typescript
   * const fileName = await client.startRecording({
   *   windowIndex: 0,
   *   fileName: 'record_001',
   *   directoryByDate: true
   * })
   * ```
   */
  async startRecording(options: RecordingOptions): Promise<string> {
    this.ensureInitialized()
    return this.recording.startRecord(options)
  }

  /**
   * 停止本地录像
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，在录像停止后解析
   * @throws {HikSDKError} 当停止失败时抛出错误
   * @example
   * ```typescript
   * await client.stopRecording(0)
   * ```
   */
  async stopRecording(windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.recording.stopRecord(windowIndex)
  }

  /**
   * 抓拍截图
   * @param options 抓拍选项（可选）
   * @returns Promise，解析为保存或返回的截图文件名
   * @throws {HikSDKError} 当抓拍失败时抛出错误
   * @example
   * ```typescript
   * const fileName = await client.capture({
   *   windowIndex: 0,
   *   fileName: 'capture_001',
   *   format: 'jpg'
   * })
   * ```
   */
  async capture(options?: CaptureOptions): Promise<string> {
    this.ensureInitialized()
    return this.recording.capture(options)
  }

  /**
   * 下载录像文件
   * @param deviceId 设备 ID
   * @param playbackUri 回放 URI
   * @param fileName 文件名
   * @param options 下载选项（可选）
   * @returns Promise，解析为下载任务句柄
   * @throws {HikSDKError} 当下载失败时抛出错误
   * @example
   * ```typescript
   * const handleId = await client.downloadRecord(
   *   device.id,
   *   'playbackURI',
   *   'download_001',
   *   { directoryByDate: true }
   * )
   * ```
   */
  async downloadRecord(deviceId: string, playbackUri: string, fileName: string, options?: DownloadOptions): Promise<number> {
    this.ensureInitialized()
    return this.recording.download(deviceId, playbackUri, fileName, options)
  }

  /**
   * 按时间段下载录像
   * @param deviceId 设备 ID
   * @param playbackUri 回放 URI
   * @param options 下载选项
   * @returns Promise，解析为下载任务句柄
   * @throws {HikSDKError} 当下载失败时抛出错误
   * @example
   * ```typescript
   * const handleId = await client.downloadRecordByTime(
   *   device.id,
   *   'playbackURI',
   *   {
   *     fileName: 'download_001',
   *     start: '2024-01-01 10:00:00',
   *     end: '2024-01-01 11:00:00'
   *   }
   * )
   * ```
   */
  async downloadRecordByTime(deviceId: string, playbackUri: string, options: DownloadByTimeOptions): Promise<number> {
    this.ensureInitialized()
    return this.recording.downloadByTime(deviceId, playbackUri, options)
  }

  /**
   * 设置视频加密密钥
   * @param secretKey 密钥
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，在密钥设置完成后解析
   * @throws {HikSDKError} 当设置失败时抛出错误
   * @example
   * ```typescript
   * await client.setSecretKey('your-secret-key', 0)
   * ```
   */
  async setSecretKey(secretKey: string, windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.config.setSecretKey(secretKey, windowIndex)
  }

  /**
   * 获取视频 OSD 时间
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，解析为当前窗口的 OSD 时间字符串
   * @throws {HikSDKError} 当获取失败时抛出错误
   * @example
   * ```typescript
   * const osdTime = await client.getOSDTime(0)
   * console.log('OSD 时间:', osdTime)
   * ```
   */
  async getOSDTime(windowIndex?: number): Promise<string> {
    this.ensureInitialized()
    return this.config.getOSDTime(windowIndex)
  }

  /**
   * 获取本地配置
   * @returns 配置对象
   * @example
   * ```typescript
   * const config = client.getLocalConfig()
   * ```
   */
  getLocalConfig(): any {
    this.ensureInitialized()
    return this.config.getLocalConfig()
  }

  /**
   * 设置本地配置
   * @param config 配置字符串
   * @returns 是否成功
   * @example
   * ```typescript
   * const success = client.setLocalConfig('config_string')
   * ```
   */
  setLocalConfig(config: string): boolean {
    this.ensureInitialized()
    return this.config.setLocalConfig(config)
  }

  /**
   * 打开文件选择对话框
   * @param type 类型（0-文件夹，1-文件）
   * @returns Promise，解析为所选文件信息
   * @throws {HikSDKError} 当打开失败时抛出错误
   * @example
   * ```typescript
   * // 选择文件
   * const { szFileName, file } = await client.openFileDialog(1)
   * // 选择文件夹
   * const { szFileName } = await client.openFileDialog(0)
   * ```
   */
  async openFileDialog(type: 0 | 1): Promise<{ szFileName: string, file: File }> {
    this.ensureInitialized()
    return this.config.openFileDialog(type)
  }

  /**
   * 发送 HTTP 请求到设备
   * @param deviceId 设备 ID
   * @param url 请求 URL
   * @param options HTTP 请求选项（可选）
   * @returns Promise，解析为设备返回的数据
   * @throws {HikSDKError} 当请求失败时抛出错误
   * @example
   * ```typescript
   * const response = await client.sendHTTPRequest(
   *   device.id,
   *   '/ISAPI/System/deviceInfo',
   *   {
   *     type: 'GET',
   *     timeout: 5000
   *   }
   * )
   * ```
   */
  async sendHTTPRequest(deviceId: string, url: string, options?: HTTPRequestOptions): Promise<any> {
    this.ensureInitialized()
    return this.config.sendHTTPRequest(deviceId, url, options ?? {})
  }

  /**
   * 获取叠加信息
   * @param deviceId 设备 ID
   * @param url 请求 URL
   * @param options HTTP 请求选项（可选）
   * @returns Promise，解析为设备返回的叠加信息
   */
  async getTextOverlay(deviceId: string, url: string, options?: HTTPRequestOptions): Promise<any> {
    this.ensureInitialized()
    return this.config.getTextOverlay(deviceId, url, options ?? {})
  }

  private ensureInitialized(): void {
    if (!this.isInitialized)
      throw new HikSDKError('not-initialized', '请先调用 initialize 完成插件初始化')
  }
}

export function createHikVideoClient(): HikVideoClient {
  return new HikVideoClient()
}
