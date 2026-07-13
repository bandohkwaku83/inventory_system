export interface Department {
  /** Stable slug stored on staff records */
  id: string;
  name: string;
  description?: string;
  /** null = top-level department; otherwise the parent department id */
  parentId: string | null;
}

export type DepartmentTreeNode = Department & { children: Department[] };

export const DEFAULT_DEPARTMENTS: Department[] = [
  { id: 'technical', name: 'Technical', parentId: null },
  { id: 'frontend', name: 'Frontend', parentId: 'technical' },
  { id: 'backend', name: 'Backend', parentId: 'technical' },
  { id: 'media', name: 'Media', parentId: null },
  { id: 'sound', name: 'Sound', parentId: 'media' },
  { id: 'photography', name: 'Photography', parentId: 'media' },
  { id: 'control_room', name: 'Control Room', parentId: 'media' },
  { id: 'sales', name: 'Sales', parentId: null },
  { id: 'finance', name: 'Finance', parentId: null },
];

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
  id: string
): Department[] {
  const path: Department[] = [];
  let current = findDepartment(departments, id);
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

export function departmentDisplayName(
  departments: Department[],
  id?: string
): string {
  if (!id) return '';
  const path = departmentPath(departments, id);
  if (path.length === 0) {
    return id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return path.map((d) => d.name).join(' · ');
}

export function departmentSelectGroups(
  departments: Department[]
): { label: string; options: { value: string; label: string }[] }[] {
  return buildDepartmentTree(departments).map((dept) => {
    if (dept.children.length === 0) {
      return {
        label: dept.name,
        options: [{ value: dept.id, label: dept.name }],
      };
    }
    return {
      label: dept.name,
      options: dept.children.map((division) => ({
        value: division.id,
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
