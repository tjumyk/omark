import {Injectable} from '@angular/core';
import {HttpClient, HttpEvent, HttpRequest} from "@angular/common/http";
import {Observable} from "rxjs";
import {Annotation, AnswerBook, AnswerPage, Marking} from "./models";
import {PDFDocumentProxy, PDFPageProxy} from "pdfjs-dist/webpack";

export class PDFCacheEntry{
  document: PDFDocumentProxy;
  pages: PDFPageProxy[] = [];
}
export type PDFCache = {[path: string]: PDFCacheEntry};

export class NewMarkingForm{
  qid: number;
  marks: number;
  remarks?:string;
}

export class NewAnnotationForm{
  data: string;
}

@Injectable({
  providedIn: 'root'
})
export class AnswerService {
  private api: string = 'api/answers';

  constructor(private http: HttpClient) {
  }

  getBook(id: number): Observable<AnswerBook> {
    return this.http.get<AnswerBook>(`${this.api}/books/${id}`)
  }

  goToBook(fromId: number, isNext: boolean):Observable<AnswerBook>{
    if(isNext)
      return this.http.get<AnswerBook>(`${this.api}/books/${fromId}/next`);
    else
      return this.http.get<AnswerBook>(`${this.api}/books/${fromId}/prev`);
  }

  addPages(book_id: number, files: FileList): Observable<HttpEvent<any>> {
    const form = new FormData();
    let i = 0;
    while (i < files.length) {
      const file = files.item(i);
      form.append('file', file);
      ++i;
    }
    const req = new HttpRequest('POST', `${this.api}/books/${book_id}/pages`,
      form, {reportProgress: true});
    return this.http.request(req);
  }

  getPageFile(page: AnswerPage): Observable<ArrayBuffer> {
    return this.http.get(`${this.api}/books/${page.book_id}/files/${page.file_path}`,
      {responseType: "arraybuffer"});
  }

  addMarking(book_id: number, form: NewMarkingForm):Observable<Marking> {
    return this.http.post<Marking>(`${this.api}/books/${book_id}/markings`, form)
  }

  addAnnotation(page_id: number, form: NewAnnotationForm):Observable<Annotation> {
    return this.http.post<Annotation>(`${this.api}/pages/${page_id}/annotations`, form)
  }
}
