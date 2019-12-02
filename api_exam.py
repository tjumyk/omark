from flask import Blueprint, jsonify, request

from auth_connect.oauth import requires_login
from models import db
from services.account import AccountService, AccountServiceError
from services.answer import AnswerService, AnswerServiceError
from services.exam import ExamService, ExamServiceError

exam_api = Blueprint('exam_api', __name__)


@exam_api.route('/')
@requires_login
def get_exams():
    try:
        exams = ExamService.get_all()
        return jsonify([e.to_dict() for e in exams])
    except ExamServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@exam_api.route('/<int:eid>')
@requires_login
def get_exam(eid: int):
    try:
        exam = ExamService.get(eid)
        if exam is None:
            return jsonify(msg='exam not found'), 404

        return jsonify(exam.to_dict(with_questions=True, with_assignments=True))
    except ExamServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@exam_api.route('/<int:eid>/answer-books', methods=['GET', 'POST'])
@requires_login
def do_exam_books(eid: int):
    try:
        user = AccountService.get_current_user()
        if user is None:
            return jsonify(msg='user info required'), 500

        exam = ExamService.get(eid)
        if exam is None:
            return jsonify(msg='exam not found'), 404

        if request.method == 'GET':
            return jsonify([b.to_dict(with_student=True, with_markings=True) for b in exam.answer_books])
        else:  # POST
            params = request.json
            student_id = params.get('sid')
            if student_id is None:
                student = None
            else:
                student = AccountService.sync_user_by_id(student_id)
                if student is None:
                    return jsonify(msg='student not found'), 404
            book = AnswerService.add_book(exam, student, creator=user)
            db.session.commit()
            return jsonify(book.to_dict(with_student=True)), 201
    except (ExamServiceError, AccountServiceError, AnswerServiceError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400
