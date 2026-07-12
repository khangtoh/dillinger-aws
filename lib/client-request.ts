export const SAME_ORIGIN_REQUEST_HEADERS = {
  "X-Dillinger-Request": "same-origin",
} as const;

export const SAME_ORIGIN_JSON_HEADERS = {
  ...SAME_ORIGIN_REQUEST_HEADERS,
  "Content-Type": "application/json",
} as const;
