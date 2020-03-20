import AdvancedConfiguration from './AdvancedConfiguration';
import AuthorizationConfiguration from './AuthorizationConfiguration';
import BuildingConfiguration from './BuildingConfiguration';
import CarConfiguration from './CarConfiguration';
import CentralSystemServerConfiguration from './CentralSystemServerConfiguration';
import CompanyConfiguration from './CompanyConfiguration';
import FrontEndConfiguration from './FrontEndConfiguration';
import LocalesConfiguration from './LocalesConfiguration';
import SiteAreaConfiguration from './SiteAreaConfiguration';
import SiteConfiguration from './SiteConfiguration';
import UserConfiguration from './UserConfiguration';

export interface Configuration {
  Advanced: AdvancedConfiguration;
  Authorization: AuthorizationConfiguration;
  CentralSystemServer: CentralSystemServerConfiguration;
  Company: CompanyConfiguration;
  Building: BuildingConfiguration;
  FrontEnd: FrontEndConfiguration;
  Locales: LocalesConfiguration;
  SiteArea: SiteAreaConfiguration;
  Site: SiteConfiguration;
  User: UserConfiguration;
  Car: CarConfiguration;
}
