import {Observable} from 'rxjs';
import {TranslateService} from '@ngx-translate/core';
import {Router} from '@angular/router';
import {ActionResponse, SubjectInfo, TableActionDef, TableColumnDef, TableDef, TableFilterDef, Transaction} from '../../../common.types';
import {CentralServerNotificationService} from '../../../services/central-server-notification.service';
import {CentralServerService} from '../../../services/central-server.service';
import {MessageService} from '../../../services/message.service';
import {SpinnerService} from '../../../services/spinner.service';
import {Utils} from '../../../utils/Utils';
import {MatDialog} from '@angular/material';
import {UserTableFilter} from '../../../shared/table/filters/user-filter';
import {TransactionsChargerFilter} from '../filters/transactions-charger-filter';
import {TransactionsDateFromFilter} from '../filters/transactions-date-from-filter';
import {TransactionsDateUntilFilter} from '../filters/transactions-date-until-filter';
import {AppUnitPipe} from '../../../shared/formatters/app-unit.pipe';
import {CurrencyPipe, PercentPipe} from '@angular/common';
import {DialogService} from '../../../services/dialog.service';
import {AppDatePipe} from '../../../shared/formatters/app-date.pipe';
import {Injectable} from '@angular/core';
import {AppConnectorIdPipe} from '../../../shared/formatters/app-connector-id.pipe';
import {AppUserNamePipe} from '../../../shared/formatters/app-user-name.pipe';
import {AppDurationPipe} from '../../../shared/formatters/app-duration.pipe';
import {LocaleService} from '../../../services/locale.service';
import {TableDeleteAction} from '../../../shared/table/actions/table-delete-action';
import {Constants} from '../../../utils/Constants';
import {TableAutoRefreshAction} from '../../../shared/table/actions/table-auto-refresh-action';
import {TableRefreshAction} from '../../../shared/table/actions/table-refresh-action';
import {TableDataSource} from '../../../shared/table/table-data-source';
import {ConsumptionChartDetailComponent} from '../components/consumption-chart-detail.component';
import * as moment from 'moment';

@Injectable()
export class TransactionsHistoryDataSource extends TableDataSource<Transaction> {

  private isAdmin = false;

  constructor(
    private messageService: MessageService,
    private translateService: TranslateService,
    private spinnerService: SpinnerService,
    private dialogService: DialogService,
    private localeService: LocaleService,
    private router: Router,
    private dialog: MatDialog,
    private centralServerNotificationService: CentralServerNotificationService,
    private centralServerService: CentralServerService,
    private appDatePipe: AppDatePipe,
    private appUnitPipe: AppUnitPipe,
    private percentPipe: PercentPipe,
    private appConnectorIdPipe: AppConnectorIdPipe,
    private appUserNamePipe: AppUserNamePipe,
    private appDurationPipe: AppDurationPipe,
    private currencyPipe: CurrencyPipe) {
    super()
  }

  public getDataChangeSubject(): Observable<SubjectInfo> {
    return this.centralServerNotificationService.getSubjectTransactions();
  }

  public loadData(refreshAction = false) {
    if (!refreshAction) {
      this.spinnerService.show();
    }
    this.centralServerService.getTransactions(this.getFilterValues(), this.getPaging(), this.getOrdering())
      .subscribe((transactions) => {
        if (!refreshAction) {
          this.spinnerService.hide();
        }
        this.setNumberOfRecords(transactions.count);
        this.updatePaginator();
        this.setData(transactions.result);
      }, (error) => {
        if (!refreshAction) {
          this.spinnerService.hide();
        }
        Utils.handleHttpError(error, this.router, this.messageService, this.centralServerService,
          this.translateService.instant('general.error_backend'));
      });
  }

  public getTableDef(): TableDef {
    return {
      search: {
        enabled: true
      },
      rowDetails: {
        enabled: true,
        isDetailComponent: true,
        detailComponentName: ConsumptionChartDetailComponent
      }
    };
  }

  public getTableColumnDefs(): TableColumnDef[] {
    const locale = this.localeService.getCurrentFullLocaleForJS();
    const columns = [
      {
        id: 'timestamp',
        name: 'transactions.started_at',
        headerClass: 'col-15p',
        class: 'text-left col-15p',
        sorted: true,
        sortable: true,
        direction: 'desc',
        formatter: (value) => this.appDatePipe.transform(value, locale, 'datetime')
      },
      {
        id: 'user',
        name: 'transactions.user',
        headerClass: 'col-20p',
        class: 'text-left col-20p',
        formatter: (value) => this.appUserNamePipe.transform(value)
      },
      {
        id: 'stop.totalDurationSecs',
        name: 'transactions.duration',
        headerClass: 'col-10p',
        class: 'text-left col-10p',
        formatter: (totalDurationSecs) => this.appDurationPipe.transform(totalDurationSecs)
      },
      {
        id: 'stop.totalInactivitySecs',
        name: 'transactions.inactivity',
        headerClass: 'col-10p',
        class: 'text-left col-10p',
        formatter: (totalInactivitySecs, row) => this.formatInactivity(totalInactivitySecs, row)
      },
      {
        id: 'chargeBoxID',
        name: 'transactions.charging_station',
        headerClass: 'col-10p',
        class: 'text-left col-10p',
        formatter: (chargingStation, row) => this.formatChargingStation(chargingStation, row)
      },
      {
        id: 'tagID',
        name: 'transactions.badge_id',
        headerClass: 'col-10p d-none d-xl-table-cell',
        class: 'text-left col-10p d-none d-xl-table-cell',
      },
      {
        id: 'stop.totalConsumption',
        name: 'transactions.total_consumption',
        headerClass: 'col-10p',
        class: 'col-10p',
        formatter: (totalConsumption) => this.appUnitPipe.transform(totalConsumption, 'Wh', 'kWh')
      }
    ];
    if (this.isAdmin) {
      columns.push({
        id: 'stop.price',
        name: 'transactions.price',
        headerClass: 'col-10p d-none d-xl-table-cell',
        class: 'col-10p d-none d-xl-table-cell',
        formatter: (price, row) => this.formatPrice(price, row.stop.priceUnit)
      })
    }
    return columns as TableColumnDef[];
  }

  formatInactivity(totalInactivitySecs, row) {
    const percentage = row.stop.totalDurationSecs > 0 ? (totalInactivitySecs / row.stop.totalDurationSecs) : 0;
    if (percentage === 0) {
      return '';
    }
    return this.appDurationPipe.transform(totalInactivitySecs) +
      ` (${this.percentPipe.transform(percentage, '2.0-0')})`
  }

  formatChargingStation(chargingStation, row) {
    return `${chargingStation} - ${this.appConnectorIdPipe.transform(row.connectorId)}`;
  }

  formatPrice(price, priceUnit): string {
    return this.currencyPipe.transform(price, priceUnit);
  }

  getTableFiltersDef(): TableFilterDef[] {
    return [
      new TransactionsDateFromFilter(moment().startOf('y').toDate()).getFilterDef(),
      new TransactionsDateUntilFilter().getFilterDef(),
      new TransactionsChargerFilter().getFilterDef(),
      new UserTableFilter().getFilterDef()
    ];
  }


  getTableRowActions(): TableActionDef[] {
    const rowActions = [];
    if (this.isAdmin) {
      rowActions.push(new TableDeleteAction().getActionDef());
    }
    return rowActions;
  }

  canDisplayRowAction(actionDef: TableActionDef, transaction: Transaction) {
    switch (actionDef.id) {
      case 'delete':
        return this.isAdmin;
      case 'refund':
        if (transaction.hasOwnProperty('refund')) {
          return false;
        }
        return true;
      default:
        return true;
    }
  }

  rowActionTriggered(actionDef: TableActionDef, transaction: Transaction) {
    switch (actionDef.id) {
      case 'delete':
        this.dialogService.createAndShowYesNoDialog(
          this.dialog,
          this.translateService.instant('transactions.dialog.delete.title'),
          this.translateService.instant('transactions.dialog.delete.confirm', {user: this.appUserNamePipe.transform(transaction.user)})
        ).subscribe((response) => {
          if (response === Constants.BUTTON_TYPE_YES) {
            this._deleteTransaction(transaction);
          }
        });
        break;
      default:
        super.rowActionTriggered(actionDef, transaction);
    }
  }

  getTableActionsRightDef(): TableActionDef[] {
    return [
      new TableAutoRefreshAction(false).getActionDef(),
      new TableRefreshAction().getActionDef()
    ];
  }

  forAdmin(isAdmin: boolean) {
    this.isAdmin = isAdmin
  }

  definePollingIntervalStrategy() {
    this.setPollingInterval(30000);
  }

  protected _deleteTransaction(transaction: Transaction) {
    this.centralServerService.deleteTransaction(transaction.id).subscribe((response: ActionResponse) => {
      this.messageService.showSuccessMessage(
        // tslint:disable-next-line:max-line-length
        this.translateService.instant('transactions.notification.delete.success', {user: this.appUserNamePipe.transform(transaction.user)}));
      this.loadData();
    }, (error) => {
      Utils.handleHttpError(error, this.router, this.messageService, this.centralServerService,
        this.translateService.instant('transactions.notification.delete.error'));
    });
  }
}
