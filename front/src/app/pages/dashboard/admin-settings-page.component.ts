import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import type {
  AdminPasswordUpdatePayload,
  NotificationPreferences,
} from '../../core/models/models';
import { api } from '../../core/services/api';
import { AuthService } from '../../core/services/auth.service';
import { SitePreferencesService } from '../../core/services/site-preferences.service';
import { sharedIcons } from '../../shared/lucide-icons';
import { RoleService } from '../../shared/services/role.service';

@Component({
  selector: 'app-admin-settings-page',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-7">
      <div class="app-page-header">
        <div class="space-y-1.5">
          <h2 class="app-page-title">{{ site.localize(pageTitle) }}</h2>
          <p class="app-page-description">
            {{ site.localize(pageDescription) }}
          </p>
        </div>
      </div>

      @if (loadingPage()) {
        <div class="surface-card rounded-2xl border border-border bg-muted/20 px-5 py-10 text-center text-sm text-muted-foreground">
          {{ site.localize(loadingLabel) }}
        </div>
      } @else {
        <div class="grid gap-6 xl:grid-cols-2">
          <form class="surface-card p-6 lg:p-7" #profileForm="ngForm" (ngSubmit)="saveProfile()">
            <div class="flex items-start gap-3 border-b border-border/70 pb-4">
              <span class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                <lucide-icon [img]="icons.UserCircle2" class="h-4 w-4"></lucide-icon>
              </span>
              <div>
                <h3 class="text-lg font-semibold text-foreground">{{ site.localize(profileCardTitle) }}</h3>
                <p class="text-sm text-muted-foreground">
                  {{ site.localize(profileCardDescription) }}
                </p>
              </div>
            </div>

            <div class="mt-5 grid gap-4">
              <label class="block space-y-2">
                <span class="text-sm font-semibold text-foreground">{{ site.localize(fullNameLabel) }}</span>
                <input
                  type="text"
                  class="input-shell h-11"
                  name="nomComplet"
                  [(ngModel)]="profile.nomComplet"
                  required
                  maxlength="180"
                  autocomplete="name"
                  [disabled]="loadingPage() || savingProfile()"
                />
              </label>

              <label class="block space-y-2">
                <span class="text-sm font-semibold text-foreground">{{ site.localize(institutionalEmailLabel) }}</span>
                <input
                  type="email"
                  class="input-shell h-11"
                  name="emailInstitutionnel"
                  [(ngModel)]="profile.emailInstitutionnel"
                  required
                  maxlength="190"
                  autocomplete="email"
                  [disabled]="loadingPage() || savingProfile()"
                />
              </label>
            </div>

            @if (profileMessage()) {
              <div class="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {{ profileMessage() }}
              </div>
            }
            @if (profileError()) {
              <div class="mt-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {{ profileError() }}
              </div>
            }

            <div class="mt-5 flex justify-end">
              <button
                type="submit"
                class="btn-secondary min-w-[13rem]"
                [disabled]="loadingPage() || savingProfile() || profileForm.invalid"
              >
                {{ savingProfile() ? site.localize(savingLabel) : site.localize(saveProfileLabel) }}
              </button>
            </div>
          </form>

          <form class="surface-card p-6 lg:p-7" #passwordForm="ngForm" (ngSubmit)="savePassword()">
            <div class="flex items-start gap-3 border-b border-border/70 pb-4">
              <span class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <lucide-icon [img]="icons.Lock" class="h-4 w-4"></lucide-icon>
              </span>
              <div>
                <h3 class="text-lg font-semibold text-foreground">{{ site.localize(securityCardTitle) }}</h3>
                <p class="text-sm text-muted-foreground">
                  {{ site.localize(securityCardDescription) }}
                </p>
              </div>
            </div>

            <div class="mt-5 grid gap-4">
              <label class="block space-y-2">
                <span class="text-sm font-semibold text-foreground">{{ site.localize(currentPasswordLabel) }}</span>
                <input
                  type="password"
                  class="input-shell h-11"
                  name="motDePasseActuel"
                  [(ngModel)]="passwordPayload.motDePasseActuel"
                  required
                  maxlength="255"
                  autocomplete="current-password"
                  [disabled]="loadingPage() || savingPassword()"
                />
              </label>

              <label class="block space-y-2">
                <span class="text-sm font-semibold text-foreground">{{ site.localize(newPasswordLabel) }}</span>
                <input
                  type="password"
                  class="input-shell h-11"
                  name="nouveauMotDePasse"
                  [(ngModel)]="passwordPayload.nouveauMotDePasse"
                  required
                  minlength="8"
                  maxlength="255"
                  autocomplete="new-password"
                  [disabled]="loadingPage() || savingPassword()"
                />
              </label>

              <label class="block space-y-2">
                <span class="text-sm font-semibold text-foreground">{{ site.localize(confirmPasswordLabel) }}</span>
                <input
                  type="password"
                  class="input-shell h-11"
                  name="confirmationMotDePasse"
                  [(ngModel)]="passwordPayload.confirmationMotDePasse"
                  required
                  minlength="8"
                  maxlength="255"
                  autocomplete="new-password"
                  [disabled]="loadingPage() || savingPassword()"
                />
              </label>
            </div>

            @if (passwordMessage()) {
              <div class="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {{ passwordMessage() }}
              </div>
            }
            @if (passwordError()) {
              <div class="mt-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {{ passwordError() }}
              </div>
            }

            <div class="mt-5 flex justify-end">
              <button
                type="submit"
                class="btn-secondary min-w-[15.5rem]"
                [disabled]="loadingPage() || savingPassword() || passwordForm.invalid"
              >
                {{ savingPassword() ? site.localize(updatingLabel) : site.localize(updatePasswordLabel) }}
              </button>
            </div>
          </form>
        </div>

        <form class="surface-card p-6 lg:p-7" (ngSubmit)="savePreferences()">
          <div class="flex items-start gap-3 border-b border-border/70 pb-4">
            <span class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <lucide-icon [img]="icons.Bell" class="h-4 w-4"></lucide-icon>
            </span>
            <div>
              <h3 class="text-lg font-semibold text-foreground">{{ site.localize(notificationPrefsTitle) }}</h3>
              <p class="text-sm text-muted-foreground">
                {{ site.localize(notificationPrefsDescription) }}
              </p>
            </div>
          </div>

          <div class="mt-5 grid gap-3 md:grid-cols-2">
            <label class="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3.5 text-sm transition hover:border-primary/20">
              <div class="space-y-0.5">
                <span class="text-sm font-semibold text-foreground">{{ site.localize(appChannelLabel) }}</span>
                <p class="text-xs text-muted-foreground">{{ site.localize(appChannelDescription) }}</p>
              </div>
              <input
                type="checkbox"
                name="canalApplication"
                [(ngModel)]="preferences.canalApplication"
                [disabled]="loadingPage() || savingPreferences()"
                class="h-5 w-5 rounded border-border text-primary focus:ring-primary/20"
              />
            </label>

            <label class="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3.5 text-sm transition hover:border-primary/20">
              <div class="space-y-0.5">
                <span class="text-sm font-semibold text-foreground">{{ site.localize(emailChannelLabel) }}</span>
                <p class="text-xs text-muted-foreground">{{ site.localize(emailChannelDescription) }}</p>
              </div>
              <input
                type="checkbox"
                name="canalEmail"
                [(ngModel)]="preferences.canalEmail"
                [disabled]="loadingPage() || savingPreferences()"
                class="h-5 w-5 rounded border-border text-primary focus:ring-primary/20"
              />
            </label>

            <label class="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3.5 text-sm transition hover:border-primary/20">
              <div class="space-y-0.5">
                <span class="text-sm font-semibold text-foreground">{{ site.localize(accountsAlertsLabel) }}</span>
                <p class="text-xs text-muted-foreground">{{ site.localize(accountsAlertsDescription) }}</p>
              </div>
              <input
                type="checkbox"
                name="notifComptes"
                [(ngModel)]="preferences.notifComptes"
                [disabled]="loadingPage() || savingPreferences()"
                class="h-5 w-5 rounded border-border text-primary focus:ring-primary/20"
              />
            </label>

            <label class="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3.5 text-sm transition hover:border-primary/20">
              <div class="space-y-0.5">
                <span class="text-sm font-semibold text-foreground">{{ site.localize(messagesAlertsLabel) }}</span>
                <p class="text-xs text-muted-foreground">{{ site.localize(messagesAlertsDescription) }}</p>
              </div>
              <input
                type="checkbox"
                name="notifMessages"
                [(ngModel)]="preferences.notifMessages"
                [disabled]="loadingPage() || savingPreferences()"
                class="h-5 w-5 rounded border-border text-primary focus:ring-primary/20"
              />
            </label>
          </div>

          @if (preferencesMessage()) {
            <div class="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {{ preferencesMessage() }}
            </div>
          }
          @if (preferencesError()) {
            <div class="mt-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {{ preferencesError() }}
            </div>
          }

          <div class="mt-5 flex justify-end">
            <button
              type="submit"
              class="btn-secondary min-w-[16rem]"
              [disabled]="loadingPage() || savingPreferences()"
            >
              {{ savingPreferences() ? site.localize(savingLabel) : site.localize(savePreferencesLabel) }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
})
export class AdminSettingsPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly site = inject(SitePreferencesService);
  readonly roleService = inject(RoleService);
  readonly router = inject(Router);
  readonly icons = sharedIcons;

  readonly isAdmin = computed(() => this.roleService.isAdmin());
  readonly loadingPage = signal(false);
  readonly savingProfile = signal(false);
  readonly savingPassword = signal(false);
  readonly savingPreferences = signal(false);

  readonly profileMessage = signal('');
  readonly profileError = signal('');
  readonly passwordMessage = signal('');
  readonly passwordError = signal('');
  readonly preferencesMessage = signal('');
  readonly preferencesError = signal('');
  readonly pageTitle = {
    fr: 'Parametres administrateur',
    en: 'Admin settings',
    ar: 'إعدادات الإدارة',
  };
  readonly pageDescription = {
    fr: 'Gerer votre profil, la securite du compte et les preferences de notification.',
    en: 'Manage your profile, account security, and notification preferences.',
    ar: 'إدارة الملف الشخصي وأمان الحساب وتفضيلات الإشعارات.',
  };
  readonly loadingLabel = {
    fr: 'Chargement des parametres...',
    en: 'Loading settings...',
    ar: 'جار تحميل الإعدادات...',
  };
  readonly profileCardTitle = { fr: 'Profil', en: 'Profile', ar: 'الملف الشخصي' };
  readonly profileCardDescription = {
    fr: 'Informations de base du compte administrateur.',
    en: 'Basic information for the admin account.',
    ar: 'المعلومات الأساسية لحساب الإدارة.',
  };
  readonly fullNameLabel = { fr: 'Nom complet', en: 'Full name', ar: 'الاسم الكامل' };
  readonly institutionalEmailLabel = {
    fr: 'Email institutionnel',
    en: 'Institutional email',
    ar: 'البريد المؤسسي',
  };
  readonly securityCardTitle = { fr: 'Securite', en: 'Security', ar: 'الأمان' };
  readonly securityCardDescription = {
    fr: 'Mettez a jour le mot de passe avec verification immediate.',
    en: 'Update your password with immediate verification.',
    ar: 'حدّث كلمة المرور مع تحقق فوري.',
  };
  readonly currentPasswordLabel = {
    fr: 'Mot de passe actuel',
    en: 'Current password',
    ar: 'كلمة المرور الحالية',
  };
  readonly newPasswordLabel = {
    fr: 'Nouveau mot de passe',
    en: 'New password',
    ar: 'كلمة المرور الجديدة',
  };
  readonly confirmPasswordLabel = {
    fr: 'Confirmer le nouveau mot de passe',
    en: 'Confirm new password',
    ar: 'تأكيد كلمة المرور الجديدة',
  };
  readonly notificationPrefsTitle = {
    fr: 'Preferences de notifications',
    en: 'Notification preferences',
    ar: 'تفضيلات الإشعارات',
  };
  readonly notificationPrefsDescription = {
    fr: 'Configurez les alertes visibles dans votre espace administrateur.',
    en: 'Configure alerts visible in your admin workspace.',
    ar: 'اضبط التنبيهات الظاهرة في مساحة الإدارة.',
  };
  readonly appChannelLabel = {
    fr: 'Canal application',
    en: 'App channel',
    ar: 'قناة التطبيق',
  };
  readonly appChannelDescription = {
    fr: 'Notifications visibles dans le dashboard',
    en: 'Notifications visible in the dashboard',
    ar: 'إشعارات ظاهرة داخل لوحة التحكم',
  };
  readonly emailChannelLabel = {
    fr: 'Canal email',
    en: 'Email channel',
    ar: 'قناة البريد الإلكتروني',
  };
  readonly emailChannelDescription = {
    fr: 'Reception des alertes par email',
    en: 'Receive alerts by email',
    ar: 'استلام التنبيهات عبر البريد الإلكتروني',
  };
  readonly accountsAlertsLabel = {
    fr: 'Alertes comptes',
    en: 'Account alerts',
    ar: 'تنبيهات الحسابات',
  };
  readonly accountsAlertsDescription = {
    fr: 'Validation et statut des comptes utilisateurs',
    en: 'Validation and status changes for user accounts',
    ar: 'التحقق وتغييرات حالة حسابات المستخدمين',
  };
  readonly messagesAlertsLabel = {
    fr: 'Alertes messages',
    en: 'Message alerts',
    ar: 'تنبيهات الرسائل',
  };
  readonly messagesAlertsDescription = {
    fr: 'Nouveaux messages et conversations',
    en: 'New messages and conversations',
    ar: 'رسائل ومحادثات جديدة',
  };
  readonly savingLabel = {
    fr: 'Enregistrement...',
    en: 'Saving...',
    ar: 'جار الحفظ...',
  };
  readonly saveProfileLabel = {
    fr: 'Enregistrer le profil',
    en: 'Save profile',
    ar: 'حفظ الملف الشخصي',
  };
  readonly updatingLabel = {
    fr: 'Mise a jour...',
    en: 'Updating...',
    ar: 'جار التحديث...',
  };
  readonly updatePasswordLabel = {
    fr: 'Mettre a jour le mot de passe',
    en: 'Update password',
    ar: 'تحديث كلمة المرور',
  };
  readonly savePreferencesLabel = {
    fr: 'Enregistrer les preferences',
    en: 'Save preferences',
    ar: 'حفظ التفضيلات',
  };

  private initialProfile = {
    nomComplet: '',
    emailInstitutionnel: '',
  };

  private initialPreferences = {
    canalApplication: true,
    canalEmail: false,
    notifComptes: true,
    notifMessages: true,
  };

  profile = {
    nomComplet: '',
    emailInstitutionnel: '',
  };

  passwordPayload: AdminPasswordUpdatePayload = {
    motDePasseActuel: '',
    nouveauMotDePasse: '',
    confirmationMotDePasse: '',
  };

  preferences: NotificationPreferences = {
    canalApplication: true,
    canalEmail: false,
    notifComptes: true,
    notifArticles: true,
    notifMessages: true,
    notifProjets: true,
    notifDemandesAchat: true,
    notifLivraisons: true,
    creeLe: '',
    modifieLe: '',
  };

  async ngOnInit() {
    if (!this.isAdmin()) {
      await this.router.navigateByUrl('/dashboard');
      return;
    }

    await this.loadData();
  }

  async loadData() {
    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }

    this.loadingPage.set(true);
    this.profileError.set('');
    this.passwordError.set('');
    this.preferencesError.set('');

    try {
      const [profile, preferences] = await Promise.all([
        api.getAdminProfile(token),
        api.getAdminPreferences(token),
      ]);

      this.profile = {
        nomComplet: profile.nomComplet,
        emailInstitutionnel: profile.emailInstitutionnel,
      };
      this.preferences = {
        ...this.preferences,
        ...preferences,
      };
      this.initialProfile = this.snapshotProfile(this.profile);
      this.initialPreferences = this.snapshotPreferences(this.preferences);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Chargement impossible.',
              en: 'Unable to load settings.',
              ar: 'تعذر تحميل الإعدادات.',
            });
      this.profileError.set(message);
      this.preferencesError.set(message);
    } finally {
      this.loadingPage.set(false);
    }
  }

  async saveProfile() {
    if (this.loadingPage() || this.savingProfile()) {
      return;
    }

    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }

    this.profileError.set('');
    this.profileMessage.set('');

    const nomComplet = this.profile.nomComplet.trim();
    const emailInstitutionnel = this.profile.emailInstitutionnel
      .trim()
      .toLowerCase();

    if (!nomComplet || !emailInstitutionnel) {
      this.profileError.set(
        this.site.localize({
          fr: 'Nom complet et email institutionnel sont obligatoires.',
          en: 'Full name and institutional email are required.',
          ar: 'الاسم الكامل والبريد المؤسسي مطلوبان.',
        }),
      );
      return;
    }

    if (!this.isValidInstitutionalEmail(emailInstitutionnel)) {
      this.profileError.set(
        this.site.localize({
          fr: 'Format de l\'email institutionnel invalide.',
          en: 'Invalid institutional email format.',
          ar: 'تنسيق البريد المؤسسي غير صالح.',
        }),
      );
      return;
    }

    if (!this.hasProfileChanges({ nomComplet, emailInstitutionnel })) {
      this.profileMessage.set(
        this.site.localize({
          fr: 'Aucune modification detectee.',
          en: 'No changes detected.',
          ar: 'لم يتم اكتشاف أي تغييرات.',
        }),
      );
      return;
    }

    this.savingProfile.set(true);

    try {
      const updated = await api.updateAdminProfile(token, {
        nomComplet,
        emailInstitutionnel,
      });

      this.profile = {
        nomComplet: updated.nomComplet,
        emailInstitutionnel: updated.emailInstitutionnel,
      };
      this.initialProfile = this.snapshotProfile(this.profile);

      try {
        await this.auth.refreshProfile();
      } catch {
        // Keep success state for settings even if profile refresh fails.
      }
      this.profileMessage.set(
        this.site.localize({
          fr: 'Profil mis a jour avec succes.',
          en: 'Profile updated successfully.',
          ar: 'تم تحديث الملف الشخصي بنجاح.',
        }),
      );
    } catch (error) {
      this.profileError.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Mise a jour impossible.',
              en: 'Update failed.',
              ar: 'فشل التحديث.',
            }),
      );
    } finally {
      this.savingProfile.set(false);
    }
  }

  async savePassword() {
    if (this.loadingPage() || this.savingPassword()) {
      return;
    }

    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }

    this.passwordError.set('');
    this.passwordMessage.set('');

    const motDePasseActuel = this.passwordPayload.motDePasseActuel.trim();
    const nouveauMotDePasse = this.passwordPayload.nouveauMotDePasse.trim();
    const confirmationMotDePasse = this.passwordPayload.confirmationMotDePasse.trim();

    if (!motDePasseActuel) {
      this.passwordError.set(
        this.site.localize({
          fr: 'Le mot de passe actuel est obligatoire.',
          en: 'Current password is required.',
          ar: 'كلمة المرور الحالية مطلوبة.',
        }),
      );
      return;
    }

    if (nouveauMotDePasse.length < 8) {
      this.passwordError.set(
        this.site.localize({
          fr: 'Le nouveau mot de passe doit contenir au moins 8 caracteres.',
          en: 'The new password must contain at least 8 characters.',
          ar: 'يجب أن تحتوي كلمة المرور الجديدة على 8 أحرف على الأقل.',
        }),
      );
      return;
    }

    if (nouveauMotDePasse === motDePasseActuel) {
      this.passwordError.set(
        this.site.localize({
          fr: 'Le nouveau mot de passe doit etre different de l\'ancien.',
          en: 'The new password must be different from the current one.',
          ar: 'يجب أن تكون كلمة المرور الجديدة مختلفة عن الحالية.',
        }),
      );
      return;
    }

    if (nouveauMotDePasse !== confirmationMotDePasse) {
      this.passwordError.set(
        this.site.localize({
          fr: 'La confirmation du nouveau mot de passe est invalide.',
          en: 'New password confirmation is invalid.',
          ar: 'تأكيد كلمة المرور الجديدة غير صحيح.',
        }),
      );
      return;
    }

    this.savingPassword.set(true);

    try {
      await api.updateAdminPassword(token, {
        motDePasseActuel,
        nouveauMotDePasse,
        confirmationMotDePasse,
      });
      this.passwordPayload = {
        motDePasseActuel: '',
        nouveauMotDePasse: '',
        confirmationMotDePasse: '',
      };
      this.passwordMessage.set(
        this.site.localize({
          fr: 'Mot de passe mis a jour avec succes.',
          en: 'Password updated successfully.',
          ar: 'تم تحديث كلمة المرور بنجاح.',
        }),
      );
    } catch (error) {
      this.passwordError.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Mise a jour impossible.',
              en: 'Update failed.',
              ar: 'فشل التحديث.',
            }),
      );
    } finally {
      this.savingPassword.set(false);
    }
  }

  async savePreferences() {
    if (this.loadingPage() || this.savingPreferences()) {
      return;
    }

    const token = this.auth.session()?.accessToken;
    if (!token) {
      return;
    }

    this.preferencesError.set('');
    this.preferencesMessage.set('');

    const payload = this.getPreferencesPayload();
    if (!this.hasPreferencesChanges(payload)) {
      this.preferencesMessage.set(
        this.site.localize({
          fr: 'Aucune modification detectee.',
          en: 'No changes detected.',
          ar: 'لم يتم اكتشاف أي تغييرات.',
        }),
      );
      return;
    }

    this.savingPreferences.set(true);

    try {
      this.preferences = await api.updateAdminPreferences(token, payload);
      this.initialPreferences = this.snapshotPreferences(this.preferences);
      this.preferencesMessage.set(
        this.site.localize({
          fr: 'Preferences enregistrees.',
          en: 'Preferences saved.',
          ar: 'تم حفظ التفضيلات.',
        }),
      );
    } catch (error) {
      this.preferencesError.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Enregistrement impossible.',
              en: 'Unable to save preferences.',
              ar: 'تعذر حفظ التفضيلات.',
            }),
      );
    } finally {
      this.savingPreferences.set(false);
    }
  }

  private snapshotProfile(profile: { nomComplet: string; emailInstitutionnel: string }) {
    return {
      nomComplet: profile.nomComplet.trim(),
      emailInstitutionnel: profile.emailInstitutionnel.trim().toLowerCase(),
    };
  }

  private snapshotPreferences(preferences: NotificationPreferences) {
    return {
      canalApplication: Boolean(preferences.canalApplication),
      canalEmail: Boolean(preferences.canalEmail),
      notifComptes: Boolean(preferences.notifComptes),
      notifMessages: Boolean(preferences.notifMessages),
    };
  }

  private hasProfileChanges(nextProfile: { nomComplet: string; emailInstitutionnel: string }) {
    const snapshot = this.snapshotProfile(nextProfile);
    return (
      snapshot.nomComplet !== this.initialProfile.nomComplet ||
      snapshot.emailInstitutionnel !== this.initialProfile.emailInstitutionnel
    );
  }

  private hasPreferencesChanges(next: {
    canalApplication: boolean;
    canalEmail: boolean;
    notifComptes: boolean;
    notifMessages: boolean;
  }) {
    return (
      next.canalApplication !== this.initialPreferences.canalApplication ||
      next.canalEmail !== this.initialPreferences.canalEmail ||
      next.notifComptes !== this.initialPreferences.notifComptes ||
      next.notifMessages !== this.initialPreferences.notifMessages
    );
  }

  private getPreferencesPayload() {
    return {
      canalApplication: Boolean(this.preferences.canalApplication),
      canalEmail: Boolean(this.preferences.canalEmail),
      notifComptes: Boolean(this.preferences.notifComptes),
      notifMessages: Boolean(this.preferences.notifMessages),
    };
  }

  private isValidInstitutionalEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
