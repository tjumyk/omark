from datetime import datetime

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

user_groups_alias = db.Table('user_groups_alias',
                             db.Column('user_id', db.Integer, db.ForeignKey('user_alias.id'), primary_key=True),
                             db.Column('group_id', db.Integer, db.ForeignKey('group_alias.id'), primary_key=True))


class UserAlias(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(16), unique=True, nullable=False)
    email = db.Column(db.String(64), unique=True, nullable=False)
    nickname = db.Column(db.String(16), unique=True)
    avatar = db.Column(db.String(128))

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    modified_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return '<UserAlias %r>' % self.name

    def to_dict(self, with_groups=True, with_group_ids=False, with_advanced_fields=False):
        _dict = dict(id=self.id, name=self.name, email=self.email, nickname=self.nickname, avatar=self.avatar)
        if with_groups:
            _dict['groups'] = [group.to_dict() for group in self.groups]
        if with_group_ids:
            _dict['group_ids'] = [group.id for group in self.groups]

        if with_advanced_fields:
            _dict['created_at'] = self.created_at
            _dict['modified_at'] = self.modified_at

        return _dict


class GroupAlias(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(24), unique=True, nullable=False)
    description = db.Column(db.String(256))

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    modified_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = db.relationship('UserAlias', secondary=user_groups_alias, backref=db.backref('groups', lazy=False))

    def to_dict(self, with_users=False, with_user_ids=False, with_advanced_fields=False):
        _dict = dict(id=self.id, name=self.name, description=self.description)
        if with_users:
            _dict['users'] = [user.to_dict(with_groups=False) for user in self.users]
        if with_user_ids:
            _dict['user_ids'] = [user.id for user in self.users]

        if with_advanced_fields:
            _dict['created_at'] = self.created_at
            _dict['modified_at'] = self.modified_at

        return _dict


class Exam(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(64), unique=True, nullable=False)
    is_locked = db.Column(db.Boolean, nullable=False, default=False)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    modified_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return '<Exam %r>' % self.name

    def to_dict(self, with_questions: bool = False, with_assignments: bool = False) -> dict:
        d = dict(id=self.id, name=self.name, is_locked=self.is_locked,
                 created_at=self.created_at, modified_at=self.modified_at)
        if with_questions:
            d['questions'] = [q.to_dict(with_marker_assignments=with_assignments) for q in self.questions]
        return d


class Question(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    exam_id = db.Column(db.Integer, db.ForeignKey('exam.id'), nullable=False)

    index = db.Column(db.Integer, nullable=False)
    marks = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    modified_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    exam = db.relationship('Exam', backref=db.backref('questions'))

    def __repr__(self):
        return '<Question %r>' % self.id

    def to_dict(self, with_exam: bool = False, with_marker_assignments: bool = False) -> dict:
        d = dict(id=self.id, exam_id=self.exam_id, index=self.index, marks=self.marks, description=self.description,
                 created_at=self.created_at, modified_at=self.modified_at)
        if with_exam:
            d['exam'] = self.exam.to_dict()
        if with_marker_assignments:
            d['marker_assignments'] = [ass.to_dict(with_marker=True) for ass in self.marker_assignments]
        return d


class MarkerQuestionAssignment(db.Model):
    marker_id = db.Column(db.Integer, db.ForeignKey('user_alias.id'), primary_key=True)
    question_id = db.Column(db.Integer, db.ForeignKey('question.id'), primary_key=True)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    modified_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    marker = db.relationship('UserAlias', lazy=False, backref=db.backref('question_assignments'))
    question = db.relationship('Question', lazy=False, backref=db.backref('marker_assignments'))

    def __repr__(self):
        return '<MarkerQuestionAssignment %r->%r>' % (self.marker_id, self.question_id)

    def to_dict(self, with_marker: bool = False, with_question: bool = False) -> dict:
        d = dict(marker_id=self.marker_id, question_id=self.question_id,
                 created_at=self.created_at, modified_at=self.modified_at)
        if with_marker:
            d['marker'] = self.marker.to_dict()
        if with_question:
            d['question'] = self.question.to_dict()
        return d


class AnswerBook(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    exam_id = db.Column(db.Integer, db.ForeignKey('exam.id'), nullable=False)

    student_id = db.Column(db.Integer, db.ForeignKey('user_alias.id'))

    creator_id = db.Column(db.Integer, db.ForeignKey('user_alias.id'))
    modifier_id = db.Column(db.Integer, db.ForeignKey('user_alias.id'))
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    modified_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    exam = db.relationship('Exam', backref=db.backref('answer_books'))
    student = db.relationship('UserAlias', backref=db.backref('answer_books'), foreign_keys='[AnswerBook.student_id]')
    creator = db.relationship('UserAlias', foreign_keys='[AnswerBook.creator_id]')
    modifier = db.relationship('UserAlias', foreign_keys='[AnswerBook.modifier_id]')

    def __repr__(self):
        return '<AnswerBook %r>' % self.id

    def to_dict(self, with_exam: bool = False, with_student: bool = False,
                with_pages: bool = False, with_markings: bool = False,
                with_creator: bool = False, with_modifier: bool = False) -> dict:
        d = dict(id=self.id, exam_id=self.exam_id, student_id=self.student_id,
                 creator_id=self.creator_id, modifier_id=self.modifier_id,
                 created_at=self.created_at, modified_at=self.modified_at)
        if with_exam:
            d['exam'] = self.exam.to_dict()
        if with_student:
            d['student'] = self.student.to_dict() if self.student else None
        if with_pages:
            d['pages'] = [p.to_dict() for p in self.pages]
        if with_markings:
            d['markings'] = [m.to_dict() for m in self.markings]
        if with_creator:
            d['creator'] = self.creator.to_dict() if self.creator else None
        if with_modifier:
            d['modifier'] = self.modifier.to_dict() if self.modifier else None
        return d


class AnswerPage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    book_id = db.Column(db.Integer, db.ForeignKey('answer_book.id'), nullable=False)

    index = db.Column(db.Integer, nullable=False)
    path = db.Column(db.String(128), nullable=False)
    transform = db.Column(db.String(64))

    creator_id = db.Column(db.Integer, db.ForeignKey('user_alias.id'))
    modifier_id = db.Column(db.Integer, db.ForeignKey('user_alias.id'))
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    modified_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    book = db.relationship('AnswerBook', backref=db.backref('pages'))
    creator = db.relationship('UserAlias', foreign_keys='[AnswerPage.creator_id]')
    modifier = db.relationship('UserAlias', foreign_keys='[AnswerPage.modifier_id]')

    def __repr__(self):
        return '<AnswerPage %r>' % self.id

    def to_dict(self, with_book: bool = False, with_annotations: bool = False,
                with_creator: bool = False, with_modifier: bool = False) -> dict:
        d = dict(id=self.id, book_id=self.book_id, index=self.index, transform=self.transform,
                 created_at=self.created_at, modified_at=self.modified_at)
        if with_book:
            d['book'] = self.book.to_dict()
        if with_annotations:
            d['annotations'] = [a.to_dict() for a in self.annotations]
        if with_creator:
            d['creator'] = self.creator.to_dict() if self.creator else None
        if with_modifier:
            d['modifier'] = self.modifier.to_dict() if self.modifier else None
        return d


class Marking(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    book_id = db.Column(db.Integer, db.ForeignKey('answer_book.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('question.id'), nullable=False)

    marks = db.Column(db.Float, nullable=False)
    remarks = db.Column(db.Text)

    creator_id = db.Column(db.Integer, db.ForeignKey('user_alias.id'))
    modifier_id = db.Column(db.Integer, db.ForeignKey('user_alias.id'))
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    modified_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    book = db.relationship('AnswerBook', backref=db.backref('markings'))
    question = db.relationship('Question', backref=db.backref('markings'))
    creator = db.relationship('UserAlias', foreign_keys='[Marking.creator_id]')
    modifier = db.relationship('UserAlias', foreign_keys='[Marking.modifier_id]')

    def __repr__(self):
        return '<Marking %r>' % self.id

    def to_dict(self, with_book: bool = False, with_question: bool = False,
                with_creator: bool = False, with_modifier: bool = False) -> dict:
        d = dict(id=self.id, book_id=self.book_id, question_id=self.question_id,
                 creator_id=self.creator_id, modifier_id=self.modifier_id,
                 created_at=self.created_at, modified_at=self.modified_at)
        if with_book:
            d['book'] = self.book.to_dict()
        if with_question:
            d['question'] = self.question.to_dict()
        if with_creator:
            d['creator'] = self.creator.to_dict() if self.creator else None
        if with_modifier:
            d['modifier'] = self.modifier.to_dict() if self.modifier else None
        return d


class Annotation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    page_id = db.Column(db.Integer, db.ForeignKey('answer_page.id'), nullable=False)

    data = db.Column(db.Text, nullable=False)

    creator_id = db.Column(db.Integer, db.ForeignKey('user_alias.id'))
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    modified_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    page = db.relationship('AnswerPage', backref=db.backref('annotations'))
    creator = db.relationship('UserAlias', foreign_keys='[Annotation.creator_id]')

    def __repr__(self):
        return '<Annotation %r>' % self.id

    def to_dict(self, with_page: bool = False,
                with_creator: bool = False) -> dict:
        d = dict(id=self.id, page_id=self.page_id, data=self.data,
                 creator_id=self.creator_id,
                 created_at=self.created_at, modified_at=self.modified_at)
        if with_page:
            d['page'] = self.page.to_dict()
        if with_creator:
            d['creator'] = self.creator.to_dict()
        return d
