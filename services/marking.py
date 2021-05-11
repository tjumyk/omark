from typing import Optional
import logging
from sqlalchemy import func

from error import BasicError
from models import Marking, AnswerBook, Question, UserAlias, db, Annotation, AnswerPage, Comment

logger = logging.getLogger(__name__)


class MarkingServiceError(BasicError):
    pass


class MarkingService:
    @staticmethod
    def get(_id: int) -> Optional[Marking]:
        if _id is None:
            raise MarkingServiceError('id is required')
        if not isinstance(_id, int):
            raise MarkingServiceError('id must be an integer')

        return Marking.query.get(_id)

    @staticmethod
    def add(book: AnswerBook, question: Question, marks: float, remarks: str = None,
            creator: UserAlias = None) -> Marking:
        if book is None:
            raise MarkingServiceError('book is required')
        if question is None:
            raise MarkingServiceError('question is required')
        if marks is None:
            raise MarkingServiceError('marks is required')
        if not isinstance(marks, (int, float)):
            raise MarkingServiceError('marks must be an integer or float')

        if book.task.marking_locked:
            raise MarkingServiceError('task marking locked')

        if creator:
            from .task import TaskService
            ass = TaskService.get_marker_question_assignment(question, creator)
            if ass is None:
                raise MarkingServiceError('no assignment')

        if db.session.query(func.count()) \
                .filter(Marking.book_id == book.id,
                        Marking.question_id == question.id) \
                .scalar():
            raise MarkingServiceError('duplicate marking')

        if marks < 0 or marks > question.marks:
            raise MarkingServiceError('invalid marks')

        marking = Marking(book=book, question=question, marks=marks, remarks=remarks, creator=creator)
        db.session.add(marking)
        return marking

    @staticmethod
    def update(marking: Marking, marks: float, remarks: Optional[str], modifier: UserAlias = None):
        if marking is None:
            raise MarkingServiceError('marking is required')
        if marks is None:
            raise MarkingServiceError('marks is required')
        if not isinstance(marks, (int, float)):
            raise MarkingServiceError('marks must be an integer or float')

        if marking.book.task.marking_locked:
            raise MarkingServiceError('task marking locked')

        if modifier:
            from .task import TaskService
            ass = TaskService.get_marker_question_assignment(marking.question, modifier)
            if ass is None:
                raise MarkingServiceError('no assignment')

        if marks < 0 or marks > marking.question.marks:
            raise MarkingServiceError('invalid marks')

        marking.marks = marks
        marking.remarks = remarks
        marking.modifier = modifier

    @staticmethod
    def get_annotation(_id: int) -> Optional[Annotation]:
        if _id is None:
            raise MarkingServiceError('id is required')
        if not isinstance(_id, int):
            raise MarkingServiceError('id must be an integer')

        return Annotation.query.get(_id)

    @staticmethod
    def add_annotation(page: AnswerPage, data: str, creator: UserAlias = None):
        if page is None:
            raise MarkingServiceError('page is required')
        if not data:
            raise MarkingServiceError('data is required')

        if page.book.task.marking_locked:
            raise MarkingServiceError('task marking locked')

        ann = Annotation(page=page, data=data, creator=creator)
        db.session.add(ann)
        return ann

    @staticmethod
    def update_annotation(ann: Annotation, data: str, modifier: UserAlias = None):
        if ann is None:
            raise MarkingServiceError('annotation is required')
        if not data:
            raise MarkingServiceError('data is required')

        if ann.page.book.task.marking_locked:
            raise MarkingServiceError('task marking locked')

        if modifier and (ann.creator_id is None or ann.creator_id != modifier.id):
            raise MarkingServiceError('no permission')

        ann.data = data

    @staticmethod
    def delete_annotation(ann: Annotation, requester: UserAlias = None):
        if ann is None:
            raise MarkingServiceError('annotation is required')

        if ann.page.book.task.marking_locked:
            raise MarkingServiceError('task marking locked')

        if requester and (ann.creator_id is None or ann.creator_id != requester.id):
            raise MarkingServiceError('no permission')

        db.session.delete(ann)

    @staticmethod
    def get_comment(_id: int) -> Optional[Comment]:
        if _id is None:
            raise MarkingServiceError('id is required')
        if not isinstance(_id, int):
            raise MarkingServiceError('id must be an integer')

        return Comment.query.get(_id)

    @staticmethod
    def add_comment(book: AnswerBook, content: str, creator: UserAlias = None) -> Comment:
        if book is None:
            raise MarkingServiceError('book is required')
        if not content:
            raise MarkingServiceError('content is required')

        if book.task.marking_locked:
            raise MarkingServiceError('task marking locked')

        comment = Comment(book=book, content=content, creator=creator)
        db.session.add(comment)
        return comment

    @staticmethod
    def update_comment(comment: Comment, content: str, modifier: UserAlias = None):
        if comment is None:
            raise MarkingServiceError('comment is required')
        if not content:
            raise MarkingServiceError('content is required')

        if comment.book.task.marking_locked:
            raise MarkingServiceError('task marking locked')

        if modifier and (comment.creator_id is None or comment.creator_id != modifier.id):
            raise MarkingServiceError('no permission')

        comment.content = content

    @staticmethod
    def delete_comment(comment: Comment, requester: UserAlias = None):
        if comment is None:
            raise MarkingServiceError('comment is required')

        if comment.book.task.marking_locked:
            raise MarkingServiceError('task marking locked')

        if requester and (comment.creator_id is None or comment.creator_id != requester.id):
            raise MarkingServiceError('no permission')
        db.session.delete(comment)

    @classmethod
    def import_markings(cls, question: Question, file_path: str):
        if question is None:
            raise MarkingServiceError('question is required')
        if not file_path:
            raise MarkingServiceError('file_path is required')

        task = question.task
        from services.answer import AnswerService
        from services.account import AccountService

        with open(file_path) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                parts = line.split('\t')  # treated as TSV file
                assert (len(parts) == 2)
                user_name, marks = parts
                marks = float(marks)

                # get user
                user = AccountService.get_user_by_name(user_name)
                if user is None:
                    raise MarkingServiceError('user not found: %s' % user_name)

                # get book
                book = AnswerService.get_book_by_task_student(task, user)
                if book is None:
                    logger.warning('book not found for user: %s', user_name)
                    continue

                # add marking
                marking = Marking(book_id=book.id, question_id=question.id, marks=marks)
                db.session.add(marking)
