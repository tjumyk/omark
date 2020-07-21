from datetime import datetime
from typing import Optional, Set, List

from sqlalchemy import func

from error import BasicError
from models import AnswerBook, Task, UserAlias, db, AnswerPage, Annotation, Marking, Comment


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
    def get_book_by_task_student(task: Task, student: UserAlias) -> Optional[AnswerBook]:
        if task is None:
            raise AnswerServiceError('task is required')
        if student is None:
            raise AnswerServiceError('student is required')

        return db.session.query(AnswerBook) \
            .filter(AnswerBook.task_id == task.id,
                    AnswerBook.student_id == student.id).first()

    @staticmethod
    def go_to_book(from_book: AnswerBook, is_next: bool = True) -> Optional[AnswerBook]:
        if from_book is None:
            raise AnswerServiceError('from book is required')

        filters = [AnswerBook.task_id == from_book.task_id]
        if is_next:
            filters.append(AnswerBook.id > from_book.id)
            order_by = AnswerBook.id.asc()
        else:
            filters.append(AnswerBook.id < from_book.id)
            order_by = AnswerBook.id.desc()
        return db.session.query(AnswerBook).filter(*filters).order_by(order_by).first()

    @staticmethod
    def add_book(task: Task, student: UserAlias = None, creator: UserAlias = None, submitted_at: datetime = None) \
            -> AnswerBook:
        if task is None:
            raise AnswerServiceError('task is required')

        if task.is_locked:
            raise AnswerServiceError('task has been locked')

        if student and db.session.query(func.count()) \
                .filter(AnswerBook.task_id == task.id,
                        AnswerBook.student_id == student.id) \
                .scalar():
            raise AnswerServiceError('duplicate book')

        book = AnswerBook(task=task, creator=creator, student=student, submitted_at=submitted_at)
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
    def add_page(book: AnswerBook, file_path: str, index: int = None, creator: UserAlias = None) -> AnswerPage:
        if book is None:
            raise AnswerServiceError('book is required')
        if not file_path:
            raise AnswerServiceError('file path is required')

        if book.task.is_locked:
            raise AnswerServiceError('task has been locked')

        if index is None:  # auto increment (may break if race condition occurs)
            max_page_index = db.session.query(func.max(AnswerPage.index)).filter(AnswerPage.book_id == book.id).scalar()
            if max_page_index is None:
                index = 1
            else:
                index = max_page_index + 1
        else:
            if not isinstance(index, int):
                raise AnswerServiceError('index must be an integer')

        page = AnswerPage(book=book, index=index, file_path=file_path, creator=creator)
        db.session.add(page)
        return page

    @staticmethod
    def add_multi_pages(book: AnswerBook, file_path: str, num_pages: int, start_index: int = None,
                        creator: UserAlias = None) -> List[AnswerPage]:
        if book is None:
            raise AnswerServiceError('book is required')
        if not file_path:
            raise AnswerServiceError('file path is required')
        if num_pages is None:
            raise AnswerServiceError('num_pages is required')
        if not isinstance(num_pages, int):
            raise AnswerServiceError('num_pages must be an integer')

        if book.task.is_locked:
            raise AnswerServiceError('task has been locked')

        if start_index is None:  # auto increment (may break if race condition occurs)
            max_page_index = db.session.query(func.max(AnswerPage.index)).filter(AnswerPage.book_id == book.id).scalar()
            if max_page_index is None:
                start_index = 1
            else:
                start_index = max_page_index + 1
        else:
            if not isinstance(start_index, int):
                raise AnswerServiceError('start index must be an integer')

        pages = []
        for i in range(num_pages):
            page = AnswerPage(book=book, index=i + start_index, file_path=file_path, file_index=i + 1, creator=creator)
            db.session.add(page)
            pages.append(page)
        return pages

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

        if db.session.query(func.count()) \
                .filter(AnswerPage.book_id == page.book_id,
                        AnswerPage.id != page.id,
                        AnswerPage.index == index) \
                .scalar():
            raise AnswerServiceError('duplicate index')

        page.index = index
        page.transform = transform
        page.modifier = modifier

    @classmethod
    def delete_book(cls, book: AnswerBook) -> Set[str]:
        if book is None:
            raise AnswerServiceError('book is required')

        if book.task.is_locked:
            raise AnswerServiceError('task has been locked')

        # batch deletion of markings
        stmt_delete_markings = Marking.__table__.delete().where(Marking.book_id == book.id)
        db.session.execute(stmt_delete_markings)

        # batch deletion of comments
        stmt_delete_comments = Comment.__table__.delete().where(Comment.book_id == book.id)
        db.session.execute(stmt_delete_comments)

        # keep a copy of file paths of the deleted pages
        # note: use set due to possible duplicate file_paths among pages
        file_paths_to_delete = set()
        for page in book.pages:
            path_to_delete = cls.delete_page(page)
            if path_to_delete:
                file_paths_to_delete.add(path_to_delete)

        # delete the book at last
        db.session.delete(book)

        return file_paths_to_delete

    @staticmethod
    def delete_page(page: AnswerPage) -> Optional[str]:
        if page is None:
            raise AnswerServiceError('page is required')

        if page.book.task.is_locked:
            raise AnswerServiceError('task has been locked')

        # batch deletion of annotations
        stmt_delete_annotations = Annotation.__table__.delete().where(Annotation.page_id == page.id)
        db.session.execute(stmt_delete_annotations)

        # keep a copy of file path to return for deletion only if this file is no longer required
        if db.session.query(func.count()) \
                .filter(AnswerPage.book_id == page.book_id,
                        AnswerPage.file_path == page.file_path,
                        AnswerPage.id != page.id) \
                .scalar():
            file_path_to_delete = None
        else:
            file_path_to_delete = page.file_path

        # delete the page at last
        db.session.delete(page)

        return file_path_to_delete
