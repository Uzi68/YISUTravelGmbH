// WhatsApp Integration Helper Methods
// Diese Datei enthält alle Methoden für die WhatsApp-Integration im Admin Dashboard

import { WhatsappService, WhatsAppChat } from '../../../Services/whatsapp/whatsapp.service';
import { MatSnackBar } from '@angular/material/snack-bar';

export class WhatsAppIntegrationHelper {

  /**
   * Lade WhatsApp Chats
   */
  static loadWhatsAppChats(
    whatsappService: WhatsappService,
    onSuccess: (chats: WhatsAppChat[]) => void,
    onError?: (error: any) => void
  ): void {
    whatsappService.getWhatsAppChats().subscribe({
      next: (response) => {
        if (response.success) {
          onSuccess(response.chats);
        }
      },
      error: (error) => {
        console.error('Fehler beim Laden der WhatsApp-Chats:', error);
        if (onError) onError(error);
      }
    });
  }

  /**
   * Sende WhatsApp Text-Nachricht
   */
  static sendWhatsAppMessage(
    whatsappService: WhatsappService,
    chatId: number,
    message: string,
    snackBar: MatSnackBar,
    onSuccess?: () => void,
    onError?: (error: any) => void
  ): void {
    whatsappService.sendTextMessage(chatId, message).subscribe({
      next: (response) => {
        if (response.success) {
          snackBar.open('✅ WhatsApp-Nachricht gesendet', 'OK', { duration: 3000 });
          if (onSuccess) onSuccess();
        }
      },
      error: (error) => {
        console.error('Fehler beim Senden der WhatsApp-Nachricht:', error);
        snackBar.open('❌ Fehler beim Senden der Nachricht', 'OK', { duration: 5000 });
        if (onError) onError(error);
      }
    });
  }

  /**
   * Sende WhatsApp Bild
   */
  static sendWhatsAppImage(
    whatsappService: WhatsappService,
    chatId: number,
    file: File,
    caption: string | undefined,
    snackBar: MatSnackBar,
    onSuccess?: () => void,
    onError?: (error: any) => void
  ): void {
    snackBar.open('📤 Bild wird hochgeladen...', '', { duration: 2000 });

    whatsappService.sendImage(chatId, file, caption).subscribe({
      next: (response) => {
        if (response.success) {
          snackBar.open('✅ Bild erfolgreich gesendet', 'OK', { duration: 3000 });
          if (onSuccess) onSuccess();
        }
      },
      error: (error) => {
        console.error('Fehler beim Senden des Bildes:', error);
        snackBar.open('❌ Fehler beim Senden des Bildes', 'OK', { duration: 5000 });
        if (onError) onError(error);
      }
    });
  }

  /**
   * Sende WhatsApp Dokument
   */
  static sendWhatsAppDocument(
    whatsappService: WhatsappService,
    chatId: number,
    file: File,
    caption: string | undefined,
    snackBar: MatSnackBar,
    onSuccess?: () => void,
    onError?: (error: any) => void
  ): void {
    snackBar.open('📤 Dokument wird hochgeladen...', '', { duration: 2000 });

    whatsappService.sendDocument(chatId, file, caption).subscribe({
      next: (response) => {
        if (response.success) {
          snackBar.open('✅ Dokument erfolgreich gesendet', 'OK', { duration: 3000 });
          if (onSuccess) onSuccess();
        }
      },
      error: (error) => {
        console.error('Fehler beim Senden des Dokuments:', error);
        snackBar.open('❌ Fehler beim Senden des Dokuments', 'OK', { duration: 5000 });
        if (onError) onError(error);
      }
    });
  }

  /**
   * Prüfe ob Chat ein WhatsApp-Chat ist
   */
  static isWhatsAppChat(chat: any): boolean {
    return chat?.channel === 'whatsapp';
  }

  /**
   * Formatiere WhatsApp-Nummer für Anzeige
   */
  static formatWhatsAppNumber(number: string): string {
    if (!number) return '';

    const cleaned = number.replace(/\D/g, '');

    if (cleaned.length >= 10) {
      const countryCode = cleaned.substring(0, cleaned.length - 10);
      const rest = cleaned.substring(cleaned.length - 10);
      const part1 = rest.substring(0, 3);
      const part2 = rest.substring(3, 7);
      const part3 = rest.substring(7);

      return `+${countryCode} ${part1} ${part2} ${part3}`;
    }

    return `+${cleaned}`;
  }

  /**
   * Hole Channel-Icon für Chat
   */
  static getChannelIcon(chat: any): string {
    return WhatsAppIntegrationHelper.isWhatsAppChat(chat) ? '💬' : '📱';
  }

  /**
   * Hole Channel-Name für Chat
   */
  static getChannelName(chat: any): string {
    return WhatsAppIntegrationHelper.isWhatsAppChat(chat) ? 'WhatsApp' : 'Website';
  }

  /**
   * Filtere Chats nach Channel
   */
  static filterChatsByChannel(
    chats: any[],
    channelFilter: 'all' | 'website' | 'whatsapp'
  ): any[] {
    if (channelFilter === 'all') {
      return chats;
    }

    return chats.filter(chat => {
      if (channelFilter === 'whatsapp') {
        return WhatsAppIntegrationHelper.isWhatsAppChat(chat);
      } else {
        return !WhatsAppIntegrationHelper.isWhatsAppChat(chat);
      }
    });
  }

  /**
   * Prüfe ob Datei-Upload für diesen Chat erlaubt ist
   */
  static canUploadFiles(chat: any): boolean {
    return WhatsAppIntegrationHelper.isWhatsAppChat(chat);
  }

  /**
   * Validiere Datei für Upload (Typ & Größe)
   */
  static validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 100 * 1024 * 1024; // 100MB
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedDocTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    if (file.size > maxSize) {
      return { valid: false, error: 'Datei ist zu groß (max. 100MB)' };
    }

    const isImage = allowedImageTypes.includes(file.type);
    const isDocument = allowedDocTypes.includes(file.type);

    if (!isImage && !isDocument) {
      return { valid: false, error: 'Dateityp nicht unterstützt' };
    }

    return { valid: true };
  }

  /**
   * Bestimme Datei-Typ (image oder document)
   */
  static getFileType(file: File): 'image' | 'document' {
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    return imageTypes.includes(file.type) ? 'image' : 'document';
  }

  /**
   * Hole Icon für Message Type
   */
  static getMessageTypeIcon(messageType: string): string {
    const iconMap: { [key: string]: string } = {
      'whatsapp_text': '💬',
      'whatsapp_image': '🖼️',
      'whatsapp_document': '📄',
      'whatsapp_video': '🎥',
      'whatsapp_audio': '🎵',
      'whatsapp_location': '📍',
      'whatsapp_contact': '👤',
      'whatsapp_template': '📋'
    };

    return iconMap[messageType] || '💬';
  }

  /**
   * Merge Website und WhatsApp Chats
   */
  static mergeChats(websiteChats: any[], whatsappChats: WhatsAppChat[]): any[] {
    // Konvertiere WhatsApp Chats zum gleichen Format wie Website Chats
    const convertedWhatsAppChats = whatsappChats.map(chat => ({
      ...chat,
      channel: 'whatsapp',
      // Weitere Felder falls nötig anpassen
    }));

    // Merge beide Arrays
    const mergedChats = [...websiteChats, ...convertedWhatsAppChats];

    // Sortiere nach updated_at (neueste zuerst)
    return mergedChats.sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at).getTime();
      const dateB = new Date(b.updated_at || b.created_at).getTime();
      return dateB - dateA;
    });
  }
}
