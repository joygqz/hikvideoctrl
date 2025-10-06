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

/**
 * 规范化后的设备凭证
 */
interface NormalizedCredentials {
  host: string
  port: number
  protocol: ProtocolScheme
  username: string
  password: string
}

/**
 * 设备相关操作的服务封装
 */
export class DeviceService {
  private readonly devices = new Map<string, DeviceSession>()
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
   * 获取所有已连接设备
   * @returns 设备会话列表
   */
  list(): DeviceSession[] {
    return Array.from(this.devices.values())
  }

  /**
   * 获取指定设备会话
   * @param deviceId 设备标识
   * @returns 设备会话信息或 undefined
   */
  get(deviceId: string): DeviceSession | undefined {
    return this.devices.get(deviceId)
  }

  /**
   * 连接设备
   * @param credentials 设备凭证信息
   * @returns Promise，解析为连接成功后的设备会话
   * @throws {HikSDKError} 输入无效或连接失败时抛出
   */
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

  /**
   * 断开设备连接
   * @param deviceId 设备标识
   * @returns Promise，在断开完成后解析
   * @throws {HikSDKError} 设备未找到或断开失败时抛出
   */
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

  /**
   * 获取设备基本信息
   * @param deviceId 设备标识
   * @returns Promise，解析为设备信息 XML 文档
   */
  async getInfo(deviceId: string): Promise<Document> {
    this.ensureDevice(deviceId)
    return this.bridge.exec('I_GetDeviceInfo', deviceId)
  }

  /**
   * 获取设备端口信息
   * @param deviceId 设备标识
   * @returns 端口信息
   */
  getPort(deviceId: string): DevicePort {
    this.ensureDevice(deviceId)
    const portInfo = this.bridge.call<DevicePort>('I_GetDevicePort', deviceId)
    if (!portInfo)
      throw createOperationError(`获取设备 ${deviceId} 端口失败`)
    return portInfo
  }

  /**
   * 获取设备所有通道
   * @param deviceId 设备标识
   * @returns Promise，解析为通道信息列表
   */
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

  /**
   * 获取音频配置信息
   * @param deviceId 设备标识
   * @returns Promise，解析为音频信息 XML 文档
   */
  async getAudioInfo(deviceId: string): Promise<Document> {
    this.ensureDevice(deviceId)
    return this.bridge.exec('I_GetAudioInfo', deviceId)
  }

  /**
   * 导出设备配置
   * @param deviceId 设备标识
   * @param password 配置密码
   * @returns Promise，在导出完成后解析
   */
  async exportConfig(deviceId: string, password: string): Promise<void> {
    this.ensureDevice(deviceId)
    await this.bridge.exec('I_ExportDeviceConfig', deviceId, password)
  }

  /**
   * 导入设备配置
   * @param deviceId 设备标识
   * @param fileName 文件名
   * @param password 配置密码
   * @param file 配置文件
   * @returns Promise，在导入完成后解析
   */
  async importConfig(deviceId: string, fileName: string, password: string, file: File): Promise<void> {
    this.ensureDevice(deviceId)
    await this.bridge.exec('I_ImportDeviceConfig', deviceId, fileName, password, file)
  }

  /**
   * 重启设备
   * @param deviceId 设备标识
   * @returns Promise，在重启命令下发后解析
   */
  async restart(deviceId: string): Promise<void> {
    this.ensureDevice(deviceId)
    await this.bridge.exec('I_Restart', deviceId)
  }

  /**
   * 重新连接设备
   * @param deviceId 设备标识
   * @returns Promise，在重连完成后解析
   */
  async reconnect(deviceId: string): Promise<void> {
    this.ensureDevice(deviceId)
    await this.bridge.exec('I_Reconnect', deviceId)
  }

  /**
   * 恢复设备出厂设置
   * @param deviceId 设备标识
   * @param mode 恢复模式
   * @returns Promise，在命令执行完成后解析
   */
  async restoreDefault(deviceId: string, mode: 'basic' | 'full'): Promise<void> {
    this.ensureDevice(deviceId)
    await this.bridge.exec('I_RestoreDefault', deviceId, mode)
  }

  /**
   * 开始固件升级
   * @param deviceId 设备标识
   * @param fileName 固件文件名
   * @param file 固件文件
   * @returns Promise，在升级任务启动后解析
   */
  async startUpgrade(deviceId: string, fileName: string, file: File): Promise<void> {
    this.ensureDevice(deviceId)
    await this.bridge.exec('I2_StartUpgrade', deviceId, fileName, file)
  }

  /**
   * 查询升级进度
   * @param deviceId 设备标识
   * @returns Promise，解析为升级进度信息
   */
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
