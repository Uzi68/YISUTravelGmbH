import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class TerminvereinbarungService {
  private emailUrl = 'backend/send_termin.php'; // Bestätigungsemail an Besitzer und Kunde
  private api_backend = 'backend/api.php'; // Im Backend speichern


  constructor(private http: HttpClient) {}

  sendEmail(formData: any): Observable<any> {
    return this.http.post(this.emailUrl, formData);
  }

  api(formData: any): Observable<any> {
    return this.http.post(this.api_backend, formData);
  }

  getAppointments(date: string): Observable<any> {
    return this.http.get(`${this.api_backend}?date=${date}`);
  }
}
