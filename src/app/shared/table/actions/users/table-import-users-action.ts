import { ComponentType } from '@angular/cdk/portal';
import { MatDialog } from '@angular/material/dialog';
import { ServerRoute } from 'types/Server';

import { TableActionDef } from '../../../../types/Table';
import { UserButtonAction, UserOptionalImportProperties, UserRequiredImportProperties } from '../../../../types/User';
import { TableImportAction } from '../table-import-action';

export interface TableImportUsersActionDef extends TableActionDef {
  action: (userDialogComponent: ComponentType<unknown>, dialog: MatDialog) => void;
}

export class TableImportUsersAction extends TableImportAction {
  public getActionDef(): TableImportUsersActionDef {
    return {
      ...super.getActionDef(),
      id: UserButtonAction.IMPORT_USERS,
      action: this.importUsers,
    };
  }

  private importUsers(userDialogComponent: ComponentType<unknown>, dialog: MatDialog) {
    super.import(userDialogComponent, dialog, ServerRoute.REST_USERS_IMPORT, 'users', UserRequiredImportProperties, UserOptionalImportProperties);
  }
}
