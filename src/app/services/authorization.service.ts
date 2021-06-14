import { Injectable } from '@angular/core';

import { Action, Entity } from '../types/Authorization';
import { SiteArea } from '../types/SiteArea';
import TenantComponents from '../types/TenantComponents';
import { UserRole, UserToken } from '../types/User';
import { CentralServerService } from './central-server.service';
import { ComponentService } from './component.service';

@Injectable()
export class AuthorizationService {
  private loggedUser!: UserToken | null;

  public constructor(
    private centralServerService: CentralServerService,
    private componentService: ComponentService) {

    this.centralServerService.getCurrentUserSubject().subscribe((user) => {
      this.loggedUser = user;
    });
  }

  public cleanUserAndUserAuthorization() {
    this.loggedUser = null;
  }

  public canListInvoicesBilling(): boolean {
    return this.canAccess(Entity.INVOICES, Action.LIST);
  }

  public canListCars(): boolean {
    return this.canAccess(Entity.CARS, Action.LIST);
  }

  public canReadCar(): boolean {
    return this.canAccess(Entity.CAR, Action.READ);
  }

  public canUpdateCar(): boolean {
    return this.canAccess(Entity.CAR, Action.UPDATE);
  }

  public canDeleteCar(): boolean {
    return this.canAccess(Entity.CAR, Action.DELETE);
  }

  public canUpdateChargingStation(): boolean {
    return this.canAccess(Entity.CHARGING_STATION, Action.UPDATE);
  }

  public canListChargingStations(): boolean {
    return this.canAccess(Entity.CHARGING_STATIONS, Action.LIST);
  }

  public canListChargingStationsInError(): boolean {
    return this.canAccess(Entity.CHARGING_STATIONS, Action.IN_ERROR);
  }

  public canListAssets(): boolean {
    return this.canAccess(Entity.ASSETS, Action.LIST);
  }

  public canListAssetsInError(): boolean {
    return this.canAccess(Entity.ASSETS, Action.IN_ERROR);
  }

  public canListChargingProfiles(): boolean {
    return this.canAccess(Entity.CHARGING_PROFILES, Action.LIST);
  }

  public canReadCompany(): boolean {
    return this.canAccess(Entity.COMPANY, Action.READ);
  }

  public canUpdateCompany(): boolean {
    return this.canAccess(Entity.COMPANY, Action.UPDATE);
  }

  public canCreateCompany(): boolean {
    return this.canAccess(Entity.COMPANY, Action.CREATE);
  }

  public canDeleteCompany(): boolean {
    return this.canAccess(Entity.COMPANY, Action.DELETE);
  }

  public canListCompanies(): boolean {
    return this.canAccess(Entity.COMPANIES, Action.LIST);
  }

  public canUpdateAsset(): boolean {
    return this.canAccess(Entity.ASSET, Action.UPDATE);
  }

  public canListSites(): boolean {
    return this.canAccess(Entity.SITES, Action.LIST);
  }

  public canReadSite(): boolean {
    return this.canAccess(Entity.SITE, Action.READ);
  }

  public canCreateSite(): boolean {
    return this.canAccess(Entity.SITE, Action.CREATE);
  }

  public canDeleteSite(): boolean {
    return this.canAccess(Entity.SITE, Action.DELETE);
  }

  public canUpdateSite(): boolean {
    return this.canAccess(Entity.SITE, Action.UPDATE);
  }

  public canListSiteAreas(): boolean {
    return this.canAccess(Entity.SITE_AREAS, Action.LIST);
  }

  public canReadSiteArea(): boolean {
    return this.canAccess(Entity.SITE_AREA, Action.READ);
  }

  public canAssignUsersSites(): boolean {
    return this.canAccess(Entity.USERS_SITES, Action.ASSIGN);
  }

  public canUnassignUsersSites(): boolean {
    return this.canAccess(Entity.USERS_SITES, Action.UNASSIGN);
  }

  public canListUsersSites(): boolean {
    return this.canAccess(Entity.USERS_SITES, Action.LIST);
  }

  public canCreateSiteArea(): boolean {
    return this.canAccess(Entity.SITE_AREA, Action.CREATE);
  }

  public canUpdateSiteArea(): boolean {
    return this.canAccess(Entity.SITE_AREA, Action.UPDATE);
  }

  public canDeleteSiteArea(): boolean {
    return this.canAccess(Entity.SITE_AREA, Action.DELETE);
  }

  public canListSettings(): boolean {
    return this.canAccess(Entity.SETTINGS, Action.LIST);
  }

  public canReadSetting(): boolean {
    return this.canAccess(Entity.SETTING, Action.READ);
  }

  public canDownloadInvoice(userId: string): boolean {
    if (this.canAccess(Entity.INVOICE, Action.DOWNLOAD)) {
      if (this.isAdmin() || (!!this.loggedUser && this.loggedUser.id === userId)) {
        return true;
      }
    }
    return false;
  }

  public canDeleteTransaction(): boolean {
    return this.canAccess(Entity.TRANSACTION, Action.DELETE);
  }

  public canExportTransactions(): boolean {
    return this.canAccess(Entity.TRANSACTIONS, Action.EXPORT);
  }

  public canListUsers(): boolean {
    return this.canAccess(Entity.USERS, Action.LIST);
  }

  public canListUsersInError(): boolean {
    return this.canAccess(Entity.USERS, Action.IN_ERROR);
  }

  public canDeleteUser(): boolean {
    return this.canAccess(Entity.USER, Action.DELETE);
  }

  public canImportUsers(): boolean {
    return this.canAccess(Entity.USERS, Action.IMPORT);
  }

  public canImportTags(): boolean {
    return this.canAccess(Entity.TAGS, Action.IMPORT);
  }

  public canExportTags(): boolean {
    return this.canAccess(Entity.TAGS, Action.EXPORT);
  }

  public canUpdateUser(): boolean {
    return this.canAccess(Entity.USER, Action.UPDATE);
  }

  public canCreateUser(): boolean {
    return this.canAccess(Entity.USER, Action.CREATE);
  }

  public canExportUsers(): boolean {
    return this.canAccess(Entity.USERS, Action.EXPORT);
  }

  public canSynchronizeBillingUser(): boolean {
    return this.canAccess(Entity.USER, Action.SYNCHRONIZE_BILLING_USER);
  }

  public canRefundTransaction(): boolean {
    return this.canAccess(Entity.TRANSACTION, Action.REFUND_TRANSACTION);
  }

  public canSynchronizeBillingUsers(): boolean {
    return this.canAccess(Entity.USERS, Action.SYNCHRONIZE_BILLING_USERS);
  }

  public canSynchronizeInvoices(): boolean {
    return this.canAccess(Entity.INVOICES, Action.SYNCHRONIZE);
  }

  public canAccess(resource: string, action: string): boolean {
    return !!this.loggedUser && !!this.loggedUser.scopes && this.loggedUser.scopes.includes(`${resource}:${action}`);
  }

  public canStopTransaction(siteArea: SiteArea, badgeID: string) {
    if (this.canAccess(Entity.CHARGING_STATION, Action.REMOTE_STOP_TRANSACTION)) {
      if (!!this.loggedUser && !!this.loggedUser.tagIDs && this.loggedUser.tagIDs.includes(badgeID)) {
        return true;
      }
      if (this.componentService.isActive(TenantComponents.ORGANIZATION)) {
        return siteArea && (this.isSiteAdmin(siteArea.siteID) || this.isAdmin());
      }
      return this.isAdmin();
    }
    return false;
  }

  public canStartTransaction(siteArea: SiteArea) {
    if (this.canAccess(Entity.CHARGING_STATION, Action.REMOTE_START_TRANSACTION)) {
      if (this.componentService.isActive(TenantComponents.ORGANIZATION)) {
        if (!siteArea) {
          return false;
        }
        return !siteArea.accessControl || this.isSiteAdmin(siteArea.siteID) || this.isAdmin() ||
          (!!this.loggedUser && !!this.loggedUser.sites && this.loggedUser.sites.includes(siteArea.siteID));
      }
      return true;
    }
    return false;
  }

  public canUnlockConnector(siteArea: SiteArea) {
    if (this.canAccess(Entity.CHARGING_STATION, Action.UNLOCK_CONNECTOR)) {
      if (this.componentService.isActive(TenantComponents.ORGANIZATION)) {
        if (!siteArea) {
          return false;
        }
        return !siteArea.accessControl || this.isSiteAdmin(siteArea.siteID) || this.isAdmin() ||
          (!!this.loggedUser && !!this.loggedUser.sites && this.loggedUser.sites.includes(siteArea.siteID));
      }
      return true;
    }
    return false;
  }

  public canReadTransaction(siteArea: SiteArea, badgeID: string) {
    if (this.canAccess(Entity.TRANSACTION, Action.READ)) {
      if (!!this.loggedUser && !!this.loggedUser.tagIDs && this.loggedUser.tagIDs.includes(badgeID)) {
        return true;
      }
      if (this.componentService.isActive(TenantComponents.ORGANIZATION) && siteArea) {
        return this.isAdmin() || this.isSiteAdmin(siteArea.siteID) || (this.isDemo() && this.isSiteUser(siteArea.siteID));
      }
      return this.isAdmin() || this.isDemo();
    }
    return false;
  }

  public canListTransactions(): boolean {
    return this.canAccess(Entity.TRANSACTIONS, Action.LIST);
  }

  public canListTransactionsInError(): boolean {
    return this.canAccess(Entity.TRANSACTIONS, Action.IN_ERROR);
  }

  public canCreateToken(): boolean {
    return this.canAccess(Entity.TOKEN, Action.CREATE);
  }

  public canListTokens(): boolean {
    return this.canAccess(Entity.TOKENS, Action.LIST);
  }

  public canUpdateToken(): boolean {
    return this.canAccess(Entity.TOKEN, Action.UPDATE);
  }

  public canDeleteToken(): boolean {
    return this.canAccess(Entity.TOKEN, Action.DELETE);
  }

  public canListPaymentMethods(): boolean {
    return this.canAccess(Entity.PAYMENT_METHODS, Action.LIST);
  }

  // TODO: Should return different response if admin is on its own pm or not ?
  public canCreatePaymentMethod(): boolean {
    return this.canAccess(Entity.PAYMENT_METHOD, Action.CREATE);
  }

  // TODO: Use canRead when we have the list of payment method
  public canReadPaymentMethod() {
    return (this.canAccess(Entity.PAYMENT_METHOD, Action.READ));
  }


  public isSiteAdmin(siteID?: string): boolean {
    return siteID ? (!!this.loggedUser && !!this.loggedUser.sitesAdmin && this.loggedUser.sitesAdmin.includes(siteID)) : this.loggedUser.rolesACL.includes('siteAdmin');
  }

  public isSiteOwner(siteID: string): boolean {
    return !!this.loggedUser && !!this.loggedUser.sitesOwner && this.loggedUser.sitesOwner.includes(siteID);
  }

  public isSiteUser(siteID: string): boolean {
    if (this.isAdmin()) {
      return true;
    }
    if (this.canAccess(Entity.SITE, Action.READ)) {
      return !!this.loggedUser && !!this.loggedUser.sites && this.loggedUser.sites.includes(siteID);
    }
    return false;
  }

  public isAdmin(): boolean {
    if (this.loggedUser) {
      return this.loggedUser.role === UserRole.ADMIN;
    }
    return false;
  }

  public hasSitesAdminRights(): boolean {
    if (this.canAccess(Entity.SITE, Action.UPDATE)) {
      return !!this.loggedUser && !!this.loggedUser.sitesAdmin && this.loggedUser.sitesAdmin.length > 0;
    }
    return false;
  }

  public getSitesAdmin(): readonly string[] {
    return !!this.loggedUser && this.loggedUser.sitesAdmin ? this.loggedUser.sitesAdmin : [];
  }

  public isSuperAdmin(): boolean {
    if (this.loggedUser) {
      return this.loggedUser.role === UserRole.SUPER_ADMIN;
    }
    return false;
  }

  public isBasic(): boolean {
    if (this.loggedUser) {
      return this.loggedUser.role === UserRole.BASIC;
    }
    return false;
  }

  public isDemo(): boolean {
    if (this.loggedUser) {
      return this.loggedUser.role === UserRole.DEMO;
    }
    return false;
  }
}
