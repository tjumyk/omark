import {Component, OnInit} from '@angular/core';
import {BasicError, VersionInfo} from "../models";
import {MetaService} from "../meta.service";
import {finalize} from "rxjs/operators";

@Component({
  selector: 'app-page-footer',
  templateUrl: './page-footer.component.html',
  styleUrls: ['./page-footer.component.less'],
  host: {'class': 'ui segment center aligned vertical'}
})
export class PageFooterComponent implements OnInit {
  error: BasicError;

  loadingVersion: boolean;
  version: VersionInfo;

  constructor(private metaService: MetaService) {
  }

  ngOnInit() {
    this.loadingVersion = true;
    this.metaService.getVersion().pipe(
      finalize(() => this.loadingVersion = false)
    ).subscribe(
      version => this.version = version,
      error => this.error = error.error
    )
  }

}
