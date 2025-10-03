import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomepageFeaturesComponent } from './homepage-features.component';

describe('HomepageFeaturesComponent', () => {
  let component: HomepageFeaturesComponent;
  let fixture: ComponentFixture<HomepageFeaturesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomepageFeaturesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomepageFeaturesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
