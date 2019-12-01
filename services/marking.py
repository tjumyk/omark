from typing import Optional

from sqlalchemy import func

from error import BasicError
from models import Marking, AnswerBook, Question, UserAlias, db, Annotation, AnswerPage


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

        if book.exam.is_locked:
            raise MarkingServiceError('exam has been locked')

        if creator:
            from .exam import ExamService
            ass = ExamService.get_marker_question_assignment(question, creator)
            if ass is None:
                raise MarkingServiceError('no assignment')

        if db.session.query(func.count()) \
                .filter(Marking.book_id == book.id,
                        Marking.question_id == question.id) \
                .scalar():
            raise MarkingServiceError('duplicate marking')

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

        if marking.book.exam.is_locked:
            raise MarkingServiceError('exam has been locked')

        if modifier:
            from .exam import ExamService
            ass = ExamService.get_marker_question_assignment(marking.question, modifier)
            if ass is None:
                raise MarkingServiceError('no assignment')

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

        if page.book.exam.is_locked:
            raise MarkingServiceError('exam has been locked')

        ann = Annotation(page=page, data=data, creator=creator)
        db.session.add(ann)
        return ann

    @staticmethod
    def update_annotation(ann: Annotation, data: str, modifier: UserAlias = None):
        if ann is None:
            raise MarkingServiceError('annotation is required')
        if not data:
            raise MarkingServiceError('data is required')

        if ann.page.book.exam.is_locked:
            raise MarkingServiceError('exam has been locked')

        if modifier and (ann.creator_id is None or ann.creator_id != modifier.id):
            raise MarkingServiceError('no permission')

        ann.data = data
        ann.modifier = modifier
