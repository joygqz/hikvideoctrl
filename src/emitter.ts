/**
 * 极简类型化事件总线，仅支持"具名事件 → 单一负载"语义。
 * 监听器异常仅记录到 console，不阻塞其它监听器。
 */

export type EventHandler<P> = (payload: P) => void

export class TypedEmitter<EventMap extends Record<string, any>> {
  private readonly listeners = new Map<keyof EventMap, Set<EventHandler<unknown>>>()

  /** 订阅事件，返回取消订阅函数。 */
  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void {
    const bag = this.listeners.get(event) ?? new Set<EventHandler<unknown>>()
    bag.add(handler as EventHandler<unknown>)
    this.listeners.set(event, bag)
    return () => this.off(event, handler)
  }

  /** 仅触发一次，触发后自动解除订阅。 */
  once<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void {
    const wrapper: EventHandler<EventMap[K]> = (payload) => {
      this.off(event, wrapper)
      handler(payload)
    }
    return this.on(event, wrapper)
  }

  /** 取消订阅；不传 handler 则清空该事件全部监听。 */
  off<K extends keyof EventMap>(event: K, handler?: EventHandler<EventMap[K]>): void {
    const bag = this.listeners.get(event)
    if (!bag)
      return
    if (!handler) {
      this.listeners.delete(event)
      return
    }
    bag.delete(handler as EventHandler<unknown>)
    if (bag.size === 0)
      this.listeners.delete(event)
  }

  /** 派发事件到所有监听器。 */
  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const bag = this.listeners.get(event)
    if (!bag?.size)
      return
    // 拷贝迭代，允许监听器在回调中安全地 off 自己或新增订阅
    for (const handler of [...bag]) {
      try {
        handler(payload)
      }
      catch (err) {
        console.error(`[hikvideoctrl] 事件 ${String(event)} 监听器抛出异常`, err)
      }
    }
  }

  /** 清空全部监听器。 */
  clear(): void {
    this.listeners.clear()
  }
}
