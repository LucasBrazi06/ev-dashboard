export default interface AdvancedConfiguration {
  debounceTimeNotifMillis: number;
  debounceTimeSearchMillis: number;
  globalAuthenticationService?: string; /* built-in | xsuaa*/
}

export enum AuthServiceType {
  XSUAA = 'xsuaa',
  BUILT_IN = 'built-in'
}
