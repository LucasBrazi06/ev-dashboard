import { Asset } from './Asset';
import { Car, CarCatalog, CarMaker } from './Car';
import { ChargingStation } from './ChargingStation';
import { Company } from './Company';
import { LogAction } from './Log';
import { RefundReport } from './Refund';
import { Site } from './Site';
import { SiteArea } from './SiteArea';
import { Tag } from './Tag';
import { User } from './User';

export interface Image {
  id: string;
  image: string;
}

export interface Images {
  id: string;
  images: string[];
}

export interface Logo {
  id: string;
  logo: string;
}

export interface SubjectInfo {
  action: string;
  data: {
    id: string;
    type: string;
  };
}

export enum DocumentType {
  PDF = 'pdf',
}

export enum DocumentEncoding {
  BASE64 = 'base64',
}

export interface KeyValue {
  key: string;
  value: string;
  objectRef?: User|SiteArea|Site|Company|Car|CarCatalog|Asset|RefundReport|ChargingStation|CarMaker|LogAction|Tag;
  readonly?: boolean;
  custom?: boolean;
  icon?: string;
  tooltip?: string;
}

export interface FilterParams {
  [param: string]: string | string[];
}

export enum ButtonAction {
  ACTIVATE = 'activate',
  DEACTIVATE = 'deactivate',
  EDIT = 'edit',
  OPEN_IN_MAPS = 'open_in_maps',
  MORE = 'more',
  DELETE = 'delete',
  DELETE_MANY = 'delete_many',
  REFRESH = 'refresh',
  SYNCHRONIZE = 'synchronize',
  AUTO_REFRESH = 'auto_refresh',
  EXPORT = 'export',
  ADD = 'add',
  CREATE = 'create',
  COPY = 'copy',
  MULTI_COPY = 'multi_copy',
  MULTI_CREATE = 'multi_create',
  NO_ACTION = 'block',
  OPEN = 'open',
  OPEN_URL = 'open_url',
  REGISTER = 'register',
  REMOVE = 'remove',
  RESET_FILTERS = 'reset_filters',
  REVOKE = 'revoke',
  SEND = 'send',
  SETTINGS = 'settings',
  START = 'start',
  STOP = 'stop',
  UNREGISTER = 'unregister',
  VIEW = 'view',
  INLINE_SAVE = 'inline_save',
  DOWNLOAD = 'download',
  TEST_CONNECTION = 'test_connection',
  MOVE = 'move'
}

export enum ChipType {
  PRIMARY = 'chip-primary',
  DEFAULT = 'chip-default',
  INFO = 'chip-info',
  SUCCESS = 'chip-success',
  DANGER = 'chip-danger',
  WARNING = 'chip-warning',
  GREY = 'chip-grey',
}

export enum LevelText {
  INFO = 'text-success',
  DANGER = 'text-danger',
  WARNING = 'text-warning',
}

export enum RestResponse {
  SUCCESS = 'Success',
}
