import type { PluginHost } from '../core/PluginHost'
import type { WebVideoBridge } from '../core/WebVideoBridge'
import type { HTTPRequestOptions } from '../types'

/**
 * 获取有效的窗口索引
 * @param plugin 插件宿主实例
 * @param windowIndex 指定的窗口索引
 * @returns 处理后的窗口索引
 */
function resolveWindowIndex(plugin: PluginHost, windowIndex?: number): number {
  return windowIndex ?? plugin.activeWindow
}

/**
 * 配置相关 SDK 操作的封装
 */
export class ConfigService {
  private readonly bridge: WebVideoBridge
  private readonly plugin: PluginHost

  /**
   * 构造函数
   * @param bridge SDK 桥接实例
   * @param plugin 插件宿主实例
   */
  constructor(bridge: WebVideoBridge, plugin: PluginHost) {
    this.bridge = bridge
    this.plugin = plugin
  }

  /**
   * 设置视频加密密钥
   * @param secretKey 加密密钥
   * @param windowIndex 窗口索引（可选）
   */
  async setSecretKey(secretKey: string, windowIndex?: number): Promise<void> {
    await this.bridge.exec('I_SetSecretKey', secretKey, resolveWindowIndex(this.plugin, windowIndex))
  }

  /**
   * 获取窗口的 OSD 时间
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，解析为 OSD 时间字符串
   */
  async getOSDTime(windowIndex?: number): Promise<string> {
    return this.bridge.exec('I_GetOSDTime', {
      iWndIndex: resolveWindowIndex(this.plugin, windowIndex),
    })
  }

  /**
   * 获取本地配置
   * @returns SDK 返回的本地配置数据
   */
  getLocalConfig(): any {
    return this.bridge.call('I_GetLocalCfg')
  }

  /**
   * 设置本地配置
   * @param config 配置字符串
   * @returns 是否设置成功（返回 true 表示 SDK 返回 0）
   */
  setLocalConfig(config: string): boolean {
    const result = this.bridge.call<number>('I_SetLocalCfg', config)
    return result === 0
  }

  /**
   * 打开文件选择对话框
   * @param type 类型（0 表示文件夹，1 表示文件）
   * @returns Promise，解析为所选文件或文件夹的 SDK 响应
   */
  async openFileDialog(type: 0 | 1): Promise<{ szFileName: string, file: File }> {
    return this.bridge.exec('I2_OpenFileDlg', type)
  }

  /**
   * 发送 HTTP 请求到设备
   * @param deviceId 设备 ID
   * @param url 请求地址
   * @param options 请求选项
   * @returns Promise，解析为设备响应数据
   */
  async sendHTTPRequest(deviceId: string, url: string, options: HTTPRequestOptions = {}): Promise<any> {
    return this.bridge.exec('I_SendHTTPRequest', deviceId, url, options)
  }

  /**
   * 获取设备的字符叠加配置
   * @param deviceId 设备 ID
   * @param url 请求地址
   * @param options 请求选项
   * @returns Promise，解析为设备响应数据
   */
  async getTextOverlay(deviceId: string, url: string, options: HTTPRequestOptions = {}): Promise<any> {
    return this.bridge.exec('I_GetTextOverlay', deviceId, url, options)
  }
}
