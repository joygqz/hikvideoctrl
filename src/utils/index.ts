/**
 * 海康威视WebSDK工具函数库
 */

/**
 * 格式化日期时间
 * @param date 日期对象
 * @param format 格式字符串
 * @returns 格式化后的时间字符串
 */
export function formatDate(date: Date, format: string = 'yyyy-MM-dd hh:mm:ss'): string {
  const year = date.getFullYear().toString()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')

  return format
    .replace(/yyyy/g, year)
    .replace(/MM/g, month)
    .replace(/dd/g, day)
    .replace(/hh/g, hours)
    .replace(/mm/g, minutes)
    .replace(/ss/g, seconds)
}

/**
 * 获取当前时间字符串
 * @param format 时间格式，默认为 'yyyy-MM-dd hh:mm:ss'
 * @returns 当前时间字符串
 */
export function getCurrentTimeString(format: string = 'yyyy-MM-dd hh:mm:ss'): string {
  return formatDate(new Date(), format)
}

/**
 * 获取今天的时间范围
 * @returns 包含开始时间和结束时间的对象
 */
export function getTodayTimeRange(): { startTime: string, endTime: string } {
  const today = formatDate(new Date(), 'yyyy-MM-dd')
  return {
    startTime: `${today} 00:00:00`,
    endTime: `${today} 23:59:59`,
  }
}

/**
 * 获取窗口尺寸
 * @returns 包含宽度和高度的对象
 */
export function getWindowSize(): { width: number, height: number } {
  const width = window.innerWidth + window.scrollX
  const height = window.innerHeight + window.scrollY
  return { width, height }
}

/**
 * 将Uint8Array转换为Base64字符串
 * @param uint8Array Uint8Array数据
 * @returns Promise<string> Base64字符串
 */
export function uint8ArrayToBase64(uint8Array: Uint8Array): Promise<string> {
  return new Promise((resolve) => {
    const blob = new Blob([new Uint8Array(uint8Array)])
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(',')[1]
      resolve(base64)
    }
    reader.readAsDataURL(blob)
  })
}

/**
 * 加载XML字符串为XML文档对象
 * @param xmlString XML字符串
 * @returns XML文档对象或null
 */
export function loadXML(xmlString: string): Document | null {
  if (!xmlString) {
    return null
  }

  try {
    const parser = new DOMParser()
    return parser.parseFromString(xmlString, 'text/xml')
  }
  catch {
    return null
  }
}

/**
 * 将XML文档对象转换为XML字符串
 * @param xmlDoc XML文档对象
 * @returns XML字符串
 */
export function toXMLString(xmlDoc: Document): string {
  try {
    const serializer = new XMLSerializer()
    let xmlString = serializer.serializeToString(xmlDoc)

    if (!xmlString.includes('<?xml')) {
      xmlString = `<?xml version='1.0' encoding='utf-8'?>${xmlString}`
    }

    return xmlString
  }
  catch {
    return ''
  }
}

/**
 * HTML实体编码
 * @param str 要编码的字符串
 * @returns 编码后的字符串
 */
export function encodeString(str: string): string {
  if (str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
  return ''
}

/**
 * 生成设备标识符
 * @param ip IP地址
 * @param port 端口号
 * @returns 设备标识符
 */
export function generateDeviceIdentify(ip: string, port: number): string {
  return `${ip}_${port}`
}

/**
 * 解析设备标识符
 * @param deviceIdentify 设备标识符
 * @returns 包含IP和端口的对象
 */
export function parseDeviceIdentify(deviceIdentify: string): { ip: string, port: number } {
  const parts = deviceIdentify.split('_')
  return {
    ip: parts[0],
    port: Number.parseInt(parts[1], 10) || 80,
  }
}

/**
 * 验证IP地址格式
 * @param ip IP地址字符串
 * @returns 是否为有效的IP地址
 */
export function isValidIP(ip: string): boolean {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})$/
  return ipRegex.test(ip)
}

/**
 * 验证端口号格式
 * @param port 端口号
 * @returns 是否为有效的端口号
 */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535
}

/**
 * 生成唯一文件名
 * @param prefix 文件名前缀
 * @param extension 文件扩展名
 * @returns 唯一文件名
 */
export function generateUniqueFileName(prefix: string, extension: string): string {
  const timestamp = new Date().getTime()
  return `${prefix}_${timestamp}.${extension}`
}

/**
 * 延迟执行
 * @param ms 延迟毫秒数
 * @returns Promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 检查时间范围是否有效
 * @param startTime 开始时间字符串
 * @param endTime 结束时间字符串
 * @returns 是否为有效的时间范围
 */
export function isValidTimeRange(startTime: string, endTime: string): boolean {
  const start = Date.parse(startTime.replace(/-/g, '/'))
  const end = Date.parse(endTime.replace(/-/g, '/'))
  return !Number.isNaN(start) && !Number.isNaN(end) && end >= start
}

/**
 * 创建响应处理器
 * @param successCallback 成功回调
 * @param errorCallback 错误回调
 * @returns 处理器对象
 */
export function createResponseHandler<T = any>(
  successCallback?: (data?: T) => void,
  errorCallback?: (status?: number, xmlDoc?: Document, error?: any) => void,
) {
  return {
    success: successCallback || (() => {}),
    error: errorCallback || (() => {}),
  }
}

/**
 * Promise化WebVideoCtrl方法
 * @param method WebVideoCtrl方法
 * @param args 方法参数
 * @returns Promise
 */
export function promisify<T = any>(
  method: (...args: any[]) => any,
  ...args: any[]
): Promise<T> {
  return new Promise((resolve, reject) => {
    const lastArg = args[args.length - 1]

    // 如果最后一个参数是对象且包含success/error回调，则替换它们
    if (lastArg && typeof lastArg === 'object' && ('success' in lastArg || 'error' in lastArg)) {
      args[args.length - 1] = {
        ...lastArg,
        success: (data: T) => resolve(data),
        error: (status: number, _xmlDoc: Document, error: any) => reject(new Error(`Error ${status}: ${error}`)),
      }
    }
    else {
      // 否则添加回调参数
      args.push({
        success: (data: T) => resolve(data),
        error: (status: number, _xmlDoc: Document, error: any) => reject(new Error(`Error ${status}: ${error}`)),
      })
    }

    const result = method(...args)

    // 如果方法直接返回结果（同步方法），则直接resolve
    if (result !== undefined && result !== -1) {
      resolve(result)
    }
  })
}
