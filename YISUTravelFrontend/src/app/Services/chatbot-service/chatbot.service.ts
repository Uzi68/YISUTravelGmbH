import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {BehaviorSubject, Observable, tap, throwError} from "rxjs";
import {catchError, map} from "rxjs/operators";
import { isPlatformBrowser } from "@angular/common";
import {Visitor} from "../../Models/Visitor";
import {ChatbotResponse, ChatbotResponseCreate} from "../../Models/Chatbot";
import {ApiResponse} from "../../Models/apiresponse.model";
import {environment} from "../../../environments/environment";

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {

  private apiUrl = environment.apiUrl;

  private isChatOpen = new BehaviorSubject<boolean>(false);
  isChatOpen$ = this.isChatOpen.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
  }

  sendMessage(message: string): Observable<any> {
    const storedSessionId = this.getLocalStorageItem('session_id');
    if (storedSessionId != undefined) {
      const headers = new HttpHeaders()
        .set('X-Session-ID', storedSessionId || '');

      return this.http.post<any>(`${this.apiUrl}/chatbot/input`, {message}, {headers, withCredentials: true}).pipe(
        tap(response => {
          if (this.getLocalStorageItem('session_id') == '') {
            this.setLocalStorageItem("session_id", response.session_id);
          }
        })
      );

    } else {
      return this.http.post<any>(`${this.apiUrl}/chatbot/input`, {message}, {withCredentials: true}).pipe(
        tap(response => {
          this.setLocalStorageItem("session_id", response.session_id);
        })
      );
    }
  }

  markMessagesAsRead(chatId: string, sessionId: string) {
    return this.http.post(
      `${this.apiUrl}/chats/mark-read`,
      {
        chat_id: chatId,
        session_id: sessionId
      },
      {
        withCredentials: true
      }
    );
  }


  sendMessageAnonymous(message: string): Observable<any> {
    const storedSessionId = this.getLocalStorageItem('session_id');
    if (storedSessionId != undefined) {
      const headers = new HttpHeaders()
        .set('X-Session-ID', storedSessionId || '');

      return this.http.post<any>(`${this.apiUrl}/chatbot/input/anonymous`, {message}, {headers}).pipe(
        tap(response => {
          if (this.getLocalStorageItem('session_id') == '') {
            this.setLocalStorageItem("session_id", response.session_id);
          }
        })
      );

    } else {
      return this.http.post<any>(`${this.apiUrl}/chatbot/input/anonymous`, {message},).pipe(
        tap(response => {
          this.setLocalStorageItem("session_id", response.session_id);
        })
      );
    }
  }

  endSession(sessionId: string): Observable<any> {
    // Header mit der Session-ID setzen
    const headers = new HttpHeaders()
      .set('X-Session-ID', sessionId);

    return this.http.post<any>(
      `${this.apiUrl}/chatbot/end_chatbotSession`, {}, {headers}).pipe(
      tap(response => {
        this.setLocalStorageItem('session_id', response.new_session_id);
      })
    );
  }


  getChatHistory(sessionId: string): Observable<any> {
    // Send as query parameter (recommended for GET requests)
    return this.http.get(`${this.apiUrl}/chat-history`, {
      params: {session_id: sessionId},
      withCredentials: true
    });
  }

// In chatbot-service.service.ts
  requestHuman(sessionId: string, message: string): Observable<any> {
    const headers = new HttpHeaders()
      .set('X-Session-ID', sessionId);

    return this.http.post(`${this.apiUrl}/human`, {
      session_id: sessionId,
      message: message
    }, {headers, withCredentials: true});
  }

  closeChat(chatId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/chat/${chatId}/close`, {}, {
      withCredentials: true
    });
  }

  transferChat(chatId: string, agentId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/chat/${chatId}/transfer`, {
      agent_id: agentId
    }, {
      withCredentials: true
    });
  }

  assignChat(chatId: string, agentId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/chat/${chatId}/assign`, {
      assigned_to: agentId
    }, {
      withCredentials: true
    });
  }


  assignChatAgent(chatId: string | number, agentId: string | number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/chats/${chatId}/assign/${agentId}`, {}, {
        withCredentials: true
      });
  }

  getChatStatus(sessionId: string): Observable<any> {
    const headers = new HttpHeaders()
      .set('X-Session-ID', sessionId);

    return this.http.get(`${this.apiUrl}/chat-status`, {
      headers,
      withCredentials: true
    });
  }

  getChatRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/chat/requests`, {
      withCredentials: true
    });
  }

  acceptChatRequest(chatId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/chat/${chatId}/accept`, {}, {
      withCredentials: true
    });
  }

  getActiveChats(): Observable<any> {

    return this.http.get<any>(`${this.apiUrl}/active-chats`, {withCredentials: true}).pipe(
      catchError((error) => {
        console.error('Error checking auth:', error);
        return throwError(error);
      })
    );
  }

  getChatByIdentifier(identifier: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/chats/lookup`, {
      withCredentials: true,
      params: { identifier }
    });
  }



  sendAgentMessage(messageData: {
    chat_id: string;
    content: string;
    isAgent: boolean;
    session_id?: string;
  }): Observable<any> {
    // Verwende die assigned_chat_session_id falls vorhanden, sonst die normale session_id
    const sessionId = messageData.session_id || this.getLocalStorageItem('assigned_chat_session_id') ||
      this.getLocalStorageItem('session_id') || '';

    return this.http.post(`${this.apiUrl}/chatbot/send-message`, {
      ...messageData,
      session_id: sessionId

    }, {
      withCredentials: true,
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId
      })
    });
  }

  private getLocalStorageItem(key: string): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(key);
    }
    return null;
  }

  private setLocalStorageItem(key: string, value: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(key, value);
    }
  }

  // Für den Admin alle Chats ansehen
  getVisitorDetails(session_id: string): Observable<Visitor> {
    return this.http.get<Visitor>(`${this.apiUrl}/visitorDetails/${session_id}`, {
      withCredentials: true
    });
  }

  // In chatbot.service.ts
  registerVisitor(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register-visitor`,data);
  }

  checkVisitorRegistration(sessionId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/check-registration/${sessionId}`);
  }


  getAllChatsForAdmin(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/chats`, {
      withCredentials: true
    });
  }


  // In chatbot.service.ts
  endChatByUser(): Observable<any> {
    const sessionId = localStorage.getItem('session_id');
    if (!sessionId) return throwError(() => new Error('No active session'));

    const headers = new HttpHeaders().set('X-Session-ID', sessionId || '');

    return this.http.post<{ success: boolean, new_session_id: string }>(
      `${this.apiUrl}/chatbot/end-by-user`,
      {},
      {
        headers,
        withCredentials: true
      }
    );
  }

  setChatOpenState(isOpen: boolean) {
    this.isChatOpen.next(isOpen);
  }


  insertResponse(response: ChatbotResponseCreate): Observable<ChatbotResponse> {
    return this.http.post<ApiResponse<ChatbotResponse>>(
      `${this.apiUrl}/insert-chatbotresponse`,
      response,
      { withCredentials: true }
    ).pipe(
      map(res => res.data) // ✅ nur data extrahieren
    );
  }

  getResponse(): Observable<ChatbotResponse[]> {
    return this.http.get<ChatbotResponse[]>(
      `${this.apiUrl}/get-chatbotresponses`,
      { withCredentials: true }
    );
  }

  deleteResponse(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/delete-chatbotresponse/${id}`,
      { withCredentials: true }
    );
  }

  updateResponse(id: number, response: ChatbotResponse): Observable<ChatbotResponse> {
    return this.http.put<ApiResponse<ChatbotResponse>>(
      `${this.apiUrl}/update-chatbotresponse/${id}`,
      response,
      { withCredentials: true }
    ).pipe(
      map(res => res.data)
    );
  }


// Chat Assignment Methoden
  assignChatToAgent(sessionId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/chats/${sessionId}/assign`, {
      session_id: sessionId
    }, {
      withCredentials: true
    });
  }

  // ✅ Chat durch Agent beenden
  closeChatByAgent(payload: { session_id: string, reason?: string | null }): Observable<any> {
    return this.http.post(`${this.apiUrl}/close-chat-by-agent`, payload, {
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('Chat closed by agent:', response);
      }),
      catchError(error => {
        console.error('Error closing chat by agent:', error);
        return throwError(() => error);
      })
    );
  }

  transferChatToAgent(sessionId: string, toAgentId: number, reason?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/chats/${sessionId}/transfer`, {
      to_agent_id: toAgentId,
      reason: reason,
      session_id: sessionId
    }, {
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('transferChatToAgent API response:', response);
      }),
      catchError(error => {
        console.error('transferChatToAgent API error:', error);
        return throwError(() => error);
      })
    );
  }

  unassignChat(sessionId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/chats/${sessionId}/unassign`, {
      session_id: sessionId
    }, {
      withCredentials: true
    });
  }


// Escalation Prompt Methoden
  sendEscalationPrompt(sessionId: string, payload?: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/chats/${sessionId}/escalation-prompt`, {
      session_id: sessionId
    }, {
      withCredentials: true
    });
  }

  handleEscalationPromptResponse(payload: {
    session_id: string;
    response: string;
    prompt_id?: string;
  }): Observable<any> {
    // ✅ Sicherstellen, dass alle Werte die richtigen Typen haben
    const cleanPayload: any = {
      session_id: String(payload.session_id),
      response: String(payload.response)
    };

    // Nur hinzufügen wenn prompt_id existiert und zu String konvertieren
    if (payload.prompt_id) {
      cleanPayload.prompt_id = String(payload.prompt_id);
    }

    console.log('Sending clean payload:', cleanPayload);

    return this.http.post(`${this.apiUrl}/escalation-prompt/response`, cleanPayload).pipe(
      catchError((error) => {
        console.error('API Error in handleEscalationPromptResponse:', error);
        return throwError(() => error);
      })
    );
  }

// ✅ Assignment Status für alle Benutzer (mit Fallback)
  getAssignmentStatus(chatId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/chats/${chatId}/assignment-status`, {
      withCredentials: true
    }).pipe(
      catchError((error) => {
        if (error.status === 401 || error.status === 419) {
          // Fallback auf anonyme Route
          return this.getAnonymousAssignmentStatus(chatId);
        }
        throw error;
      })
    );
  }
  // ✅ Anonyme Assignment Status Check
  getAnonymousAssignmentStatus(sessionId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/anonymous/chats/${sessionId}/status`);
  }

  canUserWrite(sessionId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/chats/${sessionId}/can-write`, {
      withCredentials: true
    });
  }

  getTransferHistory(sessionId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/chats/${sessionId}/transfer-history`, {
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('getTransferHistory API response:', response);
      }),
      catchError(error => {
        console.error('getTransferHistory API error:', error);
        return throwError(() => error);
      })
    );
  }

  getAvailableAgents(): Observable<any> {
    return this.http.get(`${this.apiUrl}/chat-assignment/available-agents`, {
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log('getAvailableAgents API response:', response);
      }),
      catchError(error => {
        console.error('getAvailableAgents API error:', error);
        return throwError(() => error);
      })
    );
  }


// ✅ Verbesserte sendMessageToHumanChat mit Error Handling
  sendMessageToHumanChat(payload: { session_id: string, content: string, isAgent: boolean }): Observable<any> {
    return this.http.post(`${this.apiUrl}/send-to-human-chat`, payload, {
      headers: {
        'X-Session-ID': payload.session_id,
        'X-Requested-With': 'XMLHttpRequest'
      }
    }).pipe(
      catchError((error) => {
        console.error('Fehler beim Senden der Nachricht:', error);

        if (error.status === 419) {
          // CSRF Token Fehler - versuche erneut ohne spezielle Header
          return this.http.post(`${this.apiUrl}/send-to-human-chat`, payload);
        }

        throw error;
      })
    );
  }

  resetChatAssignment(): Observable<any> {
    const sessionId = localStorage.getItem('session_id');
    if (!sessionId) return throwError(() => new Error('No active session'));

    const headers = new HttpHeaders().set('X-Session-ID', sessionId);

    return this.http.post(`${this.apiUrl}/reset-chat-assignment`, {}, {
      headers,
      withCredentials: true
    });
  }
  getExplicitAssignmentStatus(sessionId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/chats/${sessionId}/explicit-assignment-status`, {
      withCredentials: true
    }).pipe(
      tap(response => console.log('Explicit assignment status:', response)),
      catchError(error => {
        console.error('Error getting explicit assignment status:', error);
        return throwError(() => error);
      })
    );
  }

  // File Attachment Methods
  uploadAttachment(file: File, chatId: string, sessionId: string, from: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('chat_id', chatId);
    formData.append('session_id', sessionId);
    formData.append('from', from);

    return this.http.post(`${this.apiUrl}/attachments/upload`, formData, {
      withCredentials: true,
      headers: new HttpHeaders({
        'X-Session-ID': sessionId
      })
    }).pipe(
      tap(response => console.log('File upload response:', response)),
      catchError(error => {
        console.error('File upload error:', error);
        return throwError(() => error);
      })
    );
  }

  downloadAttachment(attachmentId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/attachments/${attachmentId}/download`, {
      responseType: 'blob',
      withCredentials: true
    });
  }

  getAttachment(attachmentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/attachments/${attachmentId}`, {
      withCredentials: true
    });
  }

  getChatAttachments(chatId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/chats/${chatId}/attachments`, {
      withCredentials: true
    });
  }

  /**
   * Notification Permission Status im Backend speichern
   */
  saveNotificationStatus(sessionId: string, permissionGranted: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}/chatbot/notification-status`, {
      session_id: sessionId,
      permission_granted: permissionGranted
    });
  }


}

