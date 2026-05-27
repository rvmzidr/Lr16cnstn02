import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import type { DashboardRole } from '../shared/services/role.service';
import { RoleService } from '../shared/services/role.service';
import type { AccessModuleKey, AccessPermissionKey } from '../core/models/models';
import { AccessContextService } from '../shared/services/access-context.service';

export function dashboardRoleGuard(allowedRoles: DashboardRole[]): CanActivateFn {
  return () => {
    const router = inject(Router);
    const roleService = inject(RoleService);

    return roleService.hasAnyRole(allowedRoles)
      ? true
      : router.createUrlTree(['/dashboard/unauthorized']);
  };
}

export function accessModuleGuard(moduleKey: AccessModuleKey): CanActivateFn {
  return async () => {
    const router = inject(Router);
    const accessContext = inject(AccessContextService);

    await accessContext.ensureLoaded();

    return accessContext.isModuleVisible(moduleKey)
      ? true
      : router.createUrlTree(['/dashboard/unauthorized']);
  };
}

export function accessPermissionGuard(
  permissionKey: AccessPermissionKey,
): CanActivateFn {
  return async () => {
    const router = inject(Router);
    const accessContext = inject(AccessContextService);

    await accessContext.ensureLoaded();

    return accessContext.isPermissionAllowed(permissionKey)
      ? true
      : router.createUrlTree(['/dashboard/unauthorized']);
  };
}
