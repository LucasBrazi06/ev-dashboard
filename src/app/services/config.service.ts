import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Utils } from 'utils/Utils';

import AdvancedConfiguration, { AuthServiceType } from '../types/configuration/AdvancedConfiguration';
import AssetConfiguration from '../types/configuration/AssetConfiguration';
import AuthorizationConfiguration from '../types/configuration/AuthorizationConfiguration';
import CarConfiguration from '../types/configuration/CarConfiguration';
import CentralSystemServerConfiguration from '../types/configuration/CentralSystemServerConfiguration';
import CompanyConfiguration from '../types/configuration/CompanyConfiguration';
import { Configuration } from '../types/configuration/Configuration';
import Debug from '../types/configuration/Debug';
import FrontEndConfiguration from '../types/configuration/FrontEndConfiguration';
import Landscape, { LandscapeType } from '../types/configuration/Landscape';
import LocalesConfiguration from '../types/configuration/LocalesConfiguration';
import SiteAreaConfiguration from '../types/configuration/SiteAreaConfiguration';
import SiteConfiguration from '../types/configuration/SiteConfiguration';
import TenantConfiguration from '../types/configuration/TenantConfiguration';
import UserConfiguration from '../types/configuration/UserConfiguration';

@Injectable()
export class ConfigService {
  private static config: Configuration;

  public constructor(private http?: HttpClient) {
    this.getConfig();
  }

  public getConfig(): Configuration {
    if (!ConfigService.config) {
      this.http.get<Configuration>('/assets/config.json').subscribe((configuration) => ConfigService.config = configuration);
    }
    return ConfigService.config;
  }

  public getCentralSystemServer(): CentralSystemServerConfiguration {
    if (this.isUndefined(this.getConfig().CentralSystemServer.socketIOEnabled)) {
      this.getConfig().CentralSystemServer.socketIOEnabled = true;
    }
    if (this.isUndefined(this.getConfig().CentralSystemServer.logoutOnConnectionError)) {
      this.getConfig().CentralSystemServer.logoutOnConnectionError = true;
    }
    return this.getConfig().CentralSystemServer;
  }

  public getFrontEnd(): FrontEndConfiguration {
    return this.getConfig()?.FrontEnd ? this.getConfig().FrontEnd : { host: 'localhost' };
  }

  public getLocales(): LocalesConfiguration {
    return this.getConfig().Locales;
  }

  public getAuthorization(): AuthorizationConfiguration {
    return this.getConfig().Authorization;
  }

  public getAdvanced(): AdvancedConfiguration {
    if (Utils.isUndefined(this.getConfig().Advanced.globalAuthenticationService)) {
      this.getConfig().Advanced.globalAuthenticationService = AuthServiceType.BUILT_IN;
    }
    return this.getConfig().Advanced;
  }

  public getUser(): UserConfiguration {
    return this.getConfig().User;
  }

  public getCompany(): CompanyConfiguration {
    return this.getConfig().Company;
  }

  public getTenant(): TenantConfiguration {
    return this.getConfig().Tenant;
  }

  public getAsset(): AssetConfiguration {
    return this.getConfig().Asset;
  }

  public getSite(): SiteConfiguration {
    return this.getConfig().Site;
  }

  public getSiteArea(): SiteAreaConfiguration {
    return this.getConfig().SiteArea;
  }

  public getCar(): CarConfiguration {
    return this.getConfig().Car;
  }

  public getDebug(): Debug {
    if (this.isUndefined(this.getConfig().Debug)) {
      this.getConfig().Debug = {} as Debug;
    }
    if (this.isUndefined(this.getConfig().Debug.enabled)) {
      this.getConfig().Debug.enabled = false;
    }
    return this.getConfig().Debug;
  }

  public getLandscape(): Landscape {
    if (this.isUndefined(this.getConfig().Landscape)) {
      this.getConfig().Landscape = {} as Landscape;
    }
    if (this.isUndefined(this.getConfig().Landscape.type)) {
      this.getConfig().Landscape.type = LandscapeType.DEVELOPMENT;
    }
    return this.getConfig().Landscape;
  }

  private isUndefined(obj: any): boolean {
    return typeof obj === 'undefined';
  }
}
