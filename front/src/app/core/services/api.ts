import { API_URL } from '../utils/env';
import type {
  AboutData,
  Actualite,
  AdminAccountsList,
  AdminRegistrationList,
  ApiEnvelope,
  Article,
  ArticlePayload,
  ArticleSearchFilters,
  ArticleSearchResultsData,
  ContactData,
  ForgotPasswordResponse,
  HomeData,
  LabHeadArticlesData,
  LoginResponse,
  MemberArticlesData,
  MemberLookupData,
  MemberProfileData,
  NewsManagementList,
  PaginationMeta,
  PublicContactResponse,
  RegistrationReferences,
  Role,
  UtilisateurComplet,
} from '../models/models';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | object | null;
  token?: string | null;
  query?: Record<string, string | number | undefined | null>;
};

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = new URL(`${API_URL}${path}`, window.location.origin);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') {
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function request<T>(path: string, options: RequestOptions = {}) {
  const { body, headers, token, query, ...rest } = options;
  const isFormData =
    typeof FormData !== 'undefined' && body instanceof FormData;
  let response: Response;

  try {
    response = await fetch(buildUrl(path, query), {
      ...rest,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body:
        body === undefined || body === null || isFormData
          ? (body as BodyInit | null | undefined)
          : JSON.stringify(body),
    });
  } catch (_error) {
    throw new ApiError(
      "Impossible de joindre l'API. Verifiez que le backend est demarre et que l'URL API est correcte.",
      0,
    );
  }

  const data = (await response
    .json()
    .catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || !data?.succes) {
    throw new ApiError(
      data?.message || `Request failed with status ${response.status}.`,
      response.status,
    );
  }

  return data.donnees;
}

async function downloadProtectedFile(path: string, token: string) {
  let response: Response;

  try {
    response = await fetch(buildUrl(path), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (_error) {
    throw new ApiError(
      "Impossible de joindre l'API. Verifiez que le backend est demarre et que l'URL API est correcte.",
      0,
    );
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;

    try {
      const data = (await response.json()) as ApiEnvelope<unknown>;
      if (data?.message) {
        message = data.message;
      }
    } catch (_error) {
      // Ignore non-JSON download failures.
    }

    throw new ApiError(message, response.status);
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get('content-disposition') || '';
  const match = contentDisposition.match(
    /filename\*?=(?:UTF-8''|")?([^\";]+)/i,
  );
  const fileName = decodeURIComponent(
    (match?.[1] || 'document').replace(/"/g, ''),
  );

  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(blobUrl);
}

export const api = {
  getHome() {
    return request<HomeData>('/public/accueil');
  },
  getAbout() {
    return request<AboutData>('/public/a-propos');
  },
  getContact() {
    return request<ContactData>('/public/contact');
  },
  submitContact(payload: {
    nomComplet: string;
    email: string;
    sujet: string;
    message: string;
  }) {
    return request<PublicContactResponse>('/public/contact', {
      method: 'POST',
      body: payload,
    });
  },
  listPublicArticles(query?: RequestOptions['query']) {
    return request<{ elements: Article[]; meta: PaginationMeta }>(
      '/public/articles',
      {
        query,
      },
    );
  },
  getPublicArticle(articleId: string | number) {
    return request<Article>(`/public/articles/${articleId}`);
  },
  listPublicNews(query?: RequestOptions['query']) {
    return request<{ elements: Actualite[]; meta: PaginationMeta }>(
      '/public/actualites',
      {
        query,
      },
    );
  },
  getPublicNews(newsId: string | number) {
    return request<Actualite>(`/public/actualites/${newsId}`);
  },
  getRegistrationReferences() {
    return request<{
      references: RegistrationReferences;
      televersementAttestation: RegistrationReferences['televersementAttestation'];
    }>('/auth/inscription/references');
  },
  register(payload: FormData) {
    return request<UtilisateurComplet>('/auth/inscription', {
      method: 'POST',
      body: payload,
    });
  },
  login(payload: { emailInstitutionnel: string; motDePasse: string }) {
    return request<LoginResponse>('/auth/connexion', {
      method: 'POST',
      body: payload,
    });
  },
  forgotPassword(payload: { emailInstitutionnel: string }) {
    return request<ForgotPasswordResponse>('/auth/mot-de-passe-oublie', {
      method: 'POST',
      body: payload,
    });
  },
  resetPassword(payload: {
    token: string;
    nouveauMotDePasse: string;
    confirmationMotDePasse: string;
  }) {
    return request<null>('/auth/reinitialiser-mot-de-passe', {
      method: 'POST',
      body: payload,
    });
  },
  getProfile(token: string) {
    return request<MemberProfileData>('/membre/profil', { token });
  },
  updateProfile(token: string, payload: FormData) {
    return request<MemberProfileData>('/membre/profil', {
      method: 'PUT',
      token,
      body: payload,
    });
  },
  downloadMyDoctorantAttestation(token: string) {
    return downloadProtectedFile('/membre/profil/attestation-doctorant', token);
  },
  listMembers(token: string, query?: RequestOptions['query']) {
    return request<MemberLookupData>('/membre/membres', {
      token,
      query,
    });
  },
  listMemberArticles(token: string) {
    return request<MemberArticlesData>('/membre/articles/mes-articles', {
      token,
    });
  },
  searchMemberArticles(token: string, query?: ArticleSearchFilters) {
    return request<ArticleSearchResultsData>('/membre/articles/recherche', {
      token,
      query: query as RequestOptions['query'],
    });
  },
  createArticle(token: string, payload: ArticlePayload) {
    return request<Article>('/membre/articles', {
      method: 'POST',
      token,
      body: payload,
    });
  },
  updateArticle(token: string, articleId: number, payload: ArticlePayload) {
    return request<Article>(`/membre/articles/${articleId}`, {
      method: 'PUT',
      token,
      body: payload,
    });
  },
  addCoAuthor(
    token: string,
    articleId: number,
    payload: {
      utilisateurId: string;
      ordreAuteur?: number;
      auteurCorrespondant?: boolean;
    },
  ) {
    return request<Article>(`/membre/articles/${articleId}/co-auteurs`, {
      method: 'POST',
      token,
      body: payload,
    });
  },
  deleteCoAuthor(token: string, articleId: number, utilisateurId: string) {
    return request<Article>(
      `/membre/articles/${articleId}/co-auteurs/${utilisateurId}`,
      {
        method: 'DELETE',
        token,
      },
    );
  },
  listMemberNews(token: string, query?: RequestOptions['query']) {
    return request<{ elements: Actualite[]; meta: PaginationMeta }>(
      '/membre/actualites',
      {
        token,
        query,
      },
    );
  },
  listAdminRegistrations(token: string, query?: RequestOptions['query']) {
    return request<AdminRegistrationList>('/admin/inscriptions', {
      token,
      query,
    });
  },
  validateRegistration(
    token: string,
    userId: string,
    payload: { role?: Role; commentaire?: string },
  ) {
    return request<UtilisateurComplet>(
      `/admin/inscriptions/${userId}/valider`,
      {
        method: 'PATCH',
        token,
        body: payload,
      },
    );
  },
  refuseRegistration(
    token: string,
    userId: string,
    payload: { motifRejet: string },
  ) {
    return request<UtilisateurComplet>(
      `/admin/inscriptions/${userId}/refuser`,
      {
        method: 'PATCH',
        token,
        body: payload,
      },
    );
  },
  listAdminAccounts(token: string, query?: RequestOptions['query']) {
    return request<AdminAccountsList>('/admin/comptes', {
      token,
      query,
    });
  },
  activateAccount(token: string, userId: string) {
    return request<UtilisateurComplet>(`/admin/comptes/${userId}/activer`, {
      method: 'PATCH',
      token,
    });
  },
  deactivateAccount(token: string, userId: string) {
    return request<UtilisateurComplet>(`/admin/comptes/${userId}/desactiver`, {
      method: 'PATCH',
      token,
    });
  },
  changeAccountRole(
    token: string,
    userId: string,
    payload: { role: Role; commentaire?: string },
  ) {
    return request<UtilisateurComplet>(`/admin/comptes/${userId}/role`, {
      method: 'PATCH',
      token,
      body: payload,
    });
  },
  downloadAdminDoctorantAttestation(token: string, userId: string) {
    return downloadProtectedFile(
      `/admin/comptes/${userId}/attestation-doctorant`,
      token,
    );
  },
  getLabHeadArticles(token: string) {
    return request<LabHeadArticlesData>('/chef-labo/articles', { token });
  },
  validateArticle(token: string, articleId: number) {
    return request<Article>(`/chef-labo/articles/${articleId}/valider`, {
      method: 'PATCH',
      token,
    });
  },
  refuseArticle(
    token: string,
    articleId: number,
    payload: { motifRejet: string },
  ) {
    return request<Article>(`/chef-labo/articles/${articleId}/refuser`, {
      method: 'PATCH',
      token,
      body: payload,
    });
  },
  publishArticle(token: string, articleId: number) {
    return request<Article>(`/chef-labo/articles/${articleId}/publier`, {
      method: 'PATCH',
      token,
    });
  },
  listLabHeadNews(token: string, query?: RequestOptions['query']) {
    return request<NewsManagementList>('/chef-labo/actualites', {
      token,
      query,
    });
  },
  createLabHeadNews(
    token: string,
    payload: {
      titre: string;
      resume?: string;
      contenu: string;
      equipeRechercheId?: number | null;
      statut?: 'BROUILLON' | 'PUBLIEE';
    },
  ) {
    return request<Actualite>('/chef-labo/actualites', {
      method: 'POST',
      token,
      body: payload,
    });
  },
  updateLabHeadNews(
    token: string,
    newsId: number,
    payload: {
      titre?: string;
      resume?: string;
      contenu?: string;
      equipeRechercheId?: number | null;
      statut?: 'BROUILLON' | 'PUBLIEE' | 'ARCHIVEE';
    },
  ) {
    return request<Actualite>(`/chef-labo/actualites/${newsId}`, {
      method: 'PUT',
      token,
      body: payload,
    });
  },
  deleteLabHeadNews(token: string, newsId: number) {
    return request<null>(`/chef-labo/actualites/${newsId}`, {
      method: 'DELETE',
      token,
    });
  },
};
