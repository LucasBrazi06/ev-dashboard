/* eslint-disable max-len */
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { JwtHelperService } from '@auth0/angular-jwt';
import { StatusCodes } from 'http-status-codes';
import { BehaviorSubject, EMPTY, Observable, TimeoutError, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { Asset, AssetConsumption } from '../types/Asset';
import { BillingInvoice, BillingPaymentMethod, BillingTax } from '../types/Billing';
import { Car, CarCatalog, CarMaker, ImageObject } from '../types/Car';
import { ChargingProfile, GetCompositeScheduleCommandResult } from '../types/ChargingProfile';
import { ChargePoint, ChargingStation, OCPPAvailabilityType, OcppParameter } from '../types/ChargingStation';
import { Company } from '../types/Company';
import CentralSystemServerConfiguration from '../types/configuration/CentralSystemServerConfiguration';
import { IntegrationConnection, UserConnection } from '../types/Connection';
import { ActionResponse, ActionsResponse, BillingOperationResult, CarCatalogDataResult, CarDataResult, CheckAssetConnectionResponse, CheckBillingConnectionResponse, CompanyDataResult, DataResult, LoginResponse, OCPIGenerateLocalTokenResponse, OCPIJobStatusesResponse, OCPIPingResponse, OICPJobStatusesResponse, OICPPingResponse, Ordering, Paging, SiteAreaDataResult, SiteDataResult, TagDataResult } from '../types/DataResult';
import { EndUserLicenseAgreement } from '../types/Eula';
import { FilterParams, Image, KeyValue } from '../types/GlobalType';
import { AssetInError, ChargingStationInError, TransactionInError } from '../types/InError';
import { Log } from '../types/Log';
import { OcpiEndpoint } from '../types/ocpi/OCPIEndpoint';
import { OCPPResetType } from '../types/ocpp/OCPP';
import { OicpEndpoint } from '../types/oicp/OICPEndpoint';
import { RefundReport } from '../types/Refund';
import { RegistrationToken } from '../types/RegistrationToken';
import { ServerAction, ServerRoute } from '../types/Server';
import { BillingSettings, SettingDB } from '../types/Setting';
import { Site, SiteUser } from '../types/Site';
import { SiteArea, SiteAreaConsumption } from '../types/SiteArea';
import { StatisticData } from '../types/Statistic';
import { Tag } from '../types/Tag';
import { Tenant } from '../types/Tenant';
import { OcpiData, Transaction } from '../types/Transaction';
import { User, UserCar, UserDefaultTagCar, UserSite, UserToken } from '../types/User';
import { Constants } from '../utils/Constants';
import { Utils } from '../utils/Utils';
import { CentralServerNotificationService } from './central-server-notification.service';
import { ConfigService } from './config.service';
import { LocalStorageService } from './local-storage.service';
import { WindowService } from './window.service';

@Injectable()
export class CentralServerService {
  private centralRestServerServiceBaseURL!: string;
  private centralRestServerServiceSecuredURL!: string;
  private centralRestServerServiceUtilURL!: string;
  private restServerAuthURL!: string;
  private restServerSecuredURL!: string;
  private centralSystemServerConfig: CentralSystemServerConfiguration;
  private initialized = false;
  private currentUserToken!: string;
  private currentUser!: UserToken;
  private currentUserSubject = new BehaviorSubject<UserToken>(this.currentUser);

  public constructor(
    private httpClient: HttpClient,
    private localStorageService: LocalStorageService,
    private centralServerNotificationService: CentralServerNotificationService,
    private windowService: WindowService,
    private dialog: MatDialog,
    public configService: ConfigService) {
    // Default
    this.initialized = false;
  }

  public getCentralRestServerServiceUtilURL(): string {
    return this.centralRestServerServiceUtilURL;
  }

  public getCentralRestServerServiceSecuredURL(): string {
    return this.centralRestServerServiceSecuredURL;
  }

  public getRestServerAuthURL(): string {
    return this.restServerAuthURL;
  }

  public removeChargersFromSiteArea(siteAreaID: string, chargerIDs: string[]): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.post<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.REMOVE_CHARGING_STATIONS_FROM_SITE_AREA}`,
      { siteAreaID, chargingStationIDs: chargerIDs },
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public deleteTransactions(transactionsIDs: number[]): Observable<ActionsResponse> {
    // Verify init
    this.checkInit();
    const options = {
      headers: this.buildHttpHeaders(),
      body: { transactionsIDs },
    };
    // Execute the REST service
    return this.httpClient.delete<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.TRANSACTIONS_DELETE}`, options)
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public addChargersToSiteArea(siteAreaID: string, chargerIDs: string[]): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.post<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.ADD_CHARGING_STATIONS_TO_SITE_AREA}`,
      { siteAreaID, chargingStationIDs: chargerIDs },
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public addAssetsToSiteArea(siteAreaID: string, assetIDs: string[]): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.post<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.ADD_ASSET_TO_SITE_AREA}`,
      { siteAreaID, assetIDs },
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public removeAssetsFromSiteArea(siteAreaID: string, assetIDs: string[]): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.post<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.REMOVE_ASSET_TO_SITE_AREA}`,
      { siteAreaID, assetIDs },
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public removeUsersFromSite(siteID: string, userIDs: string[]): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.post<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.REMOVE_USERS_FROM_SITE}`,
      { siteID, userIDs },
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public addUsersToSite(siteID: string, userIDs: string[]): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.post<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.ADD_USERS_TO_SITE}`,
      { siteID, userIDs },
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public updateSiteUserAdmin(siteID: string, userID: string, siteAdmin: boolean): Observable<ActionResponse> {
    this.checkInit();
    return this.httpClient.put<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.SITE_USER_ADMIN}`,
      { siteID, userID, siteAdmin },
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public updateSiteOwner(siteID: string, userID: string, siteOwner: boolean): Observable<ActionResponse> {
    this.checkInit();
    return this.httpClient.put<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.SITE_OWNER}`,
      { siteID, userID, siteOwner },
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public removeSitesFromUser(userID: string, siteIDs: string[]): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    const url = this.buildRestEndpointUrl(ServerRoute.REST_USER_SITES, { id: userID });
    return this.httpClient.put<ActionResponse>(url,
      { siteIDs },
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public addSitesToUser(userID: string, siteIDs: string[]): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    const url = this.buildRestEndpointUrl(ServerRoute.REST_USER_SITES, { id: userID });
    return this.httpClient.post<ActionResponse>(url,
      { siteIDs },
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getCompanies(params: FilterParams,
    paging: Paging = Constants.DEFAULT_PAGING, ordering: Ordering[] = []): Observable<CompanyDataResult> {
    // Verify init
    this.checkInit();
    // Build Paging
    this.getPaging(paging, params);
    // Build Ordering
    this.getSorting(ordering, params);
    // Execute the REST service
    return this.httpClient.get<CompanyDataResult>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.COMPANIES}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getCompany(companyId: string, withLogo: boolean = false): Observable<Company> {
    const params: { [param: string]: string } = {};
    params['ID'] = companyId;
    params['WithLogo'] = withLogo.toString();
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<Company>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.COMPANY}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getCompanyLogo(companyID: string): Observable<string> {
    const params: { [param: string]: string } = {};
    params['ID'] = companyID;
    params['TenantID'] = this.currentUser?.tenantID;
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<Blob>(`${this.centralRestServerServiceUtilURL}/${ServerAction.COMPANY_LOGO}`,
      {
        headers: this.buildHttpHeaders(),
        responseType: 'blob' as 'json',
        params,
      })
      .pipe(
        switchMap((blob: Blob) => this.processImage(blob)),
        catchError(this.handleHttpError),
      );
  }

  public getAssets(params: FilterParams,
    paging: Paging = Constants.DEFAULT_PAGING, ordering: Ordering[] = []): Observable<DataResult<Asset>> {
    // Verify init
    this.checkInit();
    // Build Paging
    this.getPaging(paging, params);
    // Build Ordering
    this.getSorting(ordering, params);
    // Execute the REST service
    return this.httpClient.get<DataResult<Asset>>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.ASSETS}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getAsset(assetId: string, withImage: boolean = false, withSiteArea: boolean = false): Observable<Asset> {
    const params: { [param: string]: string } = {};
    params['ID'] = assetId;
    params['WithImage'] = withImage.toString();
    params['WithSiteArea'] = withSiteArea.toString();
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<Asset>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.ASSET}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getAssetImage(assetID: string): Observable<string> {
    const params: { [param: string]: string } = {};
    params['ID'] = assetID;
    params['TenantID'] = this.currentUser?.tenantID;
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<Blob>(`${this.centralRestServerServiceUtilURL}/${ServerAction.ASSET_IMAGE}`,
      {
        headers: this.buildHttpHeaders(),
        responseType: 'blob' as 'json',
        params,
      })
      .pipe(
        switchMap((blob: Blob) => this.processImage(blob)),
        catchError(this.handleHttpError),
      );
  }

  public getAssetsInError(params: FilterParams,
    paging: Paging = Constants.DEFAULT_PAGING, ordering: Ordering[] = []): Observable<DataResult<AssetInError>> {
    // Verify init
    this.checkInit();
    // Build Paging
    this.getPaging(paging, params);
    // Build Ordering
    this.getSorting(ordering, params);
    // Execute the REST service
    return this.httpClient.get<DataResult<AssetInError>>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.ASSETS_IN_ERROR}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getUserSites(params: FilterParams,
    paging: Paging = Constants.DEFAULT_PAGING, ordering: Ordering[] = []): Observable<DataResult<SiteUser>> {
    // Verify init
    this.checkInit();
    // Build Paging
    this.getPaging(paging, params);
    // Build Ordering
    this.getSorting(ordering, params);
    // Execute the REST service
    return this.httpClient.get<DataResult<SiteUser>>(this.buildRestEndpointUrl(ServerRoute.REST_USER_SITES, { id: params.UserID.toString() }),
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getSites(params: FilterParams,
    paging: Paging = Constants.DEFAULT_PAGING, ordering: Ordering[] = []): Observable<SiteDataResult> {
    // Verify init
    this.checkInit();
    // Build Paging
    this.getPaging(paging, params);
    // Build Ordering
    this.getSorting(ordering, params);
    // Execute the REST service
    return this.httpClient.get<SiteDataResult>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.SITES}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getChargingProfiles(params: FilterParams, paging: Paging = Constants.DEFAULT_PAGING, ordering: Ordering[] = []): Observable<DataResult<ChargingProfile>> {
    this.checkInit();
    // Build Paging
    this.getPaging(paging, params);
    // Build Ordering
    this.getSorting(ordering, params);
    return this.httpClient.get<DataResult<ChargingProfile>>(
      `${this.restServerSecuredURL}/${ServerRoute.REST_CHARGING_PROFILES}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public triggerSmartCharging(siteAreaID: string): Observable<ActionResponse> {
    this.checkInit();
    const params: { [param: string]: string } = {};
    params['SiteAreaID'] = siteAreaID;
    return this.httpClient.get<ActionResponse>(`${this.restServerSecuredURL}/${ServerRoute.REST_CHARGING_STATION_TRIGGER_SMART_CHARGING}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getSite(siteID: string, withImage: boolean = false, withCompany: boolean = false): Observable<Site> {
    const params: { [param: string]: string } = {};
    params['ID'] = siteID;
    params['WithImage'] = withImage.toString();
    params['WithCompany'] = withImage.toString();
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<Site>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.SITE}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getSiteImage(siteID: string): Observable<string> {
    const params: { [param: string]: string } = {};
    params['ID'] = siteID;
    params['TenantID'] = this.currentUser?.tenantID;
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<Blob>(`${this.centralRestServerServiceUtilURL}/${ServerAction.SITE_IMAGE}`,
      {
        headers: this.buildHttpHeaders(),
        responseType: 'blob' as 'json',
        params,
      })
      .pipe(
        switchMap((blob: Blob) => this.processImage(blob)),
        catchError(this.handleHttpError),
      );
  }

  public getSiteAreas(params: FilterParams = {},
    paging: Paging = Constants.DEFAULT_PAGING, ordering: Ordering[] = []): Observable<SiteAreaDataResult> {
    // Verify init
    this.checkInit();
    // Build Paging
    this.getPaging(paging, params);
    // Build Ordering
    this.getSorting(ordering, params);
    // Execute the REST service
    return this.httpClient.get<SiteAreaDataResult>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.SITE_AREAS}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getSiteArea(siteAreaID: string, withSite?: boolean): Observable<SiteArea> {
    const params: { [param: string]: string } = {};
    params['ID'] = siteAreaID;
    if (withSite) {
      params['WithSite'] = withSite.toString();
    }
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<SiteArea>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.SITE_AREA}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getSiteAreaImage(siteAreaID: string): Observable<string> {
    const params: { [param: string]: string } = {};
    params['ID'] = siteAreaID;
    params['TenantID'] = this.currentUser?.tenantID;
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<Blob>(`${this.centralRestServerServiceUtilURL}/${ServerAction.SITE_AREA_IMAGE}`,
      {
        headers: this.buildHttpHeaders(),
        responseType: 'blob' as 'json',
        params,
      })
      .pipe(
        switchMap((blob: Blob) => this.processImage(blob)),
        catchError(this.handleHttpError),
      );
  }

  public getTransactionYears(): Observable<number[]> {
    const params: { [param: string]: string } = {};
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<number[]>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.TRANSACTION_YEARS}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getChargingStationConsumptionStatistics(year: number,
    params: FilterParams = {}): Observable<StatisticData[]> {
    params['Year'] = year + '';
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<StatisticData[]>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.CHARGING_STATION_CONSUMPTION_STATISTICS}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getUserConsumptionStatistics(year: number,
    params: FilterParams = {}): Observable<StatisticData[]> {
    params['Year'] = year + '';
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<StatisticData[]>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.USER_CONSUMPTION_STATISTICS}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getChargingStationUsageStatistics(year: number,
    params: FilterParams = {}): Observable<StatisticData[]> {
    params['Year'] = year + '';
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<StatisticData[]>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.CHARGING_STATION_USAGE_STATISTICS}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getUserUsageStatistics(year: number,
    params: FilterParams = {}): Observable<StatisticData[]> {
    params['Year'] = year + '';
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<StatisticData[]>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.USER_USAGE_STATISTICS}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getChargingStationInactivityStatistics(year: number,
    params: FilterParams = {}): Observable<StatisticData[]> {
    params['Year'] = year + '';
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<StatisticData[]>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.CHARGING_STATION_INACTIVITY_STATISTICS}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getUserInactivityStatistics(year: number,
    params: FilterParams = {}): Observable<StatisticData[]> {
    params['Year'] = year + '';
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<StatisticData[]>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.USER_INACTIVITY_STATISTICS}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getLastTransaction(chargingStationID: string, connectorID: number): Observable<DataResult<Transaction>> {
    const params: { [param: string]: string } = {};
    params['ConnectorID'] = connectorID.toString();
    params['Limit'] = '1';
    params['Skip'] = '0';
    params['SortFields'] = '-timestamp';
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<DataResult<Transaction>>(`${this.restServerSecuredURL}/${ServerRoute.REST_CHARGING_STATIONS}/${chargingStationID}/transactions`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getChargingStationTransactionsStatistics(year: number,
    params: FilterParams = {}): Observable<StatisticData[]> {
    params['Year'] = year + '';
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<StatisticData[]>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.CHARGING_STATION_TRANSACTIONS_STATISTICS}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getUserTransactionsStatistics(year: number,
    params: FilterParams = {}): Observable<StatisticData[]> {
    params['Year'] = year + '';
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<StatisticData[]>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.USER_TRANSACTIONS_STATISTICS}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getChargingStationPricingStatistics(year: number,
    params: FilterParams = {}): Observable<StatisticData[]> {
    params['Year'] = year + '';
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<StatisticData[]>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.CHARGING_STATION_PRICING_STATISTICS}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getUserPricingStatistics(year: number,
    params: FilterParams = {}): Observable<StatisticData[]> {
    params['Year'] = year + '';
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<StatisticData[]>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.USER_PRICING_STATISTICS}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getChargingStations(params: FilterParams,
    paging: Paging = Constants.DEFAULT_PAGING, ordering: Ordering[] = []): Observable<DataResult<ChargingStation>> {
    // Verify init
    this.checkInit();
    // Build Paging
    this.getPaging(paging, params);
    // Build Ordering
    this.getSorting(ordering, params);
    // Execute the REST service
    return this.httpClient.get<DataResult<ChargingStation>>(`${this.restServerSecuredURL}/${ServerRoute.REST_CHARGING_STATIONS}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError)
      );
  }

  public getChargingStation(id: string): Observable<ChargingStation> {
    // Verify init
    this.checkInit();
    if (!id) {
      return EMPTY;
    }
    // Execute the REST service
    return this.httpClient.get<ChargingStation>(`${this.restServerSecuredURL}/${ServerRoute.REST_CHARGING_STATIONS}/${id}`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getConnectorQrCode(chargingStationID: string, connectorID: number): Observable<Image> {
    // Verify init
    this.checkInit();
    if (!chargingStationID || connectorID < 0) {
      return EMPTY;
    }
    // Execute the REST service
    return this.httpClient.get<Image>(`${this.restServerSecuredURL}/${ServerRoute.REST_CHARGING_STATIONS}/${chargingStationID}/connectors/${connectorID}/qrcode/generate`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  // eslint-disable-next-line max-len
  public getChargingStationsInError(params: FilterParams,
    paging: Paging = Constants.DEFAULT_PAGING, ordering: Ordering[] = []): Observable<DataResult<ChargingStationInError>> {
    // Verify init
    this.checkInit();
    // Build Paging
    this.getPaging(paging, params);
    // Build Ordering
    this.getSorting(ordering, params);
    // Execute the REST service
    return this.httpClient.get<DataResult<ChargingStationInError>>(`${this.restServerSecuredURL}/${ServerRoute.REST_CHARGING_STATIONS_IN_ERROR}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getSiteUsers(params: FilterParams,
    paging: Paging = Constants.DEFAULT_PAGING, ordering: Ordering[] = []): Observable<DataResult<UserSite>> {
    // Verify init
    this.checkInit();
    // Build Paging
    this.getPaging(paging, params);
    // Build Ordering
    this.getSorting(ordering, params);
    // Execute the REST service
    return this.httpClient.get<DataResult<UserSite>>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.SITE_USERS}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getUsers(params: FilterParams,
    paging: Paging = Constants.DEFAULT_PAGING, ordering: Ordering[] = []): Observable<DataResult<User>> {
    // Verify init
    this.checkInit();
    // Build Paging
    this.getPaging(paging, params);
    // Build Ordering
    this.getSorting(ordering, params);
    // Execute the REST service
    return this.httpClient.get<DataResult<User>>(this.buildRestEndpointUrl(ServerRoute.REST_USERS),
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getTag(tagID: string): Observable<Tag> {
    // Verify init
    this.checkInit();
    const params: { [param: string]: string } = {};
    params['ID'] = tagID;
    // Execute the REST service
    return this.httpClient.get<Tag>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.TAG}`,
      {
        headers: this.buildHttpHeaders(),
        params
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getUserDefaultTagCar(userID: string): Observable<UserDefaultTagCar> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    const url = this.buildRestEndpointUrl(ServerRoute.REST_USER_DEFAULT_TAG_CAR, { id: userID });
    return this.httpClient.get<UserDefaultTagCar>(url,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getTags(params: FilterParams,
    paging: Paging = Constants.DEFAULT_PAGING, ordering: Ordering[] = []): Observable<TagDataResult> {
    // Verify init
    this.checkInit();
    // Build Paging
    this.getPaging(paging, params);
    // Build Ordering
    this.getSorting(ordering, params);
    // Execute the REST service
    return this.httpClient.get<TagDataResult>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.TAGS}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public deleteTag(id: string): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.delete<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.TAG_DELETE}?ID=${id}`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public deleteTags(tagsIDs: string[]): Observable<ActionsResponse> {
    // Verify init
    this.checkInit();
    const options = {
      headers: this.buildHttpHeaders(),
      body: { tagsIDs },
    };
    // Execute the REST service
    return this.httpClient.delete<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.TAGS_DELETE}`, options)
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public createTag(tag: Tag): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.post<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.TAG_CREATE}`, tag,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public updateTag(tag: Tag): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.put<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.TAG_UPDATE}`, tag,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getUsersInError(params: FilterParams,
    paging: Paging = Constants.DEFAULT_PAGING, ordering: Ordering[] = []): Observable<DataResult<User>> {
    // Verify init
    this.checkInit();
    // Build Paging
    this.getPaging(paging, params);
    // Build Ordering
    this.getSorting(ordering, params);
    // Execute the REST service
    return this.httpClient.get<DataResult<User>>(this.buildRestEndpointUrl(ServerRoute.REST_USERS_IN_ERROR),
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getTenants(params: FilterParams,
    paging: Paging = Constants.DEFAULT_PAGING, ordering: Ordering[] = []): Observable<DataResult<Tenant>> {
    // Verify init
    this.checkInit();
    // Build Paging
    this.getPaging(paging, params);
    // Build Ordering
    this.getSorting(ordering, params);
    // Execute the REST service
    return this.httpClient.get<DataResult<Tenant>>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.TENANTS}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getTenant(id: string): Observable<Tenant> {
    // Verify init
    this.checkInit();
    if (!id) {
      return EMPTY;
    }
    // Execute the REST service
    return this.httpClient.get<Tenant>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.TENANT}`,
      {
        headers: this.buildHttpHeaders(),
        params: { ID: id },
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getTenantLogo(tenantID: string): Observable<string> {
    const params: { [param: string]: string } = {};
    params['ID'] = tenantID;
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<Blob>(
      `${this.centralRestServerServiceUtilURL}/${ServerAction.TENANT_LOGO}`,
      {
        headers: this.buildHttpHeaders(),
        responseType: 'blob' as 'json',
        params,
      })
      .pipe(
        switchMap((blob: Blob) => this.processImage(blob)),
        catchError(this.handleHttpError),
      );
  }

  public getTenantLogoBySubdomain(tenantSubDomain: string): Observable<string> {
    const params: { [param: string]: string } = {};
    params['Subdomain'] = tenantSubDomain;
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<Blob>(
      `${this.centralRestServerServiceUtilURL}/${ServerAction.TENANT_LOGO}`,
      {
        headers: this.buildHttpHeaders(),
        responseType: 'blob' as 'json',
        params,
      })
      .pipe(
        switchMap((blob: Blob) => this.processImage(blob)),
        catchError(this.handleHttpError),
      );
  }

  public getTransactions(params: FilterParams,
    paging: Paging = Constants.DEFAULT_PAGING, ordering: Ordering[] = []): Observable<DataResult<Transaction>> {
    // Verify init
    this.checkInit();
    // Build Paging
    this.getPaging(paging, params);
    // Build Ordering
    this.getSorting(ordering, params);
    // Execute the REST service
    return this.httpClient.get<DataResult<Transaction>>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.TRANSACTIONS_COMPLETED}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getTransactionsToRefund(params: FilterParams,
    paging: Paging = Constants.DEFAULT_PAGING,
    ordering: Ordering[] = []): Observable<DataResult<Transaction>> {
    // Verify init
    this.checkInit();
    // Build Paging
    this.getPaging(paging, params);
    // Build Ordering
    this.getSorting(ordering, params);
    // Execute the REST service
    return this.httpClient.get<DataResult<Transaction>>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.TRANSACTIONS_TO_REFUND}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getRefundReports(params: FilterParams,
    paging: Paging = Constants.DEFAULT_PAGING,
    ordering: Ordering[] = []): Observable<DataResult<RefundReport>> {
    // Verify init
    this.checkInit();
    // Build Paging
    this.getPaging(paging, params);
    // Build Ordering
    this.getSorting(ordering, params);
    // Execute the REST service
    return this.httpClient.get<DataResult<RefundReport>>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.TRANSACTIONS_TO_REFUND_REPORTS}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public exportTransactionOcpiCdr(id: number): Observable<OcpiData> {
    // Verify init
    this.checkInit();
    if (!id) {
      return EMPTY;
    }
    // Execute the REST service
    return this.httpClient.get<OcpiData>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.TRANSACTION_OCPI_CDR_EXPORT}`,
      {
        headers: this.buildHttpHeaders(),
        params: { ID: id.toString() },
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public assignTransactionsToUser(userID: string, tagID: string): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.put<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.ASSIGN_TRANSACTIONS_TO_USER}`,
      null,
      {
        headers: this.buildHttpHeaders(),
        params: {
          UserID: userID,
          TagID: tagID,
        },
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getUnassignedTransactionsCount(tagID: string): Observable<number> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<number>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.UNASSIGNED_TRANSACTIONS_COUNT}`,
      {
        headers: this.buildHttpHeaders(),
        params: {
          TagID: tagID
        },
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getTransaction(id: number): Observable<Transaction> {
    // Verify init
    this.checkInit();
    if (!id) {
      return EMPTY;
    }
    // Execute the REST service
    return this.httpClient.get<Transaction>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.TRANSACTION}`,
      {
        headers: this.buildHttpHeaders(),
        params: { ID: id.toString() },
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public rebuildTransactionConsumption(id: number): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    if (!id) {
      return EMPTY;
    }
    // Execute the REST service
    return this.httpClient.get<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.REBUILD_TRANSACTION_CONSUMPTIONS}`,
      {
        headers: this.buildHttpHeaders(),
        params: { ID: id.toString() },
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public exportLogs(params: FilterParams): Observable<Blob> {
    this.checkInit();
    return this.httpClient.get(`${this.centralRestServerServiceSecuredURL}/${ServerAction.LOGGINGS_EXPORT}`,
      {
        headers: this.buildHttpHeaders(),
        responseType: 'blob',
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public exportUsers(params: FilterParams): Observable<Blob> {
    this.checkInit();
    return this.httpClient.get(this.buildRestEndpointUrl(ServerRoute.REST_USERS_EXPORT),
      {
        headers: this.buildHttpHeaders(),
        responseType: 'blob',
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public exportTransactions(params: FilterParams): Observable<Blob> {
    this.checkInit();
    return this.httpClient.get(`${this.centralRestServerServiceSecuredURL}/${ServerAction.TRANSACTIONS_EXPORT}`,
      {
        headers: this.buildHttpHeaders(),
        responseType: 'blob',
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public exportTransactionsToRefund(params: FilterParams): Observable<Blob> {
    this.checkInit();
    return this.httpClient.get(`${this.centralRestServerServiceSecuredURL}/${ServerAction.TRANSACTIONS_TO_REFUND_EXPORT}`,
      {
        headers: this.buildHttpHeaders(),
        responseType: 'blob',
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public exportStatistics(params: FilterParams): Observable<Blob> {
    this.checkInit();
    return this.httpClient.get(`${this.centralRestServerServiceSecuredURL}/${ServerAction.STATISTICS_EXPORT}`,
      {
        headers: this.buildHttpHeaders(),
        responseType: 'blob',
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public exportChargingStations(params: FilterParams): Observable<Blob> {
    this.checkInit();
    return this.httpClient.get(`${this.restServerSecuredURL}/${ServerRoute.REST_CHARGING_STATIONS_EXPORT}`,
      {
        headers: this.buildHttpHeaders(),
        responseType: 'blob',
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public exportAllChargingStationsOCPPParams(params: FilterParams): Observable<Blob> {
    // Verify init
    this.checkInit();
    return this.httpClient.get(`${this.restServerSecuredURL}/${ServerRoute.REST_CHARGING_STATIONS_EXPORT_OCPP_PARAMETERS}`,
      {
        headers: this.buildHttpHeaders(),
        responseType: 'blob',
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public exportTags(params: FilterParams): Observable<Blob> {
    // Verify init
    this.checkInit();
    return this.httpClient.get(`${this.centralRestServerServiceSecuredURL}/${ServerAction.TAGS_EXPORT}`,
      {
        headers: this.buildHttpHeaders(),
        responseType: 'blob',
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getTransactionsInError(params: FilterParams,
    paging: Paging = Constants.DEFAULT_PAGING, ordering: Ordering[] = []): Observable<DataResult<TransactionInError>> {
    // Verify init
    this.checkInit();
    // Build Paging
    this.getPaging(paging, params);
    // Build Ordering
    this.getSorting(ordering, params);
    // Execute the REST service
    return this.httpClient.get<DataResult<TransactionInError>>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.TRANSACTIONS_IN_ERROR}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getActiveTransactions(params: FilterParams,
    paging: Paging = Constants.DEFAULT_PAGING, ordering: Ordering[] = []): Observable<DataResult<Transaction>> {
    // Verify init
    this.checkInit();
    // Build Paging
    this.getPaging(paging, params);
    // Build Ordering
    this.getSorting(ordering, params);
    // Execute the REST service
    return this.httpClient.get<DataResult<Transaction>>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.TRANSACTIONS_ACTIVE}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  // eslint-disable-next-line max-len
  public getOcpiEndpoints(params: FilterParams,
    paging: Paging = Constants.DEFAULT_PAGING, ordering: Ordering[] = []): Observable<DataResult<OcpiEndpoint>> {
    // Verify init
    this.checkInit();
    // Build Paging
    this.getPaging(paging, params);
    // Build Ordering
    this.getSorting(ordering, params);
    // Execute the REST service
    return this.httpClient.get<DataResult<OcpiEndpoint>>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.OCPI_ENDPOINTS}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  // eslint-disable-next-line max-len
  public getOicpEndpoints(params: FilterParams,
    paging: Paging = Constants.DEFAULT_PAGING, ordering: Ordering[] = []): Observable<DataResult<OicpEndpoint>> {
    // Verify init
    this.checkInit();
    // Build Paging
    this.getPaging(paging, params);
    // Build Ordering
    this.getSorting(ordering, params);
    // Execute the REST service
    return this.httpClient.get<DataResult<OicpEndpoint>>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.OICP_ENDPOINTS}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getSiteAreaConsumption(siteAreaID: string, startDate: Date, endDate: Date): Observable<SiteAreaConsumption> {
    const params: { [param: string]: string } = {};
    params['SiteAreaID'] = siteAreaID;
    params['StartDate'] = startDate.toISOString();
    params['EndDate'] = endDate.toISOString();
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<SiteAreaConsumption>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.SITE_AREA_CONSUMPTION}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getAssetConsumption(assetID: string, startDate: Date, endDate: Date): Observable<AssetConsumption> {
    const params: { [param: string]: string } = {};
    params['AssetID'] = assetID;
    params['StartDate'] = startDate.toISOString();
    params['EndDate'] = endDate.toISOString();
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<AssetConsumption>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.ASSET_CONSUMPTION}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getTransactionConsumption(transactionId: number, loadAllConsumptions?: boolean, ordering: Ordering[] = []): Observable<Transaction> {
    const params: { [param: string]: string } = {};
    params['TransactionId'] = transactionId.toString();
    if (loadAllConsumptions) {
      params['LoadAllConsumptions'] = loadAllConsumptions.toString();
    }
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<Transaction>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.TRANSACTION_CONSUMPTION}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public createTenant(tenant: Tenant): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.post<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.TENANT_CREATE}`, tenant,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public updateTenant(tenant: Tenant): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.put<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.TENANT_UPDATE}`, tenant,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public deleteTenant(id: string): Observable<ActionResponse> {
    this.checkInit();
    // Execute the REST service
    return this.httpClient.delete<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.TENANT_DELETE}?ID=${id}`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getLogs(params: FilterParams,
    paging: Paging = Constants.DEFAULT_PAGING, ordering: Ordering[] = []): Observable<DataResult<Log>> {
    // Verify init
    this.checkInit();
    // Build Paging
    this.getPaging(paging, params);
    // Build Ordering
    this.getSorting(ordering, params);
    // Execute the REST service
    return this.httpClient.get<DataResult<Log>>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.LOGGINGS}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getLog(id: string): Observable<Log> {
    // Verify init
    this.checkInit();
    if (!id) {
      return EMPTY;
    }
    // Call
    return this.httpClient.get<Log>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.LOGGING}?ID=${id}`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getUserImage(id: string): Observable<Image> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    if (!id) {
      return EMPTY;
    }
    const url = this.buildRestEndpointUrl(ServerRoute.REST_USER_IMAGE, { id });
    return this.httpClient.get<Image>(url,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getUser(id: string): Observable<User> {
    // Verify init
    this.checkInit();
    if (!id) {
      return EMPTY;
    }
    // Execute the REST service
    const url = this.buildRestEndpointUrl(ServerRoute.REST_USER, { id });
    return this.httpClient.get<User>(url,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getInvoice(invoiceID: string): Observable<Blob> {
    // Verify init
    this.checkInit();
    if (!invoiceID) {
      return EMPTY;
    }
    const url = this.buildRestEndpointUrl(ServerRoute.REST_BILLING_INVOICE, {
      invoiceID
    });
    // Execute the REST service
    return this.httpClient.get(url,
      {
        headers: this.buildHttpHeaders(),
        responseType: 'blob',
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getSetting(identifier: string): Observable<SettingDB> {
    // verify init
    this.checkInit();
    // Execute the REST Service
    return this.httpClient.get<SettingDB>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.SETTING_BY_IDENTIFIER}?ID=${identifier}`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getBillingSettings(): Observable<BillingSettings> {
    // verify init
    this.checkInit();
    // Build the URL
    const url = this.buildRestEndpointUrl(ServerRoute.REST_BILLING_SETTING);
    // Execute the REST Service
    return this.httpClient.get<BillingSettings>(url, {
      headers: this.buildHttpHeaders()
    }).pipe(
      catchError(this.handleHttpError),
    );
  }

  public updateBillingSettings(billingSettings: BillingSettings): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Build the URL
    const url = this.buildRestEndpointUrl(ServerRoute.REST_BILLING_SETTING);
    // Execute
    return this.httpClient.put<ActionResponse>(url, billingSettings, {
      headers: this.buildHttpHeaders(),
    }).pipe(
      catchError(this.handleHttpError),
    );
  }

  public clearBillingTestData(): Observable<BillingOperationResult> {
    // Verify init
    this.checkInit();
    // Build the URL
    const url = this.buildRestEndpointUrl(ServerRoute.REST_BILLING_CLEAR_TEST_DATA);
    // Execute
    return this.httpClient.post<BillingOperationResult>(url, {}, {
      headers: this.buildHttpHeaders(),
    }).pipe(
      catchError(this.handleHttpError),
    );
  }

  public checkBillingConnection(): Observable<CheckBillingConnectionResponse> {
    // verify init
    this.checkInit();
    // Build the URL
    const url = this.buildRestEndpointUrl(ServerRoute.REST_BILLING_CHECK);
    // Execute the REST Service
    return this.httpClient.post<CheckBillingConnectionResponse>(url, {}, {
      headers: this.buildHttpHeaders()
    }).pipe(
      catchError(this.handleHttpError),
    );
  }

  public synchronizeUsersForBilling(): Observable<ActionsResponse> {
    this.checkInit();
    // Execute the REST service
    return this.httpClient.post<ActionsResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.BILLING_SYNCHRONIZE_USERS}`, {},
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public synchronizeUserForBilling(userID: string): Observable<ActionResponse> {
    this.checkInit();
    // Execute the REST service
    return this.httpClient.post<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.BILLING_SYNCHRONIZE_USER}`, { id: userID },
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  // TODO - create a dedicated method for the ATTACH?
  public setupPaymentMethod(parameters: any): Observable<BillingOperationResult> {
    this.checkInit();
    // Build the URL
    const urlPattern: ServerRoute = (!parameters.paymentMethodID) ? ServerRoute.REST_BILLING_PAYMENT_METHOD_SETUP : ServerRoute.REST_BILLING_PAYMENT_METHOD_ATTACH;
    const url = this.buildRestEndpointUrl(urlPattern, {
      userID: parameters.userID,
      paymentMethodID: parameters.paymentMethodID
    });
    // Execute the REST service
    return this.httpClient.post<BillingOperationResult>(url, parameters, {
      headers: this.buildHttpHeaders(),
    }).pipe(
      catchError(this.handleHttpError),
    );
  }

  public getPaymentMethods(currentUserID: string, params: FilterParams,
    paging: Paging = Constants.DEFAULT_PAGING, ordering: Ordering[] = []): Observable<DataResult<BillingPaymentMethod>> {
    // Verify init
    this.checkInit();
    // Build Paging
    this.getPaging(paging, params);
    // Build Ordering
    this.getSorting(ordering, params);
    // Build the URL
    const url = this.buildRestEndpointUrl(ServerRoute.REST_BILLING_PAYMENT_METHODS, {
      userID: currentUserID
    });
    // Execute the REST Service
    return this.httpClient.get<DataResult<BillingPaymentMethod>>(url, {
      headers: this.buildHttpHeaders(),
      params
    }).pipe(
      catchError(this.handleHttpError),
    );
  }

  public deletePaymentMethod(paymentMethodID: string, userID: string): Observable<BillingOperationResult> {
    // Verify init
    this.checkInit();
    const options = {
      headers: this.buildHttpHeaders(),
      // body: { paymentMethodId: paymentMethodID, userID },
    };
    // Build the URL
    const url = this.buildRestEndpointUrl(ServerRoute.REST_BILLING_PAYMENT_METHOD, {
      userID,
      paymentMethodID
    });
    // Execute the REST service
    return this.httpClient.delete<BillingOperationResult>(url, options)
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public forceSynchronizeUserForBilling(userID: string): Observable<ActionResponse> {
    this.checkInit();
    // Execute the REST service
    return this.httpClient.post<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.BILLING_FORCE_SYNCHRONIZE_USER}`,
      { id: userID },
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getBillingTaxes(): Observable<BillingTax[]> {
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<BillingTax[]>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.BILLING_TAXES}`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getInvoices(params: FilterParams,
    paging: Paging = Constants.DEFAULT_PAGING, ordering: Ordering[] = []): Observable<DataResult<BillingInvoice>> {
    // Verify init
    this.checkInit();
    // Build Paging
    this.getPaging(paging, params);
    // Build Ordering
    this.getSorting(ordering, params);
    // Build the URL
    const url = this.buildRestEndpointUrl(ServerRoute.REST_BILLING_INVOICES);
    // Execute the REST Service
    return this.httpClient.get<DataResult<BillingInvoice>>(url, {
      headers: this.buildHttpHeaders(),
      params
    }).pipe(
      catchError(this.handleHttpError),
    );
  }

  public synchronizeInvoicesForBilling(): Observable<ActionsResponse> {
    this.checkInit();
    // Execute the REST service
    return this.httpClient.post<ActionsResponse>(
      `${this.centralRestServerServiceSecuredURL}/${ServerAction.BILLING_SYNCHRONIZE_INVOICES}`, {},
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public forceSynchronizeUserInvoicesForBilling(userID: string): Observable<ActionsResponse> {
    this.checkInit();
    // Execute the REST service
    return this.httpClient.post<ActionsResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.BILLING_FORCE_SYNCHRONIZE_USER_INVOICES}`,
      { userID },
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public createTransactionInvoice(transactionID: number): Observable<ActionResponse> {
    this.checkInit();
    // Execute the REST service
    return this.httpClient.post<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.BILLING_CREATE_TRANSACTION_INVOICE}`, { transactionID },
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public downloadInvoice(invoiceID: string): Observable<Blob> {
    this.checkInit();
    if (!invoiceID) {
      return EMPTY;
    }
    const url = this.buildRestEndpointUrl(ServerRoute.REST_BILLING_DOWNLOAD_INVOICE, {
      invoiceID
    });
    return this.httpClient.get(url,
      {
        headers: this.buildHttpHeaders(),
        responseType: 'blob',
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public downloadSiteQrCodes(siteID: string): Observable<Blob> {
    this.checkInit();
    const params: { [param: string]: string } = {};
    params['SiteID'] = siteID;
    return this.httpClient.get(`${this.restServerSecuredURL}/${ServerRoute.REST_CHARGING_STATIONS_QRCODE_DOWNLOAD}/`,
      {
        headers: this.buildHttpHeaders(),
        params,
        responseType: 'blob',
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public downloadSiteAreaQrCodes(siteAreaID?: string): Observable<Blob> {
    this.checkInit();
    const params: { [param: string]: string } = {};
    params['SiteAreaID'] = siteAreaID;
    return this.httpClient.get(`${this.restServerSecuredURL}/${ServerRoute.REST_CHARGING_STATIONS_QRCODE_DOWNLOAD}`,
      {
        headers: this.buildHttpHeaders(),
        params,
        responseType: 'blob',
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public downloadChargingStationQrCodes(chargingStationID: string, connectorID?: number): Observable<Blob> {
    this.checkInit();
    const params: { [param: string]: string } = {};
    params['ChargingStationID'] = chargingStationID;
    if (connectorID) {
      params['ConnectorID'] = connectorID.toString();
    }
    return this.httpClient.get(`${this.restServerSecuredURL}/${ServerRoute.REST_CHARGING_STATIONS_QRCODE_DOWNLOAD}`,
      {
        headers: this.buildHttpHeaders(),
        params,
        responseType: 'blob',
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getRegistrationTokens(params: FilterParams,
    paging: Paging = Constants.DEFAULT_PAGING, ordering: Ordering[] = []): Observable<DataResult<RegistrationToken>> {
    // Verify init
    this.checkInit();
    // Build Paging
    this.getPaging(paging, params);
    // Build Ordering
    this.getSorting(ordering, params);
    // Execute the REST service
    return this.httpClient.get<DataResult<RegistrationToken>>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.REGISTRATION_TOKENS}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getRegistrationToken(registrationTokenID: string): Observable<RegistrationToken> {
    // Verify init
    this.checkInit();
    const params: { [param: string]: string } = {};
    params['ID'] = registrationTokenID;
    // Execute the REST service
    return this.httpClient.get<RegistrationToken>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.REGISTRATION_TOKEN}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public createRegistrationToken(registrationToken: Partial<RegistrationToken> = {}): Observable<RegistrationToken> {
    this.checkInit();
    return this.httpClient.post<RegistrationToken>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.REGISTRATION_TOKEN_CREATE}`, registrationToken,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public updateRegistrationToken(registrationToken: RegistrationToken): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.put<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.REGISTRATION_TOKEN_UPDATE}`, registrationToken,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public deleteRegistrationToken(id: string): Observable<ActionResponse> {
    this.checkInit();
    return this.httpClient.delete<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.REGISTRATION_TOKEN_DELETE}?ID=${id}`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public revokeRegistrationToken(id: string): Observable<ActionResponse> {
    this.checkInit();
    return this.httpClient.delete<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.REGISTRATION_TOKEN_REVOKE}?ID=${id}`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getEndUserLicenseAgreement(language: string): Observable<EndUserLicenseAgreement> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<EndUserLicenseAgreement>(`${this.restServerAuthURL}/${ServerRoute.REST_END_USER_LICENSE_AGREEMENT}`,
      {
        headers: this.buildHttpHeaders(this.windowService.getSubdomain()),
        params: { language }
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public login(user: any): Observable<LoginResponse> {
    // Verify init
    this.checkInit();
    // Set the tenant
    user['tenant'] = this.windowService.getSubdomain();
    // Execute
    return this.httpClient.post<LoginResponse>(`${this.restServerAuthURL}/${ServerRoute.REST_SIGNIN}`, user,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public loginSucceeded(token: string): void {
    // Keep the token in local storage
    this.currentUserToken = token;
    this.currentUser = new JwtHelperService().decodeToken(token);
    this.localStorageService.setItem('token', token);
    // Notify
    this.currentUserSubject.next(this.currentUser);
    // Init Socket IO at user login
    if (this.configService.getCentralSystemServer().socketIOEnabled) {
      this.centralServerNotificationService.initSocketIO(token);
    }
  }

  public getLoggedUser(): UserToken {
    // Get the token
    if (!this.currentUser) {
      this.readAndDecodeTokenFromLocalStorage();
    }
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return this.getLoggedUserToken() && !new JwtHelperService().isTokenExpired(this.getLoggedUserToken());
  }

  public getCurrentUserSubject(): BehaviorSubject<UserToken> {
    return this.currentUserSubject;
  }

  public logout(): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<ActionResponse>(`${this.restServerAuthURL}/${ServerRoute.REST_SIGNOUT}`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public logoutSucceeded(): void {
    this.dialog.closeAll();
    this.clearLoggedUser();
    if (this.configService.getCentralSystemServer().socketIOEnabled) {
      this.centralServerNotificationService.resetSocketIO();
    }
  }

  public resetUserPassword(data: any): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Set the tenant
    data['tenant'] = this.windowService.getSubdomain();
    // Execute
    return this.httpClient.post<ActionResponse>(`${this.restServerAuthURL}/${ServerRoute.REST_PASSWORD_RESET}`, data,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public registerUser(user: any): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Set the tenant
    user['tenant'] = this.windowService.getSubdomain();
    // Execute
    return this.httpClient.post<ActionResponse>(`${this.restServerAuthURL}/${ServerRoute.REST_SIGNON}`, user,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public createUser(user: any): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.post<ActionResponse>(this.buildRestEndpointUrl(ServerRoute.REST_USERS), user,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public updateUser(user: any): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute
    const url = this.buildRestEndpointUrl(ServerRoute.REST_USER, { id: user.id });
    return this.httpClient.put<ActionResponse>(url, user,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public createCompany(company: any): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.post<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.COMPANY_CREATE}`, company,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public updateCompany(company: any): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.put<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.COMPANY_UPDATE}`, company,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public deleteCompany(id: string): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.delete<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.COMPANY_DELETE}?ID=${id}`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public createAsset(asset: any): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.post<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.ASSET_CREATE}`, asset,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public updateAsset(asset: any): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.put<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.ASSET_UPDATE}`, asset,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public deleteAsset(id: string): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.delete<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.ASSET_DELETE}?ID=${id}`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public checkAssetConnection(assetConnectionId: string): Observable<CheckAssetConnectionResponse> {
    const params: { [param: string]: string } = {};
    params['ID'] = assetConnectionId;
    // Verify init
    this.checkInit();
    // Execute REST service
    return this.httpClient.get<CheckAssetConnectionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.CHECK_ASSET_CONNECTION}`,
      {
        headers: this.buildHttpHeaders(),
        params
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public tableRetrieveAssetConsumptionAction(assetId: string): Observable<ActionResponse> {
    const params: { [param: string]: string } = {};
    params['ID'] = assetId;
    // Verify init
    this.checkInit();
    // Execute REST service
    return this.httpClient.get<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.RETRIEVE_ASSET_CONSUMPTION}`,
      {
        headers: this.buildHttpHeaders(),
        params
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public createSite(site: Site): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.post<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.SITE_CREATE}`, site,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public updateSite(site: Site): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.put<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.SITE_UPDATE}`, site,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public deleteSite(id: string): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.delete<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.SITE_DELETE}?ID=${id}`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public createSiteArea(siteArea: SiteArea): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.post<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.SITE_AREA_CREATE}`, siteArea,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public updateSiteArea(siteArea: SiteArea): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.put<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.SITE_AREA_UPDATE}`, siteArea,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public deleteSiteArea(id: string): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.delete<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.SITE_AREA_DELETE}?ID=${id}`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public checkSmartChargingConnection(): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.get<ActionResponse>(`${this.restServerSecuredURL}/${ServerRoute.REST_CHARGING_STATION_CHECK_SMART_CHARGING_CONNECTION}`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public updateSetting(setting: any): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.put<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.SETTING_UPDATE}`, setting,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public createOcpiEndpoint(ocpiEndpoint: any): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.post<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.OCPI_ENDPOINT_CREATE}`,
      ocpiEndpoint,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public sendEVSEStatusesOcpiEndpoint(ocpiEndpoint: OcpiEndpoint): Observable<OCPIJobStatusesResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.post<OCPIJobStatusesResponse>(
      `${this.centralRestServerServiceSecuredURL}/${ServerAction.OCPI_ENDPOINT_SEND_EVSE_STATUSES}`, ocpiEndpoint,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public sendTokensOcpiEndpoint(ocpiEndpoint: OcpiEndpoint): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.post<OCPIJobStatusesResponse>(
      `${this.centralRestServerServiceSecuredURL}/${ServerAction.OCPI_ENDPOINT_SEND_TOKENS}`, ocpiEndpoint,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public pullLocationsOcpiEndpoint(ocpiEndpoint: OcpiEndpoint): Observable<OCPIJobStatusesResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.post<OCPIJobStatusesResponse>(
      `${this.centralRestServerServiceSecuredURL}/${ServerAction.OCPI_ENDPOINT_PULL_LOCATIONS}`, ocpiEndpoint,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public pullSessionsOcpiEndpoint(ocpiEndpoint: OcpiEndpoint): Observable<OCPIJobStatusesResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.post<OCPIJobStatusesResponse>(
      `${this.centralRestServerServiceSecuredURL}/${ServerAction.OCPI_ENDPOINT_PULL_SESSIONS}`, ocpiEndpoint,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public pullTokensOcpiEndpoint(ocpiEndpoint: OcpiEndpoint): Observable<OCPIJobStatusesResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.post<OCPIJobStatusesResponse>(
      `${this.centralRestServerServiceSecuredURL}/${ServerAction.OCPI_ENDPOINT_PULL_TOKENS}`, ocpiEndpoint,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public pullCdrsOcpiEndpoint(ocpiEndpoint: OcpiEndpoint): Observable<OCPIJobStatusesResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.post<OCPIJobStatusesResponse>(
      `${this.centralRestServerServiceSecuredURL}/${ServerAction.OCPI_ENDPOINT_PULL_CDRS}`, ocpiEndpoint,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public checkLocationsOcpiEndpoint(ocpiEndpoint: OcpiEndpoint): Observable<OCPIJobStatusesResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.post<OCPIJobStatusesResponse>(
      `${this.centralRestServerServiceSecuredURL}/${ServerAction.OCPI_ENDPOINT_CHECK_LOCATIONS}`, ocpiEndpoint,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public checkCdrsOcpiEndpoint(ocpiEndpoint: OcpiEndpoint): Observable<OCPIJobStatusesResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.post<OCPIJobStatusesResponse>(
      `${this.centralRestServerServiceSecuredURL}/${ServerAction.OCPI_ENDPOINT_CHECK_CDRS}`, ocpiEndpoint,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public checkSessionsOcpiEndpoint(ocpiEndpoint: OcpiEndpoint): Observable<OCPIJobStatusesResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.post<OCPIJobStatusesResponse>(
      `${this.centralRestServerServiceSecuredURL}/${ServerAction.OCPI_ENDPOINT_CHECK_SESSIONS}`, ocpiEndpoint,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public createOicpEndpoint(oicpEndpoint: any): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.post<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.OICP_ENDPOINT_CREATE}`,
      oicpEndpoint,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public sendEVSEStatusesOicpEndpoint(oicpEndpoint: OicpEndpoint): Observable<OICPJobStatusesResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.post<OICPJobStatusesResponse>(
      `${this.centralRestServerServiceSecuredURL}/${ServerAction.OICP_ENDPOINT_SEND_EVSE_STATUSES}`, oicpEndpoint,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public sendEVSEsOicpEndpoint(oicpEndpoint: OicpEndpoint): Observable<OICPJobStatusesResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.post<OICPJobStatusesResponse>(
      `${this.centralRestServerServiceSecuredURL}/${ServerAction.OICP_ENDPOINT_SEND_EVSES}`, oicpEndpoint,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public pingOicpEndpoint(oicpEndpoint: any): Observable<OICPPingResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.post<OICPPingResponse>(
      `${this.centralRestServerServiceSecuredURL}/${ServerAction.OICP_ENDPOINT_PING}`, oicpEndpoint,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public updateOicpEndpoint(oicpEndpoint: OicpEndpoint): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.put<ActionResponse>(
      `${this.centralRestServerServiceSecuredURL}/${ServerAction.OICP_ENDPOINT_UPDATE}`, oicpEndpoint,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public deleteOicpEndpoint(id: string): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.delete<ActionResponse>(
      `${this.centralRestServerServiceSecuredURL}/${ServerAction.OICP_ENDPOINT_DELETE}?ID=${id}`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public unregisterOicpEndpoint(id: string): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.put<ActionResponse>(
      `${this.centralRestServerServiceSecuredURL}/${ServerAction.OICP_ENDPOINT_UNREGISTER}?ID=${id}`,
      `{ "id": "${id}" }`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public registerOicpEndpoint(id: string): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.put<ActionResponse>(
      `${this.centralRestServerServiceSecuredURL}/${ServerAction.OICP_ENDPOINT_REGISTER}?ID=${id}`,
      `{ "id": "${id}" }`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public pingOcpiEndpoint(ocpiEndpoint: any): Observable<OCPIPingResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.post<OCPIPingResponse>(
      `${this.centralRestServerServiceSecuredURL}/${ServerAction.OCPI_ENDPOINT_PING}`, ocpiEndpoint,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public generateLocalTokenOcpiEndpoint(ocpiEndpoint: any): Observable<OCPIGenerateLocalTokenResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.post<OCPIGenerateLocalTokenResponse>(
      `${this.centralRestServerServiceSecuredURL}/${ServerAction.OCPI_ENDPOINT_GENERATE_LOCAL_TOKEN}`, ocpiEndpoint,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public updateOcpiEndpoint(ocpiEndpoint: OcpiEndpoint): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.put<ActionResponse>(
      `${this.centralRestServerServiceSecuredURL}/${ServerAction.OCPI_ENDPOINT_UPDATE}`, ocpiEndpoint,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public deleteOcpiEndpoint(id: string): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.delete<ActionResponse>(
      `${this.centralRestServerServiceSecuredURL}/${ServerAction.OCPI_ENDPOINT_DELETE}?ID=${id}`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public unregisterOcpiEndpoint(id: string): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.put<ActionResponse>(
      `${this.centralRestServerServiceSecuredURL}/${ServerAction.OCPI_ENDPOINT_UNREGISTER}?ID=${id}`,
      `{ "id": "${id}" }`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public registerOcpiEndpoint(id: string): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.put<ActionResponse>(
      `${this.centralRestServerServiceSecuredURL}/${ServerAction.OCPI_ENDPOINT_REGISTER}?ID=${id}`,
      `{ "id": "${id}" }`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public deleteUser(id: string): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    const url = this.buildRestEndpointUrl(ServerRoute.REST_USER, { id });
    return this.httpClient.delete<ActionResponse>(url,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public verifyEmail(params: FilterParams): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Set the tenant
    params['Tenant'] = this.windowService.getSubdomain();
    // Execute the REST service
    return this.httpClient.get<ActionResponse>(`${this.restServerAuthURL}/${ServerRoute.REST_MAIL_CHECK}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public resendVerificationEmail(user: any): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Set the tenant
    user['tenant'] = this.windowService.getSubdomain();
    // Execute
    return this.httpClient.post<ActionResponse>(`${this.restServerAuthURL}/${ServerRoute.REST_MAIL_RESEND}`, user,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public deleteTransaction(id: number): Observable<ActionResponse> {
    this.checkInit();
    // Execute the REST service
    return this.httpClient.delete<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.TRANSACTION_DELETE}?ID=${id}`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public refundTransactions(ids: number[]): Observable<ActionsResponse> {
    this.checkInit();
    // Execute the REST service
    return this.httpClient.post<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.TRANSACTIONS_REFUND}`, { transactionIds: ids },
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public pushTransactionCdr(id: number): Observable<ActionsResponse> {
    this.checkInit();
    // Execute the REST service
    return this.httpClient.post<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.TRANSACTION_PUSH_CDR}`,
      { transactionId: id },
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public synchronizeRefundedTransactions(): Observable<ActionResponse> {
    this.checkInit();
    // Execute the REST service
    return this.httpClient.post<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.SYNCHRONIZE_REFUNDED_TRANSACTIONS}`, {},
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public softStopTransaction(id: number): Observable<ActionResponse> {
    this.checkInit();
    return this.httpClient.put<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.TRANSACTION_SOFT_STOP}`,
      `{ "ID": "${id}" }`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public chargingStationStopTransaction(chargingStationID: string, transactionId: number): Observable<ActionResponse> {
    this.checkInit();
    const body = {
      args: {
        transactionId,
      },
    };
    return this.httpClient.put<ActionResponse>(
      `${this.restServerSecuredURL}/${ServerRoute.REST_CHARGING_STATIONS}/${chargingStationID}/remote/stop`, body,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public chargingStationsUnlockConnector(chargingStationID: string, connectorId: number): Observable<ActionResponse> {
    this.checkInit();
    const body = {
      chargingStationID,
      args: {
        connectorId,
      },
    };
    return this.httpClient.put<ActionResponse>(
      `${this.restServerSecuredURL}/${ServerRoute.REST_CHARGING_STATIONS}/${chargingStationID}/connectors/${connectorId}/unlock`, body,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public chargingStationStartTransaction(chargingStationID: string, connectorId: number, tagID: string, carID?: string): Observable<ActionResponse> {
    this.checkInit();
    const body = {
      carID,
      args: {
        tagID,
        connectorId,
      },
    };
    return this.httpClient.put<ActionResponse>(
      `${this.restServerSecuredURL}/${ServerRoute.REST_CHARGING_STATIONS}/${chargingStationID}/remote/start`, body,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public updateChargingStationParams(chargingStation: ChargingStation): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.put<ActionResponse>(
      `${this.restServerSecuredURL}/${ServerRoute.REST_CHARGING_STATIONS}/${chargingStation.id}/parameters`, chargingStation,
      {
        headers: this.buildHttpHeaders(this.windowService.getSubdomain()),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public updateChargingProfile(chargingProfile: ChargingProfile): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.put<ActionResponse>(
      `${this.restServerSecuredURL}/${ServerRoute.REST_CHARGING_PROFILES}/${chargingProfile.id}`, chargingProfile,
      {
        headers: this.buildHttpHeaders(this.windowService.getSubdomain()),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public createChargingProfile(chargingProfile: ChargingProfile): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.post<ActionResponse>(
      `${this.restServerSecuredURL}/${ServerRoute.REST_CHARGING_PROFILES}`, chargingProfile,
      {
        headers: this.buildHttpHeaders(this.windowService.getSubdomain()),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public deleteChargingProfile(id: string): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.delete<ActionResponse>(
      `${this.restServerSecuredURL}/${ServerRoute.REST_CHARGING_PROFILES}/${id}`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public deleteChargingStation(id: string): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.delete<ActionResponse>(
      `${this.restServerSecuredURL}/${ServerRoute.REST_CHARGING_STATIONS}/${id}`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getChargingStationOcppParameters(chargingStationID: string): Observable<DataResult<OcppParameter>> {
    // Verify Init
    this.checkInit();
    // Execute REST Service
    return this.httpClient.get<DataResult<OcppParameter>>(
      `${this.restServerSecuredURL}/${ServerRoute.REST_CHARGING_STATIONS}/${chargingStationID}/ocpp/parameters`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getCarCatalogs(params: FilterParams,
    paging: Paging = Constants.DEFAULT_PAGING, ordering: Ordering[] = []): Observable<CarCatalogDataResult> {
    // Verify init
    this.checkInit();
    // Build Paging
    this.getPaging(paging, params);
    // Build Ordering
    this.getSorting(ordering, params);
    // Execute the REST service
    return this.httpClient.get<CarCatalogDataResult>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.CAR_CATALOGS}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getCars(params: FilterParams,
    paging: Paging = Constants.DEFAULT_PAGING, ordering: Ordering[] = []): Observable<CarDataResult> {
    // Verify init
    this.checkInit();
    // Build Paging
    this.getPaging(paging, params);
    // Build Ordering
    this.getSorting(ordering, params);
    // Execute the REST service
    return this.httpClient.get<CarDataResult>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.CARS}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getCar(carID: string): Observable<Car> {
    // Verify init
    this.checkInit();
    const params: { [param: string]: string } = {};
    params['ID'] = carID;
    // Execute the REST service
    return this.httpClient.get<Car>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.CAR}`,
      {
        headers: this.buildHttpHeaders(),
        params
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getCarUsers(params: FilterParams,
    paging: Paging = Constants.DEFAULT_PAGING, ordering: Ordering[] = []): Observable<DataResult<UserCar>> {
    // Verify init
    this.checkInit();
    // Build Paging
    this.getPaging(paging, params);
    // Build Ordering
    this.getSorting(ordering, params);
    // Execute the REST service
    return this.httpClient.get<DataResult<UserCar>>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.CAR_USERS}`,
      {
        headers: this.buildHttpHeaders(),
        params,
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getCarCatalog(id: number): Observable<CarCatalog> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<CarCatalog>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.CAR_CATALOG}?ID=${id}`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getCarCatalogImages(id: number, params: FilterParams,
    paging: Paging = Constants.DEFAULT_PAGING): Observable<DataResult<ImageObject>> {
    // Verify init
    this.checkInit();
    // Build Paging
    this.getPaging(paging, params);
    // Execute the REST service
    return this.httpClient.get<DataResult<ImageObject>>(
      `${this.centralRestServerServiceSecuredURL}/${ServerAction.CAR_CATALOG_IMAGES}?ID=${id}`,
      {
        headers: this.buildHttpHeaders(),
        params
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getCarMakers(params: FilterParams): Observable<DataResult<CarMaker>> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.get<DataResult<CarMaker>>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.CAR_MAKERS}`,
      {
        headers: this.buildHttpHeaders(),
        params
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public synchronizeCarsCatalog(): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.put<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.SYNCHRONIZE_CAR_CATALOGS}`, {},
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public createCar(car: Car, forced: boolean): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.post<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.CAR_CREATE}`, { ...car, forced },
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public updateCar(car: Car): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.put<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.CAR_UPDATE}`, car,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public deleteCar(id: number): Observable<ActionResponse> {
    this.checkInit();
    // Execute the REST service
    return this.httpClient.delete<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/CarDelete?ID=${id}`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public updateChargingStationOCPPConfiguration(id: string, chargerParameter: KeyValue): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    const custom = chargerParameter.custom ? chargerParameter.custom : false;
    const body = `{
      "args": {
        "key": "${chargerParameter.key}",
        "value": "${chargerParameter.value}",
        "custom": "${custom}"
      }
    }`;
    // Execute
    return this.httpClient.put<ActionResponse>(`${this.restServerSecuredURL}/${ServerRoute.REST_CHARGING_STATIONS}/${id}/configuration`, body,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getChargingStationCompositeSchedule(id: string, connectorId: number, duration: number, unit: string): Observable<GetCompositeScheduleCommandResult | GetCompositeScheduleCommandResult[]> {
    // Verify init
    this.checkInit();
    // build request
    const body =
      `{
        "args": {
          "connectorId": ${connectorId},
          "duration": ${duration},
          "chargingRateUnit": "${unit}"
        }
      }`;
    // Execute
    return this.httpClient.put<GetCompositeScheduleCommandResult | GetCompositeScheduleCommandResult[]>(
      `${this.restServerSecuredURL}/${ServerRoute.REST_CHARGING_STATIONS}/${id}/compositeschedule`, body,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public chargingStationLimitPower(charger: ChargingStation, chargePoint: ChargePoint, connectorId?: number, ampLimitValue: number = 0, forceUpdateChargingPlan: boolean = false): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute
    return this.httpClient.put<ActionResponse>(`${this.restServerSecuredURL}/${ServerRoute.REST_CHARGING_STATIONS}/${charger.id}/power/limit`, {
      chargePointID: chargePoint.chargePointID,
      connectorId,
      ampLimitValue,
      forceUpdateChargingPlan,
    },
    {
      headers: this.buildHttpHeaders(),
    })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public chargingStationSetChargingProfile(charger: ChargingStation, connectorId: number, chargingProfile: any): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Build default charging profile json
    const body = `{
      "chargingStationID": "${charger.id}",
      "args": {
        "connectorId": 0,
        "csChargingProfiles": ${JSON.stringify(chargingProfile)}
      }
    }`;
    // Execute
    return this.httpClient.post<ActionResponse>(`${this.centralRestServerServiceSecuredURL}/${ServerAction.CHARGING_STATION_SET_CHARGING_PROFILE}`, body,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public chargingStationUpdateFirmware(charger: ChargingStation, locationURL: string): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    const date = new Date().toISOString();
    const body = (
      `{
        "args": {
          "location": "${locationURL}",
          "retries": 0,
          "retrieveDate": "${date}",
          "retryInterval": 0
        }
      }`
    );
    // Execute
    return this.httpClient.put<ActionResponse>(`${this.restServerSecuredURL}/${ServerRoute.REST_CHARGING_STATIONS}/${charger.id}/firmware/update`, body,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public chargingStationChangeAvailability(id: string, available: boolean, connectorID: number = 0): Observable<ActionResponse> {
    return this.actionChargingStation(
      `${ServerRoute.REST_CHARGING_STATIONS}/${id}/availability/change`, JSON.stringify({
        connectorId: connectorID,
        type: available ? OCPPAvailabilityType.OPERATIVE : OCPPAvailabilityType.INOPERATIVE,
      })
    );
  }

  public chargingStationReset(id: string, hard: boolean = false): Observable<ActionResponse> {
    return this.actionChargingStation(
      `${ServerRoute.REST_CHARGING_STATIONS}/${id}/reset`, JSON.stringify({ type: hard ? OCPPResetType.HARD : OCPPResetType.SOFT }));
  }

  public chargingStationClearCache(id: string): Observable<ActionResponse> {
    return this.actionChargingStation(`${ServerRoute.REST_CHARGING_STATIONS}/${id}/cache/clear`, '');
  }

  public actionChargingStation(action: string, args: string): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    const body = (args ?
      `{
        "args": ${args}
      }` : ''
    );
    // Execute
    return this.httpClient.put<ActionResponse>(`${this.restServerSecuredURL}/${action}`, body,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public requestChargingStationOcppParameters(id: string): Observable<ActionResponse> {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.post<ActionResponse>(
      `${this.restServerSecuredURL}/${ServerRoute.REST_CHARGING_STATIONS_REQUEST_OCPP_PARAMETERS}`,
      {
        chargingStationID: id,
        forceUpdateOCPPParamsFromTemplate: false,
      },
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public updateChargingStationOCPPParamWithTemplate(id: string) {
    // Verify init
    this.checkInit();
    // Execute the REST service
    return this.httpClient.post<ActionResponse>(
      `${this.restServerSecuredURL}/${ServerRoute.REST_CHARGING_STATIONS_REQUEST_OCPP_PARAMETERS}`,
      {
        chargingStationID: id,
        forceUpdateOCPPParamsFromTemplate: true,
      },
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public getIntegrationConnections(userId: string): Observable<DataResult<IntegrationConnection>> {
    this.checkInit();
    return this.httpClient.get<DataResult<IntegrationConnection>>(
      `${this.centralRestServerServiceSecuredURL}/${ServerAction.INTEGRATION_CONNECTIONS}?UserID=${userId}`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public createIntegrationConnection(connection: UserConnection) {
    this.checkInit();
    return this.httpClient.post<ActionResponse>(
      `${this.centralRestServerServiceSecuredURL}/${ServerAction.INTEGRATION_CONNECTION_CREATE}`, connection,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public deleteIntegrationConnection(id: string): Observable<ActionResponse> {
    this.checkInit();
    return this.httpClient.delete<ActionResponse>(
      `${this.centralRestServerServiceSecuredURL}/${ServerAction.INTEGRATION_CONNECTION_DELETE}?ID=${id}`,
      {
        headers: this.buildHttpHeaders(),
      })
      .pipe(
        catchError(this.handleHttpError),
      );
  }

  public buildHttpHeadersFile(autoActivateUserAtImport?: string, autoActivateTagAtImport?: string, tenantID?: string): { name: string; value: string }[] {
    // Build File Header
    return [
      {
        name: 'Tenant',
        value: tenantID
      },
      {
        name: 'Authorization',
        value: 'Bearer ' + this.getLoggedUserToken()
      },
      {
        name: 'autoActivateUserAtImport',
        value: autoActivateUserAtImport
      },
      {
        name: 'autoActivateTagAtImport',
        value: autoActivateTagAtImport
      },
    ];
  }

  public buildRestEndpointUrl(urlPatternAsString: ServerRoute, params: {[name: string]: string | number | null } = {}) {
    let resolvedUrlPattern = urlPatternAsString as string;
    for (const key in params) {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        resolvedUrlPattern = resolvedUrlPattern.replace(`:${key}`, encodeURIComponent(params[key]));
      }
    }
    return `${this.restServerSecuredURL}/${resolvedUrlPattern}`;
  }

  private getLoggedUserToken(): string {
    // Get the token
    if (!this.currentUserToken) {
      this.readAndDecodeTokenFromLocalStorage();
    }
    return this.currentUserToken;
  }

  private readAndDecodeTokenFromLocalStorage() {
    // Read the token
    this.localStorageService.getItem('token').subscribe((token: string) => {
      this.currentUserToken = token;
      this.currentUser = null;
      // Decode the token
      if (token) {
        this.currentUser = new JwtHelperService().decodeToken(token);
      }
      // Notify
      this.currentUserSubject.next(this.currentUser);
    });
  }

  private clearLoggedUser(): void {
    // Clear
    this.currentUserToken = null;
    this.currentUser = null;
    this.localStorageService.removeItem('token');
    this.currentUserSubject.next(this.currentUser);
  }

  private checkInit(): void {
    // Initialized?
    if (!this.initialized) {
      // No: Process the init
      // Get the server config
      this.centralSystemServerConfig = this.configService.getCentralSystemServer();
      // Build Central Service URL
      this.centralRestServerServiceBaseURL = this.centralSystemServerConfig.protocol + '://' +
        this.centralSystemServerConfig.host + ':' + this.centralSystemServerConfig.port;
      // Set REST base URL
      this.centralServerNotificationService.setCentralRestServerServiceURL(this.centralRestServerServiceBaseURL);
      // Auth API
      this.restServerAuthURL = this.centralRestServerServiceBaseURL + '/v1/auth';
      // REST Secured API
      this.restServerSecuredURL = this.centralRestServerServiceBaseURL + '/v1/api';
      // Secured API
      this.centralRestServerServiceSecuredURL = this.centralRestServerServiceBaseURL + '/client/api';
      // Util API
      this.centralRestServerServiceUtilURL = this.centralRestServerServiceBaseURL + '/client/util';
      // Init Socket IO if user already logged
      if (this.configService.getCentralSystemServer().socketIOEnabled && this.isAuthenticated()) {
        this.centralServerNotificationService.initSocketIO(this.getLoggedUserToken());
      }
      // Done
      this.initialized = true;
    }
  }

  private buildHttpHeaders(tenantID?: string): HttpHeaders {
    const header = {
      'Content-Type': 'application/json'
    };
    if (!Utils.isUndefined(tenantID)) {
      header['Tenant'] = tenantID;
    }
    // Check token
    if (this.getLoggedUserToken()) {
      header['Authorization'] = 'Bearer ' + this.getLoggedUserToken();
    }
    // Build Header
    return new HttpHeaders(header);
  }

  private getSorting(ordering: Ordering[], queryParams: FilterParams) {
    // Check
    if (!Utils.isEmptyArray(ordering)) {
      const sortFields: string[] = [];
      for (const order of ordering) {
        if (order.field) {
          sortFields.push(order.field);
        }
      }
      if (!Utils.isEmptyArray(sortFields)) {
        queryParams['SortFields'] = sortFields;
      }
    }
  }

  private getPaging(paging: Paging, queryParams: FilterParams) {
    // Limit
    if (paging.limit) {
      queryParams['Limit'] = paging.limit.toString();
    }
    // Skip
    if (paging.skip) {
      queryParams['Skip'] = paging.skip.toString();
    }
  }

  private handleHttpError(error: HttpErrorResponse): Observable<never> {
    // We might use a remote logging infrastructure
    const errMsg = { status: 0, message: '', details: undefined };
    if (error && error instanceof TimeoutError) {
      errMsg.status = StatusCodes.REQUEST_TIMEOUT;
      errMsg.message = error.message;
      errMsg.details = undefined;
    } else if (error) {
      errMsg.status = error.status;
      errMsg.message = error.message ? error.message : error.toString();
      errMsg.details = error.error ? error.error : undefined;
    }
    return throwError(errMsg);
  }

  private processImage(blob: Blob): Observable<string> {
    if (blob.size > 0) {
      return new Observable(observer => {
        const reader = new FileReader();
        reader.readAsDataURL(blob); // convert blob to base64
        reader.onloadend = () => {
          observer.next(reader.result?.toString()); // emit the base64 string result
        };
      });
    }
    return of(null);
  }
}

