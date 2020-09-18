sed -i 's/return new Worker[(][a-zA-Z.]*/return new Worker("static_cn\/"/g' static_cn/main*.js

# Another way to hotfix is as follows, which might not work with IE (need testing).
# In pdfjs-dist/webpack.js, use the following code for loading worker.
#
# var PdfjsWorker = require('!!raw-loader!./build/pdf.worker.min.js');
#
# if (typeof window !== 'undefined' && 'Worker' in window) {
#   pdfjs.GlobalWorkerOptions.workerSrc = window.URL.createObjectURL(new Blob([PdfjsWorker.default],{type:'text/javascript'}));
# }
