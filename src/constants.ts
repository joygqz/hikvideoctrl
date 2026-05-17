/**
 * 与 SDK 一一对应的常量集合。所有常量均使用 `as const` 以派生字面量联合类型。
 * 取值来源：`WebSDK3.4_无插件开发包编程指南`。
 */

// ─────────────────────────── 协议与端口 ───────────────────────────

/** SDK 内部协议数值；与字符串形态的互转见 `toProtocolValue`。 */
export const PROTOCOL = {
  HTTP: 1,
  HTTPS: 2,
} as const

export const DEFAULT_PORT = {
  HTTP: 80,
  HTTPS: 443,
  RTSP: 554,
} as const

// ─────────────────────────── 码流与窗口 ───────────────────────────

/** 码流类型，传给 `I_StartRealPlay` / `I_StartPlayback` / `I_RecordSearch`。 */
export const STREAM_TYPE = {
  Main: 1,
  Sub: 2,
  Third: 3,
} as const

/**
 * 分屏布局，传给 `I_InitPlugin.iWndowType` 与 `I_ChangeWndNum`。
 *
 * 取值非平方关系：`1/2/3/4` 直接对应 `1x1 / 2x2 / 3x3 / 4x4`，超过 4 按 4x4 处理。
 */
export const LAYOUT = {
  Single: 1,
  Quad: 2,
  Nine: 3,
  Sixteen: 4,
} as const

/** `I_GetWindowStatus().iPlayStatus` / `I_GetWndSet()` 元素的播放状态。 */
export const PLAY_STATUS = {
  Idle: 0,
  Preview: 1,
  Playback: 2,
  Paused: 3,
  SingleFrame: 4,
  Reverse: 5,
  ReversePaused: 6,
} as const

// ─────────────────────────── PTZ ───────────────────────────

/**
 * PTZ 控制类型，对应 `I_PTZControl` 的 `iPTZIndex`。
 *
 * 海康文档原文：`5-左上，6-左下，7-右上，8-右下`，注意命名顺序与直觉相反。
 */
export const PTZ_COMMAND = {
  Up: 1,
  Down: 2,
  Left: 3,
  Right: 4,
  UpLeft: 5,
  DownLeft: 6,
  UpRight: 7,
  DownRight: 8,
  /** 自动巡航开关 */
  AutoPan: 9,
  ZoomIn: 10,
  ZoomOut: 11,
  FocusFar: 12,
  FocusNear: 13,
  IrisOpen: 14,
  IrisClose: 15,
} as const

/** PTZ 速度合法区间，超出抛出 `INVALID_ARGUMENT`。 */
export const PTZ_SPEED_RANGE = { min: 1, max: 7, default: 4 } as const

// ─────────────────────────── 录像 / 抓拍 ───────────────────────────

/** `I_RecordSearch` 单次返回上限；分页按此步长递增 `iSearchPos`。 */
export const RECORD_SEARCH_PAGE_SIZE = 40

/** `I2_OpenFileDlg` 对话框类型（`0` 文件夹，`1` 文件）。 */
export const FILE_DIALOG = {
  Directory: 0,
  File: 1,
} as const

/**
 * `I_RestoreDefault` 的 `szMode` 取值。
 * - `basic`：保留用户与网络等基础配置
 * - `full`：完全恢复，包括所有用户信息
 */
export const RESTORE_MODE = {
  Basic: 'basic',
  Full: 'full',
} as const

// ─────────────────────────── 转码回放 ───────────────────────────

/** 转码回放 `TransFrameRate` 档位。 */
export const TRANSCODE_FRAME_RATE = {
  All: '0',
  Fps1: '5',
  Fps2: '6',
  Fps4: '7',
  Fps6: '8',
  Fps8: '9',
  Fps10: '10',
  Fps12: '11',
  Fps16: '12',
  Fps20: '13',
  Fps15: '14',
  Fps18: '15',
  Fps22: '16',
  Auto: '255',
} as const

/** 转码回放 `TransResolution` 档位。 */
export const TRANSCODE_RESOLUTION = {
  CIF: '1',
  QCIF: '2',
  /** 4CIF / D1 */
  D1: '3',
  Auto: '255',
} as const

/** 转码回放 `TransBitrate` 档位。 */
export const TRANSCODE_BITRATE = {
  K32: '2',
  K48: '3',
  K64: '4',
  K80: '5',
  K96: '6',
  K128: '7',
  K160: '8',
  K192: '9',
  K224: '10',
  K256: '11',
  K320: '12',
  K384: '13',
  K448: '14',
  K512: '15',
  K640: '16',
  K768: '17',
  K896: '18',
  K1024: '19',
  K1280: '20',
  K1536: '21',
  K1792: '22',
  K2048: '23',
  K3072: '24',
  K4096: '25',
  K8192: '26',
  Auto: '255',
} as const

// ─────────────────────────── 事件 / 错误码 ───────────────────────────

/** 插件 `cbEvent` 的事件类型（第一个参数）。 */
export const PLUGIN_EVENT = {
  /** 回放异常 / 取流被动断开 */
  PlayAbnormal: 0,
  /** 回放正常结束 */
  PlaybackEnd: 2,
  /** 对讲失败 */
  AudioTalkFail: 3,
  /** 硬盘空间不足 */
  NoFreeSpace: 21,
} as const

/** 设备/插件运行时错误码与中文描述（来源：`cbPluginErrorHandler` 与流回调 `iErrorCode`）。 */
export const SDK_RUNTIME_ERROR = Object.freeze({
  1001: '码流传输过程异常',
  1002: '回放结束',
  1003: '取流失败，连接被动断开',
  1004: '对讲连接被动断开',
  1005: '广播连接被动断开',
  1006: '视频编码格式不支持，目前只支持 H.264 / H.265',
  1007: '网络异常导致 WebSocket 断开',
  1008: '首帧回调超时',
  1009: '对讲码流传输过程异常',
  1010: '广播码流传输过程异常',
  1011: '数据接收异常，请检查是否修改了视频格式',
  1012: '播放资源不足',
  1013: '当前环境不支持该鱼眼展开模式',
  1014: '外部强制关闭',
  1015: '获取播放 URL 失败',
  1016: '文件下载完成',
  1017: '密码错误',
  1018: '链接到萤石平台失败',
  1019: '未找到录像片段',
  1020: '水印模式等场景，当前通道需要重新播放',
  1021: '缓存溢出',
  1022: '采集音频失败：非 https/localhost 域名或未插耳机等',
})

// ─────────────────────────── 字面量类型 ───────────────────────────

/** 面向用户的协议字符串形态。 */
export type ProtocolScheme = 'http' | 'https'

export type Protocol = typeof PROTOCOL[keyof typeof PROTOCOL]
export type StreamType = typeof STREAM_TYPE[keyof typeof STREAM_TYPE]
export type Layout = typeof LAYOUT[keyof typeof LAYOUT]
export type PlayStatus = typeof PLAY_STATUS[keyof typeof PLAY_STATUS]
export type PtzCommand = typeof PTZ_COMMAND[keyof typeof PTZ_COMMAND]
export type FileDialogType = typeof FILE_DIALOG[keyof typeof FILE_DIALOG]
export type RestoreMode = typeof RESTORE_MODE[keyof typeof RESTORE_MODE]
export type PluginEventCode = typeof PLUGIN_EVENT[keyof typeof PLUGIN_EVENT]
export type TranscodeFrameRate = typeof TRANSCODE_FRAME_RATE[keyof typeof TRANSCODE_FRAME_RATE]
export type TranscodeResolution = typeof TRANSCODE_RESOLUTION[keyof typeof TRANSCODE_RESOLUTION]
export type TranscodeBitrate = typeof TRANSCODE_BITRATE[keyof typeof TRANSCODE_BITRATE]
export type SdkRuntimeError = keyof typeof SDK_RUNTIME_ERROR
