import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, CanLoad, Route, Router, RouterStateSnapshot, UrlSegment } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { UserRole } from 'types/User';

import { environment } from '../../environments/environment';
import { AuthorizationService } from '../services/authorization.service';
import { CentralServerService } from '../services/central-server.service';
import { ComponentService } from '../services/component.service';
import { MessageService } from '../services/message.service';
import { ConfigService } from '../services/config.service';
import { AuthServiceType } from 'types/configuration/AdvancedConfiguration';

@Injectable()
export class RouteGuardService implements CanActivate, CanActivateChild, CanLoad {

  public static readonly LOGIN_ROUTE = '/auth/login';
  public static readonly TENANT_ROUTE = '/tenants';
  public static readonly CHARGING_STATION_ROUTE = '/charging-stations';
  public static readonly BROWSER_NOT_SUPPORTED_ROUTE = '/browser-not-supported';

  private userRole?: string;

  public constructor(
    private router: Router,
    private messageService: MessageService,
    private authorizationService: AuthorizationService,
    private translateService: TranslateService,
    private centralServerService: CentralServerService,
    private configService: ConfigService,
    private componentService: ComponentService) {

    this.centralServerService.getCurrentUserSubject().subscribe((user) => {
      if (user) {
        this.userRole = user.role;
      } else {
        this.userRole = undefined;
      }
    });
  }

  public async canActivate(activatedRoute: ActivatedRouteSnapshot, routerState: RouterStateSnapshot): Promise<boolean> {
    const isIE = /msie\s|trident\//i.test(window.navigator.userAgent);
    const isActiveInSuperTenant: boolean = activatedRoute && activatedRoute.data ? activatedRoute.data['activeInSuperTenant'] : false;

    if (isIE) {
      await this.redirectToBrowserNotSupportRoute();
      return false;
    }
    const queryParams = {};
    // Check if authenticated
    if (this.centralServerService.isAuthenticated()) {
      if (this.isRouteAllowed(activatedRoute.routeConfig, isActiveInSuperTenant)) {
        return true;
      }
      await this.redirectToDefaultRoute();
      return false;
    }
    this.userRole = undefined;
    // Add URL origin
    queryParams['returnUrl'] = routerState.url;
    console.log("globalAuthenticationService = " + this.configService.getAdvanced().globalAuthenticationService);
    if(this.configService.getAdvanced().globalAuthenticationService &&
        this.configService.getAdvanced().globalAuthenticationService === AuthServiceType.XSUAA) {
          //navigate to login page which will handle the xsuaa connection
          await this.router.navigate([RouteGuardService.LOGIN_ROUTE], { queryParams });
      }
    else {
      // Check user/pass in URL
      const email = activatedRoute.queryParams['email'];
      const password = activatedRoute.queryParams['password'];
      if (email && password) {
        // Login
        this.centralServerService.login({
          email,
          password,
          acceptEula: true,
        }).subscribe(async (result) => {
          // Success
          this.centralServerService.loginSucceeded(result.token);
          await this.redirectToDefaultRoute();
        }, async (error) => {
          // Report the error
          this.messageService.showErrorMessage(
            this.translateService.instant('authentication.wrong_email_or_password'));
          // Navigate to login
          await this.router.navigate([RouteGuardService.LOGIN_ROUTE], { queryParams: { email } });
        });
      } else {
        // Not logged in so redirect to login page with the return url
        //go to login page to authenticate with built-in mechanism
        await this.router.navigate([RouteGuardService.LOGIN_ROUTE], { queryParams });
      }
    }
    return false;
  }

  public async canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    return this.canActivate(childRoute, state);
  }

  public isRouteAllowed(route: Route | null, isActiveInSuperTenant?: boolean): boolean {
    const auth = route && route.data ? route.data['auth'] : undefined;
    const displayInSuperTenant = route && route.data ? route.data['displayInSuperTenant'] : false;
    if (displayInSuperTenant && this.authorizationService.isSuperAdmin()) {
      return true;
    }
    if (auth) {
      const component = route && route.data ? route.data['component'] : undefined;
      if (component && !this.componentService.isActive(component)) {
        if (this.authorizationService.isSuperAdmin() && isActiveInSuperTenant) {
          return true;
        }
        return false;
      }
      if (Array.isArray(auth)) {
        return auth.some(authElement => this.authorizationService.canAccess(authElement.entity, authElement.action));
      }
      return this.authorizationService.canAccess(auth.entity, auth.action);
    }
    return false;
  }

  public canLoad(route: Route, segments: UrlSegment[]): boolean {
    if (route.data && route.data.options && route.data.options.onlyDev) {
      return !environment.production; // if prod = false it will load module
    }
    return true;
  }

  public async redirectToDefaultRoute(): Promise<boolean> {
    let route = RouteGuardService.LOGIN_ROUTE;
    if (this.userRole) {
      switch (this.userRole) {
        case UserRole.SUPER_ADMIN:
          route = RouteGuardService.TENANT_ROUTE;
          break;
        case UserRole.ADMIN:
        case UserRole.BASIC:
        case UserRole.DEMO:
        default:
          route = RouteGuardService.CHARGING_STATION_ROUTE;
      }
    }
    return this.router.navigate([route]);
  }

  public async redirectToBrowserNotSupportRoute(): Promise<boolean> {
    return this.router.navigate([RouteGuardService.BROWSER_NOT_SUPPORTED_ROUTE]);
  }
}
