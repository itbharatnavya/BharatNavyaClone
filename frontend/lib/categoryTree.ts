// categoryTree.ts — getCategories() returns a FLAT Category[] (parentId-linked);
// this groups it into a tree client-side. Shared by CategoryMegaMenu and any
// other UI (e.g. directory/page.tsx's CategoryGroupGrid) that needs real
// sub-categories under each top-level category.

import type { Category } from "@/lib/types";

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

const ROOT_KEY = "__root__";

export function buildTree(flat: Category[]): CategoryTreeNode[] {
  const byParent = new Map<string, Category[]>();
  for (const c of flat) {
    const key = c.parentId ?? ROOT_KEY;
    const bucket = byParent.get(key);
    if (bucket) bucket.push(c);
    else byParent.set(key, [c]);
  }
  const sort = (a: Category, b: Category) =>
    (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name);
  const build = (cat: Category): CategoryTreeNode => ({
    ...cat,
    children: (byParent.get(cat.id) ?? []).sort(sort).map(build),
  });
  return (byParent.get(ROOT_KEY) ?? []).sort(sort).map(build);
}
