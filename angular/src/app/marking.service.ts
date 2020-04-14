import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs";
import {Marking, Comment} from "./models";

export class UpdateMarkingForm{
  marks: number;
  remarks?: string;
}

export class UpdateCommentForm{
  content: string;
}

@Injectable({
  providedIn: 'root'
})
export class MarkingService {
  private api = 'api/markings';

  constructor(private http: HttpClient) { }

  updateMarking(mid: number, form: UpdateMarkingForm):Observable<Marking>{
    return this.http.put<Marking>(`${this.api}/${mid}`, form)
  }

  deleteAnnotation(aid: number):Observable<any>{
    return this.http.delete(`${this.api}/annotations/${aid}`)
  }

  updateComment(cid: number, form: UpdateCommentForm): Observable<Comment>{
    return this.http.put<Comment>(`${this.api}/comments/${cid}`, form)
  }

  deleteComment(cid: number):Observable<any>{
    return this.http.delete(`${this.api}/comments/${cid}`)
  }
}
