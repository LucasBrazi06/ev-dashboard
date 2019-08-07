import { Component, Input, OnInit } from '@angular/core';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { AuthorizationService } from 'app/services/authorization.service';
import { SessionDialogComponent } from 'app/shared/dialogs/session/session-dialog.component';
import { LocaleService } from '../../../services/locale.service';
import { CellContentTemplateComponent } from '../../../shared/table/cell-content-template/cell-content-template.component';

@Component({
  template: `
    <button *ngIf="row.activeTransactionID > 0 && displaySessionAuthorized"
      mat-icon-button color="primary"
      (click)="showSessionDialog()"><mat-icon>open_in_new</mat-icon></button>
  `,
  styles: [`.no-margin {
      margin: 0
  }`]

})
export class ChargingStationsSessionDetailComponentCellComponent extends CellContentTemplateComponent implements OnInit {
  @Input() row: any;
  locale: string;
  displaySessionAuthorized: boolean;
  dialogRef: MatDialogRef<SessionDialogComponent>;

  constructor(
      private localeService: LocaleService,
      private authorizationService: AuthorizationService,
      private dialog: MatDialog) {
    super();
    this.locale = this.localeService.getCurrentLocaleJS();
  }

  showSessionDialog() {
    // Create the dialog
    const dialogConfig = new MatDialogConfig();
    dialogConfig.minWidth = '80vw';
    dialogConfig.minHeight = '80vh';
    dialogConfig.height = '80vh';
    dialogConfig.width = '80vw';
    dialogConfig.panelClass = 'transparent-dialog-container';
    if (this.row) {
      dialogConfig.data = {
        transactionId: this.row.activeTransactionID,
        siteArea: '',
        connector: this.row,
      };
    }
    // Open
    this.dialogRef = this.dialog.open(SessionDialogComponent, dialogConfig);
  }

  refresh() {
    if (this.dialogRef && this.dialogRef.componentInstance) {
      this.dialogRef.componentInstance.refresh();
    }
  }

  ngOnInit(): void {
    this.displaySessionAuthorized = this.authorizationService.isAdmin() || this.authorizationService.isDemo();
  }
}
