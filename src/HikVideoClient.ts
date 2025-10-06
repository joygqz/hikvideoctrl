import type {
  CaptureOptions,
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

export class HikVideoClient {
  private readonly bridge: WebVideoBridge
  private readonly events: EventBus<HikVideoEventMap>
  private readonly plugin: PluginHost
  private readonly devices: DeviceService
  private readonly video: VideoService
  private readonly ptz: PTZService
  private readonly recording: RecordingService
  private readonly config: ConfigService

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

  get isInitialized(): boolean {
    return this.plugin.isInitialized
  }

  get activeWindow(): number {
    return this.plugin.activeWindow
  }

  supportsNoPlugin(): boolean {
    return this.bridge.isNoPluginSupported()
  }

  async initialize(options: PluginInitOptions): Promise<void> {
    if (!this.supportsNoPlugin())
      throw new HikSDKError('sdk-not-found', '当前浏览器不支持 WebVideoCtrl 无插件模式')

    await this.plugin.init(options)
  }

  on<K extends keyof HikVideoEventMap>(event: K, handler: (payload: HikVideoEventMap[K]) => void): () => void {
    return this.events.on(event, handler)
  }

  off<K extends keyof HikVideoEventMap>(event: K, handler?: (payload: HikVideoEventMap[K]) => void): void {
    this.events.off(event, handler as any)
  }

  listDevices(): DeviceSession[] {
    return this.devices.list()
  }

  getDevice(deviceId: string): DeviceSession | undefined {
    return this.devices.get(deviceId)
  }

  async connectDevice(credentials: DeviceCredentials): Promise<DeviceSession> {
    this.ensureInitialized()
    return this.devices.connect(credentials)
  }

  async disconnectDevice(deviceId: string): Promise<void> {
    this.ensureInitialized()
    await this.devices.disconnect(deviceId)
  }

  async getDeviceInfo(deviceId: string): Promise<Document> {
    this.ensureInitialized()
    return this.devices.getInfo(deviceId)
  }

  getDevicePort(deviceId: string): DevicePort {
    this.ensureInitialized()
    return this.devices.getPort(deviceId)
  }

  async getChannels(deviceId: string) {
    this.ensureInitialized()
    return this.devices.getChannels(deviceId)
  }

  async getAudioInfo(deviceId: string): Promise<Document> {
    this.ensureInitialized()
    return this.devices.getAudioInfo(deviceId)
  }

  async exportDeviceConfig(deviceId: string, password: string): Promise<void> {
    this.ensureInitialized()
    await this.devices.exportConfig(deviceId, password)
  }

  async importDeviceConfig(deviceId: string, fileName: string, password: string, file: File): Promise<void> {
    this.ensureInitialized()
    await this.devices.importConfig(deviceId, fileName, password, file)
  }

  async restartDevice(deviceId: string): Promise<void> {
    this.ensureInitialized()
    await this.devices.restart(deviceId)
  }

  async reconnectDevice(deviceId: string): Promise<void> {
    this.ensureInitialized()
    await this.devices.reconnect(deviceId)
  }

  async restoreDeviceDefault(deviceId: string, mode: 'basic' | 'full'): Promise<void> {
    this.ensureInitialized()
    await this.devices.restoreDefault(deviceId, mode)
  }

  async startUpgrade(deviceId: string, fileName: string, file: File): Promise<void> {
    this.ensureInitialized()
    await this.devices.startUpgrade(deviceId, fileName, file)
  }

  async getUpgradeProgress(deviceId: string): Promise<{ percent: number, upgrading: boolean }> {
    this.ensureInitialized()
    return this.devices.getUpgradeProgress(deviceId)
  }

  async startPreview(deviceId: string, options: PreviewOptions): Promise<void> {
    this.ensureInitialized()
    await this.video.startPreview(deviceId, options)
  }

  async stopPreview(windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.video.stopPreview(windowIndex)
  }

  async stopAllPreview(): Promise<void> {
    this.ensureInitialized()
    await this.video.stopAll()
  }

  async startPlayback(deviceId: string, options: PlaybackOptions): Promise<void> {
    this.ensureInitialized()
    await this.video.startPlayback(deviceId, options)
  }

  async stopPlayback(windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.video.stopPlayback(windowIndex)
  }

  async pausePlayback(windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.video.pause(windowIndex)
  }

  async resumePlayback(windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.video.resume(windowIndex)
  }

  async playFast(windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.video.playFast(windowIndex)
  }

  async playSlow(windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.video.playSlow(windowIndex)
  }

  async openSound(windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.video.openSound(windowIndex)
  }

  async closeSound(windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.video.closeSound(windowIndex)
  }

  async setVolume(volume: number, windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.video.setVolume(volume, windowIndex)
  }

  toggleFullScreen(enable: boolean = true): void {
    this.ensureInitialized()
    this.video.toggleFullScreen(enable)
  }

  async enableEZoom(windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.video.enableEZoom(windowIndex)
  }

  async disableEZoom(windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.video.disableEZoom(windowIndex)
  }

  async enable3DZoom(windowIndex?: number, callback?: (info: unknown) => void): Promise<void> {
    this.ensureInitialized()
    await this.video.enable3DZoom(windowIndex, callback)
  }

  disable3DZoom(windowIndex?: number): boolean {
    this.ensureInitialized()
    return this.video.disable3DZoom(windowIndex)
  }

  changeWindowLayout(layout: number): void {
    this.ensureInitialized()
    this.video.changeWindowLayout(layout)
  }

  getWindowStatus(windowIndex?: number): any {
    this.ensureInitialized()
    return this.video.getWindowStatus(windowIndex)
  }

  getWindowSet(): any[] {
    this.ensureInitialized()
    return this.video.getWindowSet()
  }

  async ptzControl(options: PTZCommandOptions, stop: boolean = false): Promise<void> {
    this.ensureInitialized()
    await this.ptz.control(options, stop)
  }

  async ptzStart(options: PTZCommandOptions): Promise<void> {
    this.ensureInitialized()
    await this.ptz.start(options)
  }

  async ptzStop(action: number, windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.ptz.stop(action, windowIndex)
  }

  async setPreset(preset: number, windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.ptz.setPreset(preset, windowIndex)
  }

  async goPreset(preset: number, windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.ptz.goPreset(preset, windowIndex)
  }

  async searchRecords(deviceId: string, options: RecordSearchOptions): Promise<Document> {
    this.ensureInitialized()
    return this.recording.search(deviceId, options)
  }

  async startRecording(options: RecordingOptions): Promise<string> {
    this.ensureInitialized()
    return this.recording.startRecord(options)
  }

  async stopRecording(windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.recording.stopRecord(windowIndex)
  }

  async capture(options?: CaptureOptions): Promise<string> {
    this.ensureInitialized()
    return this.recording.capture(options)
  }

  async downloadRecord(deviceId: string, playbackUri: string, fileName: string, options?: DownloadOptions): Promise<number> {
    this.ensureInitialized()
    return this.recording.download(deviceId, playbackUri, fileName, options)
  }

  async downloadRecordByTime(deviceId: string, playbackUri: string, options: DownloadByTimeOptions): Promise<number> {
    this.ensureInitialized()
    return this.recording.downloadByTime(deviceId, playbackUri, options)
  }

  async setSecretKey(secretKey: string, windowIndex?: number): Promise<void> {
    this.ensureInitialized()
    await this.config.setSecretKey(secretKey, windowIndex)
  }

  async getOSDTime(windowIndex?: number): Promise<string> {
    this.ensureInitialized()
    return this.config.getOSDTime(windowIndex)
  }

  getLocalConfig(): any {
    this.ensureInitialized()
    return this.config.getLocalConfig()
  }

  setLocalConfig(config: string): boolean {
    this.ensureInitialized()
    return this.config.setLocalConfig(config)
  }

  async openFileDialog(type: 0 | 1): Promise<{ szFileName: string, file: File }> {
    this.ensureInitialized()
    return this.config.openFileDialog(type)
  }

  async sendHTTPRequest(deviceId: string, url: string, options?: HTTPRequestOptions): Promise<any> {
    this.ensureInitialized()
    return this.config.sendHTTPRequest(deviceId, url, options ?? {})
  }

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
