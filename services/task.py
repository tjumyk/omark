from operator import or_
from typing import Optional, List

from sqlalchemy import func
from sqlalchemy.orm import joinedload

from error import BasicError
from models import Task, db, Question, UserAlias, MarkerQuestionAssignment, AnswerBook, Marking, Comment


class TaskServiceError(BasicError):
    pass


class TaskService:
    @staticmethod
    def get(_id: int) -> Optional[Task]:
        if _id is None:
            raise TaskServiceError('id is required')
        if not isinstance(_id, int):
            raise TaskServiceError('id must be an integer')

        return Task.query.get(_id)

    @staticmethod
    def get_all() -> List[Task]:
        return db.session.query(Task).order_by(Task.id).all()

    @staticmethod
    def add(name: str) -> Task:
        if not name:
            raise TaskServiceError('name is required')

        if db.session.query(func.count()).filter(Task.name == name).scalar():
            raise TaskServiceError('duplicate name')

        task = Task(name=name)
        db.session.add(task)
        return task

    @staticmethod
    def set_lock(task: Task, lock_type: str, locked: bool):
        if task is None:
            raise TaskServiceError('task is required')
        if lock_type in {'config', 'answer', 'marking'}:
            attr = lock_type + '_locked'
            if locked:
                if getattr(task, attr):
                    raise TaskServiceError('already locked')
                setattr(task, attr, True)
            else:
                if not getattr(task, attr):
                    raise TaskServiceError('not yet locked')
                setattr(task, attr, False)
        else:
            raise TaskServiceError('invalid lock type')

    @staticmethod
    def get_books(task: Task, joined_load_student: bool = False) -> List[AnswerBook]:
        if task is None:
            raise TaskServiceError('task is required')

        query = AnswerBook.query.with_parent(task)
        if joined_load_student:
            query = query.options(joinedload(AnswerBook.student))
        return query.order_by(AnswerBook.id).all()

    @staticmethod
    def get_markings(task: Task) -> List[Marking]:
        if task is None:
            raise TaskServiceError('task is required')

        return db.session.query(Marking) \
            .filter(Marking.book_id == AnswerBook.id,
                    AnswerBook.task_id == task.id) \
            .all()

    @staticmethod
    def get_comments(task: Task) -> List[Comment]:
        if task is None:
            raise TaskServiceError('task is required')

        return db.session.query(Comment) \
            .filter(Comment.book_id == AnswerBook.id,
                    AnswerBook.task_id == task.id) \
            .order_by(Comment.id) \
            .all()

    @staticmethod
    def get_question(_id: int) -> Optional[Question]:
        if _id is None:
            raise TaskServiceError('id is required')
        if not isinstance(_id, int):
            raise TaskServiceError('id must be an integer')

        return Question.query.get(_id)

    @staticmethod
    def add_question(task: Task, index: int, marks: float, description: Optional[str]) -> Question:
        if task is None:
            raise TaskServiceError('task is required')
        if index is None:
            raise TaskServiceError('index is required')
        if not isinstance(index, int):
            raise TaskServiceError('index must be an integer')
        if marks is None:
            raise TaskServiceError('marks is required')
        if not isinstance(marks, (int, float)):
            raise TaskServiceError('marks must be an integer or float')

        if task.config_locked:
            raise TaskServiceError('task config locked')

        if db.session.query(func.count()) \
                .filter(Question.task_id == task.id,
                        Question.index == index) \
                .scalar():
            raise TaskServiceError('duplicate index')

        q = Question(task=task, index=index, marks=marks, description=description)
        db.session.add(q)
        return q

    @staticmethod
    def remove_question(q: Question):
        if q is None:
            raise TaskServiceError('question is required')

        if q.task.config_locked:
            raise TaskServiceError('task config locked')

        if db.session.query(func.count()).filter(Marking.question_id == q.id).scalar():
            raise TaskServiceError('question already marked')
        db.session.execute(MarkerQuestionAssignment.__table__.delete()
                           .where(MarkerQuestionAssignment.question_id == q.id))
        db.session.delete(q)

    @staticmethod
    def get_marker_question_assignment(question: Question, marker: UserAlias) -> Optional[MarkerQuestionAssignment]:
        if question is None:
            raise TaskServiceError('question is required')
        if marker is None:
            raise TaskServiceError('marker is required')

        return db.session.query(MarkerQuestionAssignment) \
            .filter(MarkerQuestionAssignment.question_id == question.id,
                    MarkerQuestionAssignment.marker_id == marker.id).first()

    @staticmethod
    def add_marker_question_assignment(question: Question, marker: UserAlias) -> MarkerQuestionAssignment:
        if question is None:
            raise TaskServiceError('question is required')
        if marker is None:
            raise TaskServiceError('marker is required')

        if question.task.config_locked:
            raise TaskServiceError('task config locked')

        if db.session.query(func.count()) \
                .filter(MarkerQuestionAssignment.question_id == question.id,
                        MarkerQuestionAssignment.marker_id == marker.id) \
                .scalar():
            raise TaskServiceError('already assigned')
        ass = MarkerQuestionAssignment(question=question, marker=marker)
        return ass

    @classmethod
    def remove_marker_question_assignment(cls, q: Question, marker: UserAlias):
        if q is None:
            raise TaskServiceError('question is required')
        if marker is None:
            raise TaskServiceError('marker is required')

        if q.task.config_locked:
            raise TaskServiceError('task config locked')

        if db.session.query(func.count()) \
                .filter(Marking.question_id == q.id,
                        or_(Marking.creator_id == marker.id, Marking.modifier_id == marker.id)) \
                .scalar():
            raise TaskServiceError('marker already marked question')

        ass = cls.get_marker_question_assignment(q, marker)
        if ass is None:
            raise TaskServiceError('assignment not found')
        db.session.delete(ass)
