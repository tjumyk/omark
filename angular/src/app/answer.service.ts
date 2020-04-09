import {Injectable} from '@angular/core';
import {HttpClient, HttpEvent, HttpParams, HttpRequest} from "@angular/common/http";
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

export class NewAnnotationsForm{
  data: string[];
}

export class PageOptions{
  cutMiddle: boolean;
  discardFirst: boolean;
  discardSecond: boolean;
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

  updateBook(id: number, form: UpdateAnswerBookForm): Observable<AnswerBook> {
    return this.http.put<AnswerBook>(`${this.api}/books/${id}`, form)
  }

  goToBook(fromId: number, isNext: boolean, getPages: boolean = false): Observable<AnswerBook> {
    let params = new HttpParams();
    if (getPages)
      params = params.append('pages', 'true');

    if (isNext)
      return this.http.get<AnswerBook>(`${this.api}/books/${fromId}/next`, {params});
    else
      return this.http.get<AnswerBook>(`${this.api}/books/${fromId}/prev`, {params});
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
    return this.getBookFile(page.book_id, page.file_path);
  }

  getBookFile(book_id: number, file_path:string): Observable<ArrayBuffer> {
    return this.http.get(`${this.api}/books/${book_id}/files/${file_path}`,
      {responseType: "arraybuffer"});
  }

  addMarking(book_id: number, form: NewMarkingForm):Observable<Marking> {
    return this.http.post<Marking>(`${this.api}/books/${book_id}/markings`, form)
  }

  addAnnotations(page_id: number, form: NewAnnotationsForm):Observable<Annotation[]> {
    return this.http.post<Annotation[]>(`${this.api}/pages/${page_id}/annotations`, form)
  }

  updatePage(page_id: number, form: UpdateAnswerPageForm):Observable<AnswerPage> {
    return this.http.put<AnswerPage>(`${this.api}/pages/${page_id}`, form)
  }
}
