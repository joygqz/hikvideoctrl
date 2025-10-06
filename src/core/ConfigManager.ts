/**
 * 配置管理模块
 */

import type { CallbackOptions } from '../types'
import { promisify } from '../utils'

export class ConfigManager {
  private currentWindowIndex: number

  constructor(currentWindowIndex: number = 0) {
    this.currentWindowIndex = currentWindowIndex
  }

  setCurrentWindowIndex(index: number): void {
    this.currentWindowIndex = index
  }

  /**
   * 设置码流加密秘钥
   */
  async setSecretKey(secretKey: string, windowIndex?: number): Promise<void> {
    const index = windowIndex ?? this.currentWindowIndex
    return promisify(window.WebVideoCtrl.I_SetSecretKey, secretKey, index)
  }

  /**
   * 获取 OSD 时间
   */
  async getOSDTime(windowIndex?: number): Promise<string> {
    const index = windowIndex ?? this.currentWindowIndex
    return promisify(window.WebVideoCtrl.I_GetOSDTime, {
      iWndIndex: index,
    })
  }

  /**
   * 获取本地配置
   */
  getLocalConfig(): any {
    return window.WebVideoCtrl.I_GetLocalCfg()
  }

  /**
   * 设置本地配置
   */
  setLocalConfig(config: string): boolean {
    return window.WebVideoCtrl.I_SetLocalCfg(config) === 0
  }

  /**
   * 打开文件选择对话框
   */
  async openFileDlg(type: 0 | 1): Promise<{ szFileName: string, file: File }> {
    return promisify(window.WebVideoCtrl.I2_OpenFileDlg, type)
  }

  /**
   * 发送HTTP请求
   */
  async sendHTTPRequest(deviceIdentify: string, url: string, options: any): Promise<any> {
    return promisify(window.WebVideoCtrl.I_SendHTTPRequest, deviceIdentify, url, options)
  }

  /**
   * 获取文字叠加配置
   */
  async getTextOverlay(url: string, deviceIdentify: string, options: CallbackOptions = {}): Promise<any> {
    return promisify(window.WebVideoCtrl.I_GetTextOverlay, url, deviceIdentify, options)
  }
}
