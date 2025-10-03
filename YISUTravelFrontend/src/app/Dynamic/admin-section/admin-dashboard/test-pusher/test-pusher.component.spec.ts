import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestPusherComponent } from './test-pusher.component';

describe('TestPusherComponent', () => {
  let component: TestPusherComponent;
  let fixture: ComponentFixture<TestPusherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestPusherComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestPusherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
