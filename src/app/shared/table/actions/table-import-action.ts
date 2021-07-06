import { ComponentType } from '@angular/cdk/portal';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ServerRoute } from 'types/Server';

import { ButtonAction, PopupSize } from '../../../types/GlobalType';
import { ButtonColor, TableActionDef } from '../../../types/Table';
import { TableAction } from './table-action';

export class TableImportAction implements TableAction {
  private action: TableActionDef = {
    id: ButtonAction.IMPORT,
    type: 'button',
    icon: 'cloud_upload',
    name: 'general.import',
    color: ButtonColor.PRIMARY,
    tooltip: 'general.import',
    action: this.import
  };

  // Return an action
  public getActionDef(): TableActionDef {
    return this.action;
  }

  protected import(component: ComponentType<unknown>, dialog: MatDialog, endpoint: ServerRoute,
    entity: string,requiredProperties: string[], optionalProperties?: string[], size?: PopupSize) {
    // Create the dialog
    const dialogConfig = new MatDialogConfig();
    // Popup Width
    dialogConfig.minWidth = size?.minWidth ? size.minWidth + 'vw' : '60vw';
    dialogConfig.maxWidth = size?.maxWidth ? size.maxWidth + 'vw' : dialogConfig.maxWidth;
    dialogConfig.width = size?.width ? size.width + 'vw' : dialogConfig.width;
    // Popup Height
    dialogConfig.minHeight = size?.minHeight ? size.minHeight + 'vh' : '60vh';
    dialogConfig.maxHeight = size?.maxHeight ? size.maxHeight + 'vh' : dialogConfig.maxHeight;
    dialogConfig.height = size?.height ? size.height + 'vh' : dialogConfig.height;
    // CSS
    dialogConfig.panelClass = 'transparent-dialog-container';
    dialogConfig.data = {
      endpoint,
      requiredProperties,
      optionalProperties,
      entity,
    };
    // Open
    dialog.open(component, dialogConfig);
  }
}
