/**
 * IndexedDB lookup keys for a minifigure: `code_factory_year` plus the bare `code`
 * for each identifier, so a scan matches on either.
 * Kept free of Vite-only APIs so vite-plugins/ can import it at build time.
 */
export const buildSearchKeys = (identifiers) =>
  identifiers.flatMap((id) => [
    ...new Set([[id.code, id.factory, id.year].filter(Boolean).join('_'), id.code])
  ]);
