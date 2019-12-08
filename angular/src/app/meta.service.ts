import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {VersionInfo} from "./models";
import {Observable, of} from "rxjs";
import {tap} from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class MetaService {
  private version: VersionInfo;

  constructor(private http: HttpClient) {
  }

  getVersion():Observable<VersionInfo>{
    if(this.version)
      return of(this.version);

    return this.http.get<VersionInfo>('api/version').pipe(
      tap(version=>this.version = version)
    )
  }

}
