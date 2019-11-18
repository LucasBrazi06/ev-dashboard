import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StatisticData } from '../../../common.types';
import { LocaleService } from '../../../services/locale.service';
import { ChartConstants, ChartData } from './chart-utilities';

import * as moment from 'moment';

export interface StatisticsBuildValueWithUnit {
  value: number;
  unit: string;
}

@Injectable()
export class StatisticsBuildService {
  private totalLabel: string;
  private monthLabel: string;
  private unitLabel: string;
  private language: string;

  constructor(
    private translateService: TranslateService,
    private localeService: LocaleService) {
    this.totalLabel = this.translateService.instant('statistics.total');
    if (this.totalLabel === '') {
      this.totalLabel = 'Total'; // should never happen
    }
    this.monthLabel = 'month';
    this.unitLabel = 'unit';
    this.localeService.getCurrentLocaleSubject().subscribe((locale) => {
      this.language = locale.language;
    });
  }

  public buildStackedChartDataForMonths(statisticsData: StatisticData[], roundingDecimals: number = 0,
                                        addUnitToLabel = false,
                                        sortedBy: 'label-asc' | 'label-desc' | 'size-asc' | 'size-desc' = 'size-desc',
                                        maxNumberOfItems = 20): ChartData {

    const stackedChartData: ChartData = { labels: [], datasets: [] };

    let roundingFactor = 1;
    let monthString = '';
    let dataSetIndex = 0;
    let monthIndex = 0;
    let countMonths = 0;
    let newKey = '';
    let numberArray = [];
    let sum = 0;

    const totalDataArray = [];
    const transactionValues = statisticsData;

    if (roundingDecimals !== 0) {
      if (roundingDecimals > 0) {
        for (let i = 0; i < roundingDecimals; i++) {
          roundingFactor *= 10;
        }
      } else {
        for (let i = roundingDecimals; i < 0; i++) {
          roundingFactor /= 10;
        }
      }
    }

    if (transactionValues && transactionValues.length > 0) {
      transactionValues.forEach((transactionValue) => {
        // for each month (sorted from 0 to 11, but attention, multiple month values are possible if multiple units!):
        let totalValuePerMonth = 0;
        let newMonth = false;

        monthIndex = transactionValue.month;
        monthString = moment().locale(this.language).month(monthIndex).format('MMMM');

        const currentIndex = stackedChartData.labels.indexOf(monthString);

        if (currentIndex < 0) {
          countMonths++;
          newMonth = true;
          stackedChartData.labels.push(monthString);
        }

        // now for all items:
        for (const key in transactionValue) {
          if ((key !== this.monthLabel)
            && (key !== this.unitLabel)) {

            // Round
            transactionValue[key] *= roundingFactor;
            transactionValue[key] = Math.round(transactionValue[key]);
            transactionValue[key] /= roundingFactor;

            if (transactionValue[key] && transactionValue[key] !== 0) {
              if (addUnitToLabel && (this.unitLabel in transactionValue)) {
                newKey = key + ` [${transactionValue[this.unitLabel]}]`;
              } else {
                newKey = key;
              }

              dataSetIndex = stackedChartData.datasets.findIndex((dataset) => dataset['label'] === newKey);

              if (dataSetIndex < 0) {
                numberArray = [];

                for (let i = 1; i < countMonths; i++) {
                  // add leading zeros for previous months without activity
                  numberArray.push(0);
                }

                numberArray.push(transactionValue[key]);
                stackedChartData.datasets.push({ label: newKey, data: numberArray, stack: ChartConstants.STACKED_ITEM });
              } else {
                numberArray = stackedChartData.datasets[dataSetIndex].data;
                if (newMonth) {
                  numberArray.push(transactionValue[key]);
                } else {
                  let monthlyNumber = numberArray[countMonths - 1];
                  if (typeof (monthlyNumber) === 'number') {
                    monthlyNumber += transactionValue[key];
                    numberArray[countMonths - 1] = monthlyNumber;
                  }
                }
                stackedChartData.datasets[dataSetIndex].data = numberArray;
              }

              totalValuePerMonth += transactionValue[key];
            }
          }
        }

        // add trailing zero if no activity in the current month:
        stackedChartData.datasets.forEach((dataset) => {
          if (dataset.stack !== ChartConstants.STACKED_TOTAL) {
            numberArray = dataset.data;
            if (numberArray.length < countMonths) {
              for (let i = numberArray.length; i < countMonths; i++) {
                numberArray.push(0);
              }
              dataset.data = numberArray;
            }
          }
        });

        // Deferred update for totals:
        if (newMonth) {
          totalDataArray.push(totalValuePerMonth);
        } else {
          let totalNumber = totalDataArray[currentIndex];
          if (typeof (totalNumber) === 'number') {
            totalNumber += totalValuePerMonth;
            totalDataArray[currentIndex] = totalNumber;
          }
        }
      });

      // sort datasets:
      if (sortedBy.startsWith('size-')) {
        // add totals at index position 0, to be used for sorting:
        stackedChartData.datasets.forEach((dataset) => {
          numberArray = dataset.data;
          sum = 0;
          numberArray.forEach((numberItem) => {
            if (typeof (numberItem) === 'number') {
              sum += numberItem;
            }
          });
          numberArray.unshift(sum);
          dataset.data = numberArray;
        });
      }

      stackedChartData.datasets.sort((dataset1, dataset2) => {
        switch (sortedBy) {
          case 'label-asc':
            if (dataset1.label < dataset2.label) {
              return -1;
            } else {
              if (dataset1.label > dataset2.label) {
                return 1;
              } else {
                return 0;
              }
            }
          case 'label-desc':
            if (dataset1.label > dataset2.label) {
              return -1;
            } else {
              if (dataset1.label < dataset2.label) {
                return 1;
              } else {
                return 0;
              }
            }
          case 'size-asc':
            if (dataset1.data[0] < dataset2.data[0]) {
              return -1;
            } else {
              if (dataset1.data[0] > dataset2.data[0]) {
                return 1;
              } else {
                return 0;
              }
            }
          case 'size-desc':
            if (dataset1.data[0] > dataset2.data[0]) {
              return -1;
            } else {
              if (dataset1.data[0] < dataset2.data[0]) {
                return 1;
              } else {
                return 0;
              }
            }
        }
      });

      if (sortedBy.startsWith('size-')) {
        // remove calculated totals again:
        stackedChartData.datasets.forEach((dataset) => {
          dataset.data.splice(0, 1);
        });
      }

      if (maxNumberOfItems > 0 && stackedChartData.datasets.length > maxNumberOfItems) {
        // push everything into the last dataset:
        const lastValidIndex = maxNumberOfItems - 1;
        let dataItem: any;
        stackedChartData.datasets[lastValidIndex].label = this.translateService.instant('statistics.others');
        for (let i = stackedChartData.datasets.length - 1; i > lastValidIndex; i--) {
          numberArray = stackedChartData.datasets[i].data;
          numberArray.forEach((numberItem, index) => {
            dataItem = stackedChartData.datasets[lastValidIndex].data[index];
            if (typeof (dataItem) === 'number' && typeof (numberItem) === 'number') {
              dataItem += numberItem;
              stackedChartData.datasets[lastValidIndex].data[index] = dataItem;
            }
          });
          stackedChartData.datasets.pop();
        }
      }

      // Last chart dataset for totals:
      stackedChartData.datasets.push({ label: this.totalLabel, data: totalDataArray, stack: ChartConstants.STACKED_TOTAL });
    }

    return stackedChartData;
  }

  public calculateTotalValueFromChartData(chartData: ChartData): number {
    let totalValue = 0;
    let dataSetIndex = 0;
    let numberArray = [];

    // is the chart a stacked chart (with totals)?
    dataSetIndex = chartData.datasets.findIndex((dataset) => dataset.stack === ChartConstants.STACKED_TOTAL);
    if (dataSetIndex < 0) {
      // no, it is a simple chart
      if (chartData.datasets.length > 0) {
        numberArray = chartData.datasets[0].data;
        if (Array.isArray(numberArray)) {
          numberArray.forEach((numberValue) => {
            if (typeof (numberValue) === 'number') {
              totalValue += numberValue;
            }
          });
        }
      }
    } else {
      // yes, it is a stacked chart with totals
      numberArray = chartData.datasets[dataSetIndex].data;
      if (Array.isArray(numberArray)) {
        numberArray.forEach((numberValue) => {
          if (typeof (numberValue) === 'number') {
            totalValue += numberValue;
          }
        });
      }
    }
    return totalValue;
  }

  public calculateTotalChartDataFromStackedChartData(stackedChartData: ChartData): ChartData {
    const totalChartData: ChartData = { labels: [], datasets: [] };
    let totalValue = 0;
    let numberArray = [];

    stackedChartData.datasets.forEach((dataset) => {
      if (dataset.stack !== ChartConstants.STACKED_TOTAL) {
        totalChartData.labels.push(dataset.label);

        totalValue = 0;
        numberArray = dataset.data;
        if (Array.isArray(numberArray)) {
          numberArray.forEach((numberValue) => {
            if (typeof (numberValue) === 'number') {
              totalValue += numberValue;
            }
          });
        }

        if (totalChartData.datasets.length === 0) {
          numberArray = [];
          numberArray.push(totalValue);
          totalChartData.datasets.push({ data: numberArray }); // no 'label, no 'stack'
        } else {
          numberArray = totalChartData.datasets[0].data;
          numberArray.push(totalValue);
          totalChartData.datasets[0].data = numberArray;
        }
      }
    });

    return totalChartData;
  }

  public countNumberOfChartItems(chartData: ChartData): number {
    let count = 0;

    if (chartData.datasets.length === 1) {
      count = chartData.datasets[0].data.length;
    } else {
      chartData.datasets.forEach((dataset) => {
        if (dataset.stack !== ChartConstants.STACKED_TOTAL) {
          count++;
        }
      });
    }

    return count;
  }

  public calculateTotalsWithUnits(statisticsData: any,
                                  roundingDecimals: number = 0,
                                  ignoreEmptyUnit = true): StatisticsBuildValueWithUnit[] {

    let roundingFactor = 1;
    let index = 0;
    let localString: any;
    let localNumber: any;
    let unitFound = false;
    let lastUnit: string;
    let totalOfLastUnit = 0;
    let totalWithUnit: StatisticsBuildValueWithUnit;
    const totalsWithUnit: StatisticsBuildValueWithUnit[] = [];

    const transactionValues = statisticsData;

    if (roundingDecimals !== 0) {
      if (roundingDecimals > 0) {
        for (let i = 0; i < roundingDecimals; i++) {
          roundingFactor *= 10;
        }
      } else {
        for (let i = roundingDecimals; i < 0; i++) {
          roundingFactor /= 10;
        }
      }
    }

    if (transactionValues && transactionValues.length > 0) {
      transactionValues.forEach((transactionValue: { [x: string]: number | string; }) => {

        totalWithUnit = { value: 0, unit: '' };
        unitFound = false;
        for (const key in transactionValue) {
          if (key === this.unitLabel) {
            localString = transactionValue[key];
            if (typeof (localString) === 'string') {
              unitFound = true;
              totalWithUnit.unit = localString;
              if (totalWithUnit.unit === lastUnit) {
                totalWithUnit.value += totalOfLastUnit;
              } else if (totalOfLastUnit && totalOfLastUnit !== 0) {
                index = totalsWithUnit.findIndex((record) => record.unit === lastUnit);
                if (index < 0) {
                  totalsWithUnit.push({ value: totalOfLastUnit, unit: lastUnit });
                } else {
                  totalsWithUnit[index].value += totalOfLastUnit;
                }
                totalOfLastUnit = 0;
              }
            }
          } else if (key !== this.monthLabel) {
            localNumber = transactionValue[key];
            if (typeof (localNumber) === 'number') {
              // Round
              localNumber *= roundingFactor;
              localNumber = Math.round(localNumber);
              localNumber /= roundingFactor;
              totalWithUnit.value += localNumber;
            }
          }
        }
        if (!unitFound) {
          if (totalWithUnit.unit === lastUnit) {
            totalWithUnit.value += totalOfLastUnit;
          } else if (totalOfLastUnit && totalOfLastUnit !== 0) {
            index = totalsWithUnit.findIndex((record) => record.unit === lastUnit);
            if (index < 0) {
              totalsWithUnit.push({ value: totalOfLastUnit, unit: lastUnit });
            } else {
              totalsWithUnit[index].value += totalOfLastUnit;
            }
            totalOfLastUnit = 0;
          }
        }
        lastUnit = totalWithUnit.unit;
        totalOfLastUnit = totalWithUnit.value;
      });
      // Save the last unit
      index = totalsWithUnit.findIndex((record) => record.unit === lastUnit);
      if (index < 0) {
        totalsWithUnit.push({ value: totalOfLastUnit, unit: lastUnit });
      } else {
        totalsWithUnit[index].value += totalOfLastUnit;
      }
    }

    if (ignoreEmptyUnit && totalsWithUnit.length === 2) {
      index = totalsWithUnit.findIndex((record) => record.unit === '');
      if (index > -1) {
        totalOfLastUnit = totalsWithUnit[index].value;
        totalsWithUnit.splice(index, 1);
        totalsWithUnit[0].value += totalOfLastUnit;
      }
    }

    return totalsWithUnit;
  }

}
