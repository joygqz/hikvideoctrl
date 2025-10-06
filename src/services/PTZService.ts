import type { PluginHost } from '../core/PluginHost'
import type { WebVideoBridge } from '../core/WebVideoBridge'
import type { PTZCommandOptions } from '../types'

function resolveWindowIndex(plugin: PluginHost, windowIndex?: number): number {
  return windowIndex ?? plugin.activeWindow
}

export class PTZService {
  private readonly bridge: WebVideoBridge
  private readonly plugin: PluginHost

  constructor(bridge: WebVideoBridge, plugin: PluginHost) {
    this.bridge = bridge
    this.plugin = plugin
  }

  async control(options: PTZCommandOptions, stop: boolean = false): Promise<void> {
    const { action, speed = 4 } = options
    const windowIndex = resolveWindowIndex(this.plugin, options.windowIndex)

    await this.bridge.exec('I_PTZControl', action, stop, {
      iWndIndex: windowIndex,
      iPTZSpeed: speed,
    })
  }

  async start(options: PTZCommandOptions): Promise<void> {
    await this.control(options, false)
  }

  async stop(action: number, windowIndex?: number): Promise<void> {
    await this.control({ action, windowIndex }, true)
  }

  async setPreset(preset: number, windowIndex?: number): Promise<void> {
    const index = resolveWindowIndex(this.plugin, windowIndex)
    await this.bridge.exec('I_SetPreset', preset, { iWndIndex: index })
  }

  async goPreset(preset: number, windowIndex?: number): Promise<void> {
    const index = resolveWindowIndex(this.plugin, windowIndex)
    await this.bridge.exec('I_GoPreset', preset, { iWndIndex: index })
  }
}
