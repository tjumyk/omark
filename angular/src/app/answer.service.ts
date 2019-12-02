import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs";
import {AnswerBook} from "./models";

@Injectable({
  providedIn: 'root'
})
export class AnswerService {
  private api: string = 'api/answers';

  constructor(private http: HttpClient) { }

  getBook(id: number):Observable<AnswerBook> {
    return this.http.get<AnswerBook>(`${this.api}/books/${id}`)
  }
}
