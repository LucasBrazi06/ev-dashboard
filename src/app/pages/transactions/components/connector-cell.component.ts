import {Component, Injectable, Input, Pipe, PipeTransform} from '@angular/core';
import {CellContentTemplateComponent} from '../../../shared/table/cell-content-template/cell-content-template.component';
import {Transaction} from 'app/common.types';

@Component({
  selector: 'app-connector-id-cell',
  template: `
    <!-- Connector ID -->
    <div class="d-flex justify-content-center">
      <div class="row mx-0 px-0 align-items-center detail-connector">
        <div appTooltip data-toogle="tooltip" data-offset="0px, 8px" data-placement="bottom"
            [title]="row | appFormatConnector:'text' | translate"
            class="charger-connector-container">
          <div [class]="row | appFormatConnector:'class'">
            {{row.connectorId | appConnectorId}}
          </div>
        </div>
      </div>
    </div>
  `
})
@Injectable()
export class ConnectorCellComponent extends CellContentTemplateComponent {
  @Input() row: any;
}

@Pipe({name: 'appFormatConnector'})
export class AppFormatConnector implements PipeTransform {
  transform(transaction: Transaction, type: string): string {
    console.log(transaction);
    
    if (type === 'class') {
      return this.buildConnectorClasses(transaction);
    }
    if (type === 'text') {
      return this.buildConnectorText(transaction);
    }
  }

  buildConnectorClasses(transaction: Transaction): string {
    let classNames = 'charger-connector-background charger-connector-text ';
    // Check if charging
    if (transaction.currentConsumption > 0) {
      classNames += 'charger-connector-charging-active charger-connector-background-spinner charger-connector-charging-active-text';
    } else {
      classNames += 'charger-connector-charging';
    }
    return classNames;
  }

  buildConnectorText(transaction: Transaction): string {
    if (transaction.currentConsumption > 0) {
      return `chargers.status_charging`;
    } else {
      return `chargers.status_suspendedev`;
    }
  }
}
