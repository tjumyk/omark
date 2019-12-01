import { Injectable } from '@angular/core';
import {Observable} from "rxjs";
import {Exam} from "./models";
import {HttpClient} from "@angular/common/http";

@Injectable({
  providedIn: 'root'
})
export class ExamService {
  private api: string = 'api/exams';

  constructor(private http: HttpClient) { }

  getExams():Observable<Exam[]>{
    return this.http.get<Exam[]>(this.api + '/')
  }
}
