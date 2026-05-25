/**
 * ShotVision API response parser — single entry for envelope parsing.
 *
 * Usage:
 * - `apiClient` calls `parseApiResponseText` internally.
 * - Services call `apiClient.get/post/...` and receive typed `body.data`.
 * - Do not import this module from screens/components.
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
