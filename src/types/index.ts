import type { FileFormatValue, StreamTypeValue } from '../utils/constants'

/**
 * 设备访问协议
 */
export type ProtocolScheme = 'http' | 'https'

/**
 * 插件初始化参数
 */
export interface PluginInitOptions {
  container: string | HTMLElement
  width?: string | number
  height?: string | number
  layout?: number
  noPlugin?: boolean
  packageType?: number
  colorProperty?: string
  ocxClassId?: string
  mimeTypes?: string
  playMode?: number
  debugMode?: boolean
  enableDoubleClickFullScreen?: boolean
  onWindowSelect?: (windowIndex: number) => void
  onWindowDoubleClick?: (windowIndex: number, isFullScreen: boolean) => void
  onEvent?: (eventType: number, param1: number, param2: number) => void
  onError?: (windowIndex: number, errorCode: number, error: unknown) => void
  onPerformanceLack?: () => void
  onSecretKeyError?: (windowIndex: number) => void
  onRemoteConfigClose?: () => void
  onInitComplete?: () => void
}

/**
 * 设备登录选项
 */
export interface DeviceLoginOptions {
  async?: boolean
  cgi?: number
  onSuccess?: (xmlDoc?: Document) => void
  onError?: (status?: number, xmlDoc?: Document, error?: unknown) => void
}

/**
 * 设备凭证信息
 */
export interface DeviceCredentials {
  host: string
  port?: number
  username: string
  password: string
  protocol?: ProtocolScheme
  loginOptions?: DeviceLoginOptions
}

/**
 * 已连接的设备会话
 */
export interface DeviceSession {
  id: string
  host: string
  port: number
  username: string
  protocol: ProtocolScheme
}

/**
 * 设备端口信息
 */
export interface DevicePort {
  iDevicePort: number
  iRtspPort: number
}

/**
 * 通道信息
 */
export interface ChannelInfo {
  id: string
  name: string
  type: 'analog' | 'digital' | 'zero'
  isZero: boolean
  online: boolean
}

/**
 * 实时预览选项
 */
export interface PreviewOptions {
  channel: number
  windowIndex?: number
  streamType?: StreamTypeValue
  zeroChannel?: boolean
  useProxy?: boolean
  rtspPort?: number
  port?: number
  onSuccess?: (result?: unknown) => void
  onError?: (status?: number, xmlDoc?: Document, error?: unknown) => void
}

/**
 * 回放转码选项
 */
export interface PlaybackTranscodeOptions {
  frameRate?: string
  resolution?: string
  bitrate?: string
}

/**
 * 录像回放选项
 */
export interface PlaybackOptions extends PreviewOptions {
  start: string
  end: string
  transcode?: PlaybackTranscodeOptions
}

/**
 * PTZ 控制参数
 */
export interface PTZCommandOptions {
  action: number
  speed?: number
  windowIndex?: number
}

/**
 * 本地录像选项
 */
export interface RecordingOptions {
  windowIndex?: number
  fileName?: string
  directoryByDate?: boolean
}

/**
 * 抓拍选项
 */
export interface CaptureOptions {
  windowIndex?: number
  fileName?: string
  format?: FileFormatValue | string
  onData?: (data: Uint8Array) => void
}

/**
 * 录像搜索选项
 */
export interface RecordSearchOptions {
  channel: number
  start: string
  end: string
  streamType?: StreamTypeValue
  page?: number
}

/**
 * 下载选项
 */
export interface DownloadOptions {
  directoryByDate?: boolean
}

/**
 * 按时间段下载选项
 */
export interface DownloadByTimeOptions extends DownloadOptions {
  fileName: string
  start: string
  end: string
}

/**
 * HTTP 请求选项
 */
export interface HTTPRequestOptions {
  type?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: string
  auth?: unknown
  timeout?: number
  async?: boolean
  success?: (response?: unknown) => void
  error?: (status?: number, xmlDoc?: Document, error?: unknown) => void
}

/**
 * 客户端事件映射
 */
export interface HikVideoEventMap {
  'plugin:initialized': void
  'plugin:error': { windowIndex: number, errorCode: number, error: unknown }
  'plugin:performance-lack': void
  'plugin:secret-key-error': { windowIndex: number }
  'plugin:event': { eventType: number, param1: number, param2: number }
  'window:selected': { index: number }
  'window:dblclick': { index: number, isFullScreen: boolean }
  'device:connected': DeviceSession
  'device:disconnected': { deviceId: string }
  'preview:started': { deviceId: string, channel: number, windowIndex: number, zeroChannel: boolean }
  'preview:stopped': { deviceId: string, windowIndex: number }
  'preview:stopped-all': void
  'playback:started': { deviceId: string, channel: number, windowIndex: number, start: string, end: string }
  'playback:stopped': { deviceId: string, windowIndex: number }
  'recording:started': { fileName: string, windowIndex: number }
  'recording:stopped': { windowIndex: number }
  'capture:completed': { fileName: string, windowIndex: number, format: string }
}

declare global {
  interface Window {
    WebVideoCtrl?: any
  }
}
