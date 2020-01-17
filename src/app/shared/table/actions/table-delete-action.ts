import { ButtonAction } from 'app/types/GlobalType';
import { ButtonColor, TableActionDef } from 'app/types/Table';
import { TableAction } from './table-action';

export class TableDeleteAction implements TableAction {
  private action: TableActionDef = {
    id: ButtonAction.DELETE,
    type: 'button',
    icon: 'delete',
    color: ButtonColor.WARN,
    name: 'general.remove',
    tooltip: 'general.tooltips.delete',
  };

  // Return an action
  public getActionDef(): TableActionDef {
    return this.action;
  }
}
