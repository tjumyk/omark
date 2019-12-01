import os
import time

from flask import Blueprint, jsonify, request, current_app as app

from auth_connect.oauth import requires_login
from models import db
from services.account import AccountService, AccountServiceError
from services.answer import AnswerService, AnswerServiceError
from services.exam import ExamService, ExamServiceError
from services.marking import MarkingService, MarkingServiceError

answer_api = Blueprint('answer_api', __name__)


@answer_api.route('/books/<int:bid>', methods=['GET', 'PUT'])
@requires_login
def do_book(bid: int):
    try:
        book = AnswerService.get_book(bid)
        if book is None:
            return jsonify(msg='book not found'), 404

        if request.method == 'GET':
            return jsonify(book.to_dict(with_student=True, with_pages=True, with_markings=True,
                                        with_creator=True, with_modifier=True))
        else:  # PUT
            user = AccountService.get_current_user()
            if user is None:
                return jsonify(msg='user info required'), 500

            params = request.json
            student_id = params.get('sid')
            if student_id is None:
                student = None
            else:
                student = AccountService.get_user(student_id)
                if student is None:
                    return jsonify(msg='student not found'), 404

            AnswerService.update_book(book, student, modifier=user)
            db.session.commit()
            return jsonify(book.to_dict(with_student=True, with_pages=True, with_markings=True,
                                        with_creator=True, with_modifier=True))
    except (AccountServiceError, AnswerServiceError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@answer_api.route('/books/<int:bid>/pages', methods=['POST'])
@requires_login
def do_book_pages(bid: int):
    try:
        user = AccountService.get_current_user()
        if user is None:
            return jsonify(msg='user info required'), 500

        book = AnswerService.get_book(bid)
        if book is None:
            return jsonify(msg='book not found'), 404

        params = request.json
        files = request.files
        file = files.get('file')
        if not file:
            return jsonify(msg='file is required'), 400

        # prepare file path
        data_folder = app.config['DATA_FOLDER']
        book_folder = os.path.join(data_folder, 'answer_books', str(book.id))
        if not os.path.exists(os.path.dirname(book_folder)):
            os.makedirs(book_folder)
        ext = os.path.splitext(file.filename)[-1]
        path = os.path.join(book_folder, '%f%s' % (time.time(), ext))

        page = AnswerService.add_page(book, path, index=params.get('index'), creator=user)
        file.save(path)
        db.session.commit()
        return jsonify(page.to_dict(with_creator=True)), 201
    except (AccountServiceError, AnswerServiceError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@answer_api.route('/pages/<int:pid>', methods=['GET', 'PUT'])
@requires_login
def do_page(pid: int):
    try:
        page = AnswerService.get_page(pid)
        if page is None:
            return jsonify(msg='page not found'), 404

        if request.method == 'GET':
            return jsonify(page.to_dict(with_annotations=True, with_creator=True, with_modifier=True))
        else:  # PUT
            user = AccountService.get_current_user()
            if user is None:
                return jsonify(msg='user info required'), 500

            params = request.json
            AnswerService.update_page(page, index=params.get('index'), transform=params.get('transform'), modifier=user)
            db.session.commit()
    except (AccountServiceError, AnswerServiceError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@answer_api.route('/books/<int:bid>/markings', methods=['POST'])
@requires_login
def do_book_markings(bid: int):
    try:
        user = AccountService.get_current_user()
        if user is None:
            return jsonify(msg='user info required'), 500

        book = AnswerService.get_book(bid)
        if book is None:
            return jsonify(msg='book not found'), 404

        params = request.json
        question = ExamService.get_question(params.get('qid'))
        marking = MarkingService.add(book, question, params.get('marks'), params.get('remarks'), creator=user)
        db.session.commit()
        return jsonify(marking.to_dict(with_creator=True)), 201
    except (AccountServiceError, AnswerServiceError, ExamServiceError, MarkingServiceError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@answer_api.route('/pages/<int:pid>/annotations', methods=['POST'])
@requires_login
def do_page_annotations(pid: int):
    try:
        user = AccountService.get_current_user()
        if user is None:
            return jsonify(msg='user info required'), 500

        page = AnswerService.get_page(pid)
        if page is None:
            return jsonify(msg='page not found'), 404

        params = request.json
        ann = MarkingService.add_annotation(page, data=params.get('data'), creator=user)
        db.session.commit()
        return jsonify(ann.to_dict(with_creator=True)), 201
    except (AccountServiceError, AnswerServiceError, MarkingServiceError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400
