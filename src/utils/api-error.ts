export function getApiErrorMessage(error: any, fallback: string): string {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') {
    return detail;
  }
  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((item: { msg?: string }) => item.msg)
      .filter(Boolean)
      .join('\n');
  }
  if (typeof error?.response?.data?.message === 'string') {
    return error.response.data.message;
  }
  return fallback;
}
