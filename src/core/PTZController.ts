/**
 * PTZ 控制模块
 */

import type { PTZOptions } from '../types'
import { promisify } from '../utils'

export class PTZController {
  private currentWindowIndex: number

  constructor(currentWindowIndex: number = 0) {
    this.currentWindowIndex = currentWindowIndex
  }

  setCurrentWindowIndex(index: number): void {
    this.currentWindowIndex = index
  }

  /**
   * PTZ 控制
   */
  async ptzControl(options: PTZOptions, stop: boolean = false): Promise<void> {
    const {
      windowIndex = this.currentWindowIndex,
      ptzIndex,
      speed = 4,
    } = options

    return promisify(
      window.WebVideoCtrl.I_PTZControl,
      ptzIndex,
      stop,
      {
        iWndIndex: windowIndex,
        iPTZSpeed: speed,
      },
    )
  }

  /**
   * 设置预置点
   */
  async setPreset(presetId: number): Promise<void> {
    return promisify(window.WebVideoCtrl.I_SetPreset, presetId)
  }

  /**
   * 调用预置点
   */
  async goPreset(presetId: number): Promise<void> {
    return promisify(window.WebVideoCtrl.I_GoPreset, presetId)
  }
}
