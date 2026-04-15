import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import type { DashboardRole } from '../shared/services/role.service';
import { RoleService } from '../shared/services/role.service';

export function dashboardRoleGuard(allowedRoles: DashboardRole[]): CanActivateFn {
  return () => {
    const router = inject(Router);
    const roleService = inject(RoleService);

    return roleService.hasAnyRole(allowedRoles)
      ? true
      : router.createUrlTree(['/dashboard']);
  };
}
