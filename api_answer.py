import json
import os
import shutil
import tempfile
import uuid

from flask import Blueprint, jsonify, request, current_app as app, send_from_directory

from auth_connect.oauth import requires_login
from models import db
from services.account import AccountService, AccountServiceError
from services.answer import AnswerService, AnswerServiceError
from services.marking import MarkingService, MarkingServiceError
from services.task import TaskService, TaskServiceError
from utils.image import process_image
from utils.pdf import get_pdf_pages

answer_api = Blueprint('answer_api', __name__)


@answer_api.route('/books/<int:bid>', methods=['GET', 'PUT'])
@requires_login
def do_book(bid: int):
    try:
        book = AnswerService.get_book(bid)
        if book is None:
            return jsonify(msg='book not found'), 404

        if request.method == 'GET':
            return jsonify(book.to_dict(with_student=True, with_pages=True, with_markings=True, with_annotations=True,
                                        with_creator=True, with_modifier=True))
        else:  # PUT
            user = AccountService.get_current_user()
            if user is None:
                return jsonify(msg='user info required'), 500

            params = request.json
            student_name = params.get('student_name')
            if not student_name:
                student = None
            else:
                student = AccountService.sync_user_by_name(student_name)
                if student is None:
                    return jsonify(msg='student not found'), 404

            AnswerService.update_book(book, student, modifier=user)
            db.session.commit()
            return jsonify(book.to_dict(with_student=True, with_pages=True, with_markings=True, with_annotations=True,
                                        with_creator=True, with_modifier=True))
    except (AccountServiceError, AnswerServiceError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@answer_api.route('/books/<int:bid>/next')
@answer_api.route('/books/<int:bid>/prev')
@requires_login
def go_to_book(bid: int):
    try:
        book = AnswerService.get_book(bid)
        if book is None:
            return jsonify(msg='book not found'), 404

        book2 = AnswerService.go_to_book(book, request.path.endswith('/next'))
        if book2 is None:
            return "", 204
        return jsonify(book2.to_dict())
    except AnswerServiceError as e:
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

        params = request.form
        files = request.files
        file_list = files.getlist('file')
        if not file_list:
            return jsonify(msg='file is required'), 400
        options = params.get('options')
        if options is not None:
            try:
                options = json.loads(options)
                if not isinstance(options, dict):
                    return jsonify(msg='invalid options format', detail='options must be a dict'), 400
            except (ValueError, TypeError) as e:
                return jsonify(msg='invalid options format', detail=str(e)), 400

        # prepare file path
        data_folder = app.config['DATA_FOLDER']
        book_folder = os.path.join('answer_books', str(book.id))
        full_book_folder = os.path.join(data_folder, book_folder)
        if not os.path.exists(full_book_folder):
            os.makedirs(full_book_folder)

        pages = []
        for file in file_list:
            ext = os.path.splitext(file.filename)[-1].lower()
            num_tries = 0
            while True:
                random_id = str(uuid.uuid4())
                path = random_id + ext  # generate a random path
                full_path = os.path.join(data_folder, book_folder, path)
                if not os.path.exists(full_path):  # check if the path already exists
                    break
                num_tries += 1
                if num_tries > 10:
                    return jsonify(msg='failed to generate a new path'), 500

            if ext == '.pdf':  # split pdf pages
                with tempfile.TemporaryDirectory() as tmp_dir:
                    tmp_path = os.path.join(tmp_dir, 'file.pdf')
                    file.save(tmp_path)
                    num_pages = get_pdf_pages(tmp_path)
                    pages.extend(AnswerService.add_multi_pages(book, path, num_pages, creator=user))
                    shutil.copyfile(tmp_path, full_path)
            else:
                if options:
                    with tempfile.TemporaryDirectory() as tmp_dir:
                        tmp_path = os.path.join(tmp_dir, 'file' + ext)
                        file.save(tmp_path)
                        try:
                            processed_img_paths = process_image(tmp_path, options, tmp_dir)
                        except Exception as e:
                            return jsonify(msg='Failed to process image', detail=str(e)), 400

                        for i, output_img_path in enumerate(processed_img_paths):
                            if i == 0:
                                alt_path = path  # keep the path of the first as the original path
                            else:
                                alt_path = '%s_%d%s' % (random_id, i, ext)
                            page = AnswerService.add_page(book, alt_path, creator=user)
                            shutil.copy(output_img_path, os.path.join(data_folder, book_folder, alt_path))
                            pages.append(page)
                else:
                    page = AnswerService.add_page(book, path, index=params.get('index'), creator=user)
                    file.save(full_path)
                    pages.append(page)
        db.session.commit()
        return jsonify([page.to_dict(with_annotations=True, with_creator=True) for page in pages]), 201
    except (AccountServiceError, AnswerServiceError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@answer_api.route('/books/<int:bid>/files/<path:file_path>')
@requires_login
def do_book_file(bid: int, file_path: str):
    try:
        book = AnswerService.get_book(bid)
        if book is None:
            return jsonify(msg='book not found'), 404

        data_folder = app.config['DATA_FOLDER']
        book_folder = os.path.join(data_folder, 'answer_books', str(book.id))
        return send_from_directory(book_folder, file_path)
    except AnswerServiceError as e:
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
            return jsonify(page.to_dict(with_annotations=True, with_creator=True, with_modifier=True))
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
        question = TaskService.get_question(params.get('qid'))
        marking = MarkingService.add(book, question, params.get('marks'), params.get('remarks'), creator=user)
        db.session.commit()
        return jsonify(marking.to_dict(with_creator=True)), 201
    except (AccountServiceError, AnswerServiceError, TaskServiceError, MarkingServiceError) as e:
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
