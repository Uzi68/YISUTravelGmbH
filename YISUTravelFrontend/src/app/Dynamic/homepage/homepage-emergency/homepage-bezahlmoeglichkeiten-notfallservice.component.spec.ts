import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomepageBezahlmoeglichkeitenNotfallserviceComponent } from './homepage-bezahlmoeglichkeiten-notfallservice.component';

describe('HomepageBezahlmoeglichkeitenNotfallserviceComponent', () => {
  let component: HomepageBezahlmoeglichkeitenNotfallserviceComponent;
  let fixture: ComponentFixture<HomepageBezahlmoeglichkeitenNotfallserviceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomepageBezahlmoeglichkeitenNotfallserviceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomepageBezahlmoeglichkeitenNotfallserviceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
