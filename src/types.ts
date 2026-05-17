import type {
  FileDialogType,
  Layout,
  PluginEventCode,
  ProtocolScheme,
  PtzCommand,
  RestoreMode,
  StreamType,
} from './constants'
import type { WebVideoCtrlSDK } from './sdk'

// ─────────────────────────── 客户端构造 ───────────────────────────

/** `createHikPlayer()` / `new HikPlayer()` 的构造参数。 */
export interface HikPlayerOptions {
  /**
   * 注入自定义 SDK 实例。
   * 缺省读取 `window.WebVideoCtrl`，便于在 Worker / SSR / 单元测试场景中替换。
   */
  sdk?: WebVideoCtrlSDK
}

// ─────────────────────────── 初始化 ───────────────────────────

/**
 * `init()` 的参数。仅暴露无插件模式下"可配置且有意义"的字段；
 * SDK 中固定/不支持的项（如 `bNoPlugin`、`iPlayMode`、`szOcxClassId`）由封装层固化。
 */
export interface PluginInitOptions {
  /** 渲染容器：DOM 元素、id 字符串或 `#id` 选择器。 */
  container: string | HTMLElement
  /** 宽度（像素或 CSS 字符串）；缺省取容器实际宽度，再退到 800。 */
  width?: number | string
  /** 高度（像素或 CSS 字符串）；缺省取容器实际高度，再退到 600。 */
  height?: number | string
  /** 初始分屏布局，默认 1（单画面）。 */
  layout?: Layout | number
  /**
   * 插件背景串。格式：
   *
   * ```
   * plugin-background:#fff; sub-background:#fff; sub-border:#fff; sub-border-select:#fff
   * ```
   */
  colorProperty?: string
  /** 打开 SDK 自身的调试日志，等效官方的 `bDebugMode`。 */
  debugMode?: boolean
  /** 窗口选中（推荐改用 `on('window:selected')`）。 */
  onWindowSelect?: (windowIndex: number) => void
  /** 窗口双击 / 全屏切换（推荐改用 `on('window:dblclick')`）。 */
  onWindowDoubleClick?: (windowIndex: number, fullScreen: boolean) => void
  /** 异常事件回调（推荐改用 `on('plugin:event')`）。 */
  onEvent?: (eventType: PluginEventCode | number, windowIndex: number, param2: number) => void
  /** 插件级错误回调（推荐改用 `on('plugin:error')`）。 */
  onError?: (windowIndex: number, errorCode: number, error: unknown) => void
  /** 性能不足回调（推荐改用 `on('plugin:performance-lack')`）。 */
  onPerformanceLack?: () => void
  /** 码流加密密钥错误（推荐改用 `on('plugin:secret-key-error')`）。 */
  onSecretKeyError?: (windowIndex: number) => void
}

// ─────────────────────────── 设备 / 通道 ───────────────────────────

/** 登录设备所需信息。 */
export interface DeviceCredentials {
  /** 设备 IP 或域名。 */
  host: string
  /** 端口；默认 `http=80`、`https=443`。 */
  port?: number
  /** 协议，默认 `http`。 */
  protocol?: ProtocolScheme
  username: string
  password: string
  /** 透传给 `I_Login` 的扩展参数。 */
  login?: DeviceLoginOptions
}

/** 登录扩展项。 */
export interface DeviceLoginOptions {
  /** 异步 / 同步交互，默认 `true`。 */
  async?: boolean
  /** CGI 协议选择；`1` 强制 ISAPI，缺省由 SDK 自动协商。 */
  cgi?: number
}

/** 一次成功登录返回的会话信息。 */
export interface DeviceSession {
  /** 设备唯一标识 `<host>_<port>`。 */
  id: string
  host: string
  port: number
  username: string
  protocol: ProtocolScheme
}

/** 设备端口信息（`I_GetDevicePort` 返回）。 */
export interface DevicePort {
  /** 设备 HTTP/HTTPS 端口 */
  iDevicePort: number
  /** 设备 RTSP 端口 */
  iRtspPort: number
  /** HTTP 管理端口；部分设备与 `iDevicePort` 相同。 */
  iHttpPort?: number
  /** WebSocket 取流端口（HTTP 页面）。 */
  iWebSocketPort?: number
  /** WebSocket Secure 取流端口（HTTPS 页面）。 */
  iWebSocketsPort?: number
}

/** 设备基本信息（解析自 `I_GetDeviceInfo` XML）。 */
export interface DeviceInfo {
  deviceName: string
  deviceId: string
  deviceType: string
  model: string
  serialNumber: string
  macAddress: string
  firmwareVersion: string
  firmwareReleasedDate: string
  encoderVersion: string
  encoderReleasedDate: string
  /** 原始 XML 文档，供进一步解析。 */
  raw: Document
}

/** 通道类型。 */
export type ChannelKind = 'analog' | 'digital' | 'zero'

/** 通道信息（聚合自模拟 / 数字 / 零通道）。 */
export interface ChannelInfo {
  id: string
  name: string
  kind: ChannelKind
  /** 是否在线（模拟通道恒为 true，数字通道按 `<online>` 字段判定）。 */
  online: boolean
  /** 是否启用（仅零通道有意义，模拟/数字均为 true）。 */
  enabled: boolean
  /** 模拟通道独有的视频制式 PAL / NTSC。 */
  videoFormat?: string
}

/** 录像类型，对应 `metadataDescriptor`。 */
export type RecordKind
  = | 'timing'
    | 'motion'
    | 'motionOrAlarm'
    | 'motionAndAlarm'
    | 'manual'
    | 'smart'
    | (string & {})

/** 录像搜索的一条命中记录。 */
export interface RecordMatch {
  trackId: string
  /** 起始时间，已规整为 `yyyy-MM-dd HH:mm:ss` */
  startTime: string
  endTime: string
  /** 录像名（从 `playbackURI` 的 `name=` 抽取，便于直接作为下载文件名片段）。 */
  fileName: string
  /** 原始 `playbackURI`，下载录像时必须原样回传。 */
  playbackUri: string
  /** 录像类型（动测 / 报警 / 定时…）。 */
  kind: RecordKind
}

/** `searchRecords()` 返回的封装结果。 */
export interface RecordSearchResult {
  matches: RecordMatch[]
  /**
   * 后端响应状态：
   * - `OK`         本次为最后一页
   * - `MORE`       仍有后续数据，需继续翻页
   * - `NO MATCHES` 时间范围内无录像
   */
  status: 'OK' | 'MORE' | 'NO MATCHES' | (string & {})
  /** 本次实际返回条数。 */
  count: number
  /** 原始 XML，便于业务方扩展解析。 */
  raw: Document
}

// ─────────────────────────── 预览 / 回放 ───────────────────────────

export interface PreviewOptions {
  /** 通道号（来自 `getChannels()` 的 `id` 整数部分）。 */
  channel: number
  /** 播放窗口索引；缺省使用当前选中窗口。 */
  windowIndex?: number
  /** 码流类型，默认主码流。 */
  streamType?: StreamType
  /** 播放零通道（即整机预览），默认 false。 */
  zeroChannel?: boolean
  /** RTSP 端口；兼容官方文档字段，不传由 SDK 自动判断。 */
  rtspPort?: number
  /** WebSocket 取流端口；V3.4.0 无插件实际读取 `iWSPort`。 */
  webSocketPort?: number
  /** 是否走 WebSocket 代理；HTTPS 下及部分设备需置 true。 */
  useProxy?: boolean
}

/** 转码回放参数（对应 `oTransCodeParam`）。 */
export interface PlaybackTranscode {
  /** 帧率档位，见 `TRANSCODE_FRAME_RATE`。 */
  frameRate?: string
  /** 分辨率档位，见 `TRANSCODE_RESOLUTION`。 */
  resolution?: string
  /** 码率档位，见 `TRANSCODE_BITRATE`。 */
  bitrate?: string
}

export interface PlaybackOptions extends Omit<PreviewOptions, 'zeroChannel'> {
  /** 起始时间，格式 `yyyy-MM-dd HH:mm:ss`。 */
  startTime: string
  /** 结束时间，格式 `yyyy-MM-dd HH:mm:ss`。 */
  endTime: string
  /** 转码参数；需设备支持，不支持时不要传入。 */
  transcode?: PlaybackTranscode
}

// ─────────────────────────── PTZ ───────────────────────────

export interface PtzControlOptions {
  /** 控制类型，见 `PTZ_COMMAND`。 */
  action: PtzCommand | number
  /** 控制速度 1-7，默认 4。 */
  speed?: number
  windowIndex?: number
}

// ─────────────────────────── 录像 / 抓拍 / 下载 ───────────────────────────

export interface RecordSearchOptions {
  channel: number
  /** 起始时间，格式 `yyyy-MM-dd HH:mm:ss`。 */
  startTime: string
  /** 结束时间，格式 `yyyy-MM-dd HH:mm:ss`。 */
  endTime: string
  streamType?: StreamType
  /**
   * 搜索起点；优先级高于 `page`。
   * 取值必须为 40 的倍数（0/40/80…），对应每页 40 条。
   */
  searchPos?: number
  /** 1 基页码；自动换算为 `(page-1) * 40`。默认 1。 */
  page?: number
}

export interface RecordingOptions {
  /** 录像文件名（无扩展名）；缺省自动生成。 */
  fileName?: string
  windowIndex?: number
  /** 是否按日期建立子目录，默认 true。 */
  byDateDirectory?: boolean
}

export interface CaptureOptions {
  /**
   * 抓拍文件名；SDK 按扩展名决定格式：`.bmp` 为 BMP，其它默认 JPEG。
   * 缺省自动生成 `capture_<ts>.jpg`。
   */
  fileName?: string
  windowIndex?: number
  /**
   * 设置回调后将不再下载文件，而是回调原始 Uint8Array。
   * 即官方文档的 `cbCallback`。
   */
  onData?: (data: Uint8Array) => void | Promise<void>
}

export interface DownloadOptions {
  /** 是否按日期建立子目录，默认 true。 */
  byDateDirectory?: boolean
}

export interface DownloadByTimeOptions extends DownloadOptions {
  fileName: string
  startTime: string
  endTime: string
}

// ─────────────────────────── 维护 ───────────────────────────

export interface RestoreDefaultOptions {
  mode: RestoreMode
}

export interface ImportDeviceConfigOptions {
  /** 导入密码；未加密配置可不传。 */
  password?: string
  /** `openFileDialog(FILE_DIALOG.File)` 返回的浏览器 File 句柄。 */
  file?: File | null
}

export interface StartUpgradeOptions {
  /** `openFileDialog(FILE_DIALOG.File)` 返回的浏览器 File 句柄。 */
  file?: File | null
}

// ─────────────────────────── 透传 HTTP ───────────────────────────

export interface HttpRequestOptions {
  /** 默认 `GET`。 */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  /** 请求体（XML 字符串），通常用于 PUT/POST。 */
  body?: string
  /** 默认 true 异步。 */
  async?: boolean
  /**
   * 认证。
   *
   * - `true`（默认）：携带已登录设备认证
   * - 字符串：直接作为 `auth` 字段透传
   */
  auth?: boolean | string
}

// ─────────────────────────── 文件对话 ───────────────────────────

export interface OpenFileDialogResult {
  /** 用户选择的文件名（`-1` 表示取消）；保留 SDK 原始语义。 */
  szFileName: string
  /** 实际文件句柄；选择文件夹时可能为 null。 */
  file: File | null
}

// ─────────────────────────── 窗口 ───────────────────────────

export interface WindowStatus {
  index: number
  deviceId: string
  channelId: number
  /** 播放状态枚举，见 `PLAY_STATUS`。 */
  playStatus: number
  /** SDK 原始对象，包含码流类型、协议等附加字段。 */
  raw: import('./sdk').SdkWindowInfo
}

// ─────────────────────────── 事件映射 ───────────────────────────

/**
 * `on / off / once` 使用的事件名 → 负载映射。
 *
 * 命名规约：`<domain>:<action>`，便于排序与日志聚合。
 */
export interface HikPlayerEventMap {
  'plugin:initialized': void
  'plugin:destroyed': void
  'plugin:error': { windowIndex: number, errorCode: number, error: unknown }
  'plugin:performance-lack': void
  'plugin:secret-key-error': { windowIndex: number }
  /** 异常事件（取流断开 / 回放结束 / 对讲失败 / 空间不足等）。 */
  'plugin:event': { eventType: PluginEventCode | number, windowIndex: number, param2: number }
  'window:selected': { windowIndex: number }
  'window:dblclick': { windowIndex: number, fullScreen: boolean }
  'device:connected': DeviceSession
  'device:disconnected': { deviceId: string }
  'preview:started': { deviceId: string, channel: number, windowIndex: number, zeroChannel: boolean }
  'preview:stopped': { deviceId: string, windowIndex: number }
  'preview:stopped-all': void
  'playback:started': {
    deviceId: string
    channel: number
    windowIndex: number
    startTime: string
    endTime: string
  }
  'playback:stopped': { deviceId: string, windowIndex: number }
  'recording:started': { fileName: string, windowIndex: number }
  'recording:stopped': { windowIndex: number }
  'capture:completed': { fileName: string, windowIndex: number, asFile: FileDialogType | boolean }
}

declare global {
  interface Window {
    /** 由 `webVideoCtrl.js` 注入的全局 SDK 句柄。 */
    WebVideoCtrl?: WebVideoCtrlSDK
  }
}
