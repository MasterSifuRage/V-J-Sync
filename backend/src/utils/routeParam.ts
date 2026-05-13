/**
 * Express types for `req.params` can be `string | string[]`. Use this for Prisma / logic.
 */
export function routeParam(value: string | string[] | undefined): string {
  if (value == null) return '';
  return Array.isArray(value) ? (value[0] ?? '') : value;
}
