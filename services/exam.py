from typing import Optional, List

from sqlalchemy import func

from error import BasicError
from models import Exam, db, Question, UserAlias, MarkerQuestionAssignment


class ExamServiceError(BasicError):
    pass


class ExamService:
    @staticmethod
    def get(_id: int) -> Optional[Exam]:
        if _id is None:
            raise ExamServiceError('id is required')
        if not isinstance(_id, int):
            raise ExamServiceError('id must be an integer')

        return Exam.query.get(_id)

    @staticmethod
    def get_all() -> List[Exam]:
        return Exam.query.all()

    @staticmethod
    def add(name: str) -> Exam:
        if not name:
            raise ExamServiceError('name is required')

        if db.session.query(func.count()).filter(Exam.name == name).scalar():
            raise ExamServiceError('duplicate name')

        exam = Exam(name=name)
        db.session.add(exam)
        return exam

    @staticmethod
    def lock(exam: Exam):
        if exam.is_locked:
            raise ExamServiceError('already locked')
        exam.is_locked = True

    @staticmethod
    def unlock(exam: Exam):
        if not exam.is_locked:
            raise ExamServiceError('not locked')
        exam.is_locked = False

    @staticmethod
    def get_question(_id: int) -> Optional[Question]:
        if _id is None:
            raise ExamServiceError('id is required')
        if not isinstance(_id, int):
            raise ExamServiceError('id must be an integer')

        return Question.query.get(_id)

    @staticmethod
    def add_question(exam: Exam, index: int, marks: float, description: Optional[str]) -> Question:
        if exam is None:
            raise ExamServiceError('exam is required')
        if index is None:
            raise ExamServiceError('index is required')
        if not isinstance(index, int):
            raise ExamServiceError('index must be an integer')
        if marks is None:
            raise ExamServiceError('marks is required')
        if not isinstance(marks, (int, float)):
            raise ExamServiceError('marks must be an integer or float')

        if exam.is_locked:
            raise ExamServiceError('exam has been locked')

        if db.session.query(func.count()) \
                .filter(Question.exam_id == exam.id,
                        Question.index == index) \
                .scalar():
            raise ExamServiceError('duplicate index')

        q = Question(exam=exam, index=index, marks=marks, description=description)
        db.session.add(q)
        return q

    @staticmethod
    def get_marker_question_assignment(question: Question, marker: UserAlias) -> Optional[MarkerQuestionAssignment]:
        if question is None:
            raise ExamServiceError('question is required')
        if marker is None:
            raise ExamServiceError('marker is required')

        return db.session.query(MarkerQuestionAssignment) \
            .filter(MarkerQuestionAssignment.question_id == question.id,
                    MarkerQuestionAssignment.marker_id == marker.id).first()

    @staticmethod
    def add_marker_question_assignment(question: Question, marker: UserAlias) -> MarkerQuestionAssignment:
        if question is None:
            raise ExamServiceError('question is required')
        if marker is None:
            raise ExamServiceError('marker is required')

        if question.exam.is_locked:
            raise ExamServiceError('exam has been locked')

        if db.session.query(func.count()) \
                .filter(MarkerQuestionAssignment.question_id == question.id,
                        MarkerQuestionAssignment.marker_id == marker.id) \
                .scalar():
            raise ExamServiceError('already assigned')
        ass = MarkerQuestionAssignment(question=question, marker=marker)
        return ass
