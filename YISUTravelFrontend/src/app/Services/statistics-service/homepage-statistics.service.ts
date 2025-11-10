import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../../../environments/environment';

export interface HomepageMetricSnapshot {
  total: number;
  todayIncrement: number;
}

export type HomepageStatisticsResponse = Record<'bookings' | 'happyCustomers', HomepageMetricSnapshot>;

@Injectable({
  providedIn: 'root'
})
export class HomepageStatisticsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getStatistics(): Observable<HomepageStatisticsResponse> {
    return this.http.get<HomepageStatisticsResponse>(`${this.apiUrl}/homepage/statistics`);
  }
}

