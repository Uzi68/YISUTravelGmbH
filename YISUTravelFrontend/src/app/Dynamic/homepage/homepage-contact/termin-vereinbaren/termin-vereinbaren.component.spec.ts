import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TerminVereinbarenComponent } from './termin-vereinbaren.component';

describe('TerminVereinbarenComponent', () => {
  let component: TerminVereinbarenComponent;
  let fixture: ComponentFixture<TerminVereinbarenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TerminVereinbarenComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TerminVereinbarenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
