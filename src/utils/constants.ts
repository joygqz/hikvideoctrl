/**
 * 海康威视 WebSDK 常量定义
 */

// SDK 版本信息
export const SDK_VERSION = 'websdk3.220191023'

// 错误码映射
export const ErrorCodes: Record<number, string> = {
  1001: '码流传输过程异常',
  1002: '回放结束',
  1003: '取流失败，连接被动断开',
  1004: '对讲连接被动断开',
  1005: '广播连接被动断开',
  1006: '视频编码格式不支持 目前只支持h264 和 h265',
  1007: '网络异常导致websocket断开',
  1008: '首帧回调超时',
  1009: '对讲码流传输过程异常',
  1010: '广播码流传输过程异常',
  1011: '数据接收异常，请检查是否修改了视频格式',
  1012: '播放资源不足',
  1013: '当前环境不支持该鱼眼展开模式',
  1014: '外部强制关闭了',
  1015: '获取播放url失败',
  1016: '文件下载完成',
  1017: '密码错误',
  1018: '链接到萤石平台失败',
  1019: '未找到录像片段',
  1020: '水印模式等场景，当前通道需要重新播放',
  1021: '缓存溢出',
  1022: '采集音频失败，可能是在非https/localhost域下使用对讲导致,或者没有插耳机等',
}

// PTZ 控制类型
export const PTZControlType = {
  Up: 1,
  Down: 2,
  Left: 3,
  Right: 4,
  UpLeft: 5,
  UpRight: 6,
  DownLeft: 7,
  DownRight: 8,
  Auto: 9,
  ZoomIn: 10,
  ZoomOut: 11,
  FocusIn: 12,
  FocusOut: 13,
  IrisIn: 14,
  IrisOut: 15,
} as const

// 流类型
export const StreamType = {
  MainStream: 1, // 主码流
  SubStream: 2, // 子码流
} as const

// 包类型
export const PackageType = {
  PS: 2,
  MP4: 11,
} as const

// 窗口类型
export const WindowType = {
  Single: 1, // 单窗口
  Four: 4, // 四窗口
  Nine: 9, // 九窗口
  Sixteen: 16, // 十六窗口
} as const

// 文件类型
export const FileDialogType = {
  Folder: 0, // 文件夹
  File: 1, // 文件
} as const

// 录像类型
export const RecordType = {
  RealPlay: 'realplay',
  Playback: 'playback',
} as const

// 协议类型
export const ProtocolType = {
  HTTP: 1,
  HTTPS: 2,
} as const

// 文件格式
export const FileFormat = {
  JPG: 'jpg',
  JPEG: 'jpeg',
  PNG: 'png',
  BMP: 'bmp',
} as const

// 默认端口配置
export const DefaultPorts = {
  HTTP: 80,
  HTTPS: 443,
  RTSP: 554,
}

// 类型别名
export type WindowTypeValue = typeof WindowType[keyof typeof WindowType]
export type StreamTypeValue = typeof StreamType[keyof typeof StreamType]
export type PTZControlTypeValue = typeof PTZControlType[keyof typeof PTZControlType]
export type ProtocolTypeValue = typeof ProtocolType[keyof typeof ProtocolType]
export type FileFormatValue = typeof FileFormat[keyof typeof FileFormat]

// IP 模式端口配置
export const IPModePorts = [0, 7071, 80]

// 音频错误码
export const AudioErrorCode = {
  AlreadyOpen: 1023,
  AlreadyClosed: 1023,
}

// 每页搜索记录数
export const SEARCH_RECORDS_PER_PAGE = 40
