import { API_URL } from '../utils/env';
import type {
  UserAccessSummaryResponse,
  UserAccessUsersListResponse,
  AccessPreviewProfileResponse,
  AccessProfileDetail,
  AccessProfileUsersResponse,
  AccessProfilesListResponse,
  SupportTicketAccessDiagnostic,
  UserAccessContext,
  AdminPasswordUpdatePayload,
  AdminProfileSettings,
  AboutData,
  Actualite,
  AdminAccountsList,
  AdminDashboardKPIs,
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
  LabHeadArticlesQuery,
  LabHeadDashboardKPIs,
  LoginResponse,
  MessagingUserSummary,
  NotificationItem,
  NotificationPreferences,
  MemberArticlesData,
  MemberLookupData,
  MemberProfileData,
  NewsManagementList,
  PaginationMeta,
  Project,
  PurchaseRequest,
  PublicContactResponse,
  SupportAttachment,
  SupportTicketDetail,
  SupportTicketStats,
  SupportTicketSummary,
  ConversationSummary,
  ConversationDetail,
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

type ApiErrorDetail = {
  champ?: string;
  message?: string;
};

type ApiErrorEnvelope = {
  succes?: boolean;
  message?: string;
  erreurs?: ApiErrorDetail[] | null;
};

const ADMIN_REGISTRATIONS_MAX_LIMIT = 50;
const ADMIN_NOTIFICATIONS_MAX_LIMIT = 50;
const SUPPORT_TICKETS_MAX_LIMIT = 50;
const ACCESS_CONTROL_MAX_LIMIT = 50;

function toPositiveInt(value: string | number | undefined | null) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(1, Math.trunc(parsed));
}

function normalizeAdminRegistrationsQuery(query?: RequestOptions['query']) {
  if (!query) {
    return undefined;
  }

  const limit = toPositiveInt(query['limit']);
  const page = toPositiveInt(query['page']);

  return {
    ...query,
    limit: limit === null ? undefined : Math.min(limit, ADMIN_REGISTRATIONS_MAX_LIMIT),
    page: page === null ? undefined : page,
  };
}

function normalizeAdminNotificationsQuery(query?: RequestOptions['query']) {
  if (!query) {
    return undefined;
  }

  const limit = toPositiveInt(query['limit']);
  const page = toPositiveInt(query['page']);
  const type = typeof query['type'] === 'string' ? query['type'].trim().toLowerCase() : undefined;
  const read = typeof query['read'] === 'string' ? query['read'].trim().toLowerCase() : undefined;

  const normalizedType =
    type && ['all', 'registration', 'account', 'message', 'role', 'support'].includes(type)
      ? type
      : undefined;

  const normalizedRead =
    read && ['all', 'read', 'unread', 'true', 'false'].includes(read)
      ? read === 'true'
        ? 'read'
        : read === 'false'
          ? 'unread'
          : read
      : undefined;

  return {
    ...query,
    limit: limit === null ? undefined : Math.min(limit, ADMIN_NOTIFICATIONS_MAX_LIMIT),
    page: page === null ? undefined : page,
    type: normalizedType,
    read: normalizedRead,
  };
}

function normalizeSupportTicketsQuery(query?: RequestOptions['query']) {
  if (!query) {
    return undefined;
  }

  const limit = toPositiveInt(query['limit']);
  const page = toPositiveInt(query['page']);

  return {
    ...query,
    limit: limit === null ? undefined : Math.min(limit, SUPPORT_TICKETS_MAX_LIMIT),
    page: page === null ? undefined : page,
  };
}

function normalizeAccessControlQuery(query?: RequestOptions['query']) {
  if (!query) {
    return undefined;
  }

  const limit = toPositiveInt(query['limit']);
  const page = toPositiveInt(query['page']);

  return {
    ...query,
    limit: limit === null ? undefined : Math.min(limit, ACCESS_CONTROL_MAX_LIMIT),
    page: page === null ? undefined : page,
  };
}

function buildApiErrorMessage(
  payload: ApiErrorEnvelope | null,
  fallback: string,
) {
  const base = payload?.message || fallback;
  const firstDetail = payload?.erreurs?.find((detail) =>
    Boolean(detail?.message),
  );

  if (!firstDetail?.message) {
    return base;
  }

  return `${base} (${firstDetail.message})`;
}

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
    .catch(() => null)) as (ApiEnvelope<T> & ApiErrorEnvelope) | null;

  if (!response.ok || !data?.succes) {
    throw new ApiError(
      buildApiErrorMessage(
        data,
        `Request failed with status ${response.status}.`,
      ),
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
      const data = (await response.json()) as ApiErrorEnvelope;
      message = buildApiErrorMessage(data, message);
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

async function openProtectedFile(path: string, token: string) {
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
      const data = (await response.json()) as ApiErrorEnvelope;
      message = buildApiErrorMessage(data, message);
    } catch (_error) {
      // Ignore non-JSON download failures.
    }

    throw new ApiError(message, response.status);
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
}

async function createProtectedBlobUrl(path: string, token: string) {
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
      const data = (await response.json()) as ApiErrorEnvelope;
      message = buildApiErrorMessage(data, message);
    } catch (_error) {
      // Ignore non-JSON download failures.
    }

    throw new ApiError(message, response.status);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

function openPublicFile(path: string) {
  window.open(buildUrl(path), '_blank', 'noopener,noreferrer');
}

async function downloadPublicFile(path: string) {
  let response: Response;

  try {
    response = await fetch(buildUrl(path));
  } catch (_error) {
    throw new ApiError(
      "Impossible de joindre l'API. Verifiez que le backend est demarre et que l'URL API est correcte.",
      0,
    );
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;

    try {
      const data = (await response.json()) as ApiErrorEnvelope;
      message = buildApiErrorMessage(data, message);
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
    (match?.[1] || 'article.pdf').replace(/"/g, ''),
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
  openPublicArticlePdf(articleId: string | number) {
    openPublicFile(`/public/articles/${articleId}/pdf?action=view`);
  },
  downloadPublicArticlePdf(articleId: string | number) {
    return downloadPublicFile(`/public/articles/${articleId}/pdf`);
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
  getMyProfilePhotoUrl(token: string) {
    return createProtectedBlobUrl('/membre/profil/photo', token);
  },
  uploadMyProfilePhoto(token: string, file: File) {
    const payload = new FormData();
    payload.set('photoProfil', file);
    return request<MemberProfileData>('/membre/profil/photo', {
      method: 'PUT',
      token,
      body: payload,
    });
  },
  deleteMyProfilePhoto(token: string) {
    return request<MemberProfileData>('/membre/profil/photo', {
      method: 'DELETE',
      token,
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
  uploadArticlePdf(token: string, articleId: number, file: File) {
    const payload = new FormData();
    payload.set('articlePdf', file);
    return request<Article>(`/membre/articles/${articleId}/pdf`, {
      method: 'POST',
      token,
      body: payload,
    });
  },
  uploadArticleCover(token: string, articleId: number, file: File) {
    const payload = new FormData();
    payload.set('articleCover', file);
    return request<Article>(`/membre/articles/${articleId}/couverture`, {
      method: 'POST',
      token,
      body: payload,
    });
  },
  openMemberArticlePdf(token: string, articleId: number) {
    return openProtectedFile(`/membre/articles/${articleId}/pdf?action=view`, token);     
  },
  getMemberArticlePdfUrl(token: string, articleId: number) {
    return createProtectedBlobUrl(`/membre/articles/${articleId}/pdf?action=view`, token);
  },
  downloadMemberArticlePdf(token: string, articleId: number) {
    return downloadProtectedFile(`/membre/articles/${articleId}/pdf`, token);
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
  // ADMIN
  getAdminDashboardKPIs(token: string) {
    return request<AdminDashboardKPIs>('/admin/dashboard', {
      token,
    });
  },
  listAdminRegistrations(token: string, query?: RequestOptions['query']) {
    return request<AdminRegistrationList>('/admin/inscriptions', {
      token,
      query: normalizeAdminRegistrationsQuery(query),
    });
  },
  getAdminRegistrationDetail(token: string, userId: string) {
    return request<UtilisateurComplet>(`/admin/inscriptions/${userId}`, {
      token,
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
  getLabHeadArticles(token: string, query?: LabHeadArticlesQuery) {
    return request<LabHeadArticlesData>('/chef-labo/articles', {
      token,
      query: query as RequestOptions['query'],
    });
  },
  getLabHeadDashboardKPIs(token: string) {
    return request<LabHeadDashboardKPIs>('/chef-labo/dashboard', { token });
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
  listConversations(token: string) {
    return request<{ elements: ConversationSummary[] }>(
      '/membre/messages/conversations',
      { token },
    );
  },
  getConversation(token: string, conversationId: number) {
    return request<ConversationDetail>(`/membre/messages/conversations/${conversationId}`, {
      token,
    });
  },
  createConversation(
    token: string,
    payload:
      | FormData
      | {
          sujet?: string;
          description?: string;
          participantIds: string[];
          contenu?: string;
        },
  ) {
    return request<ConversationDetail>('/membre/messages/conversations', {
      method: 'POST',
      token,
      body: payload,
    });
  },
  createGroupConversation(
    token: string,
    payload:
      | FormData
      | {
          sujet: string;
          description?: string;
          participantIds: string[];
          contenu?: string;
        },
  ) {
    return request<ConversationDetail>('/membre/messages/groups', {
      method: 'POST',
      token,
      body: payload,
    });
  },
  sendMessage(
    token: string,
    conversationId: number,
    payload: FormData | { contenu?: string },
  ) {
    return request<ConversationDetail['messages'][number]>(
      `/membre/messages/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        token,
        body: payload,
      },
    );
  },
  markMessageRead(token: string, messageId: number) {
    return request<unknown>(`/membre/messages/messages/${messageId}/lire`, {
      method: 'PATCH',
      token,
    });
  },
  addGroupMembers(
    token: string,
    conversationId: number,
    payload: { participantIds: string[] },
  ) {
    return request<ConversationDetail>(`/membre/messages/groups/${conversationId}/members`, {
      method: 'POST',
      token,
      body: payload,
    });
  },
  removeGroupMember(token: string, conversationId: number, userId: string) {
    return request<{ conversationId: number; removedUserId: string }>(
      `/membre/messages/groups/${conversationId}/members/${userId}`,
      {
        method: 'DELETE',
        token,
      },
    );
  },
  leaveGroupConversation(token: string, conversationId: number) {
    return request<{ conversationId: number; left: boolean }>(
      `/membre/messages/groups/${conversationId}/leave`,
      {
        method: 'POST',
        token,
      },
    );
  },
  archiveConversation(token: string, conversationId: number) {
    return request<{ conversationId: number; archived: boolean }>(
      `/membre/messages/conversations/${conversationId}/archive`,
      {
        method: 'PATCH',
        token,
      },
    );
  },
  unarchiveConversation(token: string, conversationId: number) {
    return request<{ conversationId: number; archived: boolean }>(
      `/membre/messages/conversations/${conversationId}/unarchive`,
      {
        method: 'PATCH',
        token,
      },
    );
  },
  downloadMessageAttachment(token: string, attachmentId: number) {
    return downloadProtectedFile(`/membre/messages/attachments/${attachmentId}`, token);
  },
  searchMessageRecipients(
    token: string,
    query?: RequestOptions['query'],
  ) {
    return request<{ elements: MessagingUserSummary[] }>('/messages/recipients', {
      token,
      query,
    });
  },
  listProjects(token: string, query?: RequestOptions['query']) {
    return request<{ elements: Project[]; meta: PaginationMeta }>('/membre/projets', {
      token,
      query,
    });
  },
  createProject(token: string, payload: Record<string, unknown>) {
    return request<Project>('/chef-labo/projets', {
      method: 'POST',
      token,
      body: payload,
    });
  },
  updateProject(token: string, projectId: number, payload: Record<string, unknown>) {
    return request<Project>(`/chef-labo/projets/${projectId}`, {
      method: 'PUT',
      token,
      body: payload,
    });
  },
  archiveProject(token: string, projectId: number) {
    return request<Project>(`/chef-labo/projets/${projectId}/archiver`, {
      method: 'PATCH',
      token,
    });
  },
  assignProjectMember(
    token: string,
    projectId: number,
    payload: { utilisateurId: string; roleDansProjet?: string },
  ) {
    return request<Project>(`/chef-labo/projets/${projectId}/membres`, {
      method: 'POST',
      token,
      body: payload,
    });
  },
  removeProjectMember(token: string, projectId: number, userId: string) {
    return request<Project>(`/chef-labo/projets/${projectId}/membres/${userId}`, {
      method: 'DELETE',
      token,
    });
  },
  listPurchaseRequests(token: string, query?: RequestOptions['query']) {
    return request<{ elements: PurchaseRequest[]; meta: PaginationMeta }>(
      '/membre/demandes-achat',
      {
        token,
        query,
      },
    );
  },
  createPurchaseRequest(token: string, payload: FormData) {
    return request<PurchaseRequest>('/membre/demandes-achat', {
      method: 'POST',
      token,
      body: payload,
    });
  },
  updatePurchaseRequest(token: string, purchaseId: number, payload: FormData) {
    return request<PurchaseRequest>(`/membre/demandes-achat/${purchaseId}`, {
      method: 'PUT',
      token,
      body: payload,
    });
  },
  generatePurchaseRequestPdf(token: string, purchaseId: number) {
    return request<PurchaseRequest>(`/membre/demandes-achat/${purchaseId}/generer-pdf`, {
      method: 'POST',
      token,
    });
  },
  openPurchaseRequestPdf(token: string, purchaseId: number) {
    return openProtectedFile(`/membre/demandes-achat/${purchaseId}/pdf?action=view`, token);
  },
  downloadPurchaseRequestPdf(token: string, purchaseId: number) {
    return downloadProtectedFile(`/membre/demandes-achat/${purchaseId}/pdf`, token);
  },
  downloadPurchaseAttachment(
    token: string,
    purchaseId: number,
    attachmentId?: number,
  ) {
    return downloadProtectedFile(
      attachmentId
        ? `/membre/demandes-achat/${purchaseId}/pieces-jointes/${attachmentId}`
        : `/membre/demandes-achat/${purchaseId}/piece-jointe`,
      token,
    );
  },
  decidePurchaseRequest(
    token: string,
    purchaseId: number,
    payload: { decision: 'ACCEPTER' | 'REJETER'; commentaire?: string },
  ) {
    return request<PurchaseRequest>(`/chef-labo/demandes-achat/${purchaseId}/decision`, {
      method: 'PATCH',
      token,
      body: payload,
    });
  },
  updatePurchaseStatus(
    token: string,
    purchaseId: number,
    payload: { statut: string; commentaire?: string; dateLivraison?: string },
  ) {
    return request<PurchaseRequest>(`/chef-labo/demandes-achat/${purchaseId}/statut`, {
      method: 'PATCH',
      token,
      body: payload,
    });
  },
  listNotifications(token: string, query?: RequestOptions['query']) {
    return request<{
      elements: NotificationItem[];
      unreadCount: number;
      meta: PaginationMeta;
    }>('/membre/notifications', {
      token,
      query,
    });
  },
  markNotificationRead(token: string, notificationId: number) {
    return request<{ id: number; estLue: boolean }>(
      `/membre/notifications/${notificationId}/lire`,
      {
      method: 'PATCH',
      token,
      },
    );
  },
  markAllNotificationsRead(token: string) {
    return request<{ updatedCount: number }>('/membre/notifications/lire-toutes', {
      method: 'PATCH',
      token,
    });
  },
  getNotificationPreferences(token: string) {
    return request<NotificationPreferences>('/membre/notifications/preferences', {
      token,
    });
  },
  updateNotificationPreferences(
    token: string,
    payload: Partial<NotificationPreferences>,
  ) {
    return request<NotificationPreferences>('/membre/notifications/preferences', {
      method: 'PUT',
      token,
      body: payload,
    });
  },
  listAdminNotifications(token: string, query?: RequestOptions['query']) {
    return request<{
      elements: NotificationItem[];
      unreadCount: number;
      meta: PaginationMeta;
    }>('/admin/notifications', {
      token,
      query: normalizeAdminNotificationsQuery(query),
    });
  },
  getAdminUnreadNotificationsCount(token: string) {
    return request<{ unreadCount: number }>('/admin/notifications/unread-count', {
      token,
    });
  },
  markAdminNotificationRead(token: string, notificationId: number) {
    return request<{ id: number; estLue: boolean }>(
      `/admin/notifications/${notificationId}/read`,
      {
      method: 'PATCH',
      token,
      },
    );
  },
  markAllAdminNotificationsRead(token: string) {
    return request<{ updatedCount: number }>('/admin/notifications/read-all', {
      method: 'PATCH',
      token,
    });
  },
  getAdminProfile(token: string) {
    return request<AdminProfileSettings>('/admin/profile', {
      token,
    });
  },
  updateAdminProfile(
    token: string,
    payload: { nomComplet: string; emailInstitutionnel: string },
  ) {
    return request<AdminProfileSettings>('/admin/profile', {
      method: 'PATCH',
      token,
      body: payload,
    });
  },
  updateAdminPassword(token: string, payload: AdminPasswordUpdatePayload) {
    return request<{ updated: boolean }>('/admin/password', {
      method: 'PATCH',
      token,
      body: payload,
    });
  },
  getAdminPreferences(token: string) {
    return request<NotificationPreferences>('/admin/preferences', {
      token,
    });
  },
  updateAdminPreferences(
    token: string,
    payload: Partial<NotificationPreferences>,
  ) {
    return request<NotificationPreferences>('/admin/preferences', {
      method: 'PATCH',
      token,
      body: payload,
    });
  },
  // Compatibility aliases for existing call-sites.
  getAdminNotificationPreferences(token: string) {
    return request<NotificationPreferences>('/admin/preferences', {
      token,
    });
  },
  updateAdminNotificationPreferences(
    token: string,
    payload: Partial<NotificationPreferences>,
  ) {
    return request<NotificationPreferences>('/admin/preferences', {
      method: 'PATCH',
      token,
      body: payload,
    });
  },

  getMyAccessContext(token: string) {
    return request<UserAccessContext>('/access/context/me', {
      token,
    });
  },

  getAdminUserAccessSummary(token: string) {
    return request<UserAccessSummaryResponse>('/admin/user-access/summary', {
      token,
    });
  },

  listAdminUserAccessUsers(token: string, query?: RequestOptions['query']) {
    return request<UserAccessUsersListResponse>('/admin/user-access/users', {
      token,
      query: normalizeAccessControlQuery(query),
    });
  },

  getAdminUserAccessContextV2(token: string, userId: string) {
    return request<UserAccessContext>(`/admin/user-access/users/${userId}`, {
      token,
    });
  },

  updateAdminUserAccess(
    token: string,
    userId: string,
    payload: {
      replace?: boolean;
      resetToDefault?: boolean;
      defaultLandingPage?: string | null;
      moduleOverrides?: Array<{ moduleKey: string; value: boolean; reason?: string }>;
      permissionOverrides?: Array<{ permissionKey: string; value: boolean; reason?: string }>;
      widgetOverrides?: Array<{ widgetKey: string; value: boolean; reason?: string }>;
    },
  ) {
    return request<UserAccessContext>(`/admin/user-access/users/${userId}`, {
      method: 'PATCH',
      token,
      body: payload,
    });
  },

  resetAdminUserAccess(token: string, userId: string) {
    return request<UserAccessContext>(`/admin/user-access/users/${userId}/reset`, {
      method: 'POST',
      token,
    });
  },

  listAdminAccessProfiles(token: string, query?: RequestOptions['query']) {
    return request<AccessProfilesListResponse>('/admin/access-profiles', {
      token,
      query: normalizeAccessControlQuery(query),
    });
  },

  createAdminAccessProfile(
    token: string,
    payload: {
      name: string;
      description?: string;
      roleParent: Role;
      isActive?: boolean;
      defaultLandingPage?: string;
      allowedLanguages?: Array<'fr' | 'en' | 'ar'>;
      defaultLanguage?: 'fr' | 'en' | 'ar';
      rtlArabic?: boolean;
      modules?: Array<{ moduleKey: string; isVisible: boolean }>;
      permissions?: Array<{ permissionKey: string; isAllowed: boolean }>;
      widgets?: Array<{ widgetKey: string; isVisible: boolean }>;
    },
  ) {
    return request<AccessProfileDetail>('/admin/access-profiles', {
      method: 'POST',
      token,
      body: payload,
    });
  },

  getAdminAccessProfileDetail(token: string, profileId: number) {
    return request<AccessProfileDetail>(`/admin/access-profiles/${profileId}`, {
      token,
    });
  },

  updateAdminAccessProfile(
    token: string,
    profileId: number,
    payload: {
      name?: string;
      description?: string;
      roleParent?: Role;
      isActive?: boolean;
      defaultLandingPage?: string;
      allowedLanguages?: Array<'fr' | 'en' | 'ar'>;
      defaultLanguage?: 'fr' | 'en' | 'ar';
      rtlArabic?: boolean;
      modules?: Array<{ moduleKey: string; isVisible: boolean }>;
      permissions?: Array<{ permissionKey: string; isAllowed: boolean }>;
      widgets?: Array<{ widgetKey: string; isVisible: boolean }>;
    },
  ) {
    return request<AccessProfileDetail>(`/admin/access-profiles/${profileId}`, {
      method: 'PATCH',
      token,
      body: payload,
    });
  },

  duplicateAdminAccessProfile(token: string, profileId: number) {
    return request<AccessProfileDetail>(`/admin/access-profiles/${profileId}/duplicate`, {
      method: 'POST',
      token,
    });
  },

  updateAdminAccessProfileStatus(
    token: string,
    profileId: number,
    payload: { isActive: boolean },
  ) {
    return request<AccessProfileDetail>(`/admin/access-profiles/${profileId}/status`, {
      method: 'PATCH',
      token,
      body: payload,
    });
  },

  listAdminAccessProfileUsers(
    token: string,
    profileId: number,
    query?: RequestOptions['query'],
  ) {
    return request<AccessProfileUsersResponse>(`/admin/access-profiles/${profileId}/users`, {
      token,
      query: normalizeAccessControlQuery(query),
    });
  },

  assignAdminUserAccessProfile(
    token: string,
    userId: string,
    payload: { profileId: number },
  ) {
    return request<UserAccessContext>(`/admin/users/${userId}/access-profile`, {
      method: 'POST',
      token,
      body: payload,
    });
  },

  getAdminUserAccessContext(token: string, userId: string) {
    return request<UserAccessContext>(`/admin/users/${userId}/access-context`, {
      token,
    });
  },

  updateAdminUserAccessOverrides(
    token: string,
    userId: string,
    payload: {
      replace?: boolean;
      moduleOverrides?: Array<{ moduleKey: string; value: boolean; reason?: string }>;
      permissionOverrides?: Array<{ permissionKey: string; value: boolean; reason?: string }>;
      widgetOverrides?: Array<{ widgetKey: string; value: boolean; reason?: string }>;
    },
  ) {
    return request<UserAccessContext>(`/admin/users/${userId}/access-overrides`, {
      method: 'PATCH',
      token,
      body: payload,
    });
  },

  previewAdminAccessProfile(token: string, profileId: number) {
    return request<AccessPreviewProfileResponse>(`/admin/access-preview/profile/${profileId}`, {
      token,
    });
  },

  previewAdminAccessUser(token: string, userId: string) {
    return request<UserAccessContext>(`/admin/access-preview/user/${userId}`, {
      token,
    });
  },

  getAdminSupportTicketAccessContext(token: string, ticketId: number) {
    return request<SupportTicketAccessDiagnostic>(
      `/admin/support/tickets/${ticketId}/access-context`,
      {
        token,
      },
    );
  },

  resolveAdminSupportTicketAccess(
    token: string,
    ticketId: number,
    payload: {
      replace?: boolean;
      resetToDefault?: boolean;
      defaultLandingPage?: string | null;
      moduleOverrides?: Array<{ moduleKey: string; value: boolean; reason?: string }>;
      permissionOverrides?: Array<{ permissionKey: string; value: boolean; reason?: string }>;
      widgetOverrides?: Array<{ widgetKey: string; value: boolean; reason?: string }>;
      notes?: string;
      responseMessage?: string;
      closeTicket?: boolean;
    },
  ) {
    return request<SupportTicketAccessDiagnostic>(
      `/admin/support/tickets/${ticketId}/access-resolution`,
      {
        method: 'PATCH',
        token,
        body: payload,
      },
    );
  },

  createSupportTicket(
    token: string,
    payload:
      | FormData
      | {
          sujet: string;
          categorie:
            | 'LOGIN'
            | 'ACCOUNT'
            | 'ACCESS'
            | 'ROLE'
            | 'MODULE_VISIBILITY'
            | 'PERMISSION'
            | 'UI_BUG'
            | 'TRANSLATION'
            | 'MESSAGING'
            | 'NOTIFICATIONS'
            | 'ARTICLES'
            | 'SYSTEM'
            | 'OTHER';
          priorite?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
          description: string;
        },
  ) {
    return request<SupportTicketDetail>('/support/tickets', {
      method: 'POST',
      token,
      body: payload,
    });
  },

  listMySupportTickets(token: string, query?: RequestOptions['query']) {
    return request<{ elements: SupportTicketSummary[]; meta: PaginationMeta }>(
      '/support/tickets/my',
      {
        token,
        query: normalizeSupportTicketsQuery(query),
      },
    );
  },

  getMySupportTicketDetail(token: string, ticketId: number) {
    return request<SupportTicketDetail>(`/support/tickets/${ticketId}`, {
      token,
    });
  },

  createSupportTicketReply(
    token: string,
    ticketId: number,
    payload: FormData | { message?: string; rouvrirTicket?: boolean },
  ) {
    return request<SupportTicketDetail>(`/support/tickets/${ticketId}/replies`, {
      method: 'POST',
      token,
      body: payload,
    });
  },

  createAdminSupportTicketReply(
    token: string,
    ticketId: number,
    payload: FormData | { message?: string; estNoteInterne?: boolean },
  ) {
    return request<SupportTicketDetail>(`/admin/support/tickets/${ticketId}/replies`, {
      method: 'POST',
      token,
      body: payload,
    });
  },

  uploadSupportTicketAttachment(token: string, ticketId: number, file: File) {
    const formData = new FormData();
    formData.set('pieceJointe', file);

    return request<SupportAttachment>(`/support/tickets/${ticketId}/attachments`, {
      method: 'POST',
      token,
      body: formData,
    });
  },

  downloadSupportAttachment(token: string, attachmentId: number) {
    return downloadProtectedFile(`/support/attachments/${attachmentId}`, token);
  },

  listAdminSupportTickets(token: string, query?: RequestOptions['query']) {
    return request<{ elements: SupportTicketSummary[]; meta: PaginationMeta }>(
      '/admin/support/tickets',
      {
        token,
        query: normalizeSupportTicketsQuery(query),
      },
    );
  },

  getAdminSupportTicketDetail(token: string, ticketId: number) {
    return request<SupportTicketDetail>(`/admin/support/tickets/${ticketId}`, {
      token,
    });
  },

  updateAdminSupportTicketStatus(
    token: string,
    ticketId: number,
    payload: { statut: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' },
  ) {
    return request<SupportTicketDetail>(`/admin/support/tickets/${ticketId}/status`, {
      method: 'PATCH',
      token,
      body: payload,
    });
  },

  assignAdminSupportTicket(
    token: string,
    ticketId: number,
    payload: { adminId?: string },
  ) {
    return request<SupportTicketDetail>(`/admin/support/tickets/${ticketId}/assign`, {
      method: 'PATCH',
      token,
      body: payload,
    });
  },

  getAdminSupportStats(token: string) {
    return request<SupportTicketStats>('/admin/support/stats', {
      token,
    });
  },
};
