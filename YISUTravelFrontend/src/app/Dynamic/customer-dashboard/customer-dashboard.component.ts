import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

import { CustomerService, CustomerProfile, CustomerChat, CustomerDashboardStats } from '../../Services/customer-service.service';
import { AuthService } from '../../Services/AuthService/auth.service';

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './customer-dashboard.component.html',
  styleUrl: './customer-dashboard.component.css'
})
export class CustomerDashboardComponent implements OnInit {
  profile: CustomerProfile | null = null;
  chatHistory: CustomerChat[] = [];
  dashboardStats: CustomerDashboardStats | null = null;
  loading = false;

  constructor(
    private customerService: CustomerService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;
    
    // Load profile
    this.customerService.getProfile().subscribe({
      next: (profile) => {
        this.profile = profile;
      },
      error: (error) => {
        console.error('Error loading profile:', error);
        this.snackBar.open('Fehler beim Laden des Profils', 'Schließen', { duration: 3000 });
      }
    });

    // Load chat history
    this.customerService.getChatHistory().subscribe({
      next: (chats) => {
        this.chatHistory = chats;
      },
      error: (error) => {
        console.error('Error loading chat history:', error);
        this.snackBar.open('Fehler beim Laden der Chat-Historie', 'Schließen', { duration: 3000 });
      }
    });

    // Load dashboard stats
    this.customerService.getDashboardStats().subscribe({
      next: (stats) => {
        this.dashboardStats = stats;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard stats:', error);
        this.snackBar.open('Fehler beim Laden der Statistiken', 'Schließen', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'primary';
      case 'waiting': return 'accent';
      case 'closed': return 'basic';
      default: return 'basic';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'active': return 'Aktiv';
      case 'waiting': return 'Wartend';
      case 'closed': return 'Geschlossen';
      default: return status;
    }
  }

  getChannelIcon(channel: string): string {
    switch (channel) {
      case 'website': return 'public';
      case 'whatsapp': return 'chat';
      default: return 'chat';
    }
  }

  getChannelLabel(channel: string): string {
    switch (channel) {
      case 'website': return 'Website';
      case 'whatsapp': return 'WhatsApp';
      default: return channel;
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  startNewChat(): void {
    // Redirect to main website chat
    window.location.href = '/';
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (error: any) => {
        console.error('Error logging out:', error);
        this.snackBar.open('Fehler beim Abmelden', 'Schließen', { duration: 3000 });
      }
    });
  }
}