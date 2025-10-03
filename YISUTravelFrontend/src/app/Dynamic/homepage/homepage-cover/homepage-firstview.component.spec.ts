import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomepageFirstviewComponent } from './homepage-firstview.component';

describe('HomepageFirstviewComponent', () => {
  let component: HomepageFirstviewComponent;
  let fixture: ComponentFixture<HomepageFirstviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomepageFirstviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomepageFirstviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
