import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AboutUsCoverComponent } from './about-us-cover.component';

describe('AboutUsCoverComponent', () => {
  let component: AboutUsCoverComponent;
  let fixture: ComponentFixture<AboutUsCoverComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutUsCoverComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AboutUsCoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
