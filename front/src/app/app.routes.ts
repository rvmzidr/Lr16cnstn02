import { Routes } from '@angular/router';
import { authGuard, publicOnlyGuard, roleGuard } from './core/services/auth.service';
import { DashboardLayoutComponent } from './layouts/dashboard-layout.component';
import { PublicLayoutComponent } from './layouts/public-layout.component';
import { AboutPageComponent } from './pages/about-page.component';
import { ArticleDetailPageComponent } from './pages/article-detail-page.component';
import { ArticlesPageComponent } from './pages/articles-page.component';
import { ContactPageComponent } from './pages/contact-page.component';
import { HomePageComponent } from './pages/home-page.component';
import { NewsDetailPageComponent } from './pages/news-detail-page.component';
import { NewsPageComponent } from './pages/news-page.component';
import { NotFoundPageComponent } from './pages/not-found-page.component';
import { ForgotPasswordPageComponent } from './pages/auth/forgot-password-page.component';
import { LoginPageComponent } from './pages/auth/login-page.component';
import { RegistrationPageComponent } from './pages/auth/registration-page.component';
import { ResetPasswordPageComponent } from './pages/auth/reset-password-page.component';
import { AdminAccountsPageComponent } from './pages/dashboard/admin-accounts-page.component';
import { ArticleSearchPageComponent } from './pages/dashboard/article-search-page.component';
import { ArticlesManagementPageComponent } from './pages/dashboard/articles-management-page.component';
import { DashboardHomePageComponent } from './pages/dashboard/dashboard-home-page.component';
import { LabHeadArticlesPageComponent } from './pages/dashboard/lab-head-articles-page.component';
import { LabHeadNewsPageComponent } from './pages/dashboard/lab-head-news-page.component';
import { MemberNewsPageComponent } from './pages/dashboard/member-news-page.component';
import { MemberProfilePageComponent } from './pages/dashboard/member-profile-page.component';
import { MessagesPageComponent } from './pages/dashboard/messages-page.component';
import { ProjectsPageComponent } from './pages/dashboard/projects-page.component';
import { PurchasesPageComponent } from './pages/dashboard/purchases-page.component';

export const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', component: HomePageComponent },
      { path: 'articles', component: ArticlesPageComponent },
      { path: 'articles/:articleId', component: ArticleDetailPageComponent },
      { path: 'news', component: NewsPageComponent },
      { path: 'news/:newsId', component: NewsDetailPageComponent },
      { path: 'actualites', component: NewsPageComponent },
      { path: 'actualites/:newsId', component: NewsDetailPageComponent },
      { path: 'about', component: AboutPageComponent },
      { path: 'a-propos', component: AboutPageComponent },
      { path: 'contact', component: ContactPageComponent },
      { path: 'inscription', component: RegistrationPageComponent, canActivate: [publicOnlyGuard] },
      { path: 'connexion', component: LoginPageComponent, canActivate: [publicOnlyGuard] },
      {
        path: 'mot-de-passe-oublie',
        component: ForgotPasswordPageComponent,
        canActivate: [publicOnlyGuard]
      },
      {
        path: 'reinitialiser-mot-de-passe',
        component: ResetPasswordPageComponent,
        canActivate: [publicOnlyGuard]
      }
    ]
  },
  {
    path: 'dashboard',
    component: DashboardLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: DashboardHomePageComponent },
      { path: 'profil', component: MemberProfilePageComponent },
      { path: 'articles', component: ArticlesManagementPageComponent },
      { path: 'articles/recherche', component: ArticleSearchPageComponent },
      { path: 'actualites', component: MemberNewsPageComponent },
      {
        path: 'admin/comptes',
        component: AdminAccountsPageComponent,
        canActivate: [roleGuard(['ADMINISTRATEUR'])]
      },
      {
        path: 'chef/articles',
        component: LabHeadArticlesPageComponent,
        canActivate: [roleGuard(['CHEF_LABO'])]
      },
      {
        path: 'chef/actualites',
        component: LabHeadNewsPageComponent,
        canActivate: [roleGuard(['CHEF_LABO'])]
      },
      { path: 'projects', component: ProjectsPageComponent },
      { path: 'messages', component: MessagesPageComponent },
      { path: 'purchases', component: PurchasesPageComponent }
    ]
  },
  { path: '**', component: NotFoundPageComponent }
];
