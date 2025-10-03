import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminLivechatComponent } from './admin-livechat.component';

describe('AdminLivechatComponent', () => {
  let component: AdminLivechatComponent;
  let fixture: ComponentFixture<AdminLivechatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLivechatComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminLivechatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
