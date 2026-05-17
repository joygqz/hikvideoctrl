/**
 * 错误码枚举。所有错误均以此为分类基础，便于上层 `switch` 处理或日志聚合。
 *
 * - `SDK_NOT_FOUND`         未检测到全局 `window.WebVideoCtrl`，多半是 `webVideoCtrl.js` 未先加载。
 * - `SDK_METHOD_MISSING`    SDK 上的目标方法不存在，常见于版本不匹配。
 * - `SDK_CALL_FAILED`       SDK 调用回调 `error` 或抛出异常，详情见 `details.status / responseXml`。
 * - `NOT_INITIALIZED`       未调用 `init()` 就操作播放器。
 * - `ALREADY_INITIALIZED`   已初始化的播放器被重复初始化。
 * - `INVALID_ARGUMENT`      参数校验失败（如端口越界、时间区间反转）。
 * - `DEVICE_NOT_FOUND`      未登录或已登出的设备被引用。
 * - `WINDOW_NOT_PLAYING`    对未在播放状态的窗口执行 `stop / pause` 等操作。
 * - `SCRIPT_LOAD_FAILED`    `loadWebVideoCtrl()` 加载脚本失败或超时。
 */
export type HikErrorCode
  = | 'SDK_NOT_FOUND'
    | 'SDK_METHOD_MISSING'
    | 'SDK_CALL_FAILED'
    | 'NOT_INITIALIZED'
    | 'ALREADY_INITIALIZED'
    | 'INVALID_ARGUMENT'
    | 'DEVICE_NOT_FOUND'
    | 'WINDOW_NOT_PLAYING'
    | 'SCRIPT_LOAD_FAILED'

/** 错误附带的调试信息。所有字段均可选，按需填充。 */
export interface HikErrorDetails {
  /** 触发错误的 SDK 方法名（若适用） */
  method?: string
  /** HTTP 状态码（来自 SDK `error(status, xmlDoc)` 回调） */
  status?: number
  /** 设备返回的 XML 文本（已序列化） */
  responseXml?: string
  /** SDK 同步返回值（如 `I_Logout` 返回 -1） */
  returnValue?: unknown
  /** 任意附加上下文 */
  [key: string]: unknown
}

/**
 * 海康封装库统一错误类型。
 *
 * 优先使用 `code` 做分支判断，避免依赖 `message` 文案；底层 SDK 抛出的原始错误
 * 经由 `cause` 透传（依赖 ES2022 `Error.cause`，运行环境需支持）。
 */
export class HikError extends Error {
  override readonly name = 'HikError'
  readonly code: HikErrorCode
  readonly details?: HikErrorDetails

  constructor(
    code: HikErrorCode,
    message: string,
    details?: HikErrorDetails,
    cause?: unknown,
  ) {
    super(message, cause === undefined ? undefined : { cause })
    this.code = code
    this.details = details
    // 修复跨编译目标的原型链，保证 `err instanceof HikError` 始终成立
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/** 内部工具：将任意值收敛为 `HikError`，便于在 `catch` 中再抛出。 */
export function toHikError(
  error: unknown,
  fallbackCode: HikErrorCode = 'SDK_CALL_FAILED',
  fallbackMessage: string = '调用 SDK 失败',
): HikError {
  if (error instanceof HikError)
    return error
  const message = error instanceof Error ? error.message : fallbackMessage
  return new HikError(fallbackCode, message, undefined, error)
}
