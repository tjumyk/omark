import {Component, Input, OnInit} from '@angular/core';
import {AnswerBook, Question, Task} from "../models";

interface SummaryData {
  question: Question;
  chartData: any;
  isTotal: boolean;
}

@Component({
  selector: 'app-marking-summary-charts',
  templateUrl: './marking-summary-charts.component.html',
  styleUrls: ['./marking-summary-charts.component.less']
})
export class MarkingSummaryChartsComponent implements OnInit {
  @Input()
  task: Task;

  @Input()
  books: AnswerBook[];

  data: SummaryData[] = [];

  constructor() { }

  ngOnInit() {
    if(!this.task || !this.books)
      return;

    // build mapping
    let questionMap = {}, questionMarksList = {}, totalMarksList = [], marksList, totalMarks;
    for(let q of this.task.questions){
      questionMap[q.id] = q;
    }
    for(let book of this.books){
      if(book.markings.length){
        totalMarks = 0;
        for(let marking of book.markings){
          let qid = marking.question_id;
          marksList = questionMarksList[qid]
          if(!marksList) {
            questionMarksList[qid] = marksList = []
          }
          marksList.push(marking.marks);
          if(!questionMap[qid].excluded_from_total)
            totalMarks += marking.marks;
        }
        totalMarksList.push(totalMarks)
      }
    }

    for(let q of this.task.questions){
      marksList = questionMarksList[q.id];
      if (!marksList)
        continue
      this.data.push({
        question: q,
        chartData: this.buildBarChart(marksList),
        isTotal: false
      })
    }

    if (this.data.length > 1) {
      this.data.push({
        question: null,
        chartData: this.buildBinnedBarChart(totalMarksList, 20),
        isTotal: true
      })
    }
  }

  private buildBarChart(results: number[]) {
    let numbers = new Set<number>();
    let numberCounts = {};
    let noResultCount = 0;
    let nanCount = 0;
    for (let v of results) {
      if (v === null || v === undefined) {
        ++noResultCount;
        continue;
      }
      if (isNaN(v)) {
        ++nanCount;
        continue;
      }
      if (numbers.has(v))
        ++numberCounts[v];
      else {
        numbers.add(v);
        numberCounts[v] = 1;
      }
    }

    let numberList = Array.from(numbers).sort((a, b) => a - b);
    let labels = [];
    let data = [];
    for (let v of numberList) {
      labels.push('' + v);
      data.push(numberCounts[v])
    }

    if (nanCount > 0) {
      labels.unshift('NaN');
      data.unshift(nanCount);
    }

    if (noResultCount > 0) {
      labels.unshift('N/A');
      data.unshift(noResultCount);
    }

    let datasetLabel = 'Students';

    return {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: datasetLabel,
            data: data
          }
        ]
      },
      options: {
        maintainAspectRatio: false,
        scales: {
          yAxes: [
            {
              ticks: {
                beginAtZero: true,
                precision: 0
              }
            }
          ]
        }
      }
    }
  }

  private buildBinnedBarChart(results: number[], maxNumOfBins: number) {
    const candidateBinSizes = [5, 10, 20, 50, 100];
    let numOfBins, binSize;
    if (!results || !results.length) { // fallback default
      binSize = candidateBinSizes[0];
      numOfBins = 1;
    } else {
      let max = results[0];
      for (let v of results) {
        if (v > max)
          max = v;
      }
      for (let i = 0; i < candidateBinSizes.length; i++) {
        binSize = candidateBinSizes[i];
        if (max / binSize <= maxNumOfBins) {
          break;
        }
      }
      while (binSize * maxNumOfBins < max) {
        binSize *= 2;
      }
      numOfBins = Math.max(Math.ceil(max / binSize), 1);
    }

    let binCounts = new Array(numOfBins).fill(0);
    let noResultCount = 0;
    let nanCount = 0;
    let binID;
    for (let v of results) {
      if (v === null || v === undefined) {
        ++noResultCount;
        continue;
      }
      if (isNaN(v)) {
        ++nanCount;
        continue;
      }
      // out-of-range numbers will be placed at the last bin
      binID = Math.min(Math.floor(v / binSize), numOfBins - 1);
      ++binCounts[binID];
    }

    let labels = [];
    let data = [];
    let start, end;
    for (let i = 0; i < numOfBins; ++i) {
      start = binSize * i;
      end = start + binSize;
      if (i < numOfBins - 1) {
        labels.push(`[${start}, ${end})`);
      } else {
        labels.push(`>=${start}`); // notice possible out-of-range values
      }
      data.push(binCounts[i])
    }

    if (nanCount > 0) {
      labels.unshift('NaN');
      data.unshift(nanCount);
    }

    if (noResultCount > 0) {
      labels.unshift('N/A');
      data.unshift(noResultCount);
    }

    let datasetLabel = 'Students';

    return {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: datasetLabel,
            data: data
          }
        ]
      },
      options: {
        maintainAspectRatio: false,
        scales: {
          yAxes: [
            {
              ticks: {
                beginAtZero: true,
                precision: 0
              }
            }
          ]
        }
      }
    }
  }

}
