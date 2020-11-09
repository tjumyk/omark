import os
import shutil
import subprocess
import sys
import tempfile
from collections import defaultdict
from uuid import uuid4

from flask import Blueprint, jsonify, request, current_app as app

from async_job_worker import run_book_mirror
from auth_connect.oauth import requires_admin
from models import db
from services.account import AccountService, AccountServiceError
from services.answer import AnswerService, AnswerServiceError
from services.task import TaskService, TaskServiceError
from utils.crypt import md5sum
from utils.give import GiveImporter, GiveImporterError
from utils.mirror import MirrorTool
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


@admin_api.route('/tasks/<int:tid>/<string:lock_type>-lock', methods=['PUT', 'DELETE'])
@requires_admin
def do_task_lock(tid: int, lock_type):
    try:
        task = TaskService.get(tid)
        if task is None:
            return jsonify(msg='task not found'), 404

        if request.method == 'PUT':
            TaskService.set_lock(task, lock_type, True)
        else:  # DELETE
            TaskService.set_lock(task, lock_type, False)
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


@admin_api.route('/questions/<int:qid>', methods=['DELETE'])
@requires_admin
def do_question(qid: int):
    try:
        q = TaskService.get_question(qid)
        if q is None:
            return jsonify(msg='question not found'), 404

        TaskService.remove_question(q)
        db.session.commit()
        return "", 204
    except TaskServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@admin_api.route('/tasks/<int:tid>/assignments', methods=['POST'])
@requires_admin
def do_task_assignments(tid):
    try:
        task = TaskService.get(tid)
        if task is None:
            return jsonify(msg='task not found'), 404

        params = request.json
        question = TaskService.get_question(params.get('qid'))
        marker = AccountService.sync_user_by_name(params.get('marker_name'))

        ass = TaskService.add_marker_question_assignment(question, marker)
        db.session.commit()
        return jsonify(ass.to_dict(with_marker=True)), 201
    except (TaskServiceError, AccountServiceError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@admin_api.route('/questions/<int:qid>/assignments/<int:uid>', methods=['DELETE'])
@requires_admin
def do_question_assignment(qid: int, uid: int):
    try:
        question = TaskService.get_question(qid)
        if question is None:
            return jsonify(msg='question not found'), 404
        marker = AccountService.get_user(uid)
        if marker is None:
            return jsonify(msg='marker not found'), 404

        TaskService.remove_marker_question_assignment(question, marker)
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

        if task.answer_locked:  # early stop
            return jsonify(msg='task answer locked'), 400

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

        num_new_books = 0
        num_skipped_books = 0
        num_updated_books = 0
        with tempfile.TemporaryDirectory() as work_dir:
            archive_path = os.path.join(work_dir, archive.filename)
            archive.save(archive_path)
            extract_dir = os.path.join(work_dir, '_extract')
            os.mkdir(extract_dir)

            copy_info = []
            for student_id, submissions_info in GiveImporter(file_names).import_archive(archive_path, extract_dir):
                student = AccountService.sync_user_by_name(student_id)
                if not submissions_info:  # no submission
                    continue  # ignore

                files_to_find = set(file_names)
                files_found = {}
                submission_time = None
                for i, (_time, files) in enumerate(reversed(submissions_info)):  # from the latest to the oldest
                    for name, tmp_path in files.items():
                        if name in files_to_find:  # not yet found
                            if i != 0:  # not the latest
                                print('[Warning] Importing "%s" from non-default submission for student "%s"'
                                      % (name, student_id), file=sys.stderr)
                            files_to_find.remove(name)
                            files_found[name] = (_time, tmp_path)
                            if submission_time is None or submission_time < _time:
                                submission_time = _time
                    if not files_to_find:  # all files found
                        break

                # find if a book exists
                book = AnswerService.get_book_by_task_student(task, student)
                if book is not None:  # already imported
                    if book.submitted_at is not None and book.submitted_at == submission_time:  # same version
                        num_skipped_books += 1
                        continue
                    else:  # update to latest version
                        book_folder = os.path.join(data_folder, 'answer_books', str(book.id))
                        old_path_pages = defaultdict(list)
                        for page in book.pages:
                            old_path_pages[page.file_path].append(page)

                        has_content_change = False
                        for file_name, (_time, tmp_path) in files_found.items():
                            path = file_name  # directly use the file name as path
                            old_pages = old_path_pages.get(path)
                            if old_pages:  # file exists
                                if md5sum(os.path.join(book_folder, path)) == md5sum(tmp_path):  # same file content
                                    continue  # skip importing this file
                                for page in old_pages:  # delete outdated pages
                                    # file will be overwritten, so no file deletion is required
                                    AnswerService.delete_page(page)
                            ext = os.path.splitext(file_name)[-1]
                            if ext == '.pdf':  # split pdf pages
                                try:
                                    num_pages = get_pdf_pages(tmp_path)
                                except subprocess.CalledProcessError:
                                    print('[Warning] Failed to get pdf info of: %s' % tmp_path, file=sys.stderr)
                                    continue
                                AnswerService.add_multi_pages(book, path, num_pages)
                            else:
                                AnswerService.add_page(book, path)
                            has_content_change = True
                            copy_info.append((tmp_path, book, path))

                        book.submitted_at = submission_time
                        if has_content_change:  # invalidate existing markings because content has changed
                            for m in book.markings:
                                db.session.delete(m)
                        num_updated_books += 1
                else:  # create new book
                    book = AnswerService.add_book(task, student, submitted_at=submission_time)
                    num_new_books += 1

                    for file_name, (_time, tmp_path) in files_found.items():
                        path = file_name  # directly use the file name as path since no conflict could occur here
                        ext = os.path.splitext(file_name)[-1]
                        if ext == '.pdf':  # split pdf pages
                            try:
                                num_pages = get_pdf_pages(tmp_path)
                            except subprocess.CalledProcessError:
                                print('[Warning] Failed to get pdf info of: %s' % tmp_path, file=sys.stderr)
                                continue
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
                run_book_mirror.apply_async((book.id, path))

        db.session.commit()
        return jsonify(num_new_books=num_new_books, num_skipped_books=num_skipped_books,
                       num_updated_books=num_updated_books)
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
        book_path = os.path.join('answer_books', str(book.id))
        book_folder = os.path.join(data_folder, book_path)
        if os.path.exists(book_folder):
            for path in file_paths:
                full_path = os.path.join(book_folder, path)
                if os.path.exists(full_path):
                    os.remove(full_path)
                if MirrorTool.enabled:
                    remote_path = os.path.join(book_path, path)
                    if MirrorTool.exists(remote_path):
                        MirrorTool.delete(remote_path)
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

        if file_path:
            data_folder = app.config['DATA_FOLDER']
            book_path = os.path.join('answer_books', str(page.book_id))
            book_folder = os.path.join(data_folder, book_path)
            full_path = os.path.join(book_folder, file_path)
            if os.path.exists(full_path):
                os.remove(full_path)
            if MirrorTool.enabled:
                remote_path = os.path.join(book_path, file_path)
                if MirrorTool.exists(remote_path):
                    MirrorTool.delete(remote_path)

        db.session.commit()
        return "", 204
    except AnswerServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@admin_api.route('/tasks/<int:tid>/materials', methods=['POST'])
@requires_admin
def do_task_materials(tid: int):
    try:
        task = TaskService.get(tid)
        if task is None:
            return jsonify(msg='task not found'), 404

        if task.config_locked:  # early stop
            return jsonify(msg='task config locked'), 400

        file = request.files.get('file')
        if file is None:
            return jsonify(msg='file is required'), 400

        name = file.filename
        _, ext = os.path.splitext(name)
        path = os.path.join('materials', str(uuid4()) + ext)
        material = TaskService.add_material(task, name, path)

        # do actual file copy
        data_folder = app.config['DATA_FOLDER']
        full_path = os.path.join(data_folder, path)
        folder_path = os.path.dirname(full_path)
        if not os.path.exists(folder_path):
            os.makedirs(folder_path)
        file.save(full_path)

        db.session.commit()
        return jsonify(material.to_dict()), 201
    except TaskServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@admin_api.route('/materials/<int:mid>', methods=['DELETE'])
@requires_admin
def do_material(mid: int):
    try:
        material = TaskService.get_material(mid)
        if material is None:
            return jsonify(msg='material not found'), 404

        TaskService.remove_material(material)
        data_folder = app.config['DATA_FOLDER']
        os.remove(os.path.join(data_folder, material.path))

        db.session.commit()
        return '', 204
    except TaskServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400
