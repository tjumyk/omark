from typing import Optional

from sqlalchemy import func

from error import BasicError
from models import AnswerBook, Task, UserAlias, db, AnswerPage


class AnswerServiceError(BasicError):
    pass


class AnswerService:
    @staticmethod
    def get_book(_id: int) -> Optional[AnswerBook]:
        if _id is None:
            raise AnswerServiceError('id is required')
        if not isinstance(_id, int):
            raise AnswerServiceError('id must be an integer')

        return AnswerBook.query.get(_id)

    @staticmethod
    def go_to_book(from_book: AnswerBook, is_next: bool = True) -> Optional[AnswerBook]:
        if from_book is None:
            raise AnswerServiceError('from book is required')

        if is_next:
            filters = [AnswerBook.id > from_book.id]
            order_by = AnswerBook.id.asc()
        else:
            filters = [AnswerBook.id < from_book.id]
            order_by = AnswerBook.id.desc()
        return db.session.query(AnswerBook).filter(*filters).order_by(order_by).first()

    @staticmethod
    def add_book(task: Task, student: UserAlias = None, creator: UserAlias = None) -> AnswerBook:
        if task is None:
            raise AnswerServiceError('task is required')

        if task.is_locked:
            raise AnswerServiceError('task has been locked')

        if student and db.session.query(func.count()) \
                .filter(AnswerBook.task_id == task.id,
                        AnswerBook.student_id == student.id) \
                .scalar():
            raise AnswerServiceError('duplicate book')

        book = AnswerBook(task=task, creator=creator, student=student)
        db.session.add(book)
        return book

    @staticmethod
    def update_book(book: AnswerBook, student: Optional[UserAlias], modifier: UserAlias = None):
        if book is None:
            raise AnswerServiceError('book is required')
        if modifier is None:
            raise AnswerServiceError('modifier is required')

        if book.task.is_locked:
            raise AnswerServiceError('task has been locked')

        if student and db.session.query(func.count()) \
                .filter(AnswerBook.task_id == book.task_id,
                        AnswerBook.id != book.id,
                        AnswerBook.student_id == student.id)\
                .scalar():
            raise AnswerServiceError('duplicate book')

        book.student = student
        book.modifier = modifier

    @staticmethod
    def get_page(_id: int) -> Optional[AnswerPage]:
        if _id is None:
            raise AnswerServiceError('id is required')
        if not isinstance(_id, int):
            raise AnswerServiceError('id must be an integer')

        return AnswerPage.query.get(_id)

    @staticmethod
    def add_page(book: AnswerBook, file_path: str, file_index: int = None, index: int = None,
                 creator: UserAlias = None) -> AnswerPage:
        if book is None:
            raise AnswerServiceError('book is required')
        if not file_path:
            raise AnswerServiceError('file path is required')

        if book.task.is_locked:
            raise AnswerServiceError('task has been locked')

        if index is None:  # auto increment
            index = db.session.query(func.count()) \
                        .filter(AnswerPage.book_id == book.id) \
                        .scalar() + 1
        else:
            if not isinstance(index, int):
                raise AnswerServiceError('index must be an integer')

        if file_index is not None and not isinstance(file_index, int):
            raise AnswerServiceError('file_index must be an integer')

        page = AnswerPage(book=book, index=index, file_path=file_path, file_index=file_index, creator=creator)
        db.session.add(page)
        return page

    @staticmethod
    def update_page(page: AnswerPage, index: int, transform: Optional[str], modifier: UserAlias = None):
        if page is None:
            raise AnswerServiceError('page is required')
        if index is None:
            raise AnswerServiceError('index is required')
        if not isinstance(index, int):
            raise AnswerServiceError('index must be an integer')

        if page.book.task.is_locked:
            raise AnswerServiceError('task has been locked')

        page.index = index
        page.transform = transform
        page.modifier = modifier
