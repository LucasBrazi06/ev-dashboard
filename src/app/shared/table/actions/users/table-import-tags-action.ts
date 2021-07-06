import { ComponentType } from '@angular/cdk/portal';
import { MatDialog } from '@angular/material/dialog';
import { ServerAction, ServerRoute } from 'types/Server';
import { TagOptionalImportProperties, TagRequiredImportProperties } from 'types/Tag';

import { TableActionDef } from '../../../../types/Table';
import { UserButtonAction } from '../../../../types/User';
import { TableImportAction } from '../table-import-action';

export interface TableImportTagsActionDef extends TableActionDef {
  action: (userDialogComponent: ComponentType<unknown>, dialog: MatDialog) => void;
}

export class TableImportTagsAction extends TableImportAction {
  public getActionDef(): TableImportTagsActionDef {
    return {
      ...super.getActionDef(),
      id: UserButtonAction.IMPORT_TAGS,
      action: this.importTags,
    };
  }

  private importTags(tagDialogComponent: ComponentType<unknown>, dialog: MatDialog) {
    super.import(tagDialogComponent, dialog, ServerRoute.REST_TAGS_IMPORT, 'tags', TagRequiredImportProperties, TagOptionalImportProperties);
  }
}
