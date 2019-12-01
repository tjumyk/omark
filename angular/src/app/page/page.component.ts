import {Component, OnInit} from '@angular/core';
import {HttpClient} from "@angular/common/http";

interface VersionInfo {
  version: string;
}

@Component({
  selector: 'app-page',
  templateUrl: './page.component.html',
  styleUrls: ['./page.component.less']
})
export class PageComponent implements OnInit {
  version: VersionInfo;

  constructor(private http: HttpClient) {
  }

  ngOnInit() {
    this.http.get<VersionInfo>('api/version').subscribe(
      version => this.version = version
    )
  }

}
