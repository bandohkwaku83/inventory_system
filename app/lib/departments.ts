export interface Department {
  /** MongoDB _id (department or nested division) */
  id: string;
  name: string;
  description?: string;
  /** null = top-level department; otherwise the parent department id */
  parentId: string | null;
}

export type DepartmentTreeNode = Department & { children: Department[] };

export const DEFAULT_DEPARTMENTS: Department[] = [];

export function normalizeDepartments(departments: Department[]): Department[] {
  return departments.map((dept) => ({
    ...dept,
    parentId: dept.parentId ?? null,
  }));
}

export function findDepartment(
  departments: Department[],
  id: string
): Department | undefined {
  return departments.find((d) => d.id === id);
}

export function findDepartmentByName(
  departments: Department[],
  name: string
): Department | undefined {
  const needle = name.trim().toLowerCase();
  if (!needle) return undefined;
  return departments.find((d) => d.name.toLowerCase() === needle);
}

/** Top-level departments (no parent). */
export function getDepartments(departments: Department[]): Department[] {
  return departments.filter((d) => !d.parentId);
}

/** Divisions under a department. */
export function getDivisions(departments: Department[], departmentId: string): Department[] {
  return departments.filter((d) => d.parentId === departmentId);
}

/** @deprecated Use getDepartments */
export function getRootDepartments(departments: Department[]): Department[] {
  return getDepartments(departments);
}

/** @deprecated Use getDivisions */
export function getChildDepartments(
  departments: Department[],
  parentId: string
): Department[] {
  return getDivisions(departments, parentId);
}

export function buildDepartmentTree(departments: Department[]): DepartmentTreeNode[] {
  return getDepartments(departments).map((dept) => ({
    ...dept,
    children: getDivisions(departments, dept.id),
  }));
}

export function departmentPath(
  departments: Department[],
  idOrName?: string
): Department[] {
  if (!idOrName) return [];
  let current =
    findDepartment(departments, idOrName) ?? findDepartmentByName(departments, idOrName);
  const path: Department[] = [];
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parentId
      ? findDepartment(departments, current.parentId)
      : undefined;
  }
  return path;
}

/**
 * Display label for a staff assignment.
 * Staff stores department/division **names**; older records may still use ids.
 */
export function departmentDisplayName(
  departments: Department[],
  idOrName?: string
): string {
  if (!idOrName) return '';
  const path = departmentPath(departments, idOrName);
  if (path.length === 0) {
    return idOrName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return path.map((d) => d.name).join(' · ');
}

/**
 * Staff select options — values are **names** (what the staff API stores).
 * Prefer division name when the department has divisions; otherwise department name.
 */
export function departmentSelectGroups(
  departments: Department[]
): { label: string; options: { value: string; label: string }[] }[] {
  return buildDepartmentTree(departments).map((dept) => {
    if (dept.children.length === 0) {
      return {
        label: dept.name,
        options: [{ value: dept.name, label: dept.name }],
      };
    }
    return {
      label: dept.name,
      options: dept.children.map((division) => ({
        value: division.name,
        label: division.name,
      })),
    };
  });
}

export function collectDescendantIds(
  departments: Department[],
  rootId: string
): Set<string> {
  const ids = new Set<string>([rootId]);
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.pop()!;
    for (const dept of departments) {
      if (dept.parentId === current && !ids.has(dept.id)) {
        ids.add(dept.id);
        queue.push(dept.id);
      }
    }
  }
  return ids;
}

/** Names of a department and all its divisions (for staff assignment warnings). */
export function collectDescendantNames(
  departments: Department[],
  rootId: string
): Set<string> {
  const names = new Set<string>();
  for (const id of collectDescendantIds(departments, rootId)) {
    const dept = findDepartment(departments, id);
    if (dept?.name) names.add(dept.name);
  }
  return names;
}

export function slugifyDepartment(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function uniqueDepartmentId(name: string, departments: Department[]): string {
  const base = slugifyDepartment(name) || 'department';
  if (!departments.some((d) => d.id === base)) return base;
  let n = 2;
  while (departments.some((d) => d.id === `${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}

export function isDivision(dept: Department): boolean {
  return Boolean(dept.parentId);
}

export function isTopLevelDepartment(dept: Department): boolean {
  return !dept.parentId;
}
