import { DOCUMENT } from '@angular/common';
import { Component, Inject, Input, OnInit } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { mergeMap } from 'rxjs/operators';
import { DialogMode } from 'types/Authorization';

import { AuthorizationService } from '../../../services/authorization.service';
import { CentralServerService } from '../../../services/central-server.service';
import { ComponentService } from '../../../services/component.service';
import { ConfigService } from '../../../services/config.service';
import { DialogService } from '../../../services/dialog.service';
import { LocaleService } from '../../../services/locale.service';
import { MessageService } from '../../../services/message.service';
import { SpinnerService } from '../../../services/spinner.service';
import { WindowService } from '../../../services/window.service';
import { AbstractTabComponent } from '../../../shared/component/abstract-tab/abstract-tab.component';
import { USER_STATUSES, UserRoles } from '../../../shared/model/users.model';
import { Address } from '../../../types/Address';
import { IntegrationConnection } from '../../../types/Connection';
import { ActionResponse } from '../../../types/DataResult';
import { KeyValue, RestResponse } from '../../../types/GlobalType';
import { HTTPError } from '../../../types/HTTPError';
import { PricingSettingsType, RefundSettings } from '../../../types/Setting';
import TenantComponents from '../../../types/TenantComponents';
import { User, UserRole, UserStatus } from '../../../types/User';
import { Constants } from '../../../utils/Constants';
import { ParentErrorStateMatcher } from '../../../utils/ParentStateMatcher';
import { Users } from '../../../utils/Users';
import { Utils } from '../../../utils/Utils';
import { PaymentMethodsTableDataSource } from './payment-methods/payment-methods-table-data-source';
import { UserDialogComponent } from './user.dialog.component';

@Component({
  selector: 'app-user',
  templateUrl: 'user.component.html',
  providers: [PaymentMethodsTableDataSource],
})
export class UserComponent extends AbstractTabComponent implements OnInit {
  @Input() public currentUserID!: string;
  @Input() public inDialog!: boolean;
  @Input() public dialogRef!: MatDialogRef<UserDialogComponent>;
  @Input() public dialogMode!: DialogMode;
  public parentErrorStateMatcher = new ParentErrorStateMatcher();
  public userStatuses: KeyValue[];
  public userRoles: KeyValue[];
  public userLocales: KeyValue[];
  public isAdmin = false;
  public isSuperAdmin = false;
  public isBasic = false;
  public isSiteAdmin = false;
  public originalEmail!: string;
  public image = Constants.USER_NO_PICTURE;
  public hideRepeatPassword = true;
  public hidePassword = true;
  public maxSize: number;
  public formGroup!: FormGroup;
  public id!: AbstractControl;
  public issuer!: AbstractControl;
  public name!: AbstractControl;
  public firstName!: AbstractControl;
  public email!: AbstractControl;
  public phone!: AbstractControl;
  public mobile!: AbstractControl;
  public iNumber!: AbstractControl;
  public plateID!: AbstractControl;
  public costCenter!: AbstractControl;
  public status!: AbstractControl;
  public role!: AbstractControl;
  public locale!: AbstractControl;
  public address!: Address;
  public refundSetting!: RefundSettings;
  public integrationConnections!: IntegrationConnection[];
  public refundConnection!: IntegrationConnection;
  public passwords!: FormGroup;
  public password!: AbstractControl;
  public repeatPassword!: AbstractControl;
  public notificationsActive!: AbstractControl;
  public notifications!: FormGroup;
  public sendSessionStarted!: AbstractControl;
  public sendOptimalChargeReached!: AbstractControl;
  public sendCarCatalogSynchronizationFailed!: AbstractControl;
  public sendEndOfCharge!: AbstractControl;
  public sendEndOfSession!: AbstractControl;
  public sendUserAccountStatusChanged!: AbstractControl;
  public sendUnknownUserBadged!: AbstractControl;
  public sendChargingStationStatusError!: AbstractControl;
  public sendChargingStationRegistered!: AbstractControl;
  public sendOfflineChargingStations!: AbstractControl;
  public sendOcpiPatchStatusError!: AbstractControl;
  public sendOicpPatchStatusError!: AbstractControl;
  public sendPreparingSessionNotStarted!: AbstractControl;
  public sendSmtpError!: AbstractControl;
  public sendBillingSynchronizationFailed!: AbstractControl;
  public sendBillingPeriodicOperationFailed!: AbstractControl;
  public sendComputeAndApplyChargingProfilesFailed!: AbstractControl;
  public sendSessionNotStarted!: AbstractControl;
  public sendUserAccountInactivity!: AbstractControl;
  public sendEndUserErrorNotification!: AbstractControl;
  public sendBillingNewInvoice!: AbstractControl;
  public sendAdminAccountVerificationNotification!: AbstractControl;
  public user!: User;
  public isRefundConnectionValid!: boolean;
  public canSeeInvoice: boolean;
  public isBillingComponentActive: boolean;
  public canListPaymentMethods: boolean;
  private currentLocale!: string;

  public constructor(
    public paymentMethodsTableDataSource: PaymentMethodsTableDataSource,
    private authorizationService: AuthorizationService,
    private centralServerService: CentralServerService,
    private componentService: ComponentService,
    private messageService: MessageService,
    private spinnerService: SpinnerService,
    private localeService: LocaleService,
    private configService: ConfigService,
    private dialogService: DialogService,
    private translateService: TranslateService,
    private router: Router,
    @Inject(DOCUMENT) private document: any,
    activatedRoute: ActivatedRoute,
    windowService: WindowService) {
    super(activatedRoute, windowService, ['common', 'notifications', 'address', 'password', 'connections', 'miscs', 'billing'], false);
    this.maxSize = this.configService.getUser().maxPictureKb;
    // Get statuses
    this.userStatuses = USER_STATUSES;
    // Get Roles
    this.userRoles = UserRoles.getAvailableRoles(this.centralServerService.getLoggedUser().role);
    // Get Locales
    this.userLocales = this.localeService.getLocales();
    this.localeService.getCurrentLocaleSubject().subscribe((locale) => {
      this.currentLocale = locale.currentLocale;
    });
    // Admin?
    this.isAdmin = this.authorizationService.isAdmin();
    this.isSuperAdmin = this.authorizationService.isSuperAdmin();
    this.isBasic = this.authorizationService.isBasic();
    this.isSiteAdmin = this.authorizationService.isSiteAdmin();
    if (!this.isAdmin) {
      this.setHashArray(['common', 'address', 'password', 'connections', 'miscs']);
    }
    this.canSeeInvoice = false;
    if (this.componentService.isActive(TenantComponents.PRICING)) {
      this.componentService.getPricingSettings().subscribe((settings) => {
        if (settings && settings.type === PricingSettingsType.CONVERGENT_CHARGING) {
          this.canSeeInvoice = true;
        }
      });
    }
    this.isBillingComponentActive = this.componentService.isActive(TenantComponents.BILLING);
    this.canListPaymentMethods = this.authorizationService.canListPaymentMethods();
  }

  public updateRoute(event: number) {
    if (!this.inDialog) {
      super.updateRoute(event);
    }
  }

  public ngOnInit() {
    if (this.activatedRoute.snapshot.url[0]?.path === 'profile') {
      this.currentUserID = this.centralServerService.getLoggedUser().id;
    }
    // Init the form
    this.formGroup = new FormGroup({
      id: new FormControl(''),
      issuer: new FormControl(true),
      name: new FormControl('',
        Validators.compose([
          Validators.required,
          Validators.maxLength(255),
        ])),
      firstName: new FormControl('',
        Validators.compose([
          Validators.required,
          Validators.maxLength(255),
        ])),
      notificationsActive: new FormControl(true),
      notifications: new FormGroup({
        sendSessionStarted: new FormControl(true),
        sendOptimalChargeReached: new FormControl(true),
        sendCarCatalogSynchronizationFailed: new FormControl(true),
        sendEndOfCharge: new FormControl(true),
        sendEndOfSession: new FormControl(true),
        sendUserAccountStatusChanged: new FormControl(true),
        sendSessionNotStarted: new FormControl(true),
        sendUserAccountInactivity: new FormControl(true),
        sendUnknownUserBadged: new FormControl(false),
        sendChargingStationStatusError: new FormControl(false),
        sendChargingStationRegistered: new FormControl(false),
        sendOfflineChargingStations: new FormControl(false),
        sendPreparingSessionNotStarted: new FormControl(false),
        sendOcpiPatchStatusError: new FormControl(false),
        sendOicpPatchStatusError: new FormControl(false),
        sendSmtpError: new FormControl(false),
        sendBillingSynchronizationFailed: new FormControl(false),
        sendBillingPeriodicOperationFailed: new FormControl(false),
        sendComputeAndApplyChargingProfilesFailed: new FormControl(false),
        sendEndUserErrorNotification: new FormControl(false),
        sendBillingNewInvoice: new FormControl(true),
        sendAdminAccountVerificationNotification: new FormControl(true)
      }),
      email: new FormControl('',
        Validators.compose([
          Validators.required,
          Validators.email,
        ])),
      phone: new FormControl('',
        Validators.compose([
          Users.validatePhone,
        ])),
      mobile: new FormControl('',
        Validators.compose([
          Users.validatePhone,
        ])),
      iNumber: new FormControl(''),
      plateID: new FormControl('',
        Validators.compose([
          Validators.pattern('^[A-Z0-9- ]*$'),
        ])),
      costCenter: new FormControl('',
        Validators.compose([
          Validators.pattern('^[0-9]*$'),
        ])),
      status: new FormControl(UserStatus.ACTIVE,
        Validators.compose([
          Validators.required,
        ])),
      role: new FormControl(
        this.isSuperAdmin ? UserRole.SUPER_ADMIN : UserRole.BASIC,
        Validators.compose([
          Validators.required,
        ])),
      locale: new FormControl(this.currentLocale,
        Validators.compose([
          Validators.required,
        ])),
      passwords: new FormGroup({
        password: new FormControl('',
          Validators.compose([
            Users.passwordWithNoSpace,
            Users.validatePassword,
          ].concat(!Utils.isEmptyString(this.currentUserID) ? [] : [Validators.required]))),
        repeatPassword: new FormControl('',
          Validators.compose([
            Users.validatePassword,
          ].concat(!Utils.isEmptyString(this.currentUserID) ? [] : [Validators.required]))),
      }, (passwordFormGroup: FormGroup) => Utils.validateEqual(passwordFormGroup, 'password', 'repeatPassword')),
    });
    // Form
    this.id = this.formGroup.controls['id'];
    this.issuer = this.formGroup.controls['issuer'];
    this.name = this.formGroup.controls['name'];
    this.firstName = this.formGroup.controls['firstName'];
    this.email = this.formGroup.controls['email'];
    this.phone = this.formGroup.controls['phone'];
    this.mobile = this.formGroup.controls['mobile'];
    this.iNumber = this.formGroup.controls['iNumber'];
    this.plateID = this.formGroup.controls['plateID'];
    this.costCenter = this.formGroup.controls['costCenter'];
    this.status = this.formGroup.controls['status'];
    this.role = this.formGroup.controls['role'];
    this.locale = this.formGroup.controls['locale'];
    this.passwords = (this.formGroup.controls['passwords'] as FormGroup);
    this.password = this.passwords.controls['password'];
    this.repeatPassword = this.passwords.controls['repeatPassword'];
    this.notificationsActive = this.formGroup.controls['notificationsActive'];
    this.notifications = this.formGroup.controls['notifications'] as FormGroup;
    this.sendSessionStarted = this.notifications.controls['sendSessionStarted'];
    this.sendOptimalChargeReached = this.notifications.controls['sendOptimalChargeReached'];
    this.sendCarCatalogSynchronizationFailed = this.notifications.controls['sendCarCatalogSynchronizationFailed'];
    this.sendEndOfCharge = this.notifications.controls['sendEndOfCharge'];
    this.sendEndOfSession = this.notifications.controls['sendEndOfSession'];
    this.sendUserAccountStatusChanged = this.notifications.controls['sendUserAccountStatusChanged'];
    this.sendUnknownUserBadged = this.notifications.controls['sendUnknownUserBadged'];
    this.sendChargingStationStatusError = this.notifications.controls['sendChargingStationStatusError'];
    this.sendChargingStationRegistered = this.notifications.controls['sendChargingStationRegistered'];
    this.sendOfflineChargingStations = this.notifications.controls['sendOfflineChargingStations'];
    this.sendOcpiPatchStatusError = this.notifications.controls['sendOcpiPatchStatusError'];
    this.sendOicpPatchStatusError = this.notifications.controls['sendOicpPatchStatusError'];
    this.sendPreparingSessionNotStarted = this.notifications.controls['sendPreparingSessionNotStarted'];
    this.sendSmtpError = this.notifications.controls['sendSmtpError'];
    this.sendBillingSynchronizationFailed = this.notifications.controls['sendBillingSynchronizationFailed'];
    this.sendBillingPeriodicOperationFailed = this.notifications.controls['sendBillingPeriodicOperationFailed'];
    this.sendSessionNotStarted = this.notifications.controls['sendSessionNotStarted'];
    this.sendUserAccountInactivity = this.notifications.controls['sendUserAccountInactivity'];
    this.sendComputeAndApplyChargingProfilesFailed = this.notifications.controls['sendComputeAndApplyChargingProfilesFailed'];
    this.sendEndUserErrorNotification = this.notifications.controls['sendEndUserErrorNotification'];
    this.sendBillingNewInvoice = this.notifications.controls['sendBillingNewInvoice'];
    this.sendAdminAccountVerificationNotification = this.notifications.controls['sendAdminAccountVerificationNotification'];
    if (this.isSiteAdmin) {
      this.role.disable();
    }
    if (this.currentUserID) {
      this.loadUser();
    }
    this.loadRefundSettings();
    if (!this.inDialog) {
      super.enableRoutingSynchronization();
    }
  }

  public toggleNotificationsActive() {
    // Reset notifications ?
  }

  public refresh() {
    // Load User
    this.loadUser();
  }

  public loadUser() {
    if (!this.currentUserID) {
      return;
    }
    this.paymentMethodsTableDataSource.setCurrentUserId(this.currentUserID);
    this.spinnerService.show();
    // eslint-disable-next-line complexity
    this.centralServerService.getUser(this.currentUserID).pipe(mergeMap((user) => {
      this.formGroup.markAsPristine();
      this.user = user;
      // Init form
      if (user.id) {
        this.formGroup.controls.id.setValue(user.id);
      }
      this.formGroup.controls.issuer.setValue(user.issuer);
      if (user.name) {
        this.formGroup.controls.name.setValue(user.name.toUpperCase());
      }
      if (user.firstName) {
        this.formGroup.controls.firstName.setValue(user.firstName);
      }
      if (user.email) {
        this.formGroup.controls.email.setValue(user.email);
        this.originalEmail = user.email;
      }
      if (user.phone) {
        this.formGroup.controls.phone.setValue(user.phone);
      }
      if (user.mobile) {
        this.formGroup.controls.mobile.setValue(user.mobile);
      }
      if (user.iNumber) {
        this.formGroup.controls.iNumber.setValue(user.iNumber);
      }
      if (user.costCenter) {
        this.formGroup.controls.costCenter.setValue(user.costCenter);
      }
      if (user.status) {
        this.formGroup.controls.status.setValue(user.status);
      }
      if (user.role) {
        this.formGroup.controls.role.setValue(user.role);
      }
      if (user.locale) {
        this.formGroup.controls.locale.setValue(user.locale);
      }
      if (user.plateID) {
        this.formGroup.controls.plateID.setValue(user.plateID);
      }
      if (Utils.objectHasProperty(user, 'notificationsActive')) {
        this.formGroup.controls.notificationsActive.setValue(user.notificationsActive);
      }
      if (user.notifications && Utils.objectHasProperty(user.notifications, 'sendSessionStarted')) {
        this.notifications.controls.sendSessionStarted.setValue(user.notifications.sendSessionStarted);
      } else {
        this.notifications.controls.sendSessionStarted.setValue(false);
      }
      if (user.notifications && Utils.objectHasProperty(user.notifications, 'sendOptimalChargeReached')) {
        this.notifications.controls.sendOptimalChargeReached.setValue(user.notifications.sendOptimalChargeReached);
      } else {
        this.notifications.controls.sendOptimalChargeReached.setValue(false);
      }
      if (user.notifications && Utils.objectHasProperty(user.notifications, 'sendCarCatalogSynchronizationFailed')) {
        this.notifications.controls.sendCarCatalogSynchronizationFailed.setValue(user.notifications.sendCarCatalogSynchronizationFailed);
      } else {
        this.notifications.controls.sendCarCatalogSynchronizationFailed.setValue(false);
      }
      if (user.notifications && Utils.objectHasProperty(user.notifications, 'sendEndOfCharge')) {
        this.notifications.controls.sendEndOfCharge.setValue(user.notifications.sendEndOfCharge);
      } else {
        this.notifications.controls.sendEndOfCharge.setValue(false);
      }
      if (user.notifications && Utils.objectHasProperty(user.notifications, 'sendEndOfSession')) {
        this.notifications.controls.sendEndOfSession.setValue(user.notifications.sendEndOfSession);
      } else {
        this.notifications.controls.sendEndOfSession.setValue(false);
      }
      if (user.notifications && Utils.objectHasProperty(user.notifications, 'sendUserAccountStatusChanged')) {
        this.notifications.controls.sendUserAccountStatusChanged.setValue(user.notifications.sendUserAccountStatusChanged);
      } else {
        this.notifications.controls.sendUserAccountStatusChanged.setValue(false);
      }
      if (user.notifications && Utils.objectHasProperty(user.notifications, 'sendUnknownUserBadged')) {
        this.notifications.controls.sendUnknownUserBadged.setValue(user.notifications.sendUnknownUserBadged);
      } else {
        this.notifications.controls.sendUnknownUserBadged.setValue(false);
      }
      if (user.notifications && Utils.objectHasProperty(user.notifications, 'sendChargingStationStatusError')) {
        this.notifications.controls.sendChargingStationStatusError.setValue(user.notifications.sendChargingStationStatusError);
      } else {
        this.notifications.controls.sendChargingStationStatusError.setValue(false);
      }
      if (user.notifications && Utils.objectHasProperty(user.notifications, 'sendChargingStationRegistered')) {
        this.notifications.controls.sendChargingStationRegistered.setValue(user.notifications.sendChargingStationRegistered);
      } else {
        this.notifications.controls.sendChargingStationRegistered.setValue(false);
      }
      if (user.notifications && Utils.objectHasProperty(user.notifications, 'sendOfflineChargingStations')) {
        this.notifications.controls.sendOfflineChargingStations.setValue(user.notifications.sendOfflineChargingStations);
      } else {
        this.notifications.controls.sendOfflineChargingStations.setValue(false);
      }
      if (user.notifications && Utils.objectHasProperty(user.notifications, 'sendOcpiPatchStatusError')) {
        this.notifications.controls.sendOcpiPatchStatusError.setValue(user.notifications.sendOcpiPatchStatusError);
      } else {
        this.notifications.controls.sendOcpiPatchStatusError.setValue(false);
      }
      if (user.notifications && Utils.objectHasProperty(user.notifications, 'sendOicpPatchStatusError')) {
        this.notifications.controls.sendOicpPatchStatusError.setValue(user.notifications.sendOicpPatchStatusError);
      } else {
        this.notifications.controls.sendOicpPatchStatusError.setValue(false);
      }
      if (user.notifications && Utils.objectHasProperty(user.notifications, 'sendPreparingSessionNotStarted')) {
        this.notifications.controls.sendPreparingSessionNotStarted.setValue(user.notifications.sendPreparingSessionNotStarted);
      } else {
        this.notifications.controls.sendPreparingSessionNotStarted.setValue(false);
      }
      if (user.notifications && Utils.objectHasProperty(user.notifications, 'sendSmtpError')) {
        this.notifications.controls.sendSmtpError.setValue(user.notifications.sendSmtpError);
      } else {
        this.notifications.controls.sendSmtpError.setValue(false);
      }
      if (user.notifications && Utils.objectHasProperty(user.notifications, 'sendBillingSynchronizationFailed')) {
        this.notifications.controls.sendBillingSynchronizationFailed.setValue(user.notifications.sendBillingSynchronizationFailed);
      } else {
        this.notifications.controls.sendBillingSynchronizationFailed.setValue(false);
      }
      if (user.notifications && Utils.objectHasProperty(user.notifications, 'sendBillingPeriodicOperationFailed')) {
        this.notifications.controls.sendBillingPeriodicOperationFailed.setValue(user.notifications.sendBillingPeriodicOperationFailed);
      } else {
        this.notifications.controls.sendBillingPeriodicOperationFailed.setValue(false);
      }
      if (user.notifications && Utils.objectHasProperty(user.notifications, 'sendUserAccountInactivity')) {
        this.notifications.controls.sendUserAccountInactivity.setValue(user.notifications.sendUserAccountInactivity);
      } else {
        this.notifications.controls.sendUserAccountInactivity.setValue(false);
      }
      if (user.notifications && Utils.objectHasProperty(user.notifications, 'sendSessionNotStarted')) {
        this.notifications.controls.sendSessionNotStarted.setValue(user.notifications.sendSessionNotStarted);
      } else {
        this.notifications.controls.sendSessionNotStarted.setValue(false);
      }
      if (user.notifications && Utils.objectHasProperty(user.notifications, 'sendComputeAndApplyChargingProfilesFailed')) {
        this.notifications.controls.sendComputeAndApplyChargingProfilesFailed.setValue(
          user.notifications.sendComputeAndApplyChargingProfilesFailed);
      } else {
        this.notifications.controls.sendComputeAndApplyChargingProfilesFailed.setValue(false);
      }
      if (user.notifications && Utils.objectHasProperty(user.notifications, 'sendEndUserErrorNotification')) {
        this.notifications.controls.sendEndUserErrorNotification.setValue(user.notifications.sendEndUserErrorNotification);
      } else {
        this.notifications.controls.sendEndUserErrorNotification.setValue(false);
      }
      if (user.notifications && Utils.objectHasProperty(user.notifications, 'sendBillingNewInvoice')) {
        this.notifications.controls.sendBillingNewInvoice.setValue(user.notifications.sendBillingNewInvoice);
      } else {
        this.notifications.controls.sendBillingNewInvoice.setValue(false);
      }
      if (user.notifications && Utils.objectHasProperty(user.notifications, 'sendAdminAccountVerificationNotification')) {
        this.notifications.controls.sendAdminAccountVerificationNotification.setValue(user.notifications.sendAdminAccountVerificationNotification);
      } else {
        this.notifications.controls.sendAdminAccountVerificationNotification.setValue(false);
      }
      if (user.address) {
        this.address = user.address;
      }
      // Reset password
      this.passwords.controls.password.setValue('');
      this.passwords.controls.repeatPassword.setValue('');
      // Yes, get image
      return this.centralServerService.getUserImage(this.currentUserID);
    })).subscribe((userImage) => {
      if (userImage && userImage.image) {
        this.image = userImage.image.toString();
      }
      this.spinnerService.hide();
      this.formGroup.updateValueAndValidity();
      this.formGroup.markAsPristine();
      this.formGroup.markAllAsTouched();
    }, (error) => {
      this.spinnerService.hide();
      switch (error.status) {
        case HTTPError.OBJECT_DOES_NOT_EXIST_ERROR:
          this.messageService.showErrorMessage('users.user_do_not_exist');
          break;
        default:
          Utils.handleHttpError(error, this.router, this.messageService,
            this.centralServerService, 'general.unexpected_error_backend');
      }
    });
  }

  public roleChanged(role: UserRoles) {
    switch (role) {
      case UserRole.ADMIN:
        this.formGroup.controls.notificationsActive.setValue(true);
        this.notifications.controls.sendSessionStarted.setValue(true);
        this.notifications.controls.sendOptimalChargeReached.setValue(true);
        this.notifications.controls.sendEndOfCharge.setValue(true);
        this.notifications.controls.sendEndOfSession.setValue(true);
        this.notifications.controls.sendUserAccountStatusChanged.setValue(true);
        this.notifications.controls.sendSessionNotStarted.setValue(true);
        this.notifications.controls.sendUserAccountInactivity.setValue(true);
        // Admin notifs
        this.notifications.controls.sendUnknownUserBadged.setValue(true);
        this.notifications.controls.sendChargingStationStatusError.setValue(true);
        this.notifications.controls.sendChargingStationRegistered.setValue(true);
        this.notifications.controls.sendOfflineChargingStations.setValue(true);
        this.notifications.controls.sendOcpiPatchStatusError.setValue(true);
        this.notifications.controls.sendOicpPatchStatusError.setValue(true);
        this.notifications.controls.sendPreparingSessionNotStarted.setValue(true);
        this.notifications.controls.sendSmtpError.setValue(true);
        this.notifications.controls.sendBillingSynchronizationFailed.setValue(true);
        this.notifications.controls.sendBillingPeriodicOperationFailed.setValue(true);
        this.notifications.controls.sendComputeAndApplyChargingProfilesFailed.setValue(true);
        this.notifications.controls.sendEndUserErrorNotification.setValue(true);
        this.notifications.controls.sendAdminAccountVerificationNotification.setValue(true);
        break;
      case UserRole.BASIC:
        this.formGroup.controls.notificationsActive.setValue(true);
        this.notifications.controls.sendSessionStarted.setValue(true);
        this.notifications.controls.sendOptimalChargeReached.setValue(true);
        this.notifications.controls.sendEndOfCharge.setValue(true);
        this.notifications.controls.sendEndOfSession.setValue(true);
        this.notifications.controls.sendUserAccountStatusChanged.setValue(true);
        this.notifications.controls.sendSessionNotStarted.setValue(true);
        this.notifications.controls.sendUserAccountInactivity.setValue(true);
        // Admin notifs
        this.notifications.controls.sendUnknownUserBadged.setValue(false);
        this.notifications.controls.sendChargingStationStatusError.setValue(false);
        this.notifications.controls.sendChargingStationRegistered.setValue(false);
        this.notifications.controls.sendOfflineChargingStations.setValue(false);
        this.notifications.controls.sendOcpiPatchStatusError.setValue(false);
        this.notifications.controls.sendOicpPatchStatusError.setValue(false);
        this.notifications.controls.sendPreparingSessionNotStarted.setValue(false);
        this.notifications.controls.sendSmtpError.setValue(false);
        this.notifications.controls.sendBillingSynchronizationFailed.setValue(false);
        this.notifications.controls.sendBillingPeriodicOperationFailed.setValue(false);
        this.notifications.controls.sendComputeAndApplyChargingProfilesFailed.setValue(false);
        this.notifications.controls.sendEndUserErrorNotification.setValue(false);
        break;
      case UserRole.DEMO:
        this.formGroup.controls.notificationsActive.setValue(false);
        this.notifications.controls.sendSessionStarted.setValue(false);
        this.notifications.controls.sendOptimalChargeReached.setValue(false);
        this.notifications.controls.sendEndOfCharge.setValue(false);
        this.notifications.controls.sendEndOfSession.setValue(false);
        this.notifications.controls.sendUserAccountStatusChanged.setValue(false);
        this.notifications.controls.sendSessionNotStarted.setValue(false);
        this.notifications.controls.sendUserAccountInactivity.setValue(false);
        // Admin notifs
        this.notifications.controls.sendUnknownUserBadged.setValue(false);
        this.notifications.controls.sendChargingStationStatusError.setValue(false);
        this.notifications.controls.sendChargingStationRegistered.setValue(false);
        this.notifications.controls.sendOfflineChargingStations.setValue(false);
        this.notifications.controls.sendOcpiPatchStatusError.setValue(false);
        this.notifications.controls.sendOicpPatchStatusError.setValue(false);
        this.notifications.controls.sendPreparingSessionNotStarted.setValue(false);
        this.notifications.controls.sendSmtpError.setValue(false);
        this.notifications.controls.sendBillingSynchronizationFailed.setValue(false);
        this.notifications.controls.sendBillingPeriodicOperationFailed.setValue(false);
        this.notifications.controls.sendComputeAndApplyChargingProfilesFailed.setValue(false);
        this.notifications.controls.sendEndUserErrorNotification.setValue(false);
        break;
    }
  }

  public updateUserImage(user: User) {
    if (this.image && !this.image.endsWith(Constants.USER_NO_PICTURE)) {
      // Set to user
      user.image = this.image;
    } else {
      // No image
      user.image = null;
    }
  }

  public saveUser(user: User) {
    if (this.currentUserID) {
      this.updateUser(user);
    } else {
      this.createUser(user);
    }
  }

  public imageChanged(event: any) {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > (this.maxSize * 1024)) {
        this.messageService.showErrorMessage('users.picture_size_error', { maxPictureKb: this.maxSize });
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          this.image = reader.result as string;
          this.formGroup.markAsDirty();
        };
        reader.readAsDataURL(file);
      }
    }
  }

  public clearImage() {
    this.image = Constants.USER_NO_PICTURE;
    this.formGroup.markAsDirty();
  }

  public revokeRefundAccount() {
    this.centralServerService.deleteIntegrationConnection(this.refundConnection.id).subscribe(
      (response: ActionResponse) => {
        if (response.status === RestResponse.SUCCESS) {
          this.messageService.showSuccessMessage('settings.refund.concur.revoke_success');
        } else {
          Utils.handleError(JSON.stringify(response),
            this.messageService, 'settings.refund.concur.revoke_error');
        }
        this.loadRefundSettings();
      }, (error) => {
        Utils.handleError(JSON.stringify(error),
          this.messageService, 'settings.refund.concur.revoke_error');
        this.loadRefundSettings();
      }
    );
  }

  public linkRefundAccount() {
    if (!this.refundSetting || !this.refundSetting.concur) {
      this.messageService.showErrorMessage(
        this.translateService.instant('transactions.notification.refund.tenant_concur_connection_invalid'));
    } else {
      // Concur
      const concurSetting = this.refundSetting.concur;
      const returnedUrl = `${this.windowService.getOrigin()}/users/connections`;
      const state = {
        connector: 'concur',
        appId: this.refundSetting.id,
        userId: this.currentUserID,
      };
      this.document.location.href =
        `${concurSetting.authenticationUrl}/oauth2/v0/authorize?client_id=${concurSetting.clientId}&response_type=code&scope=EXPRPT&redirect_uri=${returnedUrl}&state=${JSON.stringify(state)}`;
    }
  }

  public getRefundUrl(): string | null {
    if (this.refundSetting && this.refundSetting.concur) {
      return this.refundSetting.concur.apiUrl;
    }
    return null;
  }

  public closeDialog(saved: boolean = false) {
    if (this.inDialog) {
      this.windowService.clearSearch();
      this.dialogRef.close(saved);
    }
  }

  public close() {
    Utils.checkAndSaveAndCloseDialog(this.formGroup, this.dialogService,
      this.translateService, this.saveUser.bind(this), this.closeDialog.bind(this));
  }

  private loadRefundSettings() {
    if (this.componentService.isActive(TenantComponents.REFUND)) {
      this.componentService.getRefundSettings().subscribe((refundSettings) => {
        this.refundSetting = refundSettings;
      });
      if (this.currentUserID) {
        this.centralServerService.getIntegrationConnections(this.currentUserID).subscribe((connectionResult) => {
          this.integrationConnections = null;
          this.refundConnection = null;
          this.isRefundConnectionValid = false;
          if (connectionResult && !Utils.isEmptyArray(connectionResult.result)) {
            for (const connection of connectionResult.result) {
              if (connection.connectorId === 'concur') {
                this.refundConnection = connection;
                this.isRefundConnectionValid =
                  this.refundConnection &&
                  this.refundConnection.validUntil &&
                  new Date(this.refundConnection.validUntil).getTime() > new Date().getTime();
              }
            }
            this.integrationConnections = connectionResult.result;
          }
        });
      }
    }
  }

  private createUser(user: User) {
    // Set the image
    this.updateUserImage(user);
    this.spinnerService.show();
    this.centralServerService.createUser(user).subscribe((response: ActionResponse) => {
      this.spinnerService.hide();
      if (response.status === RestResponse.SUCCESS) {
        this.messageService.showSuccessMessage('users.create_success', { userFullName: user.firstName + ' ' + user.name });
        user.id = response.id ?? '';
        this.currentUserID = response.id ?? '';
        this.closeDialog(true);
      } else {
        Utils.handleError(JSON.stringify(response), this.messageService, 'users.create_error');
      }
    }, (error) => {
      this.spinnerService.hide();
      switch (error.status) {
        // Email already exists
        case HTTPError.USER_EMAIL_ALREADY_EXIST_ERROR:
          this.messageService.showErrorMessage('authentication.email_already_exists');
          break;
        // User deleted
        case HTTPError.OBJECT_DOES_NOT_EXIST_ERROR:
          this.messageService.showErrorMessage('users.user_do_not_exist');
          break;
        // No longer exists!
        default:
          Utils.handleHttpError(error, this.router, this.messageService, this.centralServerService, 'users.create_error');
      }
    });
  }

  private updateUser(user: User) {
    // Set the image
    this.updateUserImage(user);
    this.spinnerService.show();
    this.centralServerService.updateUser(user).subscribe((response) => {
      this.spinnerService.hide();
      if (response.status === RestResponse.SUCCESS) {
        this.messageService.showSuccessMessage('users.update_success', { userFullName: user.firstName + ' ' + user.name });
        this.closeDialog(true);
      } else {
        Utils.handleError(JSON.stringify(response), this.messageService, 'users.update_error');
      }
    }, (error) => {
      this.spinnerService.hide();
      switch (error.status) {
        // Email already exists
        case HTTPError.USER_EMAIL_ALREADY_EXIST_ERROR:
          this.messageService.showErrorMessage('authentication.email_already_exists');
          break;
        // User deleted
        case HTTPError.OBJECT_DOES_NOT_EXIST_ERROR:
          this.messageService.showErrorMessage('users.user_do_not_exist');
          break;
        // No longer exists!
        default:
          Utils.handleHttpError(error, this.router, this.messageService, this.centralServerService, 'users.update_error');
      }
    });
  }
}
