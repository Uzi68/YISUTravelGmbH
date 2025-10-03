import { TestBed } from '@angular/core/testing';

import { TerminvereinbarungService } from './terminvereinbarung.service';

describe('TerminvereinbarungService', () => {
  let service: TerminvereinbarungService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TerminvereinbarungService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
