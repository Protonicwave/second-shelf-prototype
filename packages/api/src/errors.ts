import type { EngineError, EngineErrorCode } from '@secondshelf/engine';

/** A failure the caller can act on, carrying the status the boundary replies with. */
export class ServiceError extends Error {
  readonly statusCode: number;
  readonly errorCode: string;

  constructor(statusCode: number, errorCode: string, message: string) {
    super(message);
    this.name = 'ServiceError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

/**
 * The status each engine rejection maps to. Every one of them means the caller
 * asked for a plan that cannot exist, so every one of them is a bad request.
 */
const ENGINE_ERROR_STATUS: Readonly<Record<EngineErrorCode, number>> = Object.freeze({
  too_many_stages: 400,
  invalid_hour: 400,
  invalid_reduction: 400,
  stage_not_later: 400,
  stage_not_deeper: 400,
});

/** Returns the boundary error for an engine rejection carried up from the engine. */
export const serviceErrorFromEngine = (error: EngineError): ServiceError =>
  new ServiceError(ENGINE_ERROR_STATUS[error.code], error.code, error.message);
