import { HikError } from './errors'

// ─────────────────────────── 时间 ───────────────────────────

/**
 * 按 `yyyy-MM-dd HH:mm:ss[.SSS]` 格式化日期。
 *
 * 支持的 token：`yyyy / MM / dd / HH / mm / ss / SSS`。
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
  return pattern.replace(/yyyy|SSS|MM|dd|HH|mm|ss/g, t => dict[t] ?? t)
}

/** 当前时间字符串，等价于 `formatDate(new Date(), pattern)`。 */
export function currentTimestamp(pattern: string = 'yyyy-MM-dd HH:mm:ss'): string {
  return formatDate(new Date(), pattern)
}

/** 当天 `00:00:00` ~ `23:59:59`，便于直接传入回放/搜索接口。 */
export function todayTimeRange(): { start: string, end: string } {
  const base = formatDate(new Date(), 'yyyy-MM-dd')
  return { start: `${base} 00:00:00`, end: `${base} 23:59:59` }
}

/** 校验 `[start, end]` 区间合法。 */
export function isValidTimeRange(start: string, end: string): boolean {
  const s = parseSdkTime(start)
  const e = parseSdkTime(end)
  return s !== null && e !== null && e >= s
}

// ─────────────────────────── 地址校验 ───────────────────────────

/** 严格匹配点分十进制 IPv4。 */
export function isIPv4(value: string): boolean {
  return /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})$/.test(value)
}

/** 校验标准 IPv6（接受带方括号和 IPv4 映射地址）。 */
export function isIPv6(value: string): boolean {
  const host = value.startsWith('[') && value.endsWith(']') ? value.slice(1, -1) : value
  if (!host.includes(':'))
    return false
  try {
    const parsed = new URL(`http://[${host}]/`).hostname
    return parsed.startsWith('[') && parsed.endsWith(']')
  }
  catch {
    return false
  }
}

/** 标准 DNS 主机名；兼容局域网单标签名称与 punycode 域名。 */
export function isHostname(value: string): boolean {
  if (!value || value.length > 253 || value.endsWith('.'))
    return false
  if (/^[\d.]+$/.test(value))
    return false
  return value.split('.').every(label => (
    label.length >= 1
    && label.length <= 63
    && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)
  ))
}

/** 主机地址综合校验（IPv4 / IPv6 / 域名 / `localhost`）。 */
export function isValidHost(host: string): boolean {
  if (!host)
    return false
  if (host === 'localhost')
    return true
  return isIPv4(host) || isIPv6(host) || isHostname(host)
}

/** 端口号是否合法（1-65535 的整数）。 */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535
}

/** 校验并返回端口，非法时抛 `INVALID_ARGUMENT`。 */
export function normalizePort(port: number): number {
  if (!isValidPort(port))
    throw new HikError('INVALID_ARGUMENT', '端口号应在 1 - 65535 之间', { received: port })
  return port
}

// ─────────────────────────── 设备标识 ───────────────────────────

/** 生成 SDK 内部设备标识 `<host>_<port>`。 */
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

/** 协议名 → SDK 数值；`'https'` → 2，其它 → 1。 */
export function toProtocolValue(protocol: 'http' | 'https'): 1 | 2 {
  return protocol === 'https' ? 2 : 1
}

// ─────────────────────────── 容器解析 ───────────────────────────

/**
 * 解析插件容器参数，接受 `'#id'`、`'id'` 或 DOM 元素。
 * 元素无 id 时会自动注入临时 id。
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
 * 将尺寸归一化为像素整数。
 *
 * 数字截断为整数；`"240px"` 剥离单位；百分比基于容器实际尺寸换算；
 * 其它字符串尝试 `parseFloat`，失败则回退到容器尺寸或 `fallback`。
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
    const doc = new DOMParser().parseFromString(xml, 'text/xml')
    return doc.querySelector('parsererror') ? null : doc
  }
  catch {
    return null
  }
}

/**
 * 将 SDK 回调入参统一为 `Document`。
 *
 * `success(data)` 入参可能形态：
 * - `Document`：现代 SDK 主路径
 * - `string`：早期版本透传 responseText
 * - jQuery `jqXHR`：旧 demo 兼容路径，含 `responseXML` 或 `responseText`
 */
export function ensureXmlDocument(input: unknown): Document | null {
  if (!input)
    return null
  if (isDocument(input))
    return input as Document
  if (typeof input === 'string')
    return parseXml(input)
  const responseXML = (input as { responseXML?: unknown }).responseXML
  if (isDocument(responseXML))
    return responseXML as Document
  const responseText = (input as { responseText?: unknown }).responseText
  if (typeof responseText === 'string')
    return parseXml(responseText)
  return null
}

/** XML 文档序列化为字符串；缺失声明时补齐 utf-8。 */
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

/** Promise 化的延时。 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** 生成 `<prefix>_<timestamp>_<random>.<ext>` 形式的唯一文件名。 */
export function uniqueFileName(prefix: string, extension: string): string {
  return `${prefix}_${Date.now()}_${randomId()}.${extension.replace(/^\./, '')}`
}

/** 短随机串，用于 dom id 或文件名后缀。 */
export function randomId(): string {
  if (globalThis.crypto?.randomUUID)
    return globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 8)
  return Math.random().toString(36).slice(2, 10)
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function parseSdkTime(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(value)
  if (!match)
    return null
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const second = Number(secondText)
  const date = new Date(year, month - 1, day, hour, minute, second, 0)
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
    || date.getHours() !== hour
    || date.getMinutes() !== minute
    || date.getSeconds() !== second
  ) {
    return null
  }
  return date.getTime()
}

function isDocument(value: unknown): value is Document {
  return Boolean(
    value
    && typeof value === 'object'
    && (value as { nodeType?: unknown }).nodeType === 9
    && typeof (value as { querySelector?: unknown }).querySelector === 'function',
  )
}
