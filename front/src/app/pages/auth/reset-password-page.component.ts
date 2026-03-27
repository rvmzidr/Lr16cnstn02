import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { api } from '../../core/services/api';
import { SitePreferencesService } from '../../core/services/site-preferences.service';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="page-shell py-8 lg:py-10">
      <div class="auth-shell">
        <div class="auth-panel">
          <div class="tag-chip">{{ site.localize(newPasswordTag) }}</div>
          <h1 class="mt-5 text-4xl font-semibold text-foreground lg:text-5xl">
            {{ site.localize(resetTitle) }}
          </h1>
          <p class="mt-4 max-w-2xl text-base text-muted-foreground lg:text-lg">
            {{ site.localize(resetIntro) }}
          </p>

          <form class="mt-8 space-y-5" (ngSubmit)="submit()">
            <div>
              <label class="mb-2 block">{{
                site.localize(newPasswordLabel)
              }}</label>
              <input
                [(ngModel)]="nouveauMotDePasse"
                name="nouveauMotDePasse"
                type="password"
                class="input-shell"
                required
              />
            </div>
            <div>
              <label class="mb-2 block">{{
                site.localize(confirmationLabel)
              }}</label>
              <input
                [(ngModel)]="confirmationMotDePasse"
                name="confirmationMotDePasse"
                type="password"
                class="input-shell"
                required
              />
            </div>
            @if (successMessage()) {
              <div
                class="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-feedback-success"
              >
                {{ successMessage() }}
              </div>
            }
            @if (errorMessage()) {
              <div
                class="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-feedback-error"
              >
                {{ errorMessage() }}
              </div>
            }
            <button
              type="submit"
              class="btn-secondary w-full justify-center"
              [disabled]="isSubmitting()"
            >
              {{
                isSubmitting()
                  ? site.localize(savingLabel)
                  : site.localize(updateLabel)
              }}
            </button>
          </form>

          <div class="mt-6 text-sm text-muted-foreground">
            <a
              routerLink="/connexion"
              class="transition hover:text-foreground"
              >{{ site.localize(backToLoginLabel) }}</a
            >
          </div>
        </div>

        <aside class="auth-aside p-6 lg:p-8">
          <div class="tag-chip border-white/10 bg-white/10 text-white">
            {{ site.localize(resetTag) }}
          </div>
          <h2 class="mt-6 text-3xl font-semibold text-white">
            {{ site.localize(asideTitle) }}
          </h2>
          <p class="mt-4 text-sm text-white/72">
            {{ site.localize(asideText) }}
          </p>

          <div class="mt-8 space-y-3">
            <div class="auth-aside__feature">
              <div class="text-sm font-semibold text-white">
                {{ site.localize(featureOneTitle) }}
              </div>
              <div class="mt-2 text-sm text-white/72">
                {{ site.localize(featureOneText) }}
              </div>
            </div>
            <div class="auth-aside__feature">
              <div class="text-sm font-semibold text-white">
                {{ site.localize(featureTwoTitle) }}
              </div>
              <div class="mt-2 text-sm text-white/72">
                {{ site.localize(featureTwoText) }}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  `,
})
export class ResetPasswordPageComponent {
  readonly route = inject(ActivatedRoute);
  readonly site = inject(SitePreferencesService);
  readonly isSubmitting = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  nouveauMotDePasse = '';
  confirmationMotDePasse = '';
  readonly newPasswordTag = {
    fr: 'Nouveau mot de passe',
    en: 'New password',
    ar: 'كلمة مرور جديدة',
  };
  readonly resetTitle = {
    fr: 'Réinitialiser le mot de passe',
    en: 'Reset password',
    ar: 'إعادة تعيين كلمة المرور',
  };
  readonly resetIntro = {
    fr: 'Définissez un nouveau mot de passe pour réactiver l accès à votre compte.',
    en: 'Set a new password to reactivate access to your account.',
    ar: 'عيّن كلمة مرور جديدة لإعادة تفعيل الوصول إلى حسابك.',
  };
  readonly newPasswordLabel = {
    fr: 'Nouveau mot de passe',
    en: 'New password',
    ar: 'كلمة مرور جديدة',
  };
  readonly confirmationLabel = {
    fr: 'Confirmation',
    en: 'Confirmation',
    ar: 'التأكيد',
  };
  readonly savingLabel = {
    fr: 'Enregistrement...',
    en: 'Saving...',
    ar: 'جار الحفظ...',
  };
  readonly updateLabel = { fr: 'Mettre à jour', en: 'Update', ar: 'تحديث' };
  readonly backToLoginLabel = {
    fr: 'Retour à la connexion',
    en: 'Back to sign in',
    ar: 'العودة إلى تسجيل الدخول',
  };
  readonly resetTag = {
    fr: 'Réinitialisation',
    en: 'Reset',
    ar: 'إعادة التعيين',
  };
  readonly asideTitle = {
    fr: 'Retour rapide à l espace membre',
    en: 'Quick return to member area',
    ar: 'عودة سريعة إلى فضاء الأعضاء',
  };
  readonly asideText = {
    fr: 'Le token de réinitialisation existant est conservé. La refonte se limite à l interface et au confort de saisie.',
    en: 'The existing reset token is preserved. The redesign is limited to interface and input comfort.',
    ar: 'يتم الحفاظ على رمز إعادة التعيين الحالي. يقتصر التحديث على الواجهة وتجربة الإدخال.',
  };
  readonly featureOneTitle = {
    fr: 'Validation immédiate',
    en: 'Immediate validation',
    ar: 'تحقق فوري',
  };
  readonly featureOneText = {
    fr: 'Le formulaire garde la même logique de confirmation du mot de passe.',
    en: 'The form keeps the same password confirmation logic.',
    ar: 'يحافظ النموذج على نفس منطق تأكيد كلمة المرور.',
  };
  readonly featureTwoTitle = {
    fr: 'Retour au tableau de bord',
    en: 'Back to dashboard',
    ar: 'العودة إلى لوحة التحكم',
  };
  readonly featureTwoText = {
    fr: 'Une fois le mot de passe mis à jour, le membre retrouve son flux habituel de connexion.',
    en: 'Once the password is updated, the member returns to the usual sign-in flow.',
    ar: 'بعد تحديث كلمة المرور، يستعيد العضو مسار الدخول المعتاد.',
  };

  async submit() {
    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    try {
      await api.resetPassword({
        token: this.route.snapshot.queryParamMap.get('token') || '',
        nouveauMotDePasse: this.nouveauMotDePasse,
        confirmationMotDePasse: this.confirmationMotDePasse,
      });
      this.successMessage.set(
        this.site.localize({
          fr: 'Mot de passe mis à jour avec succès.',
          en: 'Password updated successfully.',
          ar: 'تم تحديث كلمة المرور بنجاح.',
        }),
      );
      this.nouveauMotDePasse = '';
      this.confirmationMotDePasse = '';
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Erreur lors de la réinitialisation.',
              en: 'Error during reset.',
              ar: 'حدث خطأ أثناء إعادة التعيين.',
            }),
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
