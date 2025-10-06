/**
 * PTZ 云台控制模块
 * 负责云台方向控制、预置点管理等功能
 */

import type { PTZOptions } from '../types'
import { promisify } from '../utils'

export class PTZController {
  private currentWindowIndex: number

  constructor(currentWindowIndex: number = 0) {
    this.currentWindowIndex = currentWindowIndex
  }

  /**
   * 设置当前窗口索引
   */
  setCurrentWindowIndex(index: number): void {
    this.currentWindowIndex = index
  }

  /**
   * 获取窗口索引（支持传入参数或使用默认）
   */
  private getWindowIndex(windowIndex?: number): number {
    return windowIndex ?? this.currentWindowIndex
  }

  /**
   * PTZ 云台控制
   * @param options PTZ 控制选项
   * @param stop 是否停止操作
   */
  async ptzControl(options: PTZOptions, stop: boolean = false): Promise<void> {
    const {
      windowIndex,
      ptzIndex,
      speed = 4,
    } = options

    return promisify(
      window.WebVideoCtrl.I_PTZControl,
      ptzIndex,
      stop,
      {
        iWndIndex: this.getWindowIndex(windowIndex),
        iPTZSpeed: speed,
      },
    )
  }

  /**
   * 开始PTZ控制（方向控制）
   * @param ptzIndex PTZ 控制类型（1-上, 2-下, 3-左, 4-右, 5-左上, 6-左下, 7-右上, 8-右下, 9-自转）
   * @param speed 速度，范围 1-7
   * @param windowIndex 窗口索引
   */
  async startPTZ(ptzIndex: number, speed: number = 4, windowIndex?: number): Promise<void> {
    return this.ptzControl({ ptzIndex, speed, windowIndex }, false)
  }

  /**
   * 停止PTZ控制
   * @param ptzIndex PTZ 控制类型
   * @param windowIndex 窗口索引
   */
  async stopPTZ(ptzIndex: number, windowIndex?: number): Promise<void> {
    return this.ptzControl({ ptzIndex, windowIndex }, true)
  }

  /**
   * 设置预置点
   * @param presetId 预置点 ID
   * @param windowIndex 窗口索引
   */
  async setPreset(presetId: number, windowIndex?: number): Promise<void> {
    return promisify(window.WebVideoCtrl.I_SetPreset, presetId, {
      iWndIndex: this.getWindowIndex(windowIndex),
    })
  }

  /**
   * 调用预置点
   * @param presetId 预置点 ID
   * @param windowIndex 窗口索引
   */
  async goPreset(presetId: number, windowIndex?: number): Promise<void> {
    return promisify(window.WebVideoCtrl.I_GoPreset, presetId, {
      iWndIndex: this.getWindowIndex(windowIndex),
    })
  }
}
