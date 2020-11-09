from flask import Blueprint, current_app as app, jsonify, send_from_directory

from auth_connect.oauth import requires_login
from services.task import TaskService, TaskServiceError

material_api = Blueprint('material_api', __name__)


@material_api.route('<int:mid>')
@material_api.route('<int:mid>/<string:name>')
@requires_login
def do(mid: int, name: str = None):
    try:
        material = TaskService.get_material(mid)
        if material is None:
            return jsonify(msg='material not found'), 404
        data_folder = app.config['DATA_FOLDER']
        return send_from_directory(data_folder, material.path)
    except TaskServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400
