import type { EventBus } from '../core/EventBus'
import type { PluginHost } from '../core/PluginHost'
import type { WebVideoBridge } from '../core/WebVideoBridge'
import type {
  ChannelInfo,
  DeviceCredentials,
  DevicePort,
  DeviceSession,
  HikVideoEventMap,
  ProtocolScheme,
} from '../types'
import { createOperationError, HikSDKError } from '../errors'
import {
  generateDeviceIdentify,
  isValidIP,
  normalizePort,
  toProtocolValue,
} from '../utils'

interface NormalizedCredentials {
  host: string
  port: number
  protocol: ProtocolScheme
  username: string
  password: string
}

export class DeviceService {
  private readonly devices = new Map<string, DeviceSession>()
  private readonly bridge: WebVideoBridge
  private readonly plugin: PluginHost
  private readonly events: EventBus<HikVideoEventMap>

  constructor(bridge: WebVideoBridge, plugin: PluginHost, events: EventBus<HikVideoEventMap>) {
    this.bridge = bridge
    this.plugin = plugin
    this.events = events
  }

  list(): DeviceSession[] {
    return Array.from(this.devices.values())
  }

  get(deviceId: string): DeviceSession | undefined {
    return this.devices.get(deviceId)
  }

  async connect(credentials: DeviceCredentials): Promise<DeviceSession> {
    const normalized = this.normalizeCredentials(credentials)
    const protocolValue = toProtocolValue(normalized.protocol)
    const deviceId = generateDeviceIdentify(normalized.host, normalized.port)
    const loginOptions = credentials.loginOptions

    const loginArgs: any[] = [normalized.host, protocolValue, normalized.port, normalized.username, normalized.password]
    if (loginOptions) {
      loginArgs.push({
        async: loginOptions.async,
        cgi: loginOptions.cgi,
        success: loginOptions.onSuccess,
        error: loginOptions.onError,
      })
    }

    await this.bridge.exec('I_Login', ...loginArgs)

    const session: DeviceSession = {
      id: deviceId,
      host: normalized.host,
      port: normalized.port,
      protocol: normalized.protocol,
      username: normalized.username,
    }

    this.devices.set(deviceId, session)
    this.events.emit('device:connected', session)
    return session
  }

  async disconnect(deviceId: string): Promise<void> {
    if (!this.devices.has(deviceId))
      throw new HikSDKError('device-not-found', `设备 ${deviceId} 未连接`)

    const result = this.bridge.call<number>('I_Logout', deviceId)
    if (result !== 0)
      throw createOperationError(`退出设备 ${deviceId} 失败`, { result })

    await this.stopStreams(deviceId)
    this.devices.delete(deviceId)
    this.events.emit('device:disconnected', { deviceId })
  }

  async getInfo(deviceId: string): Promise<Document> {
    this.ensureDevice(deviceId)
    return this.bridge.exec('I_GetDeviceInfo', deviceId)
  }

  getPort(deviceId: string): DevicePort {
    this.ensureDevice(deviceId)
    const portInfo = this.bridge.call<DevicePort>('I_GetDevicePort', deviceId)
    if (!portInfo)
      throw createOperationError(`获取设备 ${deviceId} 端口失败`)
    return portInfo
  }

  async getChannels(deviceId: string): Promise<ChannelInfo[]> {
    this.ensureDevice(deviceId)
    const channels: ChannelInfo[] = []

    const analog = await this.safeGetXml('I_GetAnalogChannelInfo', deviceId)
    if (analog)
      channels.push(...this.parseAnalogChannels(analog))

    const digital = await this.safeGetXml('I_GetDigitalChannelInfo', deviceId)
    if (digital)
      channels.push(...this.parseDigitalChannels(digital))

    const zero = await this.safeGetXml('I_GetZeroChannelInfo', deviceId)
    if (zero)
      channels.push(...this.parseZeroChannels(zero))

    return channels
  }

  async getAudioInfo(deviceId: string): Promise<Document> {
    this.ensureDevice(deviceId)
    return this.bridge.exec('I_GetAudioInfo', deviceId)
  }

  async exportConfig(deviceId: string, password: string): Promise<void> {
    this.ensureDevice(deviceId)
    await this.bridge.exec('I_ExportDeviceConfig', deviceId, password)
  }

  async importConfig(deviceId: string, fileName: string, password: string, file: File): Promise<void> {
    this.ensureDevice(deviceId)
    await this.bridge.exec('I_ImportDeviceConfig', deviceId, fileName, password, file)
  }

  async restart(deviceId: string): Promise<void> {
    this.ensureDevice(deviceId)
    await this.bridge.exec('I_Restart', deviceId)
  }

  async reconnect(deviceId: string): Promise<void> {
    this.ensureDevice(deviceId)
    await this.bridge.exec('I_Reconnect', deviceId)
  }

  async restoreDefault(deviceId: string, mode: 'basic' | 'full'): Promise<void> {
    this.ensureDevice(deviceId)
    await this.bridge.exec('I_RestoreDefault', deviceId, mode)
  }

  async startUpgrade(deviceId: string, fileName: string, file: File): Promise<void> {
    this.ensureDevice(deviceId)
    await this.bridge.exec('I2_StartUpgrade', deviceId, fileName, file)
  }

  async getUpgradeProgress(deviceId: string): Promise<{ percent: number, upgrading: boolean }> {
    this.ensureDevice(deviceId)
    return this.bridge.exec('I_UpgradeProgress', deviceId)
  }

  private ensureDevice(deviceId: string): void {
    if (!this.devices.has(deviceId))
      throw new HikSDKError('device-not-found', `设备 ${deviceId} 未连接`)
  }

  private normalizeCredentials(credentials: DeviceCredentials): NormalizedCredentials {
    const host = credentials.host.trim()
    const protocol: ProtocolScheme = credentials.protocol ?? 'http'
    const port = normalizePort(credentials.port ?? (protocol === 'https' ? 443 : 80))

    if (!host)
      throw new HikSDKError('validation', '设备地址不能为空')

    if (!isValidIP(host) && !host.includes('.')) {
      throw new HikSDKError('validation', '请输入有效的设备 IP 或域名')
    }

    return {
      host,
      port,
      protocol,
      username: credentials.username,
      password: credentials.password,
    }
  }

  private async safeGetXml(method: string, deviceId: string): Promise<Document | null> {
    try {
      return await this.bridge.exec(method, deviceId)
    }
    catch (error) {
      console.warn(`[hikvideoctrl] 调用 ${method} 失败`, error)
      return null
    }
  }

  private parseAnalogChannels(doc: Document): ChannelInfo[] {
    const nodes = Array.from(doc.querySelectorAll('VideoInputChannel'))
    return nodes.map((node, index) => {
      const id = node.querySelector('id')?.textContent ?? ''
      const name = node.querySelector('name')?.textContent ?? `Camera ${(index + 1).toString().padStart(2, '0')}`
      return { id, name, type: 'analog', isZero: false, online: true }
    })
  }

  private parseDigitalChannels(doc: Document): ChannelInfo[] {
    const nodes = Array.from(doc.querySelectorAll('InputProxyChannelStatus'))
    return nodes
      .filter(node => node.querySelector('online')?.textContent === 'true')
      .map((node, index) => {
        const id = node.querySelector('id')?.textContent ?? ''
        const name = node.querySelector('name')?.textContent ?? `IPCamera ${(index + 1).toString().padStart(2, '0')}`
        return { id, name, type: 'digital', isZero: false, online: true }
      })
  }

  private parseZeroChannels(doc: Document): ChannelInfo[] {
    const nodes = Array.from(doc.querySelectorAll('ZeroVideoChannel'))
    return nodes
      .filter(node => node.querySelector('enabled')?.textContent === 'true')
      .map((node, index) => {
        const id = node.querySelector('id')?.textContent ?? ''
        const name = node.querySelector('name')?.textContent ?? `Zero Channel ${(index + 1).toString().padStart(2, '0')}`
        return { id, name, type: 'zero', isZero: true, online: true }
      })
  }

  private async stopStreams(deviceId: string): Promise<void> {
    const windows = this.plugin.getWindowSet()
    const relatedWindows = windows.filter((wnd: any) => wnd.szDeviceIdentify === deviceId)

    await Promise.all(relatedWindows.map(async (wnd: any) => {
      try {
        await this.bridge.exec('I_Stop', { iWndIndex: wnd.iIndex })
        await this.bridge.exec('I_SetSecretKey', '', wnd.iIndex)
      }
      catch (error) {
        console.warn(`[hikvideoctrl] 停止窗口 ${wnd.iIndex} 流失败`, error)
      }
    }))
  }
}
