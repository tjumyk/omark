import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-page-header',
  templateUrl: './page-header.component.html',
  styleUrls: ['./page-header.component.less'],
  host: {'class': 'ui segment basic center aligned'}
})
export class PageHeaderComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
