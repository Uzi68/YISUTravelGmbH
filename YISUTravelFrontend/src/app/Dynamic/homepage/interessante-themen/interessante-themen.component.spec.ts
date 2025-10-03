import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InteressanteThemenComponent } from './interessante-themen.component';

describe('InteressanteThemenComponent', () => {
  let component: InteressanteThemenComponent;
  let fixture: ComponentFixture<InteressanteThemenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InteressanteThemenComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InteressanteThemenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
