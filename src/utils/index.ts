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

export function getCurrentTimeString(format: string = 'yyyy-MM-dd HH:mm:ss'): string {
  return formatDate(new Date(), format)
}

export function getTodayTimeRange(): { start: string, end: string } {
  const base = formatDate(new Date(), 'yyyy-MM-dd')
  return {
    start: `${base} 00:00:00`,
    end: `${base} 23:59:59`,
  }
}

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

export function encodeString(value: string): string {
  return value ? value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''
}

export function generateDeviceIdentify(host: string, port: number): string {
  return `${host}_${port}`
}

export function parseDeviceIdentify(deviceIdentify: string): { host: string, port: number } {
  const [host, portText] = deviceIdentify.split('_')
  return {
    host,
    port: Number.parseInt(portText ?? '80', 10) || 80,
  }
}

export function isValidIP(address: string): boolean {
  const ipv4 = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})$/
  return ipv4.test(address)
}

export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535
}

export function normalizePort(port: number): number {
  if (!Number.isFinite(port))
    throw new TypeError('端口必须为有效数字')

  const value = Math.trunc(port)
  if (!isValidPort(value))
    throw new RangeError('端口范围应在 1 - 65535 之间')
  return value
}

export function generateUniqueFileName(prefix: string, extension: string): string {
  return `${prefix}_${Date.now()}.${extension}`
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function isValidTimeRange(start: string, end: string): boolean {
  const startTime = Date.parse(start.replace(/-/g, '/'))
  const endTime = Date.parse(end.replace(/-/g, '/'))
  return Number.isFinite(startTime) && Number.isFinite(endTime) && endTime >= startTime
}

export function toProtocolValue(protocol: 'http' | 'https'): 1 | 2 {
  return protocol === 'https' ? 2 : 1
}
