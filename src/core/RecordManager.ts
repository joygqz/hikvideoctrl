/**
 * 录像和抓拍模块
 */

import type { CaptureOptions, RecordOptions, SearchRecordOptions } from '../types'
import { generateUniqueFileName, isValidTimeRange, promisify } from '../utils'
import { FileFormat, StreamType } from '../utils/constants'

export class RecordManager {
  /**
   * 搜索录像
   */
  async searchRecord(options: SearchRecordOptions): Promise<any> {
    const {
      deviceId,
      channelId,
      startTime,
      endTime,
      streamType = StreamType.MainStream,
      searchPos = 0,
    } = options

    if (!isValidTimeRange(startTime, endTime)) {
      throw new Error('无效的时间范围')
    }

    return promisify(
      window.WebVideoCtrl.I_RecordSearch,
      deviceId,
      channelId,
      startTime,
      endTime,
      {
        iStreamType: streamType,
        iSearchPos: searchPos,
      },
    )
  }

  /**
   * 开始录像
   */
  async startRecord(options: RecordOptions, onSuccess?: (fileName: string) => void): Promise<void> {
    const {
      windowIndex,
      fileName,
      useDateDir = true,
    } = options

    const finalFileName = fileName || generateUniqueFileName('record', 'mp4')

    return promisify(
      window.WebVideoCtrl.I_StartRecord,
      finalFileName,
      {
        iWndIndex: windowIndex,
        bDateDir: useDateDir,
        success: () => {
          onSuccess?.(finalFileName)
        },
      },
    )
  }

  /**
   * 停止录像
   */
  async stopRecord(windowIndex?: number, onSuccess?: () => void): Promise<void> {
    return promisify(
      window.WebVideoCtrl.I_StopRecord,
      {
        iWndIndex: windowIndex,
        success: () => {
          onSuccess?.()
        },
      },
    )
  }

  /**
   * 抓图
   */
  async capturePicture(options: CaptureOptions): Promise<void> {
    const {
      windowIndex,
      fileName,
      format = FileFormat.JPEG,
      callback,
    } = options

    const finalFileName = fileName || generateUniqueFileName('capture', format)

    return promisify(
      window.WebVideoCtrl.I2_CapturePic,
      finalFileName,
      {
        iWndIndex: windowIndex,
        cbCallback: callback,
      },
    )
  }

  /**
   * 开始下载录像文件
   */
  async startDownloadRecord(
    deviceIdentify: string,
    playbackURI: string,
    fileName: string,
    options: { bDateDir?: boolean } = {},
  ): Promise<void> {
    return promisify(
      window.WebVideoCtrl.I_StartDownloadRecord,
      deviceIdentify,
      playbackURI,
      fileName,
      options,
    )
  }

  /**
   * 按时间下载录像文件
   */
  async startDownloadRecordByTime(
    deviceIdentify: string,
    playbackURI: string,
    fileName: string,
    startTime: string,
    endTime: string,
    options: { bDateDir?: boolean } = {},
  ): Promise<void> {
    return promisify(
      window.WebVideoCtrl.I_StartDownloadRecordByTime,
      deviceIdentify,
      playbackURI,
      fileName,
      startTime,
      endTime,
      options,
    )
  }
}
