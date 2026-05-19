/** 1=Giám đốc, 2=Quản lý, 3=Nhân viên, 4=Khách */
export const ROLE = {
  ADMIN: 1,
  MANAGER: 2,
  EMPLOYEE: 3,
  GUEST: 4,
} as const;

export function canCreateTask(roleId?: number): boolean {
  return roleId === ROLE.ADMIN || roleId === ROLE.MANAGER;
}

export function canManageWorkspace(roleId?: number): boolean {
  return roleId === ROLE.ADMIN;
}

export function isEmployee(roleId?: number): boolean {
  return roleId === ROLE.EMPLOYEE;
}

export function canCreateWorkspace(workspaces: { roleId?: number }[]): boolean {
  return workspaces.some((w) => w.roleId === ROLE.ADMIN);
}
