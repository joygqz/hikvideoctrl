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

function resolveWindowIndex(plugin: PluginHost, windowIndex?: number): number {
  return windowIndex ?? plugin.activeWindow
}

export class RecordingService {
  private readonly bridge: WebVideoBridge
  private readonly plugin: PluginHost
  private readonly events: EventBus<HikVideoEventMap>

  constructor(bridge: WebVideoBridge, plugin: PluginHost, events: EventBus<HikVideoEventMap>) {
    this.bridge = bridge
    this.plugin = plugin
    this.events = events
  }

  async search(deviceId: string, options: RecordSearchOptions): Promise<Document> {
    if (!isValidTimeRange(options.start, options.end))
      throw new TypeError('无效的时间范围')

    return this.bridge.exec('I_RecordSearch', deviceId, options.channel, options.start, options.end, {
      iStreamType: options.streamType ?? 1,
      iSearchPos: options.page ?? 0,
    })
  }

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

  async stopRecord(windowIndex?: number): Promise<void> {
    const target = resolveWindowIndex(this.plugin, windowIndex)
    await this.bridge.exec('I_StopRecord', { iWndIndex: target })
    this.events.emit('recording:stopped', { windowIndex: target })
  }

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

  async download(deviceId: string, playbackUri: string, fileName: string, options: DownloadOptions = {}): Promise<number> {
    return this.bridge.exec('I_StartDownloadRecord', deviceId, playbackUri, fileName, {
      bDateDir: options.directoryByDate ?? true,
    })
  }

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
