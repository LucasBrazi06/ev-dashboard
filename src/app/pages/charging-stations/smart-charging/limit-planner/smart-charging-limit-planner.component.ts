import { Component, OnInit, Input, ViewChildren, QueryList, Output, DoCheck, EventEmitter, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AuthorizationService } from '../../../../services/authorization-service';
import { Charger, ScheduleSlot, ConnectorSchedule } from 'app/common.types';
import { SmartChargingPowerSliderComponent } from '../smart-charging-power-slider.component';
import { MatDialog } from '@angular/material';
import { Router } from '@angular/router';
import { DialogService } from 'app/services/dialog.service';
import { CentralServerService } from 'app/services/central-server.service';
import { MessageService } from 'app/services/message.service';
import { SpinnerService } from 'app/services/spinner.service';
import { Constants } from 'app/utils/Constants';
import { Utils } from 'app/utils/Utils';
import { SmartChargingLimitPlannerChartComponent } from './smart-charging-limit-planner-chart.component';
import { ChargingStations } from 'app/utils/ChargingStations';
import { FormGroup, AbstractControl, FormControl, Validators } from '@angular/forms';

interface DisplayedSlot extends ScheduleSlot {
  displayedLimitInkW: number,
}
export interface DisplayedScheduleSlot {
  slot: DisplayedSlot,
  id: number,
  displayedStartValue: string,
  displayedEndValue: string,
  duration: number
}

export const PROFILE_TYPE_MAP =
  [
    { key: 'Relative', description: 'chargers.smart_charging.profile_types.relative', stackLevel: 4, id: 4 },
    { key: 'Absolute', description: 'chargers.smart_charging.profile_types.absolute', stackLevel: 3, id: 3 },
    { key: 'Daily', description: 'chargers.smart_charging.profile_types.recurring_daily', stackLevel: 2, id: 2 },
    { key: 'Weekly', description: 'chargers.smart_charging.profile_types.recurring_weekly', stackLevel: 1, id: 1 }
  ]

@Component({
  selector: 'app-smart-charging-limit-planner',
  templateUrl: 'smart-charging-limit-planner.html',
  styleUrls: ['smart-charging-limit-planner-chart.component.scss']
})
export class SmartChargingLimitPlannerComponent implements OnInit {
  @Input() charger: Charger;
  @Output() onApplyPlanning = new EventEmitter<any>();

  @ViewChildren('powerSliders') powerSliders: QueryList<SmartChargingPowerSliderComponent>;
  @ViewChild('limitChart') limitChartPlannerComponent: SmartChargingLimitPlannerChartComponent;

  public profileTypeMap = PROFILE_TYPE_MAP;
  public powerUnit: string;

  public slotsSchedule: DisplayedScheduleSlot[];

  public formGroup: FormGroup;
  public profileTypeControl: AbstractControl;
  public stackLevelControl: AbstractControl;
  public profileIdControl: AbstractControl;
  public durationControl: AbstractControl;

  private _defaultLimit: number;

  constructor(
    private authorizationService: AuthorizationService,
    private translateService: TranslateService,
    private dialog: MatDialog,
    private router: Router,
    private dialogService: DialogService,
    private centralServerService: CentralServerService,
    private messageService: MessageService,
    private spinnerService: SpinnerService,

  ) {

  }

  ngOnInit(): void {
    this.slotsSchedule = [];
    // Initialize slider values
    this.powerUnit = (this.charger.powerLimitUnit ? this.charger.powerLimitUnit : Constants.OCPP_UNIT_AMPER)
    // Calculate default slider value which is macimum Power of the charger
    if (this.powerUnit === Constants.OCPP_UNIT_AMPER) {
      this._defaultLimit = ChargingStations.convertWToAmp(this.charger.numberOfConnectedPhase, this.charger.maximumPower);
    } else {
      this._defaultLimit = this.charger.maximumPower;
    }
    // Init the form
    this.formGroup = new FormGroup({
      'profileTypeControl': new FormControl('',
        Validators.compose([
          Validators.required
        ])),
      'stackLevelControl': new FormControl('',
        Validators.compose([
          Validators.required
        ])),
      'profileIdControl': new FormControl('',
        Validators.compose([
          Validators.required
        ])),
      'durationControl': new FormControl('')
    });
    // Form
    this.profileTypeControl = this.formGroup.controls['profileTypeControl'];
    this.stackLevelControl = this.formGroup.controls['stackLevelControl'];
    this.profileIdControl = this.formGroup.controls['profileIdControl'];
    this.durationControl = this.formGroup.controls['durationControl'];

    this.profileTypeControl.valueChanges.subscribe(() => {
      this.resetSlots();
      // Set default values
      this.stackLevelControl.setValue(PROFILE_TYPE_MAP.find((mapElement) => mapElement.key === this.profileTypeControl.value).stackLevel);
      this.profileIdControl.setValue(PROFILE_TYPE_MAP.find((mapElement) => mapElement.key === this.profileTypeControl.value).id);
    });

    this.profileTypeControl.setValue('Absolute');
  }

  addSlot() {
    let slot: DisplayedSlot;

    if (this.slotsSchedule.length === 0) {
      const date = new Date();
      date.setSeconds(0);
      date.setMilliseconds(0);
      slot = { start: date, end: date, limit: this._defaultLimit, displayedLimitInkW: this._getDisplayedLimit(this._defaultLimit) };
    } else {
      // change previous slot
      const previousSlot = this.slotsSchedule[this.slotsSchedule.length - 1];
      if (previousSlot.duration > 0) {
        const start = new Date(previousSlot.slot.start.getTime() + previousSlot.duration * 1000);
        slot = { start: start, end: start, limit: this._defaultLimit, displayedLimitInkW: this._getDisplayedLimit(this._defaultLimit) };
      } else {
        const start = new Date(this.slotsSchedule[this.slotsSchedule.length - 1].slot.start.getTime() + 60000)
        slot = { start: start, end: start, limit: this._defaultLimit, displayedLimitInkW: this._getDisplayedLimit(this._defaultLimit) };
        previousSlot.slot.end = start;
        previousSlot.duration = ((previousSlot.slot.end.getTime() - previousSlot.slot.start.getTime()) / 1000);
      }
    }
    const displayedSlot: DisplayedScheduleSlot = {
      slot: slot,
      id: this.slotsSchedule.length,
      displayedStartValue: this._buildDisplayDateTimePickerValue(slot.start),
      displayedEndValue: this._buildDisplayDateTimePickerValue(slot.end),
      duration: ((slot.end.getTime() - slot.start.getTime()) / 1000)
    };
    this.slotsSchedule.push(displayedSlot);
    this.limitChartPlannerComponent.setLimitPlannerData(this.slotsSchedule);
  }

  resetSlots() {
    this.slotsSchedule = [];
    this.limitChartPlannerComponent.setLimitPlannerData(this.slotsSchedule);
  }

  public sliderChanged(slot, value) {
    slot.slot.limit = value;
    slot.slot.displayedLimitInkW = this._getDisplayedLimit(value);
    this.limitChartPlannerComponent.setLimitPlannerData(this.slotsSchedule);
  }


  changeStartSlotDate(event, slot: DisplayedScheduleSlot) {
    const start = new Date(event.target.value);
    slot.slot.start = start;
    // Set end date of previous slot
    if (slot.id > 0) {
      this.slotsSchedule[slot.id - 1].slot.end = start;
      // tslint:disable-next-line:max-line-length
      this.slotsSchedule[slot.id - 1].duration = (this.slotsSchedule[slot.id - 1].slot.end.getTime() - this.slotsSchedule[slot.id - 1].slot.start.getTime()) / 1000;
    }
    // update current slot end date
    if (slot.slot.end) {
      if (slot.slot.end.getTime() < slot.slot.start.getTime()) {
        slot.slot.end = slot.slot.start;
        slot.displayedEndValue = this._buildDisplayDateTimePickerValue(slot.slot.end);
      }
    }
    this.limitChartPlannerComponent.setLimitPlannerData(this.slotsSchedule);
  }

  changeEndSlotDate(event, slot: DisplayedScheduleSlot) {
    if (event.target.value !== '') {
      const end = new Date(event.target.value);
      slot.slot.end = end;
      slot.duration = (slot.slot.end.getTime() - slot.slot.start.getTime()) / 1000;
    } else {
      slot.slot.end = slot.slot.start;
    }
    this.limitChartPlannerComponent.setLimitPlannerData(this.slotsSchedule);
  }

  changeSlotDuration(event, slot: DisplayedScheduleSlot) {
    // update current slot end date
    slot.slot.end = new Date(slot.slot.start.getTime() + event.target.value * 1000);
    slot.displayedEndValue = this._buildDisplayDateTimePickerValue(slot.slot.end);
    slot.duration = event.target.value;
    // update next slots start date
    for (let index = slot.id + 1; index < this.slotsSchedule.length; index++) {
      const slotSchedule = this.slotsSchedule[index];
      slotSchedule.slot.start = this.slotsSchedule[index - 1].slot.end;
      slotSchedule.slot.end = new Date(this.slotsSchedule[index - 1].slot.end.getTime() + slotSchedule.duration * 1000);
      slotSchedule.displayedStartValue = this._buildDisplayDateTimePickerValue(slotSchedule.slot.start);
      slotSchedule.displayedEndValue = this._buildDisplayDateTimePickerValue(slotSchedule.slot.end);
    }
    this.limitChartPlannerComponent.setLimitPlannerData(this.slotsSchedule);
  }

  applyPowerLimit() {
    // show yes/no dialog
    const self = this;
    this.dialogService.createAndShowYesNoDialog(
      this.dialog,
      this.translateService.instant('chargers.smart_charging.power_limit_plan_title'),
      this.translateService.instant('chargers.smart_charging.power_limit_plan_confirm', { 'chargeBoxID': this.charger.id })
    ).subscribe((result) => {
      if (result === Constants.BUTTON_TYPE_YES) {
        try {
          // Build OCPP planning
          const chargingProfile = this._buildProfile();
          // console.log('Profile ' + JSON.stringify(chargingProfile, null, ' '));
          // call REST service
          this.centralServerService.chargingStationSetChargingProfile(this.charger, 0, chargingProfile).subscribe(response => {
            if (response.status === Constants.OCPP_RESPONSE_ACCEPTED) {
              // success + reload
              this.messageService.showSuccessMessage(this.translateService.instant('chargers.smart_charging.power_limit_plan_success',
                { 'chargeBoxID': self.charger.id, 'power': 'plan' }));
              this.onApplyPlanning.emit();
            } else {
              Utils.handleError(JSON.stringify(response),
                this.messageService, this.translateService.instant('chargers.smart_charging.power_limit_plan_error'));
            }
          }, (error) => {
            this.spinnerService.hide();
            this.dialog.closeAll();
            Utils.handleHttpError(error, this.router, this.messageService, this.centralServerService, 'chargers.smart_charging.power_limit_error');
          });
        } catch (error) {
          Utils.handleError(JSON.stringify(error),
            this.messageService, this.translateService.instant('chargers.smart_charging.power_limit_error'));
        }
      }
    });
  }

  public _buildProfile() {
    const profile: any = {};
    if (this.profileIdControl.value > 0 && this.profileIdControl.value <= 10) {
      profile.chargingProfileId = this.profileIdControl.value;
    } else {
      throw new Error('Invalid profile Id');
    }
    if (this.stackLevelControl.value > 0 && this.stackLevelControl.value <= 10) {
      profile.stackLevel = this.stackLevelControl.value;
    } else {
      throw new Error('Invalid stack level');
    }
    profile.chargingProfilePurpose = 'TxDefaultProfile';
    // set profile type
    if (this.profileTypeControl.value === PROFILE_TYPE_MAP[2].key || this.profileTypeControl.value === PROFILE_TYPE_MAP[3].key) {
      profile.chargingProfileKind = 'Recurring';
      profile.recurrencyKind = this.profileTypeControl.value;
    } else {
      if (this.profileTypeControl.value) {
        profile.chargingProfileKind = this.profileTypeControl.value;
      } else {
        throw new Error('Invalid profile type');
      }
    }
    // build charging schedule header
    profile.chargingSchedule = {};
    if (this.durationControl.value > 0) {
      profile.chargingSchedule.duration = this.durationControl.value;
    }
    if (profile.chargingProfileKind !== PROFILE_TYPE_MAP[0].key) {
      profile.chargingSchedule.startSchedule = this.slotsSchedule[0].slot.start.toISOString();
      if (!profile.chargingSchedule.startSchedule || profile.chargingSchedule.startSchedule.length === 0) {
        throw new Error('Invalid start date for non relative profile');
      }
    }
    profile.chargingSchedule.chargingRateUnit = this.powerUnit;
    // build schedule
    const startOfSchedule = this.slotsSchedule[0].slot.start.getTime();
    profile.chargingSchedule.chargingSchedulePeriod = [];
    for (const slot of this.slotsSchedule) {
      const period: any = {};
      period.startPeriod = (slot.slot.start.getTime() - startOfSchedule) / 1000;
      if (period.startPeriod >= 0) {
        period.limit = ChargingStations.provideLimit(this.charger, slot.slot.limit);
        profile.chargingSchedule.chargingSchedulePeriod.push(period);
      } else {
        throw new Error('Invalid schedule');
      }
    }
    return profile;
  }

  _buildDisplayDateTimePickerValue(date: Date) {
    // tslint:disable-next-line:max-line-length
    const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1)}-${(date.getDate() < 10 ? '0' + date.getDate() : date.getDate())}T${(date.getHours() < 10 ? '0' + date.getHours() : date.getHours())}:${(date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())}`;
    return dateStr;
  }

  private _getDisplayedLimit(value) {
    if (this.powerUnit === Constants.OCPP_UNIT_AMPER) {
      return ChargingStations.convertAmpToW(this.charger.numberOfConnectedPhase, value);
    } else {
      return value;
    }
  }

}
