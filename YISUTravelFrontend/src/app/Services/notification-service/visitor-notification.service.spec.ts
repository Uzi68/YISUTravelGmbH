import { TestBed } from '@angular/core/testing';

import { VisitorNotificationService } from './visitor-notification.service';

describe('VisitorNotificationService', () => {
  let service: VisitorNotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VisitorNotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
