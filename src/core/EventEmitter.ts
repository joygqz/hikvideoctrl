/**
 * 事件系统
 */

import type { EventCallback } from '../types'

export class EventEmitter {
  private callbacks: Map<string, EventCallback[]> = new Map()

  on(event: string, callback: EventCallback): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, [])
    }
    this.callbacks.get(event)!.push(callback)
  }

  off(event: string, callback?: EventCallback): void {
    if (!this.callbacks.has(event))
      return

    if (callback) {
      const callbacks = this.callbacks.get(event)!
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
    else {
      this.callbacks.delete(event)
    }
  }

  emit(event: string, data?: any): void {
    const callbacks = this.callbacks.get(event)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }

  clear(): void {
    this.callbacks.clear()
  }
}
