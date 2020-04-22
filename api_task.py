from collections import defaultdict

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
            books = TaskService.get_books(task, joined_load_student=True)
            markings = TaskService.get_markings(task)
            comments = TaskService.get_comments(task)
            marking_map = defaultdict(list)
            comment_map = defaultdict(list)
            for m in markings:
                marking_map[m.book_id].append(m.to_dict())
            for c in comments:
                comment_map[c.book_id].append(c.to_dict())
            book_dicts = []
            for b in books:
                d = b.to_dict(with_student=True)
                d['markings'] = marking_map.get(b.id, [])
                d['comments'] = comment_map.get(b.id, [])
                book_dicts.append(d)
            return jsonify(book_dicts)
        else:  # POST
            params = request.json
            student_name = params.get('student_name')
            if not student_name:
                student = None
            else:
                student = AccountService.sync_user_by_name(student_name)
                if student is None:
                    return jsonify(msg='student not found'), 404
            book = AnswerService.add_book(task, student, creator=user)
            db.session.commit()
            return jsonify(book.to_dict(with_student=True)), 201
    except (TaskServiceError, AccountServiceError, AnswerServiceError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@task_api.route('/<int:tid>/export-markings')
@requires_login
def export_markings(tid: int):
    try:
        task = TaskService.get(tid)
        if task is None:
            return jsonify(msg='task not found'), 404

        books = TaskService.get_books(task, joined_load_student=True)
        markings = TaskService.get_markings(task)
        comments = TaskService.get_comments(task)
        marking_map = defaultdict(list)
        comment_map = defaultdict(list)
        for m in markings:
            marking_map[m.book_id].append(m)
        for c in comments:
            comment_map[c.book_id].append(c)

        tsv = []
        columns = ['BookID', 'UserID', 'UserName']
        questions = task.questions
        for q in questions:
            columns.append('Q%d' % q.index)
        columns.append('Comments')
        columns.append('Total')
        tsv.append('\t'.join(columns))

        for book in books:
            book_markings = marking_map.get(book.id, [])
            book_comments = comment_map.get(book.id, [])
            student_name = book.student.name if book.student_id else None
            book_columns = [book.id, book.student_id, student_name]
            question_marking_map = {m.question_id: m for m in book_markings}
            total = 0
            for q in questions:
                marking = question_marking_map.get(q.id)
                if marking:
                    marks = marking.marks
                    if int(marks) == marks:
                        marks = int(marks)  # convert to int
                    book_columns.append(marks)
                    total += marks
                else:
                    book_columns.append(None)

            book_columns.append(' || '.join(c.content.replace('\n', ' ').replace('\t', ' ') for c in book_comments))
            book_columns.append(total if question_marking_map else None)
            tsv.append('\t'.join([str(c) for c in book_columns]))
        return '\n'.join(tsv), {'Content-Type': 'text/plain'}
    except TaskServiceError as e:
        return jsonify(msg=e.msg, detail=e.detail), 400
