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

export class UpdateAnswerBookForm {
  student_name?: string;
}

export class UpdateAnswerPageForm{
  index: number;
}

export class NewMarkingForm{
  qid: number;
  marks: number;
  remarks?:string;
}

export class NewAnnotationForm{
  data: string;
}

export class PageOptions{
  cutMiddle: boolean;
  discardFirst: boolean;
  fitMaxWidth?: number;
  fitMaxHeight?: number;
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

  updateBook(id: number, form: UpdateAnswerBookForm):Observable<AnswerBook>{
    return this.http.put<AnswerBook>(`${this.api}/books/${id}`, form)
  }

  goToBook(fromId: number, isNext: boolean):Observable<AnswerBook>{
    if(isNext)
      return this.http.get<AnswerBook>(`${this.api}/books/${fromId}/next`);
    else
      return this.http.get<AnswerBook>(`${this.api}/books/${fromId}/prev`);
  }

  addPages(book_id: number, files: File[], options?: PageOptions): Observable<HttpEvent<any>> {
    const form = new FormData();
    for (let file of files) {
      form.append('file', file);
    }
    if(options){
      form.append('options', JSON.stringify(options));
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

  updatePage(page_id: number, form: UpdateAnswerPageForm):Observable<AnswerPage> {
    return this.http.put<AnswerPage>(`${this.api}/pages/${page_id}`, form)
  }
}
