from flask import Blueprint, jsonify, request

from auth_connect.oauth import requires_login
from models import db
from services.account import AccountService, AccountServiceError
from services.answer import AnswerService, AnswerServiceError
from services.task import TaskService, TaskServiceError

task_api = Blueprint('task_api', __name__)


@task_api.route('/')
@requires_login
def get_tasks():
    try:
        tasks = TaskService.get_all()
        return jsonify([t.to_dict() for t in tasks])
    except TaskServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@task_api.route('/<int:tid>')
@requires_login
def get_task(tid: int):
    try:
        task = TaskService.get(tid)
        if task is None:
            return jsonify(msg='task not found'), 404

        return jsonify(task.to_dict(with_questions=True, with_assignments=True))
    except TaskServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@task_api.route('/<int:tid>/answer-books', methods=['GET', 'POST'])
@requires_login
def do_task_books(tid: int):
    try:
        user = AccountService.get_current_user()
        if user is None:
            return jsonify(msg='user info required'), 500

        task = TaskService.get(tid)
        if task is None:
            return jsonify(msg='task not found'), 404

        if request.method == 'GET':
            return jsonify([b.to_dict(with_student=True, with_markings=True) for b in task.answer_books])
        else:  # POST
            params = request.json
            student_id = params.get('sid')
            if student_id is None:
                student = None
            else:
                student = AccountService.sync_user_by_id(student_id)
                if student is None:
                    return jsonify(msg='student not found'), 404
            book = AnswerService.add_book(task, student, creator=user)
            db.session.commit()
            return jsonify(book.to_dict(with_student=True)), 201
    except (TaskServiceError, AccountServiceError, AnswerServiceError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400
