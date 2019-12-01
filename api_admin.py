from flask import Blueprint, jsonify, request

from auth_connect.oauth import requires_admin
from models import db
from services.account import AccountService, AccountServiceError
from services.exam import ExamService, ExamServiceError

admin_api = Blueprint('admin_api', __name__)


@admin_api.route('/exams', methods=['POST'])
@requires_admin
def do_exams():
    try:
        params = request.json
        exam = ExamService.add(params.get('name'))
        db.session.commit()
        return jsonify(exam.to_dict()), 201
    except ExamServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@admin_api.route('/exams/<int:eid>/questions', methods=['POST'])
@requires_admin
def do_exam_questions(eid: int):
    try:
        exam = ExamService.get(eid)
        if exam is None:
            return jsonify(msg='exam not found'), 404

        params = request.json
        q = ExamService.add_question(exam, params.get('index'), params.get('marks'), params.get('description'))
        db.session.commit()
        return jsonify(q.to_dict()), 201
    except ExamServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@admin_api.route('/exams/<int:eid>/assignments', methods=['POST', 'DELETE'])
@requires_admin
def do_exam_assignments(eid):
    try:
        exam = ExamService.get(eid)
        if exam is None:
            return jsonify(msg='exam not found'), 404

        params = request.json
        question = ExamService.get_question(params.get('qid'))
        marker = AccountService.sync_user_by_id(params.get('mid'))

        if request.method == 'POST':
            ass = ExamService.add_marker_question_assignment(question, marker)
            db.session.commit()
            return jsonify(ass.to_dict()), 201
        else:  # DELETE
            ass = ExamService.get_marker_question_assignment(question, marker)
            if ass is None:
                return jsonify(msg='assignment not found'), 404
            db.session.delete(ass)
            db.session.commit()
            return "", 204
    except (ExamServiceError, AccountServiceError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400
