from flask import Blueprint, jsonify, request

from auth_connect.oauth import requires_login
from models import db
from services.account import AccountService, AccountServiceError
from services.marking import MarkingService, MarkingServiceError

marking_api = Blueprint('marking_api', __name__)


@marking_api.route('/<int:mid>', methods=['PUT'])
@requires_login
def do_marking(mid: int):
    try:
        user = AccountService.get_current_user()
        if user is None:
            return jsonify(msg='user info required'), 500

        marking = MarkingService.get(mid)
        if marking is None:
            return jsonify(msg='marking not found'), 404

        params = request.json
        MarkingService.update(marking, params.get('marks'), params.get('remarks'), modifier=user)
        db.session.commit()
        return jsonify(marking.to_dict(with_creator=True, with_modifier=True))
    except (AccountServiceError, MarkingServiceError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400


@marking_api.route('/annotations/<int:aid>', methods=['PUT'])
@requires_login
def do_annotation(aid: int):
    try:
        user = AccountService.get_current_user()
        if user is None:
            return jsonify(msg='user info required'), 500

        ann = MarkingService.get_annotation(aid)
        if ann is None:
            return jsonify(msg='annotation not found'), 404

        params = request.json
        MarkingService.update_annotation(ann, params.get('data'), modifier=user)
        db.session.commit()
        return jsonify(ann.to_dict(with_creator=True))
    except (AccountServiceError, MarkingServiceError) as e:
        return jsonify(msg=e.msg, detail=e.detail), 400