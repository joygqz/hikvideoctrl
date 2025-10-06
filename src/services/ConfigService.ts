import type { PluginHost } from '../core/PluginHost'
import type { WebVideoBridge } from '../core/WebVideoBridge'
import type { HTTPRequestOptions } from '../types'

function resolveWindowIndex(plugin: PluginHost, windowIndex?: number): number {
  return windowIndex ?? plugin.activeWindow
}

export class ConfigService {
  private readonly bridge: WebVideoBridge
  private readonly plugin: PluginHost

  constructor(bridge: WebVideoBridge, plugin: PluginHost) {
    this.bridge = bridge
    this.plugin = plugin
  }

  async setSecretKey(secretKey: string, windowIndex?: number): Promise<void> {
    await this.bridge.exec('I_SetSecretKey', secretKey, resolveWindowIndex(this.plugin, windowIndex))
  }

  async getOSDTime(windowIndex?: number): Promise<string> {
    return this.bridge.exec('I_GetOSDTime', {
      iWndIndex: resolveWindowIndex(this.plugin, windowIndex),
    })
  }

  getLocalConfig(): any {
    return this.bridge.call('I_GetLocalCfg')
  }

  setLocalConfig(config: string): boolean {
    const result = this.bridge.call<number>('I_SetLocalCfg', config)
    return result === 0
  }

  async openFileDialog(type: 0 | 1): Promise<{ szFileName: string, file: File }> {
    return this.bridge.exec('I2_OpenFileDlg', type)
  }

  async sendHTTPRequest(deviceId: string, url: string, options: HTTPRequestOptions = {}): Promise<any> {
    return this.bridge.exec('I_SendHTTPRequest', deviceId, url, options)
  }

  async getTextOverlay(deviceId: string, url: string, options: HTTPRequestOptions = {}): Promise<any> {
    return this.bridge.exec('I_GetTextOverlay', deviceId, url, options)
  }
}
