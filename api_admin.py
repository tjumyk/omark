from flask import Blueprint, jsonify, request

from auth_connect.oauth import requires_admin
from models import db
from services.account import AccountService, AccountServiceError
from services.task import TaskService, TaskServiceError

admin_api = Blueprint('admin_api', __name__)


@admin_api.route('/tasks', methods=['POST'])
@requires_admin
def do_tasks():
    try:
        params = request.json
        task = TaskService.add(params.get('name'))
        db.session.commit()
        return jsonify(task.to_dict()), 201
    except TaskServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@admin_api.route('/tasks/<int:tid>/lock', methods=['PUT', 'DELETE'])
@requires_admin
def do_task_lock(tid: int):
    try:
        task = TaskService.get(tid)
        if task is None:
            return jsonify(msg='task not found'), 404

        if request.method == 'PUT':
            TaskService.lock(task)
        else:  # DELETE
            TaskService.unlock(task)
        db.session.commit()
        return "", 204
    except TaskServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@admin_api.route('/tasks/<int:tid>/questions', methods=['POST'])
@requires_admin
def do_task_questions(tid: int):
    try:
        task = TaskService.get(tid)
        if task is None:
            return jsonify(msg='task not found'), 404

        params = request.json
        q = TaskService.add_question(task, params.get('index'), params.get('marks'), params.get('description'))
        db.session.commit()
        return jsonify(q.to_dict(with_marker_assignments=True)), 201
    except TaskServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@admin_api.route('/tasks/<int:tid>/assignments', methods=['POST', 'DELETE'])
@requires_admin
def do_task_assignments(tid):
    try:
        task = TaskService.get(tid)
        if task is None:
            return jsonify(msg='task not found'), 404

        params = request.json
        question = TaskService.get_question(params.get('qid'))
        marker = AccountService.sync_user_by_id(params.get('mid'))

        if request.method == 'POST':
            ass = TaskService.add_marker_question_assignment(question, marker)
            db.session.commit()
            return jsonify(ass.to_dict(with_marker=True)), 201
        else:  # DELETE
            ass = TaskService.get_marker_question_assignment(question, marker)
            if ass is None:
                return jsonify(msg='assignment not found'), 404
            db.session.delete(ass)
            db.session.commit()
            return "", 204
    except (TaskServiceError, AccountServiceError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400
