/**
 * 类型定义
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

export interface ChannelInfo {
  id: string
  name: string
  type: 'analog' | 'digital' | 'zero'
  isZero: boolean
}

declare global {
  interface Window {
    WebVideoCtrl: any
  }
}
