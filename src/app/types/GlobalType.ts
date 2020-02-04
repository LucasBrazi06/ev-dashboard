
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

export interface KeyValue {
  key: string;
  value: string;
  objectRef?: any;
  readonly?: boolean;
}

export enum ButtonAction {
  EDIT = 'edit',
  OPEN_IN_MAPS = 'open_in_maps',
  MORE = 'more',
  DELETE = 'delete',
  INLINE_DELETE = 'inline-delete',
  REFRESH = 'refresh',
  AUTO_REFRESH = 'auto-refresh',
  EXPORT = 'export',
  ADD = 'add',
  CREATE = 'create',
  COPY = 'copy',
  MULTI_COPY = 'multi-copy',
  MULTI_CREATE = 'multi-create',
  NO_ACTION = 'block',
  OPEN = 'open',
  REGISTER = 'register',
  REMOVE = 'remove',
  RESET_FILTERS = 'reset-filters',
  REVOKE = 'revoke',
  SEND = 'send',
  SETTINGS = 'settings',
  START = 'start',
  STOP = 'stop',
  UNREGISTER = 'unregister',
  VIEW = 'view',
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

export enum Notification {
  DELETE = 'Delete',
}

export enum RestResponse {
  SUCCESS = 'Success',
}
