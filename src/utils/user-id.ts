export function sameUserId(
  left?: string | number | null,
  right?: string | number | null
): boolean {
  if (left == null || right == null) {
    return false;
  }
  return String(left) === String(right);
}
