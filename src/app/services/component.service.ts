import {Injectable} from '@angular/core';
import {CentralServerService} from './central-server.service';
import { PricingSettings, PricingSettingsType } from 'app/common.types';
import { Observable } from 'rxjs';

export enum ComponentEnum {
  OCPI = 'ocpi',
  ORGANIZATION = 'organization',
  PRICING = 'pricing',
  REFUND = 'refund',
  SAC = 'sac'
}

@Injectable()
export class ComponentService {
  private activeComponents?: Array<string>;

  constructor(
      private centralServerService: CentralServerService) {
    this.centralServerService.getCurrentUserSubject().subscribe(user => {
      if (user) {
        this.activeComponents = user.activeComponents;
      } else {
        this.activeComponents = null;
      }
    });
  }

  public isActive(componentName: ComponentEnum): boolean {
    if (this.activeComponents) {
      return this.activeComponents.includes(componentName);
    } else {
      return false;
    }
  }

  public getActiveComponents(): string[] {
    return this.activeComponents;
  }

  public getPricingSettings(): Observable<PricingSettings> {
    return new Observable((observer) => {
      const pricingSettings = {
        identifier: ComponentEnum.PRICING
      } as PricingSettings;
      // Get the Pricing settings
      this.centralServerService.getSettings(ComponentEnum.PRICING).subscribe((settings) => {
        // Get the currency
        if (settings && settings.count > 0 && settings.result[0].content) {
          const config = settings.result[0].content;
          // ID
          pricingSettings.id = settings.result[0].id;
          // Simple price
          if (config.simple) {
            pricingSettings.type = PricingSettingsType.simple;
            pricingSettings.simplePricing = {
              price: config.simple.price ? parseFloat(config.simple.price) : 0,
              currency: config.simple.currency ? config.simple.currency : ''
            }
          }
          // Convergeant Charging
          if (config.convergentCharging) {
            pricingSettings.type = PricingSettingsType.convergentCharging;
            pricingSettings.convergentChargingPricing = {
              url: config.convergentCharging.url ? config.convergentCharging.url : '',
              chargeableItemName: config.convergentCharging.chargeableItemName ? config.convergentCharging.chargeableItemName : '',
              user: config.convergentCharging.user ? config.convergentCharging.user : '',
              password: config.convergentCharging.password ? config.convergentCharging.password : ''
            }
          }
        }
        observer.next(pricingSettings);
        observer.complete();
      });
    });
  }
}
