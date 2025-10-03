import { Component } from '@angular/core';
import {RouterLink} from "@angular/router";
import {MatDialog} from "@angular/material/dialog";
import {
  TerminVereinbarenComponent
} from "../../Dynamic/homepage/homepage-contact/termin-vereinbaren/termin-vereinbaren.component";


@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [
    RouterLink
  ],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {
  constructor(private dialog: MatDialog) {}

  openDialog(): void {
    const dialogRef = this.dialog.open(TerminVereinbarenComponent, {
      width: '1000px',
      autoFocus: false,
      panelClass: 'custom-dialog-container'
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('Das Fenster wurde geschlossen. Ausgewähltes Datum:', result);
    });
  }
}
