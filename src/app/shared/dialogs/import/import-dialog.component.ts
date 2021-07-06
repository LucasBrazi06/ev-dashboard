import { Component, Inject, Input, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { StatusCodes } from 'http-status-codes';
import { FileItem, FileUploader, ParsedResponseHeaders } from 'ng2-file-upload';
import { NgxCsvParser } from 'ngx-csv-parser';
import { CentralServerService } from 'services/central-server.service';
import { DialogService } from 'services/dialog.service';
import { MessageService } from 'services/message.service';
import { ActionsResponse } from 'types/DataResult';
import { HTTPError } from 'types/HTTPError';
import { ServerRoute } from 'types/Server';
import { ButtonType } from 'types/Table';
import { Utils } from 'utils/Utils';

@Component({
  templateUrl: './import-dialog.component.html',
})
export class ImportDialogComponent implements OnInit {
  public uploader: FileUploader;
  public response: string;
  public progress = 0;
  public uploadInProgress = false;
  public fileName = '';
  public importInstructionsRequiredFields: string;
  public importInstructionsOptionalFields: string;
  public isFileValid = true;
  public title: string;
  public entity: string;
  private ngxCsvParser: NgxCsvParser;
  private endpoint: ServerRoute;
  private requiredProperties: string[];
  private optionalProperties: string[];
  private messageSuccess: string;
  private messageError: string;
  private messageSuccessAndError: string;
  private messageNoSuccessNoError: string;
  private confirmImportTitle: string;
  private confirmImportMessage: string;
  private confirmImportMessageAutoActivate: string;
  private autoActivateImportedUsers: string;
  private autoActivateImportedTags: string;

  public constructor(
    protected dialogRef: MatDialogRef<ImportDialogComponent>,
    protected translateService: TranslateService,
    private dialogService: DialogService,
    private centralServerService: CentralServerService,
    private messageService: MessageService,
    @Inject(MAT_DIALOG_DATA) data) {
    if (data?.endpoint) {
      this.endpoint = data.endpoint;
      this.entity = data.entity;
      this.title = translateService.instant(`${data.entity}.import_${data.entity}`);
      this.messageSuccess = `${data.entity}.import_${data.entity}_success`;
      this.messageError = `${data.entity}.import_${data.entity}_error`;
      this.messageSuccessAndError = `${data.entity}.import_${data.entity}_partial`;
      this.messageNoSuccessNoError = `${data.entity}.import_no_${data.entity}`;
      this.requiredProperties = data.requiredProperties;
      this.optionalProperties = data.optionalProperties ?? [];
      this.confirmImportTitle = `${data.entity}.import_${data.entity}`;
      this.confirmImportMessage = `${data.entity}.import_${data.entity}_message`;
      this.confirmImportMessageAutoActivate = `${data.entity}.import_${data.entity}_message_auto_activate`;
    }
    Utils.registerCloseKeyEvents(this.dialogRef);
    this.uploader = new FileUploader({
      headers: this.centralServerService.buildHttpHeadersFile(this.autoActivateImportedUsers, this.autoActivateImportedTags),
      url: `${this.centralServerService.buildRestEndpointUrl(this.endpoint)}`
    });
    this.uploader.response.subscribe(res => this.response = res);
    this.ngxCsvParser = new NgxCsvParser();
  }

  public ngOnInit() {
    this.importInstructionsRequiredFields = this.translateService.instant('general.import_instructions_required_fields', { properties: this.requiredProperties.join(', ') });
    this.importInstructionsOptionalFields = !Utils.isEmptyArray(this.optionalProperties) ? this.translateService.instant('general.import_instructions_optional_fields', { properties: this.optionalProperties.join(', ') }) : '';
    // File has been selected
    this.uploader.onAfterAddingFile = (fileItem: FileItem) => {
      if (this.uploader.queue.length > 1) {
        this.uploader.removeFromQueue(this.uploader.queue[0]);
      }
      fileItem.withCredentials = false;
      this.fileName = fileItem.file.name;
      this.isFileValid = this.ngxCsvParser.isCSVFile(fileItem._file);
    };
    // Display the progress bar during the upload
    this.uploader.onProgressAll = (progress: any) => {
      this.progress = progress;
      this.uploadInProgress = true;
    };
    // File upload has finished
    this.uploader.onCompleteItem = (fileItem: FileItem, response: string, status: number, headers: ParsedResponseHeaders) => {
      // Success
      if (status === StatusCodes.OK) {
        // Ok: Check result
        const actionsResponse = JSON.parse(response) as ActionsResponse;
        this.messageService.showActionsMessage(actionsResponse,
          this.messageSuccess, this.messageError, this.messageSuccessAndError, this.messageNoSuccessNoError);
      // Error
      } else {
        switch (status) {
          case HTTPError.INVALID_FILE_FORMAT:
            this.messageService.showErrorMessage('general.invalid_file_error');
            break;
          case HTTPError.INVALID_FILE_CSV_HEADER_FORMAT:
            this.messageService.showErrorMessage('general.invalid_file_csv_header_error');
            break;
          case HTTPError.CANNOT_ACQUIRE_LOCK:
            this.messageService.showErrorMessage('general.import_already_ongoing');
            break;
          default:
            this.messageService.showErrorMessage('general.import_unexpected_error');
            break;
        }
      }
      this.uploader.destroy();
      this.dialogRef.close();
    };
  }

  public cancel() {
    this.uploader.destroy();
    this.dialogRef.close();
  }

  public upload(): void {
    this.dialogService.createAndShowYesNoDialog(
      this.translateService.instant(this.confirmImportTitle),
      this.autoActivateImportedUsers ? this.translateService.instant(this.confirmImportMessageAutoActivate) : this.translateService.instant(this.confirmImportMessage),
    ).subscribe((result) => {
      if (result === ButtonType.YES) {
        this.uploader.uploadAll();
      }
    });
  }

  public handleAutoActivateUserAtImport(checked) {
    this.autoActivateImportedUsers = checked;
    this.uploader.options.headers[this.uploader.options.headers.findIndex(
      option => option.name === 'autoActivateUserAtImport'
    )].value = this.autoActivateImportedUsers;
  }

  public handleAutoActivateTagAtImport(checked) {
    this.autoActivateImportedTags = checked;
    this.uploader.options.headers[this.uploader.options.headers.findIndex(
      option => option.name === 'autoActivateTagAtImport'
    )].value = this.autoActivateImportedTags;
  }
}
