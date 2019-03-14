import {Component, OnInit} from '@angular/core';
import {ChargingStationsListDataSource} from './charging-stations-list-data-source-table';

@Component({
  selector: 'app-charging-stations-list',
  templateUrl: 'charging-stations-list.component.html',
  styleUrls: ['../charging-stations-data-source-table.scss'],
  styles: ['.fulldetails app-detail-component-container{width: 100%}'],
  providers: [
    ChargingStationsListDataSource
  ]
})
export class ChargingStationsListComponent implements OnInit {
  constructor(
    public chargingStationsListDataSource: ChargingStationsListDataSource
  ) {
  }

  ngOnInit() {
    // Scroll up
    jQuery('html, body').animate({scrollTop: 0}, {duration: 500});
  }
}
