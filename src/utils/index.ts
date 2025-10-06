/**
 * 按指定格式格式化日期
 * @param date 目标日期
 * @param format 日期格式模板
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: Date, format: string = 'yyyy-MM-dd HH:mm:ss'): string {
  const tokens: Record<string, string> = {
    yyyy: date.getFullYear().toString(),
    MM: (date.getMonth() + 1).toString().padStart(2, '0'),
    dd: date.getDate().toString().padStart(2, '0'),
    HH: date.getHours().toString().padStart(2, '0'),
    mm: date.getMinutes().toString().padStart(2, '0'),
    ss: date.getSeconds().toString().padStart(2, '0'),
  }

  return Object.entries(tokens).reduce(
    (acc, [token, value]) => acc.replace(new RegExp(token, 'g'), value),
    format,
  )
}

/**
 * 获取当前时间的格式化字符串
 * @param format 日期格式模板
 * @returns 格式化后的时间字符串
 */
export function getCurrentTimeString(format: string = 'yyyy-MM-dd HH:mm:ss'): string {
  return formatDate(new Date(), format)
}

/**
 * 获取当天的时间范围
 * @returns 包含开始和结束时间的对象
 */
export function getTodayTimeRange(): { start: string, end: string } {
  const base = formatDate(new Date(), 'yyyy-MM-dd')
  return {
    start: `${base} 00:00:00`,
    end: `${base} 23:59:59`,
  }
}

/**
 * 将 Uint8Array 转换为 Base64 字符串
 * @param uint8Array 二进制数组
 * @returns Base64 字符串
 */
export function uint8ArrayToBase64(uint8Array: Uint8Array): Promise<string> {
  return new Promise((resolve) => {
    const blob = new Blob([new Uint8Array(uint8Array)])
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      resolve(dataUrl.split(',')[1] ?? '')
    }
    reader.readAsDataURL(blob)
  })
}

/**
 * 解析 XML 字符串
 * @param xml XML 字符串
 * @returns 解析后的 XML 文档
 */
export function loadXML(xml: string): Document | null {
  if (!xml)
    return null

  try {
    return new DOMParser().parseFromString(xml, 'text/xml')
  }
  catch {
    return null
  }
}

/**
 * 将 XML 文档序列化为字符串
 * @param xmlDoc XML 文档
 * @returns XML 字符串
 */
export function toXMLString(xmlDoc?: Document | null): string {
  if (!xmlDoc)
    return ''

  try {
    const serializer = new XMLSerializer()
    const xml = serializer.serializeToString(xmlDoc)
    return xml.includes('<?xml') ? xml : `<?xml version='1.0' encoding='utf-8'?>${xml}`
  }
  catch {
    return ''
  }
}

/**
 * 对字符串执行 XML 编码
 * @param value 待编码字符串
 * @returns 编码后的字符串
 */
export function encodeString(value: string): string {
  return value ? value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''
}

/**
 * 生成设备唯一标识
 * @param host 设备地址
 * @param port 设备端口
 * @returns 唯一标识字符串
 */
export function generateDeviceIdentify(host: string, port: number): string {
  return `${host}_${port}`
}

/**
 * 解析设备唯一标识
 * @param deviceIdentify 唯一标识字符串
 * @returns 包含主机和端口的对象
 */
export function parseDeviceIdentify(deviceIdentify: string): { host: string, port: number } {
  const [host, portText] = deviceIdentify.split('_')
  return {
    host,
    port: Number.parseInt(portText ?? '80', 10) || 80,
  }
}

/**
 * 校验 IPv4 地址
 * @param address IPv4 地址
 * @returns 地址是否合法
 */
export function isValidIP(address: string): boolean {
  const ipv4 = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})$/
  return ipv4.test(address)
}

/**
 * 校验端口号
 * @param port 端口号
 * @returns 端口是否合法
 */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535
}

/**
 * 归一化端口号
 * @param port 端口号
 * @returns 归一化后的端口
 */
export function normalizePort(port: number): number {
  if (!Number.isFinite(port))
    throw new TypeError('端口必须为有效数字')

  const value = Math.trunc(port)
  if (!isValidPort(value))
    throw new RangeError('端口范围应在 1 - 65535 之间')
  return value
}

/**
 * 生成唯一的文件名称
 * @param prefix 文件名前缀
 * @param extension 文件后缀
 * @returns 文件名称
 */
export function generateUniqueFileName(prefix: string, extension: string): string {
  return `${prefix}_${Date.now()}.${extension}`
}

/**
 * 延迟指定时间
 * @param ms 延迟时长（毫秒）
 * @returns 一个在指定时间后完成的 Promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 校验时间范围有效性
 * @param start 起始时间
 * @param end 结束时间
 * @returns 时间范围是否有效
 */
export function isValidTimeRange(start: string, end: string): boolean {
  const startTime = Date.parse(start.replace(/-/g, '/'))
  const endTime = Date.parse(end.replace(/-/g, '/'))
  return Number.isFinite(startTime) && Number.isFinite(endTime) && endTime >= startTime
}

/**
 * 将协议转换为数值表示
 * @param protocol 协议类型
 * @returns 协议数值
 */
export function toProtocolValue(protocol: 'http' | 'https'): 1 | 2 {
  return protocol === 'https' ? 2 : 1
}
