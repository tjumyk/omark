import json
import os
import ssl

import celery

from utils.mirror import MirrorTool

with open('config.json') as _f:
    config = json.load(_f)
celery_config = config['ASYNC_JOB']
data_folder = config['DATA_FOLDER']

MirrorTool.init(config)

app = celery.Celery('mark', broker=celery_config['broker'], backend=celery_config['backend'])
app.conf.update(
    task_routes={
        'mark.book.mirror': {'queue': 'mark_book_mirror'}
    },
    task_track_started=True
)
broker_ssl_config = celery_config.get('broker_use_ssl')
if broker_ssl_config:
    cert_reqs = broker_ssl_config.get('cert_reqs')
    if cert_reqs:
        broker_ssl_config['cert_reqs'] = getattr(ssl, cert_reqs)
    app.conf.update(broker_use_ssl=broker_ssl_config)


@app.task(bind=True, name='mark.book.mirror')
def run_book_mirror(self, book_id: int, file_path: str):
    if not MirrorTool.enabled:
        return
    file_full_path = os.path.join('answer_books', str(book_id), file_path)
    MirrorTool.put(file_full_path, os.path.join(data_folder, file_full_path))
