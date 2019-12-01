import os
import subprocess

from flask import Flask, request, jsonify

from api_account import account_api
from api_admin import admin_api
from api_answer import answer_api
from api_exam import exam_api
from api_marking import marking_api
from auth_connect import oauth
from models import db
from services.account import AccountService, AccountServiceError

app = Flask(__name__)
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
app.register_blueprint(exam_api, url_prefix='/api/exams')
app.register_blueprint(answer_api, url_prefix='/api/answers')
app.register_blueprint(marking_api, url_prefix='/api/markings')


@app.route('/')
@app.route('/exams/<path:path>')
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
