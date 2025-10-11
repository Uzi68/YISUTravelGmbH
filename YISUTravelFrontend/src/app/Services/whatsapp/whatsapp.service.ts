import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WhatsAppChat {
  id: number;
  session_id: string;
  whatsapp_number: string;
  channel: 'whatsapp';
  status: string;
  visitor?: any;
  messages?: any[];
  created_at: string;
  updated_at: string;
}

export interface WhatsAppMessage {
  id: number;
  chat_id: number;
  from: string;
  text: string;
  message_type: string;
  metadata?: any;
  attachments?: any[];
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class WhatsappService {
  private apiUrl = `${environment.apiUrl}/whatsapp`;

  constructor(private http: HttpClient) { }

  /**
   * Hole alle WhatsApp Chats
   */
  getWhatsAppChats(): Observable<{ success: boolean; chats: WhatsAppChat[] }> {
    return this.http.get<{ success: boolean; chats: WhatsAppChat[] }>(`${this.apiUrl}/chats`, {
      withCredentials: true // ✅ Session-Cookies mitschicken
    });
  }

  /**
   * Sende Text-Nachricht über WhatsApp
   */
  sendTextMessage(chatId: number, message: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/send-text`, {
      chat_id: chatId,
      message: message
    }, {
      withCredentials: true // ✅ Session-Cookies mitschicken
    });
  }

  /**
   * Sende Bild über WhatsApp
   */
  sendImage(chatId: number, imageFile: File, caption?: string): Observable<any> {
    const formData = new FormData();
    formData.append('chat_id', chatId.toString());
    formData.append('image', imageFile);
    if (caption) {
      formData.append('caption', caption);
    }

    return this.http.post(`${this.apiUrl}/send-image`, formData, {
      withCredentials: true // ✅ Session-Cookies mitschicken
    });
  }

  /**
   * Sende Dokument über WhatsApp
   */
  sendDocument(chatId: number, documentFile: File, caption?: string): Observable<any> {
    const formData = new FormData();
    formData.append('chat_id', chatId.toString());
    formData.append('document', documentFile);
    if (caption) {
      formData.append('caption', caption);
    }

    return this.http.post(`${this.apiUrl}/send-document`, formData, {
      withCredentials: true // ✅ Session-Cookies mitschicken
    });
  }

  /**
   * Sende Template-Nachricht
   */
  sendTemplate(chatId: number, templateName: string, languageCode: string = 'de', components: any[] = []): Observable<any> {
    return this.http.post(`${this.apiUrl}/send-template`, {
      chat_id: chatId,
      template_name: templateName,
      language_code: languageCode,
      components: components
    }, {
      withCredentials: true // ✅ Session-Cookies mitschicken
    });
  }

  /**
   * Hilfsmethode: Prüfe ob Chat WhatsApp-Chat ist
   */
  isWhatsAppChat(chat: any): boolean {
    return chat?.channel === 'whatsapp';
  }

  /**
   * Hilfsmethode: Formatiere WhatsApp-Nummer für Anzeige
   */
  formatWhatsAppNumber(number: string): string {
    if (!number) return '';

    // Entferne führendes +
    const cleaned = number.replace(/\D/g, '');

    // Formatiere als +XX XXX XXXX XXXX
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
}
