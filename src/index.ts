/**
 * 海康威视无插件视频播放SDK
 * HikVideoCtrl - Hikvision WebSDK Wrapper
 *
 * @author joygqz
 * @version 1.0.0
 */

// 导出主控制器类
export { HikVideoController } from './lib/HikVideoController'

// 导出类型定义
export type {
  CaptureOptions,
  DeviceInfo,
  DownloadRecordOptions,
  InitOptions,
  PlaybackOptions,
  PreviewOptions,
  PTZOptions,
  RecordOptions,
  SearchRecordOptions,
} from './lib/HikVideoController'

// 默认导出
export { HikVideoController as default } from './lib/HikVideoController'

// 导出常量
export {
  AudioErrorCode,
  DefaultPorts,
  ErrorCodes,
  FileFormat,
  ProtocolType,
  PTZControlType,
  RecordType,
  SEARCH_RECORDS_PER_PAGE,
  StreamType,
  WindowType,
} from './utils/constants'

// 导出工具函数
export {
  createResponseHandler,
  delay,
  encodeString,
  formatDate,
  generateDeviceIdentify,
  generateUniqueFileName,
  getCurrentTimeString,
  getTodayTimeRange,
  getWindowSize,
  isValidIP,
  isValidPort,
  isValidTimeRange,
  loadXML,
  parseDeviceIdentify,
  promisify,
  toXMLString,
  uint8ArrayToBase64,
} from './utils/index'
