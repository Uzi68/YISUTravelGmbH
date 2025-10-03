import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DienstleistungCoverComponent } from './dienstleistung-cover.component';

describe('DienstleistungCoverComponent', () => {
  let component: DienstleistungCoverComponent;
  let fixture: ComponentFixture<DienstleistungCoverComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DienstleistungCoverComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DienstleistungCoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
