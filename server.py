import os
import subprocess

from flask import Flask, request, jsonify, send_from_directory

from api_account import account_api
from api_admin import admin_api
from api_answer import answer_api
from api_task import task_api
from api_marking import marking_api
from auth_connect import oauth
from models import db
from services.account import AccountService, AccountServiceError


class MyFlask(Flask):
    _hashed_static_file_pattern = re.compile(r'^.+\.[a-z0-9]{20}\.\w+$')
    _hashed_static_file_cache_timeout = 365 * 24 * 60 * 60  # 1 year
    _index_page_cache_timeout = 5 * 60  # 5 minutes

    def send_static_file(self, filename):
        """Identify hashed static files and send them with a longer cache timeout.
        For 'index.html', send it with a short cache timeout.
        For other static files, the default cache timeout is used.
        """
        if not self.has_static_folder:
            raise RuntimeError('No static folder for this object')
        if filename == 'index.html':
            cache_timeout = self._index_page_cache_timeout
        elif self._hashed_static_file_pattern.fullmatch(filename):
            cache_timeout = self._hashed_static_file_cache_timeout
        else:
            cache_timeout = self.get_send_file_max_age(filename)
        return send_from_directory(self.static_folder, filename,
                                   cache_timeout=cache_timeout)
    

app = MyFlask(__name__)
app.config.from_json('config.json')

db.init_app(app)


# import logging
# logging.basicConfig()
# logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)


def _login_callback(user):
    try:
        AccountService.sync_user(user)
        db.session.commit()
    except AccountServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 500


oauth.init_app(app, login_callback=_login_callback)

app.register_blueprint(account_api, url_prefix='/api/account')
app.register_blueprint(admin_api, url_prefix='/api/admin')
app.register_blueprint(task_api, url_prefix='/api/tasks')
app.register_blueprint(answer_api, url_prefix='/api/answers')
app.register_blueprint(marking_api, url_prefix='/api/markings')


@app.route('/')
@app.route('/tasks/<path:path>')
@app.route('/admin/<path:path>')
@oauth.requires_login
def get_index_page(path=''):
    return app.send_static_file('index.html')


@app.errorhandler(404)
def page_not_found(error):
    for mime in request.accept_mimetypes:
        if mime[0] == 'text/html':
            break
        if mime[0] == 'application/json':
            return jsonify(msg='wrong url', detail='You have accessed an unknown location'), 404
    # in case we are building the front-end
    if not os.path.exists(os.path.join(app.static_folder, 'index.html')):
        return "Building front-end in progress", 503
    return app.send_static_file('index.html'), 404


@app.cli.command()
def create_db():
    db.create_all()


@app.cli.command()
def drop_db():
    db.drop_all()


@app.route('/api/version')
def api_version():
    git_version = subprocess.check_output(['git', 'describe', '--tags']).decode().strip()
    return jsonify(version=git_version)


if __name__ == '__main__':
    app.run(host='localhost', port=8333)
