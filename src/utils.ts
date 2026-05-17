import { HikError } from './errors'

// ─────────────────────────── 时间 ───────────────────────────

/**
 * 按 `yyyy-MM-dd HH:mm:ss[.SSS]` 风格格式化日期。
 *
 * 仅支持以下 token，互不重叠以避免替换串扰：
 *   `yyyy / MM / dd / HH / mm / ss / SSS`
 */
export function formatDate(date: Date, pattern: string = 'yyyy-MM-dd HH:mm:ss'): string {
  const dict: Record<string, string> = {
    yyyy: String(date.getFullYear()),
    MM: pad2(date.getMonth() + 1),
    dd: pad2(date.getDate()),
    HH: pad2(date.getHours()),
    mm: pad2(date.getMinutes()),
    ss: pad2(date.getSeconds()),
    SSS: String(date.getMilliseconds()).padStart(3, '0'),
  }
  // 单次扫描即可完成全部替换，避免 `MM` 与已替换的数字数字部分二次匹配
  return pattern.replace(/yyyy|SSS|MM|dd|HH|mm|ss/g, t => dict[t] ?? t)
}

/** 等价于 `formatDate(new Date(), pattern)`。 */
export function currentTimestamp(pattern: string = 'yyyy-MM-dd HH:mm:ss'): string {
  return formatDate(new Date(), pattern)
}

/** 当天 `00:00:00` 至 `23:59:59` 的时间段，便于直接传入回放/搜索接口。 */
export function todayTimeRange(): { start: string, end: string } {
  const base = formatDate(new Date(), 'yyyy-MM-dd')
  return { start: `${base} 00:00:00`, end: `${base} 23:59:59` }
}

/**
 * 校验 `[start, end]` 区间合法（end 大于等于 start）。
 *
 * 字符串中 `-` 主动替换成 `/` 以兼容 Safari 的 Date.parse。
 */
export function isValidTimeRange(start: string, end: string): boolean {
  const s = Date.parse(start.replace(/-/g, '/'))
  const e = Date.parse(end.replace(/-/g, '/'))
  return Number.isFinite(s) && Number.isFinite(e) && e >= s
}

// ─────────────────────────── 地址校验 ───────────────────────────

/** 严格匹配点分十进制 IPv4。 */
export function isIPv4(value: string): boolean {
  return /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})$/.test(value)
}

/** 仅做最小可用校验：含 `:` 且字符集为 IPv6 允许字符。 */
export function isIPv6(value: string): boolean {
  return value.includes(':') && /^[0-9a-f:]+$/i.test(value)
}

/** 标准域名（含至少两级 TLD）。 */
export function isHostname(value: string): boolean {
  return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(value)
}

/** 设备主机地址综合校验（IPv4 / IPv6 / 域名 / `localhost`）。 */
export function isValidHost(host: string): boolean {
  if (!host)
    return false
  if (host === 'localhost')
    return true
  return isIPv4(host) || isIPv6(host) || isHostname(host)
}

/** 校验端口号是否在合法整数范围内。 */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535
}

/**
 * 标准化端口：拒绝 NaN / 越界，截断小数部分。
 *
 * @throws {HikError} 输入非法（`INVALID_ARGUMENT`）
 */
export function normalizePort(port: number): number {
  if (!Number.isFinite(port))
    throw new HikError('INVALID_ARGUMENT', '端口号必须是有效数字', { received: port })
  const value = Math.trunc(port)
  if (!isValidPort(value))
    throw new HikError('INVALID_ARGUMENT', '端口号应在 1 - 65535 之间', { received: port })
  return value
}

// ─────────────────────────── 设备标识 ───────────────────────────

/** 生成 SDK 内部使用的设备标识：`<host>_<port>`。 */
export function makeDeviceIdentify(host: string, port: number): string {
  return `${host}_${port}`
}

/** 反解 `<host>_<port>`；缺省端口返回 80。 */
export function parseDeviceIdentify(identify: string): { host: string, port: number } {
  const idx = identify.lastIndexOf('_')
  if (idx < 0)
    return { host: identify, port: 80 }
  return {
    host: identify.slice(0, idx),
    port: Number.parseInt(identify.slice(idx + 1), 10) || 80,
  }
}

/** 协议名 → SDK 数值；`'https'` → 2，其它一律 1。 */
export function toProtocolValue(protocol: 'http' | 'https'): 1 | 2 {
  return protocol === 'https' ? 2 : 1
}

// ─────────────────────────── 容器解析 ───────────────────────────

/**
 * 解析插件容器参数。
 *
 * 接受以下形式：
 *   - CSS id 选择器（`'#video'`）
 *   - 元素 id（`'video'`）
 *   - DOM 元素（若无 id 将自动注入临时 id）
 *
 * @throws {HikError} 解析失败（`INVALID_ARGUMENT`）
 */
export function resolveContainer(input: string | HTMLElement): {
  id: string
  element: HTMLElement | null
} {
  if (typeof input === 'string') {
    const id = input.startsWith('#') ? input.slice(1) : input
    if (!id.trim())
      throw new HikError('INVALID_ARGUMENT', '插件容器 ID 不能为空')
    const element = typeof document === 'undefined' ? null : document.getElementById(id)
    return { id, element }
  }

  if (typeof HTMLElement === 'undefined' || !(input instanceof HTMLElement))
    throw new HikError('INVALID_ARGUMENT', '插件容器必须是 DOM 元素或元素 ID')

  if (!input.id)
    input.id = `hik-player-${randomId()}`
  return { id: input.id, element: input }
}

/**
 * 将用户传入的尺寸归一化为像素整数，供 SDK 使用。
 *
 * - 数字：直接截断为整数
 * - `"240px"`：剥离 `px`
 * - `"100%"` 等百分比：基于容器实际尺寸换算
 * - 其它 CSS 字符串：尝试 parseFloat，再失败则回退到容器尺寸或 fallback
 */
export function normalizeSize(
  value: string | number | undefined,
  element: HTMLElement | null,
  axis: 'width' | 'height',
  fallback: number,
): number {
  if (typeof value === 'number' && Number.isFinite(value))
    return Math.max(0, Math.trunc(value))

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (/^\d+(?:\.\d+)?px$/i.test(trimmed))
      return Math.trunc(Number.parseFloat(trimmed))
    if (/^\d+(?:\.\d+)?%$/.test(trimmed) && element) {
      const measured = measure(element, axis)
      if (measured > 0)
        return Math.trunc((measured * Number.parseFloat(trimmed)) / 100)
    }
    const num = Number.parseFloat(trimmed)
    if (Number.isFinite(num) && num > 0)
      return Math.trunc(num)
  }

  if (element) {
    const measured = measure(element, axis)
    if (measured > 0)
      return Math.trunc(measured)
  }

  return fallback
}

function measure(element: HTMLElement, axis: 'width' | 'height'): number {
  const rect = element.getBoundingClientRect()
  return axis === 'width' ? rect.width : rect.height
}

// ─────────────────────────── XML ───────────────────────────

/** 解析 XML 字符串为 `Document`，失败返回 `null`。 */
export function parseXml(xml: string | null | undefined): Document | null {
  if (!xml)
    return null
  if (typeof DOMParser === 'undefined')
    return null
  try {
    return new DOMParser().parseFromString(xml, 'text/xml')
  }
  catch {
    return null
  }
}

/**
 * 将 SDK 回调入参统一为 `Document`。
 *
 * SDK 的不同方法 / 不同设备 / 不同浏览器，`success(data)` 入参可能是：
 *   - `Document` —— 现代 SDK 主路径
 *   - `string`   —— 早期版本透传 responseText
 *   - jQuery `jqXHR` —— 旧 demo 兼容路径，含 `responseXML` 或 `responseText`
 */
export function ensureXmlDocument(input: unknown): Document | null {
  if (!input)
    return null
  if (typeof Document !== 'undefined' && input instanceof Document)
    return input
  if (typeof input === 'string')
    return parseXml(input)
  const responseXML = (input as { responseXML?: unknown }).responseXML
  if (responseXML && typeof Document !== 'undefined' && responseXML instanceof Document)
    return responseXML
  const responseText = (input as { responseText?: unknown }).responseText
  if (typeof responseText === 'string')
    return parseXml(responseText)
  return null
}

/** XML 文档序列化为字符串；缺失 XML 声明时补齐 utf-8。 */
export function stringifyXml(doc: Document | null | undefined): string {
  if (!doc || typeof XMLSerializer === 'undefined')
    return ''
  try {
    const xml = new XMLSerializer().serializeToString(doc)
    return xml.includes('<?xml') ? xml : `<?xml version="1.0" encoding="utf-8"?>${xml}`
  }
  catch {
    return ''
  }
}

/** 读取 XML 节点内容；缺失返回 `fallback`。 */
export function xmlText(doc: Document | Element | null | undefined, selector: string, fallback: string = ''): string {
  return doc?.querySelector(selector)?.textContent?.trim() ?? fallback
}

// ─────────────────────────── 其它 ───────────────────────────

/** 标准延时（基于 `setTimeout`）。 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** 生成唯一文件名：`<prefix>_<timestamp>_<random>.<ext>`。 */
export function uniqueFileName(prefix: string, extension: string): string {
  return `${prefix}_${Date.now()}_${randomId()}.${extension.replace(/^\./, '')}`
}

/** 简短的随机串，用于 dom id / 文件名后缀。 */
export function randomId(): string {
  if (globalThis.crypto?.randomUUID)
    return globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 8)
  return Math.random().toString(36).slice(2, 10)
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}
