import { ButtonAction } from '../../../types/GlobalType';
import { ButtonColor, TableActionDef } from '../../../types/Table';
import { TableAction } from './table-action';

export class TableMoveAction implements TableAction {
  private action: TableActionDef = {
    id: ButtonAction.MOVE,
    type: 'button',
    icon: 'arrow_forward',
    color: ButtonColor.PRIMARY,
    name: 'general.move',
    tooltip: 'general.tooltips.move',
  };

  // Return an action
  public getActionDef(): TableActionDef {
    return this.action;
  }
}
