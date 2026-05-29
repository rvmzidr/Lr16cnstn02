import { Routes } from '@angular/router';
import {
  authGuard,
  publicOnlyGuard,
} from './core/services/auth.service';
import {
  accessModuleGuard,
  accessPermissionGuard,
  dashboardRoleGuard,
} from './guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layouts/public-layout.component').then(
        (m) => m.PublicLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/public/home-page.component').then(
            (m) => m.HomePageComponent,
          ),
      },
      {
        path: 'accueil',
        loadComponent: () =>
          import('./pages/public/home-page.component').then(
            (m) => m.HomePageComponent,
          ),
      },
      {
        path: 'articles',
        loadComponent: () =>
          import('./pages/public/articles-page.component').then(
            (m) => m.ArticlesPageComponent,
          ),
      },
      {
        path: 'articles/:articleId',
        loadComponent: () =>
          import('./pages/public/article-detail-page.component').then(
            (m) => m.ArticleDetailPageComponent,
          ),
      },
      {
        path: 'news',
        loadComponent: () =>
          import('./pages/public/news-page.component').then(
            (m) => m.NewsPageComponent,
          ),
      },
      {
        path: 'news/:newsId',
        loadComponent: () =>
          import('./pages/public/news-detail-page.component').then(
            (m) => m.NewsDetailPageComponent,
          ),
      },
      {
        path: 'actualites',
        loadComponent: () =>
          import('./pages/public/news-page.component').then(
            (m) => m.NewsPageComponent,
          ),
      },
      {
        path: 'actualites/:newsId',
        loadComponent: () =>
          import('./pages/public/news-detail-page.component').then(
            (m) => m.NewsDetailPageComponent,
          ),
      },
      {
        path: 'about',
        loadComponent: () =>
          import('./pages/public/about-page.component').then(
            (m) => m.AboutPageComponent,
          ),
      },
      {
        path: 'a-propos',
        loadComponent: () =>
          import('./pages/public/about-page.component').then(
            (m) => m.AboutPageComponent,
          ),
      },
      {
        path: 'contact',
        loadComponent: () =>
          import('./pages/public/contact-page.component').then(
            (m) => m.ContactPageComponent,
          ),
      },
      {
        path: 'inscription',
        loadComponent: () =>
          import('./pages/auth/registration-page.component').then(
            (m) => m.RegistrationPageComponent,
          ),
        canActivate: [publicOnlyGuard],
      },
      {
        path: 'connexion',
        loadComponent: () =>
          import('./pages/auth/login-page.component').then(
            (m) => m.LoginPageComponent,
          ),
        canActivate: [publicOnlyGuard],
      },
      {
        path: 'mot-de-passe-oublie',
        loadComponent: () =>
          import('./pages/auth/forgot-password-page.component').then(
            (m) => m.ForgotPasswordPageComponent,
          ),
        canActivate: [publicOnlyGuard],
      },
      {
        path: 'reinitialiser-mot-de-passe',
        loadComponent: () =>
          import('./pages/auth/reset-password-page.component').then(
            (m) => m.ResetPasswordPageComponent,
          ),
        canActivate: [publicOnlyGuard],
      },
    ],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./layouts/dashboard-layout.component').then(
        (m) => m.DashboardLayoutComponent,
      ),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/dashboard/dashboard-home-page.component').then(
            (m) => m.DashboardHomePageComponent,
          ),
        canActivate: [accessModuleGuard('dashboard_home')],
      },
      {
        path: 'unauthorized',
        loadComponent: () =>
          import('./pages/dashboard/unauthorized-page.component').then(
            (m) => m.UnauthorizedPageComponent,
          ),
      },
      {
        path: 'overview',
        loadComponent: () =>
          import('./pages/dashboard/dashboard-home-page.component').then(
            (m) => m.DashboardHomePageComponent,
          ),
        canActivate: [accessModuleGuard('dashboard_home')],
      },
      {
        path: 'articles',
        loadComponent: () =>
          import('./pages/dashboard/articles-page.component').then(
            (m) => m.ArticlesPageComponent,
          ),
        canActivate: [dashboardRoleGuard(['chef', 'membre']), accessModuleGuard('articles')],
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/dashboard/admin-users-page.component').then(
            (m) => m.AdminUsersPageComponent,
          ),
        canActivate: [dashboardRoleGuard(['admin']), accessModuleGuard('admin_users')],
      },
      {
        path: 'registrations',
        loadComponent: () =>
          import('./pages/dashboard/admin-registrations-page.component').then(
            (m) => m.AdminRegistrationsPageComponent,
          ),
        canActivate: [dashboardRoleGuard(['admin']), accessModuleGuard('admin_registrations')],
      },
      {
        path: 'roles',
        loadComponent: () =>
          import('./pages/dashboard/admin-roles-page.component').then(
            (m) => m.AdminRolesPageComponent,
          ),
        canActivate: [dashboardRoleGuard(['admin']), accessModuleGuard('admin_roles')],
      },
      {
        path: 'user-access',
        loadComponent: () =>
          import('./pages/dashboard/access-control-page.component').then(
            (m) => m.AccessControlPageComponent,
          ),
        canActivate: [dashboardRoleGuard(['admin']), accessModuleGuard('access_control')],
      },
      {
        path: 'access-control',
        loadComponent: () =>
          import('./pages/dashboard/access-control-page.component').then(
            (m) => m.AccessControlPageComponent,
          ),
        canActivate: [dashboardRoleGuard(['admin']), accessModuleGuard('access_control')],
      },
      {
        path: 'projects',
        loadComponent: () =>
          import('./pages/dashboard/projects-page.component').then(
            (m) => m.ProjectsPageComponent,
          ),
        canActivate: [dashboardRoleGuard(['chef', 'membre']), accessModuleGuard('projects')],
      },
      {
        path: 'profil',
        loadComponent: () =>
          import('./pages/dashboard/profile-page.component').then(
            (m) => m.ProfilePageComponent,
          ),
        canActivate: [dashboardRoleGuard(['chef', 'membre']), accessModuleGuard('profile_settings')],
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./pages/dashboard/messages-page.component').then(
            (m) => m.MessagesPageComponent,
          ),
        canActivate: [accessModuleGuard('messaging')],
      },
      {
        path: 'purchases',
        loadComponent: () =>
          import('./pages/dashboard/purchases-page.component').then(
            (m) => m.PurchasesPageComponent,
          ),
        canActivate: [dashboardRoleGuard(['chef', 'membre']), accessModuleGuard('purchases')],
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./pages/dashboard/notifications-page.component').then(
            (m) => m.NotificationsPageComponent,
          ),
        canActivate: [
          dashboardRoleGuard(['admin', 'chef', 'membre']),
          accessModuleGuard('notifications'),
          accessPermissionGuard('canViewNotifications'),
        ],
      },
      {
        path: 'support',
        loadComponent: () =>
          import('./pages/dashboard/support-page.component').then(
            (m) => m.SupportPageComponent,
          ),
        canActivate: [accessModuleGuard('support')],
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/dashboard/admin-settings-page.component').then(
            (m) => m.AdminSettingsPageComponent,
          ),
        canActivate: [dashboardRoleGuard(['admin']), accessModuleGuard('admin_settings')],
      },
      // --- AI Routes (Release 3) ---
      {
        path: 'recherche-semantique',
        loadComponent: () =>
          import('./pages/dashboard/semantic-search-page.component').then(
            (m) => m.SemanticSearchPageComponent,
          ),
        canActivate: [dashboardRoleGuard(['admin', 'chef', 'membre'])],
      },
      {
        path: 'resume-ia',
        loadComponent: () =>
          import('./pages/dashboard/article-summary-page.component').then(
            (m) => m.ArticleSummaryPageComponent,
          ),
        canActivate: [dashboardRoleGuard(['chef', 'membre'])],
      },
      {
        path: 'assistant-ia',
        loadComponent: () =>
          import('./pages/dashboard/intelligent-assistant-page.component').then(
            (m) => m.IntelligentAssistantPageComponent,
          ),
        canActivate: [dashboardRoleGuard(['admin', 'chef', 'membre'])],
      },
      {
        path: 'analytiques',
        loadComponent: () =>
          import('./pages/dashboard/analytic-dashboard-page.component').then(
            (m) => m.AnalyticDashboardPageComponent,
          ),
        canActivate: [dashboardRoleGuard(['admin', 'chef'])],
      },
      {
        path: 'audit',
        loadComponent: () =>
          import('./pages/dashboard/audit-log-page.component').then(
            (m) => m.AuditLogPageComponent,
          ),
        canActivate: [dashboardRoleGuard(['admin'])],
      },
      // ----------------------------
      {
        path: 'articles-view',
        redirectTo: 'articles',
        pathMatch: 'full',
      },
      {
        path: 'articles/recherche',
        redirectTo: 'articles',
        pathMatch: 'full',
      },
      {
        path: 'profile',
        redirectTo: 'profil',
        pathMatch: 'full',
      },
      {
        path: 'admin/comptes',
        redirectTo: 'users',
        pathMatch: 'full',
      },
      {
        path: 'admin/inscriptions',
        redirectTo: 'registrations',
        pathMatch: 'full',
      },
      {
        path: 'admin/roles',
        redirectTo: 'roles',
        pathMatch: 'full',
      },
      {
        path: 'chef/articles',
        redirectTo: 'articles',
        pathMatch: 'full',
      },
      {
        path: 'news',
        loadComponent: () =>
          import('./pages/dashboard/news-management-page.component').then(
            (m) => m.NewsManagementPageComponent,
          ),
        canActivate: [dashboardRoleGuard(['chef'])],
      },
      {
        path: 'chef/actualites',
        redirectTo: 'news',
        pathMatch: 'full',
      },
      {
        path: 'actualites',
        redirectTo: '',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/public/not-found-page.component').then(
        (m) => m.NotFoundPageComponent,
      ),
  },
];
