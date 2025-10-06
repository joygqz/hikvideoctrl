/**
 * 事件处理器函数类型
 */
type EventHandler<Payload> = (payload: Payload) => void

/**
 * 事件总线类
 * @template EventMap 事件映射类型
 * @example
 * ```typescript
 * interface MyEvents {
 *   'user:login': { userId: string }
 *   'user:logout': void
 * }
 * const bus = new EventBus<MyEvents>()
 * // 订阅事件
 * bus.on('user:login', ({ userId }) => {
 *   console.log('User logged in:', userId)
 * })
 * // 发布事件
 * bus.emit('user:login', { userId: '123' })
 * ```
 */
export class EventBus<EventMap extends Record<string, any>> {
  /**
   * 事件监听器映射表
   */
  private readonly listeners = new Map<keyof EventMap, Set<EventHandler<any>>>()

  /**
   * 订阅事件
   * @param event 事件名称
   * @param handler 事件处理器
   * @returns 取消订阅函数
   * @example
   * ```typescript
   * const unsubscribe = bus.on('user:login', (data) => {
   *   console.log(data)
   * })
   * // 取消订阅
   * unsubscribe()
   * ```
   */
  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void {
    const set = this.listeners.get(event) ?? new Set<EventHandler<any>>()
    set.add(handler)
    this.listeners.set(event, set)
    return () => this.off(event, handler)
  }

  /**
   * 订阅事件（仅触发一次）
   * @param event 事件名称
   * @param handler 事件处理器
   * @returns 取消订阅函数
   * @example
   * ```typescript
   * bus.once('user:login', (data) => {
   *   console.log('This will only run once')
   * })
   * ```
   */
  once<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void {
    const wrapper: EventHandler<EventMap[K]> = (payload) => {
      this.off(event, wrapper)
      handler(payload)
    }
    return this.on(event, wrapper)
  }

  /**
   * 取消订阅事件
   * @param event 事件名称
   * @param handler 事件处理器（可选，不传则移除所有处理器）
   * @example
   * ```typescript
   * // 移除特定处理器
   * bus.off('user:login', handler)
   * // 移除所有处理器
   * bus.off('user:login')
   * ```
   */
  off<K extends keyof EventMap>(event: K, handler?: EventHandler<EventMap[K]>): void {
    if (!this.listeners.has(event))
      return

    // 如果没有指定处理器，删除该事件的所有监听器
    if (!handler) {
      this.listeners.delete(event)
      return
    }

    const set = this.listeners.get(event)
    if (!set)
      return

    set.delete(handler)
    // 如果没有监听器了，删除该事件
    if (set.size === 0)
      this.listeners.delete(event)
  }

  /**
   * 发布事件
   * @param event 事件名称
   * @param payload 事件数据
   * @example
   * ```typescript
   * bus.emit('user:login', { userId: '123' })
   * ```
   */
  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const set = this.listeners.get(event)
    if (!set?.size)
      return

    // 使用数组副本避免在迭代过程中修改集合
    for (const handler of Array.from(set)) {
      handler(payload)
    }
  }

  /**
   * 清空所有事件监听器
   * @example
   * ```typescript
   * bus.clear()
   * ```
   */
  clear(): void {
    this.listeners.clear()
  }

  /**
   * 获取监听器总数
   * @returns 监听器数量
   * @example
   * ```typescript
   * const count = bus.listenerCount()
   * console.log(`Total listeners: ${count}`)
   * ```
   */
  listenerCount(): number {
    let total = 0
    for (const [, handlers] of this.listeners)
      total += handlers.size
    return total
  }
}
