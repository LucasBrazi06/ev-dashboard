import {Component, ViewEncapsulation} from '@angular/core';
import {AuthorizationService} from '../../services/authorization-service';
import {Constants} from '../../utils/Constants';
import {AbstractTabComponent} from '../../shared/component/tab/AbstractTab.component';
import {ActivatedRoute} from '@angular/router';
import {WindowService} from '../../services/window.service';
import {ComponentEnum, ComponentService} from '../../services/component.service';

declare const $: any;

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  encapsulation: ViewEncapsulation.None
})
export class SettingsComponent extends AbstractTabComponent {
  public isOCPIActive = false;
  public isChargeAtHomeActive = false;
  public isPricingActive = false;
  public isSacActive = false;

  constructor(
    private authorizationService: AuthorizationService,
    private componentService: ComponentService,
    activatedRoute: ActivatedRoute,
    windowService: WindowService
  ) {
    super(activatedRoute, windowService, ['ocpi', 'chargeathome', 'pricing', 'sac']);
    this.isOCPIActive = componentService.isActive(ComponentEnum.OCPI);
    this.isChargeAtHomeActive = componentService.isActive(ComponentEnum.CHARGE_AT_HOME);
    this.isPricingActive = componentService.isActive(ComponentEnum.PRICING);
    this.isSacActive = componentService.isActive(ComponentEnum.SAC);
  }
}
