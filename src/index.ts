/**
 * hikvideoctrl —— 海康威视无插件视频 SDK 的现代化 TypeScript 封装。
 *
 * @packageDocumentation
 */

export {
  DEFAULT_PORT,
  FILE_DIALOG,
  LAYOUT,
  PLAY_STATUS,
  PLUGIN_EVENT,
  PROTOCOL,
  PTZ_COMMAND,
  PTZ_SPEED_RANGE,
  RECORD_SEARCH_PAGE_SIZE,
  RESTORE_MODE,
  SDK_RUNTIME_ERROR,
  STREAM_TYPE,
  TRANSCODE_BITRATE,
  TRANSCODE_FRAME_RATE,
  TRANSCODE_RESOLUTION,
} from './constants'

export type {
  FileDialogType,
  Layout,
  PlayStatus,
  PluginEventCode,
  Protocol,
  ProtocolScheme,
  PtzCommand,
  RestoreMode,
  SdkRuntimeError,
  StreamType,
  TranscodeBitrate,
  TranscodeFrameRate,
  TranscodeResolution,
} from './constants'

export { HikError, type HikErrorCode, type HikErrorDetails, toHikError } from './errors'

export { createHikPlayer, HikPlayer, isNoPluginSupported } from './HikPlayer'

export {
  callPromise,
  callSync,
  callWithCallback,
  loadWebVideoCtrl,
  type LoadWebVideoCtrlOptions,
  type SdkAjaxOptions,
  type SdkDevicePort,
  type SdkHttpOptions,
  type SdkInitOptions,
  type SdkWindowInfo,
  type WebVideoCtrlSDK,
} from './sdk'

export type {
  CaptureOptions,
  ChannelInfo,
  ChannelKind,
  DeviceCredentials,
  DeviceInfo,
  DeviceLoginOptions,
  DevicePort,
  DeviceSession,
  DownloadByTimeOptions,
  DownloadOptions,
  HikPlayerEventMap,
  HikPlayerOptions,
  HttpRequestOptions,
  ImportDeviceConfigOptions,
  OpenFileDialogResult,
  PlaybackOptions,
  PlaybackTranscode,
  PluginInitOptions,
  PreviewOptions,
  PtzControlOptions,
  RecordingOptions,
  RecordKind,
  RecordMatch,
  RecordSearchOptions,
  RecordSearchResult,
  RestoreDefaultOptions,
  StartUpgradeOptions,
  WindowStatus,
} from './types'

export {
  currentTimestamp,
  ensureXmlDocument,
  formatDate,
  isHostname,
  isIPv4,
  isIPv6,
  isValidHost,
  isValidPort,
  isValidTimeRange,
  makeDeviceIdentify,
  normalizePort,
  parseDeviceIdentify,
  parseXml,
  stringifyXml,
  todayTimeRange,
  toProtocolValue,
  uniqueFileName,
  xmlText,
} from './utils'
