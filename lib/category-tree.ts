export type CategoryTreeItem = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
};

export function categoryPathLabel(
  category: CategoryTreeItem,
  byId: ReadonlyMap<string, CategoryTreeItem>,
) {
  const labels = [category.name];
  const visited = new Set<string>([category.id]);
  let parentId = category.parentId;

  while (parentId) {
    if (visited.has(parentId)) break;
    visited.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) break;
    labels.unshift(parent.name);
    parentId = parent.parentId;
  }

  return labels.join(" › ");
}

export function sortCategoriesByPath<T extends CategoryTreeItem>(categories: T[]) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  return [...categories].sort((a, b) =>
    categoryPathLabel(a, byId).localeCompare(categoryPathLabel(b, byId), "fr", {
      sensitivity: "base",
    }),
  );
}

export function getDescendantCategoryIds(
  rootId: string,
  categories: CategoryTreeItem[],
) {
  const childrenByParent = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parentId) continue;
    const current = childrenByParent.get(category.parentId) ?? [];
    current.push(category.id);
    childrenByParent.set(category.parentId, current);
  }

  const descendants = new Set<string>();
  const stack = [...(childrenByParent.get(rootId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (descendants.has(id)) continue;
    descendants.add(id);
    stack.push(...(childrenByParent.get(id) ?? []));
  }

  return descendants;
}
