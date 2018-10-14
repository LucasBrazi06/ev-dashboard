import { Component, OnInit, ViewChild, Input, AfterViewInit, ElementRef, OnDestroy } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { MatPaginator, MatSort, MatDialog } from '@angular/material';
import { TranslateService } from '@ngx-translate/core';
import { SelectionModel } from '@angular/cdk/collections';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { TableColumnDef, TableDef, TableFilterDef, TableActionDef, Filter, Variant, VariantResult } from '../../common.types';
import { ConfigService } from '../../services/config.service';
import { CentralServerService } from '../../services/central-server.service';
import { TableDataSource } from './table-data-source';
import { TableFilter } from './filters/table-filter';
import { Utils } from '../../utils/Utils';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

/**
 * @title Data table with sorting, pagination, and filtering.
 */
@Component({
  selector: 'app-table',
  styleUrls: ['table.component.scss'],
  templateUrl: 'table.component.html',
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({height: '0px', minHeight: '0', display: 'none'})),
      state('expanded', style({height: '*'})),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)'))
    ])
  ]
})
export class TableComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() dataSource: TableDataSource<any>;
  public columnDefs = [];
  public columns: string[];
  public pageSizes = [];
  public searchPlaceholder = '';
  public searchSourceSubject: Subject<string> = new Subject();
  public tableDef: TableDef;
  public autoRefeshChecked = true;
  public variantInputFieldValue: string;
  public variantPlaceholder = '';
  private selection: SelectionModel<any>;
  private filtersDef: TableFilterDef[] = [];
  private actionsDef: TableActionDef[] = [];
  private actionsRightDef: TableActionDef[] = [];
  private footer = false;
  private filters: TableFilter[] = [];
  private variants: Variant[];

  @ViewChild('paginator') paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('searchInput') searchInput: ElementRef;

  constructor(
      private configService: ConfigService,
      private centralServerService: CentralServerService,
      private translateService: TranslateService,
      private dialog: MatDialog) {
    // Set placeholder
    this.searchPlaceholder = this.translateService.instant('general.search');
    this.variantPlaceholder = this.translateService.instant('general.variant_placeholder');
  }

  ngOnInit() {
    // Get Table def
    this.tableDef = this.dataSource.getTableDef();
    // Get Filters def
    this.filtersDef = this.dataSource.getTableFiltersDef();
    // Get Actions def
    this.actionsDef = this.dataSource.getTableActionsDef();
    // Get Actions Right def
    this.actionsRightDef = this.dataSource.getTableActionsRightDef();
    // Get Selection Model
    this.selection = this.dataSource.getSelectionModel();
    // Get column defs
    this.columnDefs = this.dataSource.getTableColumnDefs();
    // Get columns
    this.columns = this.columnDefs.map( (column) => column.id);
    // Row Selection enabled?
    if (this.dataSource.isRowSelectionEnabled()) {
      // Yes: Add Select column
      this.columns = ['select', ...this.columns];
    }
    // Row Detailed enabled?
    if (this.dataSource.isRowDetailsEnabled()) {
      // Yes: Add Details column
      this.columns = ['details', ...this.columns];
    }
    // Paginator
    this.pageSizes = this.dataSource.getPaginatorPageSizes();
    // Find Sorted columns
    const columnDef = this.columnDefs.find((column) => column.sorted === true);
    // Found?
    if (columnDef) {
      // Yes: Set Sorting
      this.sort.active = columnDef.id;
      this.sort.direction = columnDef.direction;
    }
    // Listen to Search change
    this.searchSourceSubject.pipe(
      debounceTime(this.configService.getAdvanced().debounceTimeSearchMillis),
      distinctUntilChanged()).subscribe(() => {
        // Reset paginator
        this.paginator.pageIndex = 0;
        // Load data
        this.loadData();
      }
    );
    // Variants
     this.centralServerService
     .getVariants({
       ViewID: this.dataSource.getViewID(),
       UserID: this.centralServerService.getLoggedUser().id,
       WithGlobal: true
     })
     .subscribe(
       (variantResult: VariantResult) => {
         this.variants = variantResult.result;
       },
       error => {
         console.log(error);
       }
     );
  }

  ngAfterViewInit() {
    // Set Paginator
    this.dataSource.setPaginator(this.paginator);
    // Set Sort
    this.dataSource.setSort(this.sort);
    // Set Search
    this.dataSource.setSearchInput(this.searchInput);
    // Load the data
    this.loadData();
  }

  ngOnDestroy() {
    // Unregister
    this.dataSource.unregisterToDataChange();
  }

  /** Whether the number of selected elements matches the total number of rows. */
  public isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.getData().length;
    return numSelected === numRows;
  }

  public filterChanged(filterDef: TableFilterDef, event) {
    // Date?
    if (filterDef.type === 'date') {
      // Date is one way binding: update the value manually
      filterDef.currentValue = event.value;
    }
      // Get Actions def
    this.dataSource.filterChanged(filterDef);
  }

  public resetDialogTableFilter(filterDef: TableFilterDef) {
    filterDef.currentValue = null;
    this.dataSource.filterChanged(filterDef)
  }

  public showDialogTableFilter(filterDef: TableFilterDef) {
    // Show
    const dialogRef = this.dialog.open(filterDef.dialogComponent);
    // Add sites
    dialogRef.afterClosed().subscribe(data => {
      if (data) {
        filterDef.currentValue = data;
        this.dataSource.filterChanged(filterDef)
      }
    });
  }

  public actionTriggered(actionDef: TableActionDef, event) {
    // Slide?
    if (actionDef.type === 'slide') {
      // Slide is one way binding: update the value manually
      actionDef.currentValue = event.checked;
    }
    // Get Actions def
    this.dataSource.actionTriggered(actionDef);
  }

  // Selects all rows if they are not all selected; otherwise clear selection.
  public masterSelectToggle() {
    this.isAllSelected() ?
        this.selection.clear() :
        this.dataSource.getData().forEach(row => this.selection.select(row));
  }

  public buildRowValue(row: any, columnDef: TableColumnDef) {
    let propertyValue = row[columnDef.id];

    // Check if ID contains multiple IDs
    if (columnDef.id.indexOf('.') > 0) {
      // Yes: get the sub-property
      propertyValue = row;
      // Get the Json value
      columnDef.id.split('.').forEach((id) => {
        propertyValue = propertyValue[id];
      });
    }

    // Type?
    switch (columnDef.type) {
      // Date
      case 'date':
        propertyValue = Utils.convertToDate(propertyValue);
        break;
      // Integer
      case 'integer':
        propertyValue = Utils.convertToInteger(propertyValue);
        break;
        // Float
      case 'float':
        propertyValue = Utils.convertToFloat(propertyValue);
        break;
    }

    // Format?
    if (columnDef.formatter) {
      // Yes
      propertyValue = columnDef.formatter(propertyValue, columnDef.formatterOptions);
    }
    // Return the property
    return propertyValue;
  }

  public handleSortChanged() {
    // Reset paginator
    this.paginator.pageIndex = 0;
    // Clear Selection
    this.selection.clear();
    // Load data
    this.loadData();
  }

  public handlePageChanged() {
    // Clear Selection
    this.selection.clear();
    // Load data
    this.loadData();
  }

  public loadData() {
    // Load data source
    this.dataSource.loadData();
  }

  public showHideDetailsClicked(row) {
    // Already Expanded
    if (!row.isExpanded) {
      // Already loaded?
      if (!row[this.tableDef.rowDetails.detailsField]) {
        // No: Load details from data source
        this.dataSource.getRowDetails(row).subscribe((details) => {
          // Set details
          row[this.tableDef.rowDetails.detailsField] = details;
          // No: Expand it!
          row.isExpanded = true;
        });
      } else {
        // No: Expand it!
        row.isExpanded = true;
      }
    } else {
      // Fold it
      row.isExpanded = false;
    }
  }

  public handleVariantChanged(variant) {
    this.dataSource.variantChanged(variant);
  }

  public handleDeleteVariant() {
    const variant = this.dataSource.getSelectedVariant();
    // Delete
    this.centralServerService.deleteVariant(variant).subscribe(
      (result) => {
        if (result) {
          this.dataSource.variantDeleted(variant);
        }
      },
      (error) => {
        console.log(error);
      }
    );
  }

  public handleSaveVariant() {
    const createdVariant: Variant = {id: '', name: '', viewID: '', userID: '', filters: []};
    // Filters
    const filters = this.dataSource.getFilterValues();
    for (const key in filters) {
      if (filters.hasOwnProperty(key)) {
        const filter: Filter = { filterID: key, filterContent: filters[key] };
        createdVariant.filters.push(filter);
      }
    }
    // Create or Update?
      const foundVariant = this.dataSource.getSelectedVariant();
      if (!foundVariant) {
        // Create
        createdVariant.name = this.variantInputFieldValue;
        createdVariant.viewID = this.dataSource.getViewID();
        createdVariant.userID = this.centralServerService.getLoggedUser().id;
        this.centralServerService.createVariant(createdVariant).subscribe(
          result => {
            if (result) {
              this.dataSource.variantCreated(result);
            }
          },
          error => {
            console.log(error);
          }
        );
      } else {
        // Update
        foundVariant.filters = JSON.parse(JSON.stringify(createdVariant.filters));
        this.centralServerService.updateVariant(foundVariant).subscribe(
          result => {
            if (result) {
              this.dataSource.variantUpdated(foundVariant);
            }
          },
          error => {
            console.log(error);
          }
        );
      }
  }

}
