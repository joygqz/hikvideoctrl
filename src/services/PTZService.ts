import type { PluginHost } from '../core/PluginHost'
import type { WebVideoBridge } from '../core/WebVideoBridge'
import type { PTZCommandOptions } from '../types'

/**
 * 获取 PTZ 操作的窗口索引
 * @param plugin 插件宿主实例
 * @param windowIndex 指定窗口索引
 * @returns 处理后的窗口索引
 */
function resolveWindowIndex(plugin: PluginHost, windowIndex?: number): number {
  return windowIndex ?? plugin.activeWindow
}

/**
 * PTZ 云台操作服务
 */
export class PTZService {
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
   * 执行 PTZ 控制指令
   * @param options 控制参数
   * @param stop 是否停止当前动作
   * @returns Promise，在指令执行完成后解析
   */
  async control(options: PTZCommandOptions, stop: boolean = false): Promise<void> {
    const { action, speed = 4 } = options
    const windowIndex = resolveWindowIndex(this.plugin, options.windowIndex)

    await this.bridge.exec('I_PTZControl', action, stop, {
      iWndIndex: windowIndex,
      iPTZSpeed: speed,
    })
  }

  /**
   * 开始 PTZ 控制
   * @param options 控制参数
   * @returns Promise，在指令执行完成后解析
   */
  async start(options: PTZCommandOptions): Promise<void> {
    await this.control(options, false)
  }

  /**
   * 停止 PTZ 控制
   * @param action PTZ 动作类型
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，在停止命令执行完成后解析
   */
  async stop(action: number, windowIndex?: number): Promise<void> {
    await this.control({ action, windowIndex }, true)
  }

  /**
   * 设置预置位
   * @param preset 预置位号
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，在设置完成后解析
   */
  async setPreset(preset: number, windowIndex?: number): Promise<void> {
    const index = resolveWindowIndex(this.plugin, windowIndex)
    await this.bridge.exec('I_SetPreset', preset, { iWndIndex: index })
  }

  /**
   * 调用预置位
   * @param preset 预置位号
   * @param windowIndex 窗口索引（可选）
   * @returns Promise，在调用完成后解析
   */
  async goPreset(preset: number, windowIndex?: number): Promise<void> {
    const index = resolveWindowIndex(this.plugin, windowIndex)
    await this.bridge.exec('I_GoPreset', preset, { iWndIndex: index })
  }
}
