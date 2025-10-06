/**
 * 类型定义
 */

/**
 * 初始化配置选项
 */
export interface InitOptions {
  /** 插件容器的 DOM ID */
  containerId: string
  /** 插件宽度，默认 '100%' */
  width?: string
  /** 插件高度，默认 '100%' */
  height?: string
  /** 窗口分割类型：1-单窗口, 2-2x2, 3-3x3, 4-4x4 */
  windowType?: number
  /** 封装格式：2-PS, 11-MP4 */
  packageType?: number
  /** 是否使用无插件模式 */
  noPlugin?: boolean
  /** 是否支持窗口双击全屏 */
  enableFullScreen?: boolean
  /** 调试模式 */
  debug?: boolean
  /** 窗口选中回调 */
  onWindowSelect?: (windowIndex: number) => void
  /** 窗口双击回调 */
  onWindowDoubleClick?: (windowIndex: number, isFullScreen: boolean) => void
  /** 插件事件回调 */
  onEvent?: (eventType: number, param1: number, param2: number) => void
  /** 错误回调 */
  onError?: (windowIndex: number, errorCode: number, error: any) => void
  /** 性能不足回调 */
  onPerformanceLack?: () => void
  /** 码流加密秘钥错误回调 */
  onSecretKeyError?: (windowIndex: number) => void
}

/**
 * 设备信息
 */
export interface DeviceInfo {
  /** 设备 IP 地址 */
  ip: string
  /** 设备端口 */
  port: number
  /** 用户名 */
  username: string
  /** 密码 */
  password: string
  /** 协议类型：1-HTTP, 2-HTTPS */
  protocol?: number
}

/**
 * 预览选项
 */
export interface PreviewOptions {
  /** 设备标识 */
  deviceId: string
  /** 通道 ID */
  channelId: number
  /** 码流类型：1-主码流, 2-子码流, 3-第三码流 */
  streamType?: number
  /** 窗口索引 */
  windowIndex?: number
  /** 是否为零通道 */
  isZeroChannel?: boolean
  /** 是否使用 WebSocket 代理 */
  useProxy?: boolean
  /** RTSP 端口 */
  rtspPort?: number
}

/**
 * 回放选项
 */
export interface PlaybackOptions extends PreviewOptions {
  /** 开始时间，格式：yyyy-MM-dd HH:mm:ss */
  startTime: string
  /** 结束时间，格式：yyyy-MM-dd HH:mm:ss */
  endTime: string
  /** 转码回放参数 */
  transcodeParams?: TranscodeParams
}

/**
 * 转码参数
 */
export interface TranscodeParams {
  /** 帧率 */
  frameRate?: string
  /** 分辨率 */
  resolution?: string
  /** 码率 */
  bitrate?: string
}

/**
 * PTZ 控制选项
 */
export interface PTZOptions {
  /** 窗口索引 */
  windowIndex?: number
  /** PTZ 控制类型 */
  ptzIndex: number
  /** PTZ 速度，范围 1-7 */
  speed?: number
}

/**
 * 录像选项
 */
export interface RecordOptions {
  /** 窗口索引 */
  windowIndex?: number
  /** 文件名 */
  fileName?: string
  /** 是否创建日期目录 */
  useDateDir?: boolean
}

/**
 * 抓图选项
 */
export interface CaptureOptions {
  /** 窗口索引 */
  windowIndex?: number
  /** 文件名 */
  fileName?: string
  /** 图片格式：jpg, bmp, png */
  format?: string
  /** 图片数据回调 */
  callback?: (imageData: Uint8Array) => void
}

/**
 * 录像搜索选项
 */
export interface SearchRecordOptions {
  /** 设备标识 */
  deviceId: string
  /** 通道 ID */
  channelId: number
  /** 开始时间 */
  startTime: string
  /** 结束时间 */
  endTime: string
  /** 码流类型 */
  streamType?: number
  /** 搜索位置，用于分页 */
  searchPos?: number
}

/**
 * 录像下载选项
 */
export interface DownloadRecordOptions {
  /** 是否创建日期目录 */
  useDateDir?: boolean
}

/**
 * 通用回调选项
 */
export interface CallbackOptions {
  /** 成功回调 */
  success?: (xmlDoc?: any) => void
  /** 失败回调 */
  error?: (status?: number, xmlDoc?: any) => void
  /** 超时时间（毫秒） */
  timeout?: number
  /** 是否异步 */
  async?: boolean
}

/**
 * 事件回调
 */
export interface EventCallback {
  (data?: any): void
}

/**
 * 通道信息
 */
export interface ChannelInfo {
  /** 通道 ID */
  id: string
  /** 通道名称 */
  name: string
  /** 通道类型 */
  type: 'analog' | 'digital' | 'zero'
  /** 是否为零通道 */
  isZero: boolean
  /** 是否在线（仅数字通道） */
  online?: boolean
}

/**
 * 窗口状态信息
 */
export interface WindowStatus {
  /** 窗口索引 */
  iIndex: number
  /** 设备标识 */
  szDeviceIdentify: string
  /** 通道 ID */
  iChannelID: number
  /** 播放状态：0-未播放, 1-预览, 2-回放, 3-暂停, 4-单帧, 5-倒放, 6-倒放暂停 */
  iPlayStatus: number
}

/**
 * 设备端口信息
 */
export interface DevicePort {
  /** 设备端口 */
  iDevicePort: number
  /** RTSP 端口 */
  iRtspPort: number
}

/**
 * 录像信息
 */
export interface RecordInfo {
  /** 录像 ID */
  trackID: string
  /** 开始时间 */
  startTime: string
  /** 结束时间 */
  endTime: string
  /** 回放 URI */
  playbackURI: string
  /** 录像类型 */
  metadataDescriptor: string
}

/**
 * HTTP 请求选项
 */
export interface HTTPRequestOptions extends CallbackOptions {
  /** 请求类型：GET, POST, PUT, DELETE */
  type?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  /** 请求数据 */
  data?: string
  /** 认证信息 */
  auth?: any
}

declare global {
  interface Window {
    WebVideoCtrl: any
  }
}
