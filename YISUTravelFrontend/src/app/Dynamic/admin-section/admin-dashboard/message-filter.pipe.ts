import { Pipe, PipeTransform } from '@angular/core';
import { AuthService } from '../../../Services/AuthService/auth.service';

@Pipe({
  standalone: true,
  name: 'messageFilter'
})
export class MessageFilterPipe implements PipeTransform {
  constructor(private authService: AuthService) {}

  transform(value: string, isAdmin: boolean): string {
    if (isAdmin) {
      return value; // Admins sehen alles
    }

    // Entferne Telefonnummern aus dem Text
    return value.replace(/Telefon:.*?(?=\n|$)/g, '');
  }
}
