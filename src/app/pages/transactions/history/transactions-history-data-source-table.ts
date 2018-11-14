import {Observable} from 'rxjs';
import {TranslateService} from '@ngx-translate/core';
import {Router} from '@angular/router';
import {TableDataSource} from '../../../shared/table/table-data-source';
import {SubjectInfo, TableActionDef, TableColumnDef, TableDef, TableFilterDef, Transaction} from '../../../common.types';
import {CentralServerNotificationService} from '../../../services/central-server-notification.service';
import {TableAutoRefreshAction} from '../../../shared/table/actions/table-auto-refresh-action';
import {TableRefreshAction} from '../../../shared/table/actions/table-refresh-action';
import {CentralServerService} from '../../../services/central-server.service';
import {LocaleService} from '../../../services/locale.service';
import {MessageService} from '../../../services/message.service';
import {SpinnerService} from '../../../services/spinner.service';
import {Utils} from '../../../utils/Utils';
import {MatDialog} from '@angular/material';
import {UserTableFilter} from '../../../shared/table/filters/user-filter';
import {TransactionsChargerFilter} from '../filters/transactions-charger-filter';
import {TransactionsDateFromFilter} from '../filters/transactions-date-from-filter';
import {TransactionsDateUntilFilter} from '../filters/transactions-date-until-filter';
import {AppKiloUnitPipe} from '../../../shared/formatters/app-kilo-unit.pipe';
import {CurrencyPipe, PercentPipe} from '@angular/common';
import {TableDeleteAction} from '../../../shared/table/actions/table-delete-action';
import {Constants} from '../../../utils/Constants';
import {DialogService} from '../../../services/dialog.service';
import {AppDateTimePipe} from '../../../shared/formatters/app-date-time.pipe';
import {AppUserNamePipe} from '../../../shared/formatters/app-user-name.pipe';
import {AppDurationPipe} from '../../../shared/formatters/app-duration.pipe';

export class TransactionsHistoryDataSource extends TableDataSource<Transaction> {
  private readonly tableActionsRow: TableActionDef[];

  constructor(
    private localeService: LocaleService,
    private messageService: MessageService,
    private translateService: TranslateService,
    private spinnerService: SpinnerService,
    private dialogService: DialogService,
    private router: Router,
    private dialog: MatDialog,
    private centralServerNotificationService: CentralServerNotificationService,
    private centralServerService: CentralServerService,
    private appDateTimePipe: AppDateTimePipe) {
    super();

    this.tableActionsRow = [
      new TableDeleteAction().getActionDef()
    ];
  }

  public getDataChangeSubject(): Observable<SubjectInfo> {
    return this.centralServerNotificationService.getSubjectTransactions();
  }

  public loadData() {
    this.spinnerService.show();
    this.centralServerService.getTransactions(this.getFilterValues(), this.getPaging(), this.getOrdering())
      .subscribe((transactions) => {
        this.spinnerService.hide();
        this.setNumberOfRecords(transactions.count);
        this.updatePaginator();
        this.getDataSubjet().next(transactions.result);
        this.setData(transactions.result);
      }, (error) => {
        this.spinnerService.hide();
        Utils.handleHttpError(error, this.router, this.messageService, this.centralServerService,
          this.translateService.instant('general.error_backend'));
      });
  }

  public getTableDef(): TableDef {
    return {
      search: {
        enabled: true
      }
    };
  }

  public getTableColumnDefs(): TableColumnDef[] {
    const locale = this.localeService.getCurrentFullLocaleForJS();
    return [
      {
        id: 'timestamp',
        name: 'transactions.date_from',
        formatter: timestamp => this.appDateTimePipe.transform(timestamp),
        headerClass: 'col-15p',
        class: 'text-left col-15p',
        sorted: true,
        sortable: true,
        direction: 'desc'
      },
      {
        id: 'totalDurationSecs',
        name: 'transactions.duration',
        formatter: new AppDurationPipe().transform,
        headerClass: 'col-10p',
        class: 'text-left col-10p'
      },
      {
        id: 'totalInactivitySecs',
        additionalIds: ['totalDurationSecs'],
        name: 'transactions.inactivity',
        formatter: (totalInactivitySecs, totalDurationSecs) => {
          const percentage = totalDurationSecs > 0 ? totalInactivitySecs / totalDurationSecs : 0;
          return new AppDurationPipe().transform(totalInactivitySecs) +
            ` (${new PercentPipe(locale).transform(percentage, '2.0-0')})`
        },
        headerClass: 'col-10p',
        class: 'text-left col-10p'
      },
      {
        id: 'user',
        name: 'transactions.user',
        formatter: new AppUserNamePipe().transform,
        headerClass: 'col-15p',
        class: 'text-left col-15p'
      },
      {
        id: 'tagID',
        name: 'transactions.badge_id',
        headerClass: 'col-10p',
        class: 'text-left col-10p'
      },
      {
        id: 'chargeBoxID',
        additionalIds: ['connectorId'],
        name: 'transactions.charging_station',
        headerClass: 'col-10p',
        class: 'text-left col-10p',
        formatter: (chargeBoxID, connectorId) => `${chargeBoxID} (${connectorId})`
      },
      {
        id: 'totalConsumption',
        name: 'transactions.total_consumption',
        headerClass: 'text-right col-10p',
        class: 'text-right col-10p',
        formatter: (totalConsumption) => new AppKiloUnitPipe(locale).transform(totalConsumption, 'kW')
      },
      {
        id: 'price',
        additionalIds: ['priceUnit'],
        name: 'transactions.price',
        headerClass: 'text-right col-10p',
        class: 'text-right col-10p',
        formatter: (price, priceUnit) => new CurrencyPipe(locale).transform(price, priceUnit, 'symbol')
      }
    ];
  }

  public getTableActionsDef(): TableActionDef[] {
    return [
      new TableRefreshAction().getActionDef()
    ];
  }

  public getTableRowActions(): TableActionDef[] {
    return this.tableActionsRow;
  }

  public actionTriggered(actionDef: TableActionDef) {
    switch (actionDef.id) {
      default:
        super.actionTriggered(actionDef);
    }
  }

  public getTableActionsRightDef(): TableActionDef[] {
    return [
      new TableAutoRefreshAction(false).getActionDef()
    ];
  }

  public getTableFiltersDef(): TableFilterDef[] {
    return [
      new TransactionsDateFromFilter().getFilterDef(),
      new TransactionsDateUntilFilter().getFilterDef(),
      new TransactionsChargerFilter().getFilterDef(),
      new UserTableFilter().getFilterDef(),
    ];
  }

  public rowActionTriggered(actionDef: TableActionDef, rowItem) {
    switch (actionDef.id) {
      case 'delete':
        this._deleteTransaction(rowItem);
        break;
      default:
        super.rowActionTriggered(actionDef, rowItem);
    }
  }

  private _deleteTransaction(transaction) {
    this.dialogService.createAndShowYesNoDialog(
      this.dialog,
      this.translateService.instant('transactions.delete_title'),
      this.translateService.instant('transactions.delete_confirm', {'name': transaction.name})
    ).subscribe((result) => {
      if (result === Constants.BUTTON_TYPE_YES) {
        this.spinnerService.show();
        this.centralServerService.deleteTransaction(transaction.id).subscribe(response => {
          this.spinnerService.hide();
          if (response.status === Constants.REST_RESPONSE_SUCCESS) {
            this.loadData();
            this.messageService.showSuccessMessage('transactions.delete_success', {'name': transaction.name});
          } else {
            Utils.handleError(JSON.stringify(response),
              this.messageService, 'transactions.delete_error');
          }
        }, (error) => {
          this.spinnerService.hide();
          Utils.handleHttpError(error, this.router, this.messageService, this.centralServerService,
            'transactions.delete_error');
        });
      }
    });
  }
}
