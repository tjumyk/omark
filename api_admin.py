import os
import shutil
import tempfile

from flask import Blueprint, jsonify, request, current_app as app

from auth_connect.oauth import requires_admin
from models import db
from services.account import AccountService, AccountServiceError
from services.answer import AnswerService, AnswerServiceError
from services.task import TaskService, TaskServiceError
from utils.give import GiveImporter, GiveImporterError
from utils.pdf import get_pdf_pages

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
        marker = AccountService.sync_user_by_name(params.get('marker_name'))

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


@admin_api.route('/tasks/<int:tid>/import-give', methods=['POST'])
@requires_admin
def import_give(tid: int):
    try:
        task = TaskService.get(tid)
        if task is None:
            return jsonify(msg='task not found'), 404

        archive = request.files.get('archive')
        file_names_str = request.form.get('file_names')

        if not archive:
            return jsonify(msg='archive file is required'), 400
        if not file_names_str:
            return jsonify(msg='file names are required'), 400

        file_names = []
        for name in file_names_str.split(','):
            name = name.strip()
            if name:
                file_names.append(name)
        if not file_names:
            return jsonify(msg='file names are required'), 400

        data_folder = app.config['DATA_FOLDER']

        num_books = 0
        with tempfile.TemporaryDirectory() as work_dir:
            archive_path = os.path.join(work_dir, archive.filename)
            archive.save(archive_path)
            extract_dir = os.path.join(work_dir, '_extract')
            os.mkdir(extract_dir)

            copy_info = []
            for student_id, files in GiveImporter(file_names).import_archive(archive_path, extract_dir):
                student = AccountService.sync_user_by_name(student_id)
                book = AnswerService.add_book(task, student)
                num_books += 1

                for file_name in file_names:  # keep the original order
                    tmp_path = files.get(file_name)
                    if not tmp_path:  # file not found in submission
                        continue

                    path = file_name  # directly use the file name as path since no conflict could occur here
                    ext = os.path.splitext(file_name)[-1]
                    if ext == '.pdf':  # split pdf pages
                        num_pages = get_pdf_pages(tmp_path)
                        AnswerService.add_multi_pages(book, path, num_pages)
                    else:
                        AnswerService.add_page(book, path)
                    copy_info.append((tmp_path, book, path))

            # do actual file copies at last
            for tmp_path, book, path in copy_info:
                book_path = os.path.join(data_folder, 'answer_books', str(book.id))
                to_path = os.path.join(book_path, path)
                to_dir_path = os.path.dirname(to_path)
                if not os.path.exists(to_dir_path):
                    os.makedirs(to_dir_path)
                shutil.copy(tmp_path, to_path)

        db.session.commit()
        return jsonify(num_books=num_books)
    except (TaskServiceError, GiveImporterError, AccountServiceError, AnswerServiceError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@admin_api.route('/books/<int:bid>', methods=['DELETE'])
@requires_admin
def delete_book(bid: int):
    try:
        book = AnswerService.get_book(bid)
        if book is None:
            return jsonify(msg='book not found'), 404

        file_paths = AnswerService.delete_book(book)

        data_folder = app.config['DATA_FOLDER']
        book_folder = os.path.join(data_folder, 'answer_books', str(book.id))
        if os.path.exists(book_folder):
            for path in file_paths:
                full_path = os.path.join(book_folder, path)
                if os.path.exists(full_path):
                    os.remove(full_path)
            if not os.listdir(book_folder):
                os.rmdir(book_folder)

        db.session.commit()
        return "", 204
    except AnswerServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@admin_api.route('/pages/<int:pid>', methods=['DELETE'])
@requires_admin
def delete_page(pid: int):
    try:
        page = AnswerService.get_page(pid)
        if page is None:
            return jsonify(msg='page not found'), 404

        file_path = AnswerService.delete_page(page)

        data_folder = app.config['DATA_FOLDER']
        book_folder = os.path.join(data_folder, 'answer_books', str(page.book_id))
        if file_path:
            full_path = os.path.join(book_folder, file_path)
            if os.path.exists(full_path):
                os.remove(full_path)

        db.session.commit()
        return "", 204
    except AnswerServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400
