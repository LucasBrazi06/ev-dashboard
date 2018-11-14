import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {TranslateModule} from '@ngx-translate/core';

import {MaterialModule} from '../../app.module';
import {TransactionsComponent} from './transactions.component';
import {TransactionsRoutes} from './transactions.routing';
import {DialogsModule} from '../../shared/dialogs/dialogs.module';
import {TableModule} from '../../shared/table/table.module';
import {TransactionsHistoryComponent} from './history/transactions-history.component';
import {TransactionsInProgressComponent} from './inProgress/transactions-in-progress.component';
import {CommonDirectivesModule} from '../../shared/directives/common-directives.module';
import {FormattersModule} from '../../shared/formatters/formatters.module';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(TransactionsRoutes),
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    MaterialModule,
    TableModule,
    CommonDirectivesModule,
    DialogsModule,
    FormattersModule
  ],
  declarations: [
    TransactionsComponent,
    TransactionsHistoryComponent,
    TransactionsInProgressComponent
  ],
  entryComponents: [
    TransactionsComponent,
    TransactionsHistoryComponent,
    TransactionsInProgressComponent
  ],
  exports: [
    TransactionsComponent
  ]
})

export class TransactionsModule {
}
