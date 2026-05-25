/**
 * @deprecated Import from `./responseParser` instead.
 * Re-exported for backward compatibility with existing service imports.
 */
export {
  ApiResponseParser,
  apiResponseParser,
  parseApiResponseText,
  unwrapApiResponseData,
  assertApiSuccess,
  isApiResponse,
  isApiSuccessCode,
  messageFromApiBody,
  parseStatusCode,
  type ParseApiResponseOptions,
  type ParsedApiResult,
} from "./responseParser";
