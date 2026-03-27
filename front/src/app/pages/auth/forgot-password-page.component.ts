import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { api } from '../../core/services/api';
import { SitePreferencesService } from '../../core/services/site-preferences.service';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="page-shell py-8 lg:py-10">
      <div class="auth-shell">
        <div class="auth-panel">
          <div class="tag-chip">{{ site.localize(accountSecurityLabel) }}</div>
          <h1 class="mt-5 text-4xl font-semibold text-foreground lg:text-5xl">
            {{ site.localize(forgotTitle) }}
          </h1>
          <p class="mt-4 max-w-2xl text-base text-muted-foreground lg:text-lg">
            {{ site.localize(forgotIntro) }}
          </p>

          <form class="mt-8 space-y-5" (ngSubmit)="submit()">
            <div>
              <label class="mb-2 block">{{
                site.localize(institutionalEmailLabel)
              }}</label>
              <input
                [(ngModel)]="emailInstitutionnel"
                name="emailInstitutionnel"
                type="email"
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
                  ? site.localize(sendingLabel)
                  : site.localize(sendLinkLabel)
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
            {{ site.localize(recoveryLabel) }}
          </div>
          <h2 class="mt-6 text-3xl font-semibold text-white">
            {{ site.localize(secureAccessTitle) }}
          </h2>
          <p class="mt-4 text-sm text-white/72">
            {{ site.localize(secureAccessText) }}
          </p>

          <div class="mt-8 space-y-3">
            <div class="auth-aside__feature">
              <div class="text-sm font-semibold text-white">
                {{ site.localize(institutionalEmailLabel) }}
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
export class ForgotPasswordPageComponent {
  readonly site = inject(SitePreferencesService);
  readonly isSubmitting = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  emailInstitutionnel = '';
  readonly accountSecurityLabel = {
    fr: 'Sécurité du compte',
    en: 'Account security',
    ar: 'أمان الحساب',
  };
  readonly forgotTitle = {
    fr: 'Mot de passe oublié',
    en: 'Forgot password',
    ar: 'نسيت كلمة المرور',
  };
  readonly forgotIntro = {
    fr: 'Saisissez votre email institutionnel pour générer un lien de réinitialisation.',
    en: 'Enter your institutional email to generate a reset link.',
    ar: 'أدخل بريدك المؤسسي لإنشاء رابط إعادة التعيين.',
  };
  readonly institutionalEmailLabel = {
    fr: 'Email institutionnel',
    en: 'Institutional email',
    ar: 'البريد المؤسسي',
  };
  readonly sendingLabel = {
    fr: 'Envoi...',
    en: 'Sending...',
    ar: 'جار الإرسال...',
  };
  readonly sendLinkLabel = {
    fr: 'Envoyer le lien',
    en: 'Send link',
    ar: 'إرسال الرابط',
  };
  readonly backToLoginLabel = {
    fr: 'Retour à la connexion',
    en: 'Back to sign in',
    ar: 'العودة إلى تسجيل الدخول',
  };
  readonly recoveryLabel = {
    fr: 'Récupération',
    en: 'Recovery',
    ar: 'الاسترجاع',
  };
  readonly secureAccessTitle = {
    fr: 'Contrôle d accès sécurisé',
    en: 'Secure access control',
    ar: 'تحكم وصول آمن',
  };
  readonly secureAccessText = {
    fr: 'Le flux de réinitialisation reste aligné sur la logique actuelle du backend sans changer les tokens ni les routes d authentification.',
    en: 'The reset flow stays aligned with current backend logic without changing tokens or authentication routes.',
    ar: 'يبقى مسار إعادة التعيين متوافقًا مع منطق الخلفية الحالي دون تغيير الرموز أو مسارات المصادقة.',
  };
  readonly featureOneText = {
    fr: 'Le lien de récupération est généré à partir de l adresse officielle du membre.',
    en: 'The recovery link is generated from the member official address.',
    ar: 'يتم إنشاء رابط الاسترجاع انطلاقًا من العنوان الرسمي للعضو.',
  };
  readonly featureTwoTitle = {
    fr: 'Flux Release 1',
    en: 'Release 1 flow',
    ar: 'مسار الإصدار 1',
  };
  readonly featureTwoText = {
    fr: 'Aucune nouvelle sémantique d authentification n est introduite dans cette refonte visuelle.',
    en: 'No new authentication semantics are introduced in this visual redesign.',
    ar: 'لا يتم إدخال أي تغييرات دلالية جديدة على المصادقة ضمن هذه الواجهة الجديدة.',
  };

  async submit() {
    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    try {
      const response = await api.forgotPassword({
        emailInstitutionnel: this.emailInstitutionnel,
      });
      this.successMessage.set(
        response.resetUrl ||
          this.site.localize({
            fr: 'Lien généré avec succès.',
            en: 'Link generated successfully.',
            ar: 'تم إنشاء الرابط بنجاح.',
          }),
      );
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : this.site.localize({
              fr: 'Erreur lors de la demande.',
              en: 'Error while processing request.',
              ar: 'حدث خطأ أثناء معالجة الطلب.',
            }),
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
