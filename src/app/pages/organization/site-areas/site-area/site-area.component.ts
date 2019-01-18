import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material';
import { mergeMap } from 'rxjs/operators';

import { LocaleService } from 'app/services/locale.service';
import { CentralServerService } from 'app/services/central-server.service';
import { SpinnerService } from 'app/services/spinner.service';
import { AuthorizationService } from 'app/services/authorization-service';
import { MessageService } from 'app/services/message.service';
import { ParentErrorStateMatcher } from 'app/utils/ParentStateMatcher';
import { DialogService } from 'app/services/dialog.service';
import { Constants } from 'app/utils/Constants';
import { Utils } from 'app/utils/Utils';
import { ReadVarExpr } from '@angular/compiler';

@Component({
  selector: 'app-site-area-cmp',
  templateUrl: 'site-area.component.html',
  styleUrls: ['./site-area.component.scss']
})
export class SiteAreaComponent implements OnInit {
  public parentErrorStateMatcher = new ParentErrorStateMatcher();
  @Input() currentSiteAreaID: string;
  @Input() inDialog: boolean;
  @Input() dialogRef: MatDialogRef<any>;
  public image: any = Constants.SITE_AREA_NO_IMAGE;
  // public image2 = 'background-image:url(\'assets/img/theme/no-logo.jpg\')';
  // public image3 = 'assets/img/theme/no-logo.jpg';

  public formGroup: FormGroup;
  public id: AbstractControl;
  public name: AbstractControl;
  public siteID: AbstractControl;
  public maximumPower: AbstractControl;
  public accessControl: AbstractControl;

  public sites: any;

  constructor(
    private authorizationService: AuthorizationService,
    private centralServerService: CentralServerService,
    private messageService: MessageService,
    private spinnerService: SpinnerService,
    private localeService: LocaleService,
    private activatedRoute: ActivatedRoute,
    private dialog: MatDialog,
    private dialogService: DialogService,
    private router: Router) {

    // Check auth
    if (this.activatedRoute.snapshot.params['id'] &&
      !authorizationService.canUpdateSiteArea({ 'id': this.activatedRoute.snapshot.params['id'] })) {
      // Not authorized
      this.router.navigate(['/']);
    }

    // refresh available sites
    this.refreshAvailableSites();
  }

  ngOnInit() {
    // Init the form
    this.formGroup = new FormGroup({
      'id': new FormControl(''),
      'name': new FormControl('',
        Validators.compose([
          Validators.required
        ])),
      'siteID': new FormControl('',
        Validators.compose([
          Validators.required
        ])),
      'maximumPower': new FormControl('',
      Validators.compose([
        Validators.pattern(/^-?(0|[1-9]\d*)?$/)
      ])),
      'accessControl': new FormControl(true)
    });
    // Form
    this.id = this.formGroup.controls['id'];
    this.name = this.formGroup.controls['name'];
    this.siteID = this.formGroup.controls['siteID'];
    this.maximumPower = this.formGroup.controls['maximumPower']
    this.accessControl = this.formGroup.controls['accessControl'];

    if (this.currentSiteAreaID) {
      this.loadSiteArea();
    } else if (this.activatedRoute && this.activatedRoute.params) {
      this.activatedRoute.params.subscribe((params: Params) => {
        this.currentSiteAreaID = params['id'];
        // this.loadSiteArea();
      });
    }
    // Scroll up
    jQuery('html, body').animate({ scrollTop: 0 }, { duration: 500 });
  }

  public isOpenInDialog(): boolean {
    return this.inDialog;
  }

  public setCurrentSiteAreaId(currentSiteAreaId) {
    this.currentSiteAreaID = currentSiteAreaId;
  }

  public refresh() {
    // Load SiteArea
    this.loadSiteArea();
  }

  public refreshAvailableSites() {
    this.centralServerService.getSites({}).subscribe((availableSites) => {
      // clear current entries
      this.sites = [];

      // add available companies to dropdown
      for (let i = 0; i < availableSites.count; i++) {
        this.sites.push({ 'id': availableSites.result[i].id, 'name': availableSites.result[i].name })
      }
    });
  }

  public clearMaximumPower() {
    this.maximumPower.setValue(null);
    this.formGroup.markAsDirty();
  }

  public loadSiteArea() {
    if (!this.currentSiteAreaID) {
      return;
    }
    // Show spinner
    this.spinnerService.show();
    // Yes, get it
    this.centralServerService.getSiteArea(this.currentSiteAreaID).pipe(mergeMap((siteArea) => {
      this.formGroup.markAsPristine();
      // Init form
      if (siteArea.id) {
        this.formGroup.controls.id.setValue(siteArea.id);
      }
      if (siteArea.name) {
        this.formGroup.controls.name.setValue(siteArea.name);
      }
      if (siteArea.siteID) {
        this.formGroup.controls.siteID.setValue(siteArea.siteID);
      }
      if (siteArea.maximumPower) {
        this.formGroup.controls.maximumPower.setValue(siteArea.maximumPower);
      }
      if (siteArea.accessControl) {
        this.formGroup.controls.accessControl.setValue(siteArea.accessControl);
      } else {
        this.formGroup.controls.accessControl.setValue(false);
      }
      // Yes, get image
      return this.centralServerService.getSiteAreaImage(this.currentSiteAreaID);
    })).subscribe((siteAreaImage) => {
      if (siteAreaImage && siteAreaImage.image) {
        this.image = siteAreaImage.image.toString();
      }
      this.spinnerService.hide();
    }, (error) => {
      // Hide
      this.spinnerService.hide();
      // Handle error
      switch (error.status) {
        // Not found
        case 550:
          // Transaction not found`
          Utils.handleHttpError(error, this.router, this.messageService, this.centralServerService, 'site_areas.site_invalid');
          break;
        default:
          // Unexpected error`
          Utils.handleHttpError(error, this.router, this.messageService, this.centralServerService,
            'general.unexpected_error_backend');
      }
    });
  }

  public updateSiteAreaImage(siteArea) {
    // Set the image
    if (!this.image.endsWith(Constants.SITE_AREA_NO_IMAGE)) {
      // Set to current image
      siteArea.image = this.image;
    } else {
      // No image
      siteArea.image = null;
    }
  }

  public saveSiteArea(siteArea) {
    if (this.currentSiteAreaID) {
      this._updateSiteArea(siteArea);
    } else {
      this._createSiteArea(siteArea);
    }
  }

  private _createSiteArea(siteArea) {
    // Show
    this.spinnerService.show();
    // Set the image
    this.updateSiteAreaImage(siteArea);
    // Yes: Update
    this.centralServerService.createSiteArea(siteArea).subscribe(response => {
      // Hide
      this.spinnerService.hide();
      // Ok?
      if (response.status === Constants.REST_RESPONSE_SUCCESS) {
        // Ok
        this.messageService.showSuccessMessage('site_areas.create_success',
          {'siteAreaName': siteArea.name});
        // Close
        this.currentSiteAreaID = siteArea.id;
        this.closeDialog();
      } else {
        Utils.handleError(JSON.stringify(response),
          this.messageService, 'site_areas.create_error');
      }
    }, (error) => {
      // Hide
      this.spinnerService.hide();
      // Check status
      switch (error.status) {
        // Site Area deleted
        case 550:
          // Show error
          this.messageService.showErrorMessage('site_areas.site_area_do_not_exist');
          break;
        default:
          // No longer exists!
          Utils.handleHttpError(error, this.router, this.messageService, this.centralServerService, 'site_areas.create_error');
      }
    });
  }

  private _updateSiteArea(siteArea) {
    // Show
    this.spinnerService.show();
    // Set the image
    this.updateSiteAreaImage(siteArea);
    // Yes: Update
    this.centralServerService.updateSiteArea(siteArea).subscribe(response => {
      // Hide
      this.spinnerService.hide();
      // Ok?
      if (response.status === Constants.REST_RESPONSE_SUCCESS) {
        // Ok
        this.messageService.showSuccessMessage('site_areas.update_success', {'siteAreaName': siteArea.name});
        this.closeDialog();
      } else {
        Utils.handleError(JSON.stringify(response),
          this.messageService, 'site_areas.update_error');
      }
    }, (error) => {
      // Hide
      this.spinnerService.hide();
      // Check status
      switch (error.status) {
        // Site Area deleted
        case 550:
          // Show error
          this.messageService.showErrorMessage('site_areas.site_areas_do_not_exist');
          break;
        default:
          // No longer exists!
          Utils.handleHttpError(error, this.router, this.messageService, this.centralServerService, 'site_areas.update_error');
      }
    });
  }

  public imageChanged(event) {
    // load picture
    let reader = new FileReader(); // tslint:disable-line
    const file = event.target.files[0];
    reader.onload = () => {
      this.image = reader.result;
    };
    reader.readAsDataURL(file);
    this.formGroup.markAsDirty();
  }

  public clearImage() {
    // Clear
    this.image = Constants.SITE_AREA_NO_IMAGE;
    // Set form dirty
    this.formGroup.markAsDirty();
  }

  public closeDialog() {
    if (this.inDialog) {
      this.dialogRef.close();
    }
  }
}
