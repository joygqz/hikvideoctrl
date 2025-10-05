/**
 * 设备管理模块
 */

import type { CallbackOptions, ChannelInfo, DeviceInfo } from '../types'
import { generateDeviceIdentify, isValidIP, isValidPort, promisify } from '../utils'
import { ProtocolType } from '../utils/constants'

export class DeviceManager {
  /**
   * 登录设备
   */
  async login(deviceInfo: DeviceInfo, onSuccess?: (deviceId: string, ip: string, port: number) => void): Promise<void> {
    const { ip, port, username, password, protocol = ProtocolType.HTTP } = deviceInfo

    if (!isValidIP(ip)) {
      throw new Error('无效的IP地址')
    }

    if (!isValidPort(port)) {
      throw new Error('无效的端口号')
    }

    const deviceId = generateDeviceIdentify(ip, port)

    return promisify(
      window.WebVideoCtrl.I_Login,
      ip,
      protocol,
      port,
      username,
      password,
      {
        success: () => {
          onSuccess?.(deviceId, ip, port)
        },
        error: (status: number) => {
          throw new Error(`登录失败: ${status}`)
        },
      },
    )
  }

  /**
   * 登出设备
   */
  async logout(deviceId: string, onSuccess?: () => void): Promise<void> {
    const result = window.WebVideoCtrl.I_Logout(deviceId)

    if (result === 0) {
      // 停止相关窗口的播放
      const windowSet = window.WebVideoCtrl.I_GetWndSet()
      windowSet.forEach((wnd: any) => {
        if (wnd.szDeviceIdentify === deviceId) {
          window.WebVideoCtrl.I_Stop({ iIndex: wnd.iIndex })
          window.WebVideoCtrl.I_SetSecretKey('', wnd.iIndex)
        }
      })

      onSuccess?.()
    }
    else {
      throw new Error('登出失败')
    }
  }

  /**
   * 获取设备信息
   */
  async getDeviceInfo(deviceId: string): Promise<any> {
    return promisify(window.WebVideoCtrl.I_GetDeviceInfo, deviceId)
  }

  /**
   * 获取设备端口信息
   */
  getDevicePort(deviceId: string): any {
    return window.WebVideoCtrl.I_GetDevicePort(deviceId)
  }

  /**
   * 获取通道信息
   */
  async getChannels(deviceId: string): Promise<ChannelInfo[]> {
    const channels: ChannelInfo[] = []

    // 获取模拟通道
    try {
      const analogChannels = await promisify(window.WebVideoCtrl.I_GetAnalogChannelInfo, deviceId)
      if (analogChannels) {
        const videoChannels = analogChannels.querySelectorAll('VideoInputChannel')
        videoChannels.forEach((channel: Element, index: number) => {
          const id = channel.querySelector('id')?.textContent || ''
          let name = channel.querySelector('name')?.textContent
          if (!name) {
            name = `Camera ${index < 9 ? `0${index + 1}` : (index + 1)}`
          }
          channels.push({ id, name, type: 'analog', isZero: false })
        })
      }
    }
    catch (error) {
      console.warn('获取模拟通道失败:', error)
    }

    // 获取数字通道
    try {
      const digitalChannels = await promisify(window.WebVideoCtrl.I_GetDigitalChannelInfo, deviceId)
      if (digitalChannels) {
        const proxyChannels = digitalChannels.querySelectorAll('InputProxyChannelStatus')
        proxyChannels.forEach((channel: Element, index: number) => {
          const id = channel.querySelector('id')?.textContent || ''
          const online = channel.querySelector('online')?.textContent
          let name = channel.querySelector('name')?.textContent

          if (online === 'true') {
            if (!name) {
              name = `IPCamera ${index < 9 ? `0${index + 1}` : (index + 1)}`
            }
            channels.push({ id, name, type: 'digital', isZero: false })
          }
        })
      }
    }
    catch (error) {
      console.warn('获取数字通道失败:', error)
    }

    // 获取零通道
    try {
      const zeroChannels = await promisify(window.WebVideoCtrl.I_GetZeroChannelInfo, deviceId)
      if (zeroChannels) {
        const videoChannels = zeroChannels.querySelectorAll('ZeroVideoChannel')
        videoChannels.forEach((channel: Element, index: number) => {
          const id = channel.querySelector('id')?.textContent || ''
          const enabled = channel.querySelector('enabled')?.textContent
          let name = channel.querySelector('name')?.textContent

          if (enabled === 'true') {
            if (!name) {
              name = `Zero Channel ${index < 9 ? `0${index + 1}` : (index + 1)}`
            }
            channels.push({ id, name, type: 'zero', isZero: true })
          }
        })
      }
    }
    catch (error) {
      console.warn('获取零通道失败:', error)
    }

    return channels
  }

  /**
   * 获取对讲通道信息
   */
  async getAudioInfo(deviceId: string): Promise<any> {
    return promisify(window.WebVideoCtrl.I_GetAudioInfo, deviceId)
  }

  /**
   * 导出设备配置
   */
  async exportDeviceConfig(deviceIdentify: string, password: string): Promise<void> {
    return promisify(window.WebVideoCtrl.I_ExportDeviceConfig, deviceIdentify, password)
  }

  /**
   * 导入设备配置
   */
  async importDeviceConfig(deviceIdentify: string, fileName: string, password: string, file: File): Promise<void> {
    return promisify(window.WebVideoCtrl.I_ImportDeviceConfig, deviceIdentify, fileName, password, file)
  }

  /**
   * 重启设备
   */
  async restart(deviceIdentify: string, options: CallbackOptions = {}): Promise<void> {
    return promisify(window.WebVideoCtrl.I_Restart, deviceIdentify, options)
  }

  /**
   * 重新连接设备
   */
  async reconnect(deviceIdentify: string, options: CallbackOptions = {}): Promise<void> {
    return promisify(window.WebVideoCtrl.I_Reconnect, deviceIdentify, options)
  }

  /**
   * 恢复设备默认设置
   */
  async restoreDefault(deviceIdentify: string, mode: 'basic' | 'full', options: CallbackOptions = {}): Promise<void> {
    return promisify(window.WebVideoCtrl.I_RestoreDefault, deviceIdentify, mode, options)
  }

  /**
   * 开始设备升级
   */
  async startUpgrade(deviceIdentify: string, fileName: string, file: File): Promise<void> {
    return promisify(window.WebVideoCtrl.I2_StartUpgrade, deviceIdentify, fileName, file)
  }

  /**
   * 获取升级进度
   */
  async getUpgradeProgress(deviceIdentify: string): Promise<{ percent: number, upgrading: boolean }> {
    return promisify(window.WebVideoCtrl.I_UpgradeProgress, deviceIdentify)
  }
}
