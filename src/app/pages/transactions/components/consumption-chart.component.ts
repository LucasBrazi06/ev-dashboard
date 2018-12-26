import {Component, ViewChild} from '@angular/core';
import {ConsumptionValue, TableDef, Transaction} from '../../../common.types';
import {DetailComponent} from '../../../shared/table/detail-component/detail-component.component';
import {ConfigService} from '../../../services/config.service';
import {CentralServerService} from '../../../services/central-server.service';
import {TranslateService} from '@ngx-translate/core';
import {LocaleService} from '../../../services/locale.service';
import {DecimalPipe} from '@angular/common';
import {AppDatePipe} from '../../../shared/formatters/app-date.pipe';
import * as moment from 'moment';
import {ChartComponent} from 'angular2-chartjs';

@Component({
  selector: 'app-transaction-chart',
  styleUrls: ['consumption-chart.component.scss'],
  template: `
    <div class="chart-container">
      <div class="chart">
        <chart  #chart *ngIf="data"
               type="line"
               [data]="data"
               [options]="options"></chart>
      </div>
      <div class="icon-left">
        <a
          [class]="'btn btn-link btn-info btn-just-icon'"
          (click)="resetZoom()"><i class="material-icons">zoom_out_map</i></a>
      </div>
    </div>
  `
})

export class ConsumptionChartComponent implements DetailComponent {
  data: any;
  options: any;
  @ViewChild('chart') chartComponent: ChartComponent;

  constructor(private configService: ConfigService,
              private centralServerService: CentralServerService,
              private translateService: TranslateService,
              private localeService: LocaleService,
              private datePipe: AppDatePipe,
              private decimalPipe: DecimalPipe) {

  }

  resetZoom() {
    this.chartComponent.chart.resetZoom();
  }

  setData(row: Transaction, tabledef: TableDef) {

    this.centralServerService.getChargingStationConsumptionFromTransaction(row.id).subscribe(transaction => {
      const consumptions = transaction.values;
      this.options = this.createOptions(consumptions);
      let distanceBetween2points = Math.floor(consumptions.length / 200);
      // if (distanceBetween2points < 2) {
        distanceBetween2points = 1;
      // }
      const labels = [];
      const chargingPowerDataSet = {
        data: [],
        yAxisID: 'power',
        ...this.formatLineColor([255, 99, 132]),
        label: this.translateService.instant('transactions.graph.power')
      };
      const cumulatedDataSet = {
        data: [],
        yAxisID: 'power',
        ...this.formatLineColor([54, 162, 235]),
        label: this.translateService.instant('transactions.graph.energy')
      };
      const stateOfChargeDataSet = {
        data: [],
        yAxisID: 'percentage',
        ...this.formatLineColor([255, 206, 86]),
        label: this.translateService.instant('transactions.graph.battery')
      };

      for (let i = 0; i < consumptions.length; i += distanceBetween2points) {
        const consumption = consumptions[i];
        labels.push(new Date(consumption.date).getTime());
        chargingPowerDataSet.data.push(consumption.value);
        cumulatedDataSet.data.push(consumption.cumulated);
        if (consumption.stateOfCharge) {
          stateOfChargeDataSet.data.push(consumption.stateOfCharge);
        }
      }
      this.data = {
        labels: labels,
        datasets: [chargingPowerDataSet, cumulatedDataSet]
      };
      if (stateOfChargeDataSet.data.length > 0) {
        this.data.datasets.push(stateOfChargeDataSet);
        this.options.scales.yAxes.push({
          id: 'percentage',
          type: 'linear',
          position: 'right',
          ticks: {
            callback: (value, index, values) => `${value}%`
          }
        });
      }

    });
  }

  createOptions(consumptions: ConsumptionValue[]) {
    const options: any = {
      legend: {position: 'bottom'},
      responsive: true,
      aspectRatio: 4,
      tooltips: {
        mode: 'index',
        position: 'nearest',
        intersect: false,
        callbacks: {
          label: (tooltipItem, values) => {
            const value = values.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
            switch (tooltipItem.datasetIndex) {
              case 0:
                return this.decimalPipe.transform(value / 1000, '2.2-2') + 'kW';
              case 1:
                return this.decimalPipe.transform(value / 1000, '2.2-2') + 'kWh';
              case 2:
                return `${value}%`;
            }
          },
          title: (tooltipItems, data) => {
            const firstDate = data.labels[0];
            const currentDate = data.labels[tooltipItems[0].index];

            return this.datePipe.transform(currentDate, this.localeService.getCurrentFullLocaleForJS(), 'time') +
              ' - ' + moment.duration(moment(currentDate).diff(firstDate)).format('h[h]mm[m]', {trim: false});
          }
        }
      },
      hover: {
        mode: 'index',
        intersect: false
      },
      scales: {
        xAxes: [
          {
            type: 'time',
            time: {
              tooltipFormat: 'h:mm a',
            }
          }
        ],
        yAxes: [
          {
            id: 'power',
            type: 'linear',
            position: 'left',
            ticks: {
              callback: (value, index, values) => this.decimalPipe.transform(value / 1000)
            }
          }
        ]
      },
      pan: {
        enabled: true,
        mode: 'x',
        rangeMin: {
          x: new Date(consumptions[0].date).getTime(),
        },
        rangeMax: {
          x: new Date(consumptions[consumptions.length - 1].date).getTime()
        },
      },
      zoom: {
        enabled: true,
        drag: false,
        mode: 'x',
        sensitivity: 10
      }
    };
    if (this.localeService.language === 'fr') {
      options.scales.xAxes[0].time = {
        tooltipFormat: 'HH:mm',
        displayFormats: {
          millisecond: 'HH:mm:ss.SSS',
          second: 'HH:mm:ss',
          minute: 'HH:mm',
          hour: 'HH'
        }
      };
    }
    return options;
  }

  formatLineColor(colors: Array<number>): any {
    return {
      backgroundColor: this.rgba(colors, 0.4),
      borderColor: this.rgba(colors, 1),
      pointRadius: 0,
      pointHoverBackgroundColor: this.rgba(colors, 1),
      pointHoverBorderColor: '#fff'
    };
  }

  rgba(colour: Array<number>, alpha: number): string {
    return 'rgba(' + colour.concat(alpha).join(',') + ')';
  }
}
