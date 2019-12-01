import {Component, ElementRef, Input, OnInit} from '@angular/core';
import {BasicError} from "../models";

@Component({
  selector: 'app-error',
  templateUrl: './error.component.html',
  styleUrls: ['./error.component.less'],
  host: {class: 'ui error message'}
})
export class ErrorComponent implements OnInit {
  _error: BasicError;
  @Input() get error() {
    return this._error;
  }

  set error(error: BasicError) {
    this._error = error;
    this.updateHost();
  }

  constructor(private hostElement: ElementRef) {
  }

  ngOnInit() {
  }

  private updateHost() {
    if (this._error) {
      this.hostElement.nativeElement.classList.remove('hidden');
    } else {
      this.hostElement.nativeElement.classList.add('hidden');
    }
  }

  redirect(url: string) {
    window.location.href = url;
  }
}
