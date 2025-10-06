/**
 * 海康威视无插件视频播放 SDK
 */

import { createHikVideoClient, HikVideoClient } from './HikVideoClient'

export { createHikVideoClient, HikVideoClient }
export { createOperationError, HikSDKError } from './errors'
export type {
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
export {
  delay,
  encodeString,
  formatDate,
  generateDeviceIdentify,
  generateUniqueFileName,
  getCurrentTimeString,
  getTodayTimeRange,
  isValidIP,
  isValidPort,
  isValidTimeRange,
  loadXML,
  normalizePort,
  parseDeviceIdentify,
  toProtocolValue,
  toXMLString,
  uint8ArrayToBase64,
} from './utils'
export {
  AudioErrorCode,
  DefaultPorts,
  ErrorCodes,
  FileFormat,
  IPModePorts,
  PackageType,
  ProtocolType,
  PTZControlType,
  RecordType,
  SEARCH_RECORDS_PER_PAGE,
  StreamType,
  WindowType,
} from './utils/constants'

export function isNoPluginSupported(): boolean {
  return Boolean(window?.WebVideoCtrl?.I_SupportNoPlugin?.())
}

export default HikVideoClient
