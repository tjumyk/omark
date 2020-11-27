import os
import shutil
from datetime import datetime
from typing import Iterable

from utils.importer import Importer, ImporterError

_DATETIME_FORMAT = '%Y-%m-%d %H:%M:%S.%f'


class SubmitImporterError(ImporterError):
    pass


class SubmitImporter(Importer):
    def __init__(self, required_file_names: Iterable[str]):
        self.required_file_names = set(required_file_names)

    def import_archive(self, archive_path: str, extract_dir: str):
        if not os.path.exists(extract_dir):
            os.makedirs(extract_dir)
        if os.listdir(extract_dir):
            raise SubmitImporterError('extract dir is not empty')

        try:
            shutil.unpack_archive(archive_path, extract_dir)
        except IOError as e:
            raise SubmitImporterError('failed to unpack archive', str(e)) from e

        root_list = os.listdir(os.path.join(extract_dir))
        submissions_folder = os.path.join(extract_dir, 'submissions')
        if not os.path.exists(submissions_folder):
            raise SubmitImporterError('submissions folder not found')
        if 'teams.json' in root_list:
            # TODO add team task support (non-trivial)
            raise SubmitImporterError('team task is not supported', 'please find "TODO" in source code')

        for student_id in sorted(os.listdir(submissions_folder)):
            submission_info = []
            user_folder = os.path.join(submissions_folder, student_id)
            for timestamp in os.listdir(user_folder):
                submission_time = datetime.strptime(timestamp, _DATETIME_FORMAT)
                files = {}
                submission_folder = os.path.join(user_folder, timestamp)
                for file_name in os.listdir(submission_folder):
                    if file_name not in self.required_file_names:
                        continue
                    files[file_name] = os.path.join(submission_folder, file_name)
                submission_info.append((submission_time, files))
            yield student_id, submission_info
