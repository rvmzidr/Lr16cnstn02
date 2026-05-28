import { Component, signal, inject, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Send, Bot, User, Sparkles } from 'lucide-angular';
import { api } from '../../core/services/api';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-intelligent-assistant-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="p-6 max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col animate-in fade-in zoom-in duration-500">
      
      <!-- Header -->
      <div class="flex items-center gap-4 pb-4 border-b border-border">
        <div class="p-2.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-sm">
          <svg class="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12.0001 0.400391L13.7937 8.21204C14.1834 9.90847 15.5186 11.2435 17.2151 11.6331L23.4001 12.0004L17.2151 12.3676C15.5186 12.7573 14.1834 14.0923 13.7937 15.7887L12.0001 23.6004L10.2065 15.7887C9.81677 14.0923 8.48166 12.7573 6.78523 12.3676L0.600098 12.0004L6.78523 11.6331C8.48166 11.2435 9.81677 9.90847 10.2065 8.21204L12.0001 0.400391Z" fill="currentColor"/>
          </svg>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            Assistant Intelligent
            <lucide-icon name="sparkles" class="w-5 h-5 text-accent"></lucide-icon>
          </h1>
          <p class="text-sm text-muted-foreground">Posez vos questions sur les articles et la plateforme</p>
        </div>
      </div>

      <!-- Chat Area -->
      <div class="flex-1 overflow-y-auto py-6 space-y-6 scroll-smooth" #chatScroll>
        
        <!-- Welcome Message -->
        <div class="flex gap-4 max-w-[85%]">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm">
            <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.0001 0.400391L13.7937 8.21204C14.1834 9.90847 15.5186 11.2435 17.2151 11.6331L23.4001 12.0004L17.2151 12.3676C15.5186 12.7573 14.1834 14.0923 13.7937 15.7887L12.0001 23.6004L10.2065 15.7887C9.81677 14.0923 8.48166 12.7573 6.78523 12.3676L0.600098 12.0004L6.78523 11.6331C8.48166 11.2435 9.81677 9.90847 10.2065 8.21204L12.0001 0.400391Z" fill="currentColor"/>
            </svg>
          </div>
          <div class="bg-card border border-border/50 rounded-2xl rounded-tl-sm p-4 shadow-sm text-card-foreground">
            <p>Bonjour ! Je suis votre assistant virtuel propulsé par l'IA. Comment puis-je vous aider aujourd'hui ?</p>
          </div>
        </div>

        <!-- Dynamic Messages -->
        <div *ngFor="let msg of messages()" class="flex gap-4 max-w-[85%]" [ngClass]="{'ml-auto flex-row-reverse': msg.role === 'user'}">
          <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm" 
               [ngClass]="msg.role === 'user' ? 'bg-accent text-accent-foreground' : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'">
            <lucide-icon *ngIf="msg.role === 'user'" name="user" class="w-6 h-6"></lucide-icon>
            <svg *ngIf="msg.role !== 'user'" class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.0001 0.400391L13.7937 8.21204C14.1834 9.90847 15.5186 11.2435 17.2151 11.6331L23.4001 12.0004L17.2151 12.3676C15.5186 12.7573 14.1834 14.0923 13.7937 15.7887L12.0001 23.6004L10.2065 15.7887C9.81677 14.0923 8.48166 12.7573 6.78523 12.3676L0.600098 12.0004L6.78523 11.6331C8.48166 11.2435 9.81677 9.90847 10.2065 8.21204L12.0001 0.400391Z" fill="currentColor"/>
            </svg>
          </div>
          <div class="p-4 shadow-sm"
               [ngClass]="msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm' 
                  : 'bg-card border border-border/50 text-card-foreground rounded-2xl rounded-tl-sm'">
            <p class="whitespace-pre-wrap">{{msg.content}}</p>
          </div>
        </div>

        <!-- Typing Indicator -->
        <div *ngIf="loading()" class="flex gap-4 max-w-[85%] animate-pulse">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm animate-pulse">
            <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.0001 0.400391L13.7937 8.21204C14.1834 9.90847 15.5186 11.2435 17.2151 11.6331L23.4001 12.0004L17.2151 12.3676C15.5186 12.7573 14.1834 14.0923 13.7937 15.7887L12.0001 23.6004L10.2065 15.7887C9.81677 14.0923 8.48166 12.7573 6.78523 12.3676L0.600098 12.0004L6.78523 11.6331C8.48166 11.2435 9.81677 9.90847 10.2065 8.21204L12.0001 0.400391Z" fill="currentColor"/>
            </svg>
          </div>
          <div class="bg-card border border-border/50 rounded-2xl rounded-tl-sm p-4 flex gap-1.5 items-center">
            <div class="w-2 h-2 rounded-full bg-primary/60 animate-bounce"></div>
            <div class="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style="animation-delay: 0.1s"></div>
            <div class="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style="animation-delay: 0.2s"></div>
          </div>
        </div>

      </div>

      <!-- Input Area -->
      <div class="pt-4 border-t border-border mt-auto">
        <div class="relative flex items-end gap-2 bg-card p-2 rounded-2xl border border-border focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-all shadow-sm">
          <textarea 
            [(ngModel)]="newMessage" 
            (keydown.enter)="handleEnter($event)"
            placeholder="Écrivez votre message..." 
            class="w-full max-h-32 min-h-[44px] bg-transparent resize-none outline-none p-3 text-card-foreground"
            rows="1"></textarea>
          
          <button 
            (click)="sendMessage()"
            [disabled]="!newMessage.trim() || loading()"
            class="p-3 bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl transition-colors disabled:opacity-50 disabled:hover:bg-accent shrink-0">
            <lucide-icon name="send" class="w-5 h-5"></lucide-icon>
          </button>
        </div>
        <p class="text-xs text-center mt-2 text-muted-foreground">L'IA peut faire des erreurs. Considérez vérifier les informations importantes.</p>
      </div>

    </div>
  `
})
export class IntelligentAssistantPageComponent implements AfterViewChecked {
  readonly Send = Send;
  readonly Bot = Bot;
  readonly User = User;
  readonly Sparkles = Sparkles;

  @ViewChild('chatScroll') private chatScrollContainer!: ElementRef;

  private authService = inject(AuthService);
  
  newMessage = '';
  loading = signal(false);
  messages = signal<{role: 'user' | 'model', content: string}[]>([]);

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.chatScrollContainer.nativeElement.scrollTop = this.chatScrollContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }

  handleEnter(event: Event) {
    event.preventDefault();
    this.sendMessage();
  }

  async sendMessage() {
    if (!this.newMessage.trim() || this.loading()) return;
    
    const userMsg = this.newMessage.trim();
    this.newMessage = '';
    
    const hist = this.messages();
    this.messages.set([...hist, { role: 'user', content: userMsg }]);
    
    this.loading.set(true);
    
    try {
      const session = this.authService.session();
      if (!session) throw new Error("Non autorisé");

      const response = await api.aiChat(session.accessToken, { 
        message: userMsg, 
        history: hist 
      });
      
      this.messages.set([...this.messages(), { role: 'model', content: response.reply }]);
    } catch (err) {
      console.error('AI Assistant error:', err);
      const errorMsg = err instanceof Error ? err.message : "Erreur inconnue";
      this.messages.set([...this.messages(), { role: 'model', content: `Désolé, je ne peux pas répondre pour le moment.\n\nErreur : ${errorMsg}` }]);
    } finally {
      this.loading.set(false);
    }
  }
}
