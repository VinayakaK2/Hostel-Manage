/**
 * When migrations for new models have not been applied yet, Prisma throws
 * errors mentioning missing tables/relation. Treat as non-fatal for read paths.
 * @param {unknown} err
 */
export function isMissingSchemaObjectError(err) {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("does not exist") ||
    msg.includes("relation") && msg.includes("does not exist") ||
    msg.includes("Unknown table") ||
    msg.includes("no such table")
  );
}

/**
 * @template T
 * @param {() => Promise<T>} fn
 * @param {T} fallback
 * @returns {Promise<T>}
 */
export async function prismaOrFallback(fn, fallback) {
  try {
    return await fn();
  } catch (err) {
    if (isMissingSchemaObjectError(err)) return fallback;
    throw err;
  }
}
