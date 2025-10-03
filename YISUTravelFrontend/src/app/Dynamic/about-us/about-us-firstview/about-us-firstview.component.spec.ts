import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AboutUsFirstviewComponent } from './about-us-firstview.component';

describe('AboutUsFirstviewComponent', () => {
  let component: AboutUsFirstviewComponent;
  let fixture: ComponentFixture<AboutUsFirstviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutUsFirstviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AboutUsFirstviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
