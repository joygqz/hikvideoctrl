export type HikSDKErrorCode
  = | 'sdk-not-found'
    | 'sdk-method-missing'
    | 'sdk-call-failed'
    | 'sdk-initialization'
    | 'validation'
    | 'not-initialized'
    | 'device-not-found'
    | 'window-state'
    | 'operation-failed'

export class HikSDKError extends Error {
  readonly name = 'HikSDKError'
  readonly code: HikSDKErrorCode
  readonly details?: unknown

  constructor(code: HikSDKErrorCode, message: string, details?: unknown) {
    super(message)
    this.code = code
    this.details = details
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export function ensure(condition: unknown, error: HikSDKError): asserts condition {
  if (!condition)
    throw error
}

export function createOperationError(message: string, details?: unknown): HikSDKError {
  return new HikSDKError('operation-failed', message, details)
}
