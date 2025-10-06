type EventHandler<Payload> = (payload: Payload) => void

export class EventBus<EventMap extends Record<string, any>> {
  private readonly listeners = new Map<keyof EventMap, Set<EventHandler<any>>>()

  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void {
    const set = this.listeners.get(event) ?? new Set<EventHandler<any>>()
    set.add(handler)
    this.listeners.set(event, set)
    return () => this.off(event, handler)
  }

  once<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void {
    const wrapper: EventHandler<EventMap[K]> = (payload) => {
      this.off(event, wrapper)
      handler(payload)
    }
    return this.on(event, wrapper)
  }

  off<K extends keyof EventMap>(event: K, handler?: EventHandler<EventMap[K]>): void {
    if (!this.listeners.has(event))
      return

    if (!handler) {
      this.listeners.delete(event)
      return
    }

    const set = this.listeners.get(event)
    if (!set)
      return

    set.delete(handler)
    if (set.size === 0)
      this.listeners.delete(event)
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const set = this.listeners.get(event)
    if (!set?.size)
      return

    for (const handler of Array.from(set)) {
      handler(payload)
    }
  }

  clear(): void {
    this.listeners.clear()
  }

  listenerCount(): number {
    let total = 0
    for (const [, handlers] of this.listeners)
      total += handlers.size
    return total
  }
}
