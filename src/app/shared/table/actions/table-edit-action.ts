import { ButtonAction } from 'app/types/GlobalType';
import { ButtonColor, TableActionDef } from 'app/types/Table';
import { TableAction } from './table-action';

export class TableEditAction implements TableAction {
  private action: TableActionDef = {
    id: ButtonAction.EDIT,
    type: 'button',
    icon: 'edit',
    color: ButtonColor.PRIMARY,
    name: 'general.edit',
    tooltip: 'general.tooltips.edit',
  };

  public getActionDef(): TableActionDef {
    return this.action;
  }
}
