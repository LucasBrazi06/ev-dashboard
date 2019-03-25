import {Component, Injectable, Input, OnInit} from '@angular/core';
import {CellContentTemplateComponent} from '../../table/cell-content-template/cell-content-template.component';
import {AuthorizationService} from 'app/services/authorization-service';

@Component({
  selector: 'app-connector-id-cell',
  styleUrls: ['./connector-cell.scss'],
  template: `
    <div class="d-flex justify-content-center">
      <div class="row mx-0 px-0 align-items-center"
           [class.simple-connector]="isSimpleConnectorDisplay" [class.detail-connector]="!isSimpleConnectorDisplay">
        <div class="charger-connector-container">
          <div [appChargerStatus]="{status: chargerStatus, target: 'background', baseClass: 'charger-connector-background'}">
          </div>
          <div [matTooltip]="row.status"
               [appChargerStatus]="{status: chargerStatus, target: 'text', baseClass: 'charger-connector-text'}">
            {{row.connectorId | appConnectorId}}
          </div>
        </div>
        <div *ngIf="!isSimpleConnectorDisplay && (row.type || row.type === null)"
             [matTooltip]="row.type | appConnectorType:false | translate"
             [appChargerStatus]="{status: chargerStatus, target: 'background-image',
              baseClass: baseClassConnectorTypeText}">
          <mat-icon *ngIf="row.type !== null" [svgIcon]="row.type | appConnectorType" class="d-flex"></mat-icon>
          <mat-icon *ngIf="row.type === null" class="d-flex">not_interested</mat-icon>
        </div>
      </div>
    </div>
  `
})

@Injectable()
export class ConnectorCellComponent extends CellContentTemplateComponent implements OnInit {

  @Input() row: any;
  @Input() largeDisplay = true;

  chargerStatus: string;
  isSimpleConnectorDisplay: boolean;
  chargerActive = false;
  baseClassConnectorTypeText: string;
  isAdmin = false;

  constructor(private _authorizationService: AuthorizationService) {
    super();
    this.isAdmin = this._authorizationService.isAdmin();
  }

  ngOnInit(): void {
    this.updateValues();
    this.isSimpleConnectorDisplay = false;
    this.baseClassConnectorTypeText =
      `charger-connector-container charger-connector-container-image d-flex align-items-center justify-content-center
            ${(this.largeDisplay ? 'charger-connector-container-image-large' : 'charger-connector-container-image-small')}
            ${(this.isAdmin && this.row.type === null ? 'connector-not-typed-icon' : '')}`;
  }

  refresh() {
    this.updateValues();
  }

  updateValues() {
    this.chargerStatus = this.row.status;
    this.chargerActive = false;
    if (this.row.status === 'Charging' || this.row.status === 'Occupied') {
      this.chargerActive = this.row.currentConsumption > 0;
      this.chargerStatus = (this.row.currentConsumption > 0 ? `${this.row.status}-active` : `${this.row.status}-inactive`);
    }
  }
}
