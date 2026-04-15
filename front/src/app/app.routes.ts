import { Routes } from '@angular/router';
import {
  authGuard,
  publicOnlyGuard,
} from './core/services/auth.service';
import { dashboardRoleGuard } from './guards/role.guard';

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
      },
      {
        path: 'overview',
        loadComponent: () =>
          import('./pages/dashboard/dashboard-home-page.component').then(
            (m) => m.DashboardHomePageComponent,
          ),
      },
      {
        path: 'articles',
        loadComponent: () =>
          import('./pages/dashboard/articles-page.component').then(
            (m) => m.ArticlesPageComponent,
          ),
        canActivate: [dashboardRoleGuard(['chef', 'membre'])],
      },
      {
        path: 'articles/editor',
        loadComponent: () =>
          import('./pages/dashboard/articles-management-page.component').then(
            (m) => m.ArticlesManagementPageComponent,
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/dashboard/admin-users-page.component').then(
            (m) => m.AdminUsersPageComponent,
          ),
        canActivate: [dashboardRoleGuard(['admin'])],
      },
      {
        path: 'registrations',
        loadComponent: () =>
          import('./pages/dashboard/admin-registrations-page.component').then(
            (m) => m.AdminRegistrationsPageComponent,
          ),
        canActivate: [dashboardRoleGuard(['admin'])],
      },
      {
        path: 'roles',
        loadComponent: () =>
          import('./pages/dashboard/admin-roles-page.component').then(
            (m) => m.AdminRolesPageComponent,
          ),
        canActivate: [dashboardRoleGuard(['admin'])],
      },
      {
        path: 'projects',
        loadComponent: () =>
          import('./pages/dashboard/projects-page.component').then(
            (m) => m.ProjectsPageComponent,
          ),
        canActivate: [dashboardRoleGuard(['chef', 'membre'])],
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./pages/dashboard/messages-page.component').then(
            (m) => m.MessagesPageComponent,
          ),
      },
      {
        path: 'purchases',
        loadComponent: () =>
          import('./pages/dashboard/purchases-page.component').then(
            (m) => m.PurchasesPageComponent,
          ),
        canActivate: [dashboardRoleGuard(['chef', 'membre'])],
      },
      {
        path: 'budget',
        loadComponent: () =>
          import('./pages/dashboard/budget-page.component').then(
            (m) => m.BudgetPageComponent,
          ),
        canActivate: [dashboardRoleGuard(['chef'])],
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./pages/dashboard/notifications-page.component').then(
            (m) => m.NotificationsPageComponent,
          ),
        canActivate: [dashboardRoleGuard(['admin'])],
      },
      {
        path: 'support',
        loadComponent: () =>
          import('./pages/dashboard/support-page.component').then(
            (m) => m.SupportPageComponent,
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/dashboard/admin-settings-page.component').then(
            (m) => m.AdminSettingsPageComponent,
          ),
        canActivate: [dashboardRoleGuard(['admin'])],
      },
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
        path: 'profil',
        redirectTo: 'settings',
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
        path: 'chef/actualites',
        redirectTo: '',
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
