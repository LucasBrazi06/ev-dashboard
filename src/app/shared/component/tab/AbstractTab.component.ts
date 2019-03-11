import {ActivatedRoute} from '@angular/router';
import {WindowService} from '../../../services/window.service';
import {OnDestroy} from '@angular/core';
import {Subscription} from 'rxjs';

export class AbstractTabComponent implements OnDestroy {
  public activeTabIndex = 0;

  private _updatedRoute: string;
  private _fragmentSubscription: Subscription;
  private _isDetroyed: boolean;

  constructor(protected activatedRoute: ActivatedRoute, protected windowService: WindowService,
              protected hashArray: string[], protected synchronizeRouting: boolean = true, protected defaultIndex: number = 0) {
    if (this.synchronizeRouting) {
      this.enableRoutingSynchronization();
    }
  }

  updateRoute(index: number) {
    if (this._fragmentSubscription && this.activeTabIndex !== index) {
      let str = `updateRoute from ${this.activeTabIndex} to ${index} Start _updatedRoutes: ${this._updatedRoute}`;
      if (!this._updatedRoute && this.hashArray && index < this.hashArray.length) {
        // Save route activated from click within a FIFO
        this._updatedRoute = this.hashArray[index];
        str += ' End _updatedRoutes: ' + this._updatedRoute;
        this.windowService.setHash(this.hashArray[index]);
        // this.activeTabIndex = index;
      }
      console.debug(str + ' ' + this.constructor.name);
    } else {
      console.debug(`no change in update route from ${this.activeTabIndex} to ${index}`);
    }
  }

  ngOnDestroy(): void {
    if (this._fragmentSubscription) {
      console.debug('Destroy fragment subscription ' + this.constructor.name);
      this.disableRoutingSynchronization();
    }
    this._isDetroyed = true;
  }

  enableRoutingSynchronization() {
    if (!this._fragmentSubscription) {
      this._fragmentSubscription = this.activatedRoute.fragment.subscribe(fragment => {
        let str = `activatedRoutes for ${fragment} Start _updatedRoutes: ${this._updatedRoute}`;
        if (!this._isDetroyed) {
          if (this._updatedRoute === fragment) {
            // Route is coming from click event so do not consider it
            this._updatedRoute = undefined;
            const indexOf = this.hashArray.indexOf(fragment);
            if (indexOf >= 0 && this.activeTabIndex !== indexOf) {
              str += ' INDEX ' + indexOf;
              this.activeTabIndex = indexOf;
            }
          } else {
            str += ' IGNORED ';
          }

          str += ` End _updatedRoutes: ${this._updatedRoute} with active index ${this.activeTabIndex}`;
        }
        console.debug(str + ' ' + this.constructor.name);
      });
      // Set default route
      if (this.defaultIndex && this.defaultIndex < this.hashArray.length && this.defaultIndex >= 0) {
        this.activeTabIndex = this.defaultIndex;
      }
      this.windowService.setHash(this.hashArray[this.activeTabIndex]);
      this._isDetroyed = false;
    }
  }

  disableRoutingSynchronization() {
    this._fragmentSubscription.unsubscribe();
    this._fragmentSubscription = null;
  }
}
