import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormControl, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { Chart, ChartColor, ChartData, ChartDataSets, ChartOptions, ChartTooltipItem } from 'chart.js';
import * as moment from 'moment';
import Consumption from 'types/Consumption';

import { AuthorizationService } from '../../../../../services/authorization.service';
import { CentralServerService } from '../../../../../services/central-server.service';
import { LocaleService } from '../../../../../services/locale.service';
import { SpinnerService } from '../../../../../services/spinner.service';
import { AppDatePipe } from '../../../../../shared/formatters/app-date.pipe';
import { AppDecimalPipe } from '../../../../../shared/formatters/app-decimal-pipe';
import { AppDurationPipe } from '../../../../../shared/formatters/app-duration.pipe';
import { SiteAreaConsumption } from '../../../../../types/SiteArea';
import { ConsumptionUnit } from '../../../../../types/Transaction';
import { Utils } from '../../../../../utils/Utils';

@Component({
  selector: 'app-site-area-chart',
  templateUrl: 'site-area-consumption-chart.component.html',
})

export class SiteAreaConsumptionChartComponent implements OnInit, AfterViewInit {
  @Input() public siteAreaId!: string;
  @Input() public siteArea!: SiteAreaConsumption;

  @ViewChild('primary', { static: true }) public primaryElement!: ElementRef;
  @ViewChild('secondary', { static: true }) public secondaryElement!: ElementRef;
  @ViewChild('warning', { static: true }) public warningElement!: ElementRef;
  @ViewChild('success', { static: true }) public successElement!: ElementRef;
  @ViewChild('danger', { static: true }) public dangerElement!: ElementRef;
  @ViewChild('chart', { static: true }) public chartElement!: ElementRef;

  public selectedUnit = ConsumptionUnit.KILOWATT;
  public dateControl!: AbstractControl;
  public startDate = moment().startOf('d').toDate();
  public endDate = moment().endOf('d').toDate();
  private canCrudSiteArea = false;
  private graphCreated = false;
  private lineTension = 0;
  private data: ChartData = {
    labels: [],
    datasets: [],
  };
  private siteAreaData: any[] = [];
  private options!: ChartOptions;
  private chart!: Chart;
  private assetConsumptionsInstantPowerColor!: string;
  private assetProductionsInstantPowerColor!: string;
  private chargingStationsConsumptionsInstantPowerColor!: string;
  private netInstantPowerColor!: string;
  private limitColor!: string;
  private defaultColor!: string;
  private backgroundColor!: string;
  private language!: string;
  private activeLegend = [
    { key: this.translateService.instant('organization.graph.asset_consumption_amps') + this.translateService.instant('organization.graph.asset_consumption_watts'), hidden: false },
    { key: this.translateService.instant('organization.graph.asset_production_amps') + this.translateService.instant('organization.graph.asset_production_watts'), hidden: false },
    { key: this.translateService.instant('organization.graph.charging_station_consumption_amps') + this.translateService.instant('organization.graph.charging_station_consumption_watts'), hidden: false },
    { key: this.translateService.instant('organization.graph.net_consumption_amps') + this.translateService.instant('organization.graph.net_consumption_watts'), hidden: false }
  ];

  public constructor(
    private spinnerService: SpinnerService,
    private centralServerService: CentralServerService,
    private translateService: TranslateService,
    private localeService: LocaleService,
    private datePipe: AppDatePipe,
    private durationPipe: AppDurationPipe,
    private decimalPipe: AppDecimalPipe,
    private authorizationService: AuthorizationService) {
    this.localeService.getCurrentLocaleSubject().subscribe((locale) => {
      this.language = locale.language;
    });
    this.canCrudSiteArea = this.authorizationService.canCreateSiteArea() && this.authorizationService.canReadSiteArea() &&
      this.authorizationService.canUpdateSiteArea() && this.authorizationService.canDeleteSiteArea();
  }

  public ngOnInit() {
    // Date control
    this.dateControl = new FormControl('dateControl',
      Validators.compose([
        Validators.required,
      ]));
    this.dateControl.setValue(this.startDate);
    this.activeLegend.push(
      {
        key: this.translateService.instant('organization.graph.limit_amps') + this.translateService.instant('organization.graph.limit_watts'),
        hidden: this.canCrudSiteArea ? false : true
      },
    );
  }

  public ngAfterViewInit() {
    this.netInstantPowerColor = this.getStyleColor(this.primaryElement.nativeElement);
    this.assetProductionsInstantPowerColor = this.getStyleColor(this.successElement.nativeElement);
    this.chargingStationsConsumptionsInstantPowerColor = this.getStyleColor(this.secondaryElement.nativeElement);
    this.assetConsumptionsInstantPowerColor = this.getStyleColor(this.warningElement.nativeElement);
    this.limitColor = this.getStyleColor(this.dangerElement.nativeElement);
    this.defaultColor = this.getStyleColor(this.chartElement.nativeElement);
    this.backgroundColor = Utils.toRgba('#FFFFFF', 1);
    if (this.canDisplayGraph()) {
      this.prepareOrUpdateGraph();
    } else {
      this.refresh();
    }
  }

  public refresh() {
    this.spinnerService.show();
    // Change Date for testing e.g.:
    this.centralServerService.getSiteAreaConsumption(this.siteAreaId, this.startDate, this.endDate)
      .subscribe((siteAreaData) => {
        this.spinnerService.hide();
        this.siteArea = siteAreaData;
        this.prepareOrUpdateGraph();
      }, (error) => {
        this.spinnerService.hide();
        delete this.siteArea;
      });
  }

  public unitChanged(key: ConsumptionUnit) {
    this.spinnerService.show();
    this.selectedUnit = key;
    this.createGraphData();
    this.prepareOrUpdateGraph();
    this.spinnerService.hide();
  }

  public dateFilterChanged(value: Date) {
    if (value) {
      this.startDate = moment(value).startOf('d').toDate();
      this.endDate = moment(value).endOf('d').toDate();
      this.refresh();
    }
  }

  private getStyleColor(element: Element): string {
    const style = getComputedStyle(element);
    return style && style.color ? style.color : '';
  }

  private prepareOrUpdateGraph() {
    if (this.canDisplayGraph()) {
      if (!this.graphCreated) {
        this.graphCreated = true;
        this.options = this.createOptions();
        this.createGraphData();
        this.chart = new Chart(this.chartElement.nativeElement.getContext('2d'), {
          type: 'bar',
          data: this.data,
          options: this.options,
        });
      }
      this.createGlobalDatasetData();
      this.refreshDataSets();
      this.chart.update();
    }
  }

  private createGraphData() {
    if (this.data.datasets && this.options?.scales?.yAxes) {
      const datasets: ChartDataSets[] = [];
      // Asset Consumption Instant Amps/Power
      datasets.push({
        name: (this.selectedUnit === ConsumptionUnit.AMPERE) ? 'assetConsumptionInstantAmps' : 'assetConsumptionInstantWatts',
        type: 'line',
        hidden: this.activeLegend[this.activeLegend.findIndex((x => x.key.includes(this.translateService.instant('organization.graph.asset_consumption_amps'))))].hidden,
        data: [],
        yAxisID: 'power',
        lineTension: this.lineTension,
        ...Utils.formatLineColor(this.assetConsumptionsInstantPowerColor),
        label: this.translateService.instant((this.selectedUnit === ConsumptionUnit.AMPERE) ?
          'organization.graph.asset_consumption_amps' : 'organization.graph.asset_consumption_watts'),
      });
      // Charging Stations Consumption Instant Amps/Power
      datasets.push({
        name: (this.selectedUnit === ConsumptionUnit.AMPERE) ? 'chargingStationInstantAmps' : 'chargingStationInstantWatts',
        type: 'line',
        hidden: this.activeLegend[this.activeLegend.findIndex((x => x.key.includes(this.translateService.instant('organization.graph.charging_station_consumption_amps'))))].hidden,
        data: [],
        yAxisID: 'power',
        lineTension: this.lineTension,
        ...Utils.formatLineColor(this.chargingStationsConsumptionsInstantPowerColor),
        label: this.translateService.instant((this.selectedUnit === ConsumptionUnit.AMPERE) ?
          'organization.graph.charging_station_consumption_amps' : 'organization.graph.charging_station_consumption_watts'),
      });
      // Asset Production Instant Amps/Power
      datasets.push({
        name: (this.selectedUnit === ConsumptionUnit.AMPERE) ? 'assetProductionInstantAmps' : 'assetProductionInstantWatts',
        type: 'line',
        hidden: this.activeLegend[this.activeLegend.findIndex((x => x.key.includes(this.translateService.instant('organization.graph.asset_production_amps'))))].hidden,
        data: [],
        yAxisID: 'power',
        lineTension: this.lineTension,
        ...Utils.formatLineColor(this.assetProductionsInstantPowerColor),
        label: this.translateService.instant((this.selectedUnit === ConsumptionUnit.AMPERE) ?
          'organization.graph.asset_production_amps' : 'organization.graph.asset_production_watts'),
      });
      // Net Instant Amps/Power
      datasets.push({
        name: (this.selectedUnit === ConsumptionUnit.AMPERE) ? 'netInstantAmps' : 'netInstantWatts',
        type: 'line',
        hidden: this.activeLegend[this.activeLegend.findIndex((x => x.key.includes(this.translateService.instant('organization.graph.net_consumption_amps'))))].hidden,
        data: [],
        yAxisID: 'power',
        lineTension: this.lineTension,
        ...Utils.formatLineColor(this.netInstantPowerColor),
        label: this.translateService.instant((this.selectedUnit === ConsumptionUnit.AMPERE) ?
          'organization.graph.net_consumption_amps' : 'organization.graph.net_consumption_watts'),
      });
      // Limit Amps/Power
      datasets.push({
        name: (this.selectedUnit === ConsumptionUnit.AMPERE) ? 'limitAmps' : 'limitWatts',
        type: 'line',
        hidden: this.activeLegend[this.activeLegend.findIndex((x => x.key.includes(this.translateService.instant('organization.graph.limit_amps'))))].hidden,
        data: [],
        yAxisID: 'power',
        lineTension: this.lineTension,
        ...Utils.formatLineColor(this.limitColor),
        label: this.translateService.instant((this.selectedUnit === ConsumptionUnit.AMPERE) ?
          'organization.graph.limit_amps' : 'organization.graph.limit_watts'),
      });
      this.options.scales.yAxes = [{
        id: 'power',
        ticks: {
          callback: (value: number) => (this.selectedUnit === ConsumptionUnit.AMPERE) ? value : value / 1000,
          min: 0,
        },
      }];
      // Assign
      this.data.labels = [];
      this.data.datasets = datasets;
    }
  }

  private createGlobalDatasetData(){
    const defaultObject = {
      netConsumptionPower: 0,
      assetConsumptionPower: 0,
      assetProductionPower: 0,
      chargingStationConsumptionPower: 0,
      netConsumptionAmps: 0,
      assetConsumptionAmps: 0,
      assetProductionAmps: 0,
      chargingStationConsumptionAmps: 0,
      limitWatts: 0,
      limitAmps: 0,
      startedAt: 0
    };
    const siteAreaDataDict: any = {};
    for(const consumption of this.siteArea.values.netConsumptions){
      const key = new Date(consumption.startedAt).toTimeString();
      siteAreaDataDict[key] = { ...defaultObject };
      siteAreaDataDict[key]['netConsumptionPower'] = consumption.instantWatts;
      siteAreaDataDict[key]['netConsumptionAmps'] = consumption.instantAmps;
      siteAreaDataDict[key]['limitWatts'] = consumption.limitWatts;
      siteAreaDataDict[key]['limitAmps'] = consumption.limitAmps;
      siteAreaDataDict[key]['startedAt'] = consumption.startedAt;
    }
    for(const production of this.siteArea.values.assetProductions){
      const key = new Date(production.startedAt).toTimeString();
      siteAreaDataDict[key]['assetProductionPower'] = production.instantWatts;
      siteAreaDataDict[key]['assetProductionAmps'] = production.instantAmps;
    }
    for(const consumption of this.siteArea.values.assetConsumptions){
      const key = new Date(consumption.startedAt).toTimeString();
      siteAreaDataDict[key]['assetConsumptionPower'] = consumption.instantWatts;
      siteAreaDataDict[key]['assetConsumptionAmps'] = consumption.instantAmps;
    }
    for(const consumption of this.siteArea.values.chargingStationConsumptions){
      const key = new Date(consumption.startedAt).toTimeString();
      siteAreaDataDict[key]['chargingStationConsumptionPower'] = consumption.instantWatts;
      siteAreaDataDict[key]['chargingStationConsumptionAmps'] = consumption.instantAmps;
    }
    this.siteAreaData = [];
    //convert dictionary to array in sorted order
    Object.entries(siteAreaDataDict).forEach((data, index) => {
      this.siteAreaData.push(data[1]);
    });
    //sort the dictionary key values by time
    this.siteAreaData.sort((a, b) => a.startedAt - b.startedAt);
  }

  private getDataSet(name: string): number[] {
    if (this.data.datasets) {
      const dataSet = this.data.datasets.find((d) => (d as any).name === name);
      return dataSet ? dataSet.data as number[] : [];
    }
    return [];
  }

  private canDisplayGraph() {
    return this.siteArea?.values?.netConsumptions?.length > 0;
  }

  private refreshDataSets() {
    if (this.data.datasets) {
      for (const key of Object.keys(this.data.datasets)) {
        this.data.datasets[key].data = [];
      }
      const labels: number[] = [];
      const assetConsumptionsInstantPowerDataSet = this.getDataSet('assetConsumptionInstantWatts');
      const assetConsumptionsInstantAmpsDataSet = this.getDataSet('assetConsumptionInstantAmps');
      const assetProductionsInstantPowerDataSet = this.getDataSet('assetProductionInstantWatts');
      const assetProductionsInstantAmpsDataSet = this.getDataSet('assetProductionInstantAmps');
      const chargingStationsInstantPowerDataSet = this.getDataSet('chargingStationInstantWatts');
      const chargingStationsInstantAmpsDataSet = this.getDataSet('chargingStationInstantAmps');
      const netConsumptionsInstantPowerDataSet = this.getDataSet('netInstantWatts');
      const netConsumptionsInstantAmpsDataSet = this.getDataSet('netInstantAmps');
      const limitWattsDataSet = this.getDataSet('limitWatts');
      const limitAmpsDataSet = this.getDataSet('limitAmps');
      for (const consumption of this.siteAreaData) {
        const dateTime = new Date(consumption.startedAt);
        labels.push(dateTime.getTime());
        if (assetConsumptionsInstantPowerDataSet) {
          assetConsumptionsInstantPowerDataSet.push(consumption.assetConsumptionPower);
        }
        if (assetConsumptionsInstantAmpsDataSet) {
          assetConsumptionsInstantAmpsDataSet.push(consumption.assetConsumptionAmps);
        }
        if (assetProductionsInstantPowerDataSet) {
          assetProductionsInstantPowerDataSet.push(consumption.assetProductionPower);
        }
        if (assetProductionsInstantAmpsDataSet) {
          assetProductionsInstantAmpsDataSet.push(consumption.assetProductionAmps);
        }
        if (chargingStationsInstantPowerDataSet) {
          chargingStationsInstantPowerDataSet.push(consumption.chargingStationConsumptionPower);
        }
        if (chargingStationsInstantAmpsDataSet) {
          chargingStationsInstantAmpsDataSet.push(consumption.chargingStationConsumptionAmps);
        }
        if (netConsumptionsInstantPowerDataSet) {
          netConsumptionsInstantPowerDataSet.push(consumption.netConsumptionPower);
        }
        if (netConsumptionsInstantAmpsDataSet) {
          netConsumptionsInstantAmpsDataSet.push(consumption.netConsumptionAmps);
        }
        if (limitWattsDataSet) {
          limitWattsDataSet.push(consumption.limitWatts);
        }
        if (limitAmpsDataSet) {
          limitAmpsDataSet.push(consumption.limitAmps);
        }
      }
      this.data.labels = labels;
    }
  }

  private createOptions(): ChartOptions {
    const locale = moment.localeData(this.language);
    const options: ChartOptions = {
      animation: {
        duration: 0,
      },
      legend: {
        position: 'bottom',
        labels: {
          fontColor: this.defaultColor,
        },
        onClick: (e, legendItem) => {
          const index = legendItem.datasetIndex;
          const ci = this.chart;
          const meta = ci.getDatasetMeta(index);
          meta.hidden = meta.hidden === null ? !ci.data.datasets[index].hidden : null;
          this.activeLegend[this.activeLegend.findIndex((x => x.key.includes(legendItem.text)))].hidden = meta.hidden;
          ci.update();
        }
      },
      responsive: true,
      maintainAspectRatio: false,
      tooltips: {
        bodySpacing: 5,
        mode: 'index',
        position: 'nearest',
        intersect: false,
        callbacks: {
          labelColor: (tooltipItem: ChartTooltipItem, chart: Chart) => ({
            borderColor: 'rgba(0,0,0,0)',
            backgroundColor: this.data.datasets && tooltipItem.datasetIndex >= 0 ?
              this.data.datasets[tooltipItem.datasetIndex].borderColor as ChartColor : '',
          }),
          label: (tooltipItem: ChartTooltipItem, data: ChartData) => {
            if (this.data.datasets && data.datasets && !Utils.isUndefined(tooltipItem.datasetIndex)) {
              const dataSet = data.datasets[tooltipItem.datasetIndex];
              if (dataSet && dataSet.data && !Utils.isUndefined(tooltipItem.index)) {
                const value = dataSet.data[tooltipItem.index] as number;
                switch (this.data.datasets[tooltipItem.datasetIndex]['name']) {
                  case 'assetConsumptionInstantWatts':
                    return this.translateService.instant('organization.graph.asset_consumption_watts') + ': ' + this.decimalPipe.transform(value / 1000, '2.0-0') + 'kW';
                  case 'assetProductionInstantWatts':
                    return this.translateService.instant('organization.graph.asset_production_watts') + ': ' + this.decimalPipe.transform(value / 1000, '2.0-0') + 'kW';
                  case 'chargingStationInstantWatts':
                    return this.translateService.instant('organization.graph.charging_station_consumption_watts') + ': ' + this.decimalPipe.transform(value / 1000, '2.0-0') + 'kW';
                  case 'netInstantWatts':
                    return this.translateService.instant('organization.graph.net_consumption_watts') + ': ' + this.decimalPipe.transform(value / 1000, '2.0-0') + 'kW';
                  case 'limitWatts':
                    return this.translateService.instant('organization.graph.limit_watts') + ': ' + this.decimalPipe.transform(value / 1000, '2.0-0') + 'kW';
                  case 'assetConsumptionInstantAmps':
                    return this.translateService.instant('organization.graph.asset_consumption_amps') + ': ' + this.decimalPipe.transform(value, '2.0-0') + 'A';
                  case 'assetProductionInstantAmps':
                    return this.translateService.instant('organization.graph.asset_production_amps') + ': ' + this.decimalPipe.transform(value, '2.0-0') + 'A';
                  case 'chargingStationInstantAmps':
                    return this.translateService.instant('organization.graph.charging_station_consumption_amps') + ': ' + this.decimalPipe.transform(value, '2.0-0') + 'A';
                  case 'netInstantAmps':
                    return this.translateService.instant('organization.graph.net_consumption_amps') + ': ' + this.decimalPipe.transform(value, '2.0-0') + 'A';
                  case 'limitAmps':
                    return this.translateService.instant('organization.graph.limit_amps') + ': ' + this.decimalPipe.transform(value, '2.0-0') + 'A';
                  default:
                    return value + '';
                }
              }
            }
            return '';
          },
          title: (item: ChartTooltipItem[], data: ChartData) => {
            if (!Utils.isEmptyArray(data.labels)) {
              const firstDate = new Date(data.labels[0] as number);
              if (!Utils.isUndefined(item[0].index)) {
                const currentDate = new Date(data.labels[item[0].index] as number);
                return this.datePipe.transform(currentDate) + ' - ' +
                  this.durationPipe.transform((currentDate.getTime() - firstDate.getTime()) / 1000);
              }
            }
            return '';
          },
        },
      },
      hover: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        xAxes: [
          {
            type: 'time',
            distribution: 'linear',
            time: {
              tooltipFormat: locale.longDateFormat('LT'),
              unit: 'minute',
              displayFormats: {
                second: locale.longDateFormat('LTS'),
                minute: locale.longDateFormat('LT'),
              },
            },
            gridLines: {
              display: true,
              color: 'rgba(0,0,0,0.2)',
            },
            ticks: {
              autoSkip: true,
              maxTicksLimit: 40,
              fontColor: this.defaultColor,
            },
          },
        ],
        yAxes: [
          {
            id: 'power',
            type: 'linear',
            position: 'left',
            ticks: {
              beginAtZero: true,
              callback: (value: number) => parseInt(this.decimalPipe.transform(value, '1.0-0')),
              fontColor: this.defaultColor,
            },
            gridLines: {
              display: true,
              color: 'rgba(0,0,0,0.2)',
            },
          },
        ],
      },
    };
    return options;
  }
}
