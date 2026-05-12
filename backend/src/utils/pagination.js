/**
 * @param {Record<string, unknown>} query
 */
export function parsePagination(query) {
  const rawPage = Number(query.page ?? 1);
  const rawLimit = Number(query.limit ?? 20);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const limitBase = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 20;
  const limit = Math.min(100, Math.max(1, limitBase));
  return { page, limit, skip: (page - 1) * limit };
}

/**
 * @param {number} total
 * @param {number} page
 * @param {number} limit
 */
export function buildMeta(total, page, limit) {
  return {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
