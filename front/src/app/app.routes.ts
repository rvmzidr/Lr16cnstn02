import { Routes } from '@angular/router';
import {
  authGuard,
  publicOnlyGuard,
  roleGuard,
} from './core/services/auth.service';

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
        path: 'profil',
        loadComponent: () =>
          import('./pages/dashboard/member-profile-page.component').then(
            (m) => m.MemberProfilePageComponent,
          ),
      },
      {
        path: 'articles',
        loadComponent: () =>
          import('./pages/dashboard/articles-management-page.component').then(
            (m) => m.ArticlesManagementPageComponent,
          ),
      },
      {
        path: 'articles/recherche',
        loadComponent: () =>
          import('./pages/dashboard/article-search-page.component').then(
            (m) => m.ArticleSearchPageComponent,
          ),
      },
      {
        path: 'actualites',
        loadComponent: () =>
          import('./pages/dashboard/member-news-page.component').then(
            (m) => m.MemberNewsPageComponent,
          ),
      },
      {
        path: 'admin/comptes',
        loadComponent: () =>
          import('./pages/dashboard/admin-accounts-page.component').then(
            (m) => m.AdminAccountsPageComponent,
          ),
        canActivate: [roleGuard(['ADMINISTRATEUR'])],
      },
      {
        path: 'chef/articles',
        loadComponent: () =>
          import('./pages/dashboard/lab-head-articles-page.component').then(
            (m) => m.LabHeadArticlesPageComponent,
          ),
        canActivate: [roleGuard(['CHEF_LABO'])],
      },
      {
        path: 'chef/actualites',
        loadComponent: () =>
          import('./pages/dashboard/lab-head-news-page.component').then(
            (m) => m.LabHeadNewsPageComponent,
          ),
        canActivate: [roleGuard(['CHEF_LABO'])],
      },
      {
        path: 'projects',
        loadComponent: () =>
          import('./pages/dashboard/projects-page.component').then(
            (m) => m.ProjectsPageComponent,
          ),
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
