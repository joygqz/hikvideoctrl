import type { EventBus } from '../core/EventBus'
import type { PluginHost } from '../core/PluginHost'
import type { WebVideoBridge } from '../core/WebVideoBridge'
import type {
  CaptureOptions,
  DownloadByTimeOptions,
  DownloadOptions,
  HikVideoEventMap,
  RecordingOptions,
  RecordSearchOptions,
} from '../types'
import {
  generateUniqueFileName,
  isValidTimeRange,
} from '../utils'
import { FileFormat } from '../utils/constants'

/**
 * 获取有效的窗口索引
 * @param plugin 插件宿主实例
 * @param windowIndex 指定窗口索引
 * @returns 处理后的窗口索引
 */
function resolveWindowIndex(plugin: PluginHost, windowIndex?: number): number {
  return windowIndex ?? plugin.activeWindow
}

/**
 * 录像与抓拍操作服务
 */
export class RecordingService {
  private readonly bridge: WebVideoBridge
  private readonly plugin: PluginHost
  private readonly events: EventBus<HikVideoEventMap>

  /**
   * 构造函数
   * @param bridge SDK 桥接实例
   * @param plugin 插件宿主实例
   * @param events 事件总线实例
   */
  constructor(bridge: WebVideoBridge, plugin: PluginHost, events: EventBus<HikVideoEventMap>) {
    this.bridge = bridge
    this.plugin = plugin
    this.events = events
  }

  /**
   * 搜索录像文件
   * @param deviceId 设备标识
   * @param options 搜索选项
   * @returns Promise，解析为录像搜索结果
   * @throws {TypeError} 时间范围无效时抛出
   */
  async search(deviceId: string, options: RecordSearchOptions): Promise<Document> {
    if (!isValidTimeRange(options.start, options.end))
      throw new TypeError('无效的时间范围')

    return this.bridge.exec('I_RecordSearch', deviceId, options.channel, options.start, options.end, {
      iStreamType: options.streamType ?? 1,
      iSearchPos: options.page ?? 0,
    })
  }

  /**
   * 开始本地录像
   * @param options 录像选项
   * @returns Promise，解析为录像文件名称
   */
  async startRecord(options: RecordingOptions): Promise<string> {
    const windowIndex = resolveWindowIndex(this.plugin, options.windowIndex)
    const fileName = options.fileName ?? generateUniqueFileName('record', 'mp4')

    await this.bridge.exec('I_StartRecord', fileName, {
      iWndIndex: windowIndex,
      bDateDir: options.directoryByDate ?? true,
    })

    this.events.emit('recording:started', { fileName, windowIndex })
    return fileName
  }

  /**
   * 停止本地录像
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，在停止完成后解析
   */
  async stopRecord(windowIndex?: number): Promise<void> {
    const target = resolveWindowIndex(this.plugin, windowIndex)
    await this.bridge.exec('I_StopRecord', { iWndIndex: target })
    this.events.emit('recording:stopped', { windowIndex: target })
  }

  /**
   * 抓拍当前画面
   * @param options 抓拍选项
   * @returns Promise，解析为抓拍文件名称；若提供 onData，则文件内容通过回调返回
   */
  async capture(options: CaptureOptions = {}): Promise<string> {
    const windowIndex = resolveWindowIndex(this.plugin, options.windowIndex)
    const format = options.format ?? FileFormat.JPEG
    const fileName = options.fileName ?? generateUniqueFileName('capture', format)

    await this.bridge.exec('I2_CapturePic', fileName, {
      iWndIndex: windowIndex,
      cbCallback: options.onData,
    })

    this.events.emit('capture:completed', { fileName, windowIndex, format })
    return fileName
  }

  /**
   * 下载录像文件
   * @param deviceId 设备标识
   * @param playbackUri 回放 URI
   * @param fileName 文件名
   * @param options 下载选项
   * @returns Promise，解析为下载任务句柄
   */
  async download(deviceId: string, playbackUri: string, fileName: string, options: DownloadOptions = {}): Promise<number> {
    return this.bridge.exec('I_StartDownloadRecord', deviceId, playbackUri, fileName, {
      bDateDir: options.directoryByDate ?? true,
    })
  }

  /**
   * 按时间范围下载录像
   * @param deviceId 设备标识
   * @param playbackUri 回放 URI
   * @param options 下载选项
   * @returns Promise，解析为下载任务句柄
   * @throws {TypeError} 时间范围无效时抛出
   */
  async downloadByTime(deviceId: string, playbackUri: string, options: DownloadByTimeOptions): Promise<number> {
    if (!isValidTimeRange(options.start, options.end))
      throw new TypeError('无效的时间范围')

    return this.bridge.exec(
      'I_StartDownloadRecordByTime',
      deviceId,
      playbackUri,
      options.fileName,
      options.start,
      options.end,
      {
        bDateDir: options.directoryByDate ?? true,
      },
    )
  }
}
