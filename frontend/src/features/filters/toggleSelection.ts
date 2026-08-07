/** Agrega/quita `item` de `selected`. Devuelve `undefined` (no `[]`) cuando
 * la selección queda vacía, para que `GlobalFilters.delitos` represente
 * "sin filtrar" de forma inequívoca en vez de un array vacío ambiguo. */
export function toggleSelection(
  selected: string[],
  item: string,
): string[] | undefined {
  const next = selected.includes(item)
    ? selected.filter((s) => s !== item)
    : [...selected, item];

  return next.length ? next : undefined;
}
