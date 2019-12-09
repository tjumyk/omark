import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import {AnswerBook, AnswerPage, BasicError, Task} from "../models";
import {AnswerService} from "../answer.service";
import {finalize} from "rxjs/operators";
import {HttpEventType} from "@angular/common/http";

export class CaptureSettings{
  marginLeft: number = 0;
  marginRight: number = 0;
  marginTop: number = 0;
  marginBottom: number = 0;
}

export class OverlayRect{
  width: number = 0;
  height: number = 0;
  left: number = 0;
  top: number = 0;
  scale: number = 1;
}

export class Shot{
  dataUrl: string;
  uploading: boolean;
  uploadProgress: number;
}

@Component({
  selector: 'app-answer-book-capture',
  templateUrl: './answer-book-capture.component.html',
  styleUrls: ['./answer-book-capture.component.less']
})
export class AnswerBookCaptureComponent implements OnInit, AfterViewInit, OnDestroy {
  error: BasicError;

  @Input()
  task: Task;
  @Input()
  book: AnswerBook;

  @Output()
  closed = new EventEmitter<any>();
  @Output()
  newPages = new EventEmitter<AnswerPage[]>();

  @ViewChild('video', {static: true})
  video: ElementRef<HTMLVideoElement>;

  @ViewChild('canvas', {static: false})
  canvas: ElementRef<HTMLCanvasElement>;

  trackSupportedConstraints: MediaTrackSupportedConstraints;
  trackCapabilities: MediaTrackCapabilities;
  trackConstraints: MediaTrackConstraints;
  trackSettings: MediaTrackSettings;

  captureSettings = new CaptureSettings();
  overlayRect: OverlayRect;

  windowResizeHandler;

  shots:Shot[] = [];

  constructor(private answerService: AnswerService) { }

  ngOnInit() {
  }

  ngOnDestroy(): void {
    if(this.windowResizeHandler){
      window.removeEventListener('resize', this.windowResizeHandler);
      this.windowResizeHandler = null;
    }
  }

  ngAfterViewInit(): void {
    const video = this.video.nativeElement;
    this.trackSupportedConstraints = navigator.mediaDevices.getSupportedConstraints();

    const constraints = {audio: false, video:{ width: 1920, height: 1080}};
    navigator.mediaDevices.getUserMedia(constraints).then(stream=>{
      const tracks = stream.getVideoTracks();
      if(tracks.length){
        const track = tracks[0];
        if(track.getCapabilities)
          this.trackCapabilities = track.getCapabilities();
        if(track.getConstraints)
          this.trackConstraints = track.getConstraints();
        if(track.getSettings)
          this.trackSettings = track.getSettings();
      }

      video.srcObject = stream;
      video.onloadedmetadata = e=>{
        video.play();

        this.windowResizeHandler = ()=>{
          this.updateOverlayRect();
        };
        this.windowResizeHandler();
        window.addEventListener('resize', this.windowResizeHandler)
      }
    }).catch(error=>{
      this.error = {msg:'Failed to access camera', detail: `${error.name}: ${error.message}`}
    })
  }

  updateOverlayRect(){
    const video = this.video.nativeElement;

    const cWidth = video.clientWidth;
    const cHeight = video.clientHeight;
    const width = video.videoWidth;
    const height = video.videoHeight;

    if(width == 0 || height == 0){
      this.overlayRect = undefined;
      return;
    }

    this.overlayRect = new OverlayRect();
    if(width /height > cWidth/cHeight){ // too wide
      this.overlayRect.left  = 0;
      this.overlayRect.width = cWidth;
      this.overlayRect.scale = cWidth / width;
      this.overlayRect.height = this.overlayRect.scale * height;
      this.overlayRect.top = (cHeight - this.overlayRect.height) / 2;
    }else{ // too high
      this.overlayRect.top  = 0;
      this.overlayRect.height = cHeight;
      this.overlayRect.scale = cHeight / height;
      this.overlayRect.width = this.overlayRect.scale * width;
      this.overlayRect.left = (cWidth - this.overlayRect.width) / 2;
    }
  }

  takeShot(){
    const video = this.video.nativeElement;
    const canvas = this.canvas.nativeElement;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, -this.captureSettings.marginLeft, -this.captureSettings.marginTop);

    const dataUrl = canvas.toDataURL();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const dataBlob = this.dataURItoBlob(dataUrl);
    const blobFile = new File([dataBlob], 'shot.png');

    const shot = new Shot();
    shot.dataUrl = dataUrl;
    this.shots.push(shot);

    shot.uploading= true;
    this.answerService.addPages(this.book.id, [blobFile]).pipe(
      finalize(()=>{
        shot.uploading = false;
        URL.revokeObjectURL(shot.dataUrl);
      })
    ).subscribe(
      event=>{
        switch (event.type) {
          case HttpEventType.UploadProgress:
            shot.uploadProgress = Math.round(100 * event.loaded / event.total);
            break;
          case HttpEventType.Response:
            const pages = event.body as AnswerPage[];
            this.newPages.emit(pages)
        }
      },
      error=>this.error = error.error
    );
  }

  dataURItoBlob(dataURI: string):Blob {
    // Reference: https://stackoverflow.com/questions/12168909/blob-from-dataurl
    // convert base64 to raw binary data held in a string
    // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
    const parts = dataURI.split(',');
    const byteString = atob(parts[1]);
    // separate out the mime component
    const mimeString = parts[0].split(':')[1].split(';')[0];
    // write the bytes of the string to an ArrayBuffer
    const ab = new ArrayBuffer(byteString.length);
    // create a view into the buffer
    const ia = new Uint8Array(ab);
    // set the bytes of the buffer to the correct values
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    // write the ArrayBuffer to a blob, and you're done
    return new Blob([ab], {type: mimeString});
  }

}
