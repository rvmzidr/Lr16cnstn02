import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import type { Role } from '../../core/models/models';

export type DashboardRole = 'admin' | 'chef' | 'membre';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly auth = inject(AuthService);

  readonly backendRole = computed<Role | null>(
    () => this.auth.session()?.utilisateur?.role ?? null,
  );

  readonly dashboardRole = computed<DashboardRole>(() => {
    const role = this.backendRole();

    if (role === 'ADMINISTRATEUR') {
      return 'admin';
    }

    if (role === 'CHEF_LABO') {
      return 'chef';
    }

    return 'membre';
  });

  readonly isAdmin = computed(() => this.dashboardRole() === 'admin');
  readonly isChef = computed(() => this.dashboardRole() === 'chef');
  readonly isMembre = computed(() => this.dashboardRole() === 'membre');

  readonly canAccessBudget = computed(() => this.isChef());

  hasAnyRole(roles: DashboardRole[]) {
    return roles.includes(this.dashboardRole());
  }
}
