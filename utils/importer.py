import os
import re
import shutil
import sys
from datetime import datetime
from typing import Iterable

from dateutil import tz

from error import BasicError

_tz_local = tz.tzlocal()
_tz_utc = tz.tzutc()


class ImporterError(BasicError):
    pass


class Importer:
    def import_archive(self, archive_path: str, extract_dir: str):
        raise NotImplementedError()


class GenericImporterError(ImporterError):
    pass


class GenericImporter(Importer):
    PDF_FILE_NAME = 'file.pdf'
    _student_folder_pattern = re.compile(r'^([zZ]\d+).*$')

    def __init__(self, required_file_names: Iterable[str]):
        self.required_file_names = set(required_file_names)

    def import_archive(self, archive_path: str, extract_dir: str):
        if not os.path.exists(extract_dir):
            os.makedirs(extract_dir)
        if os.listdir(extract_dir):
            raise GenericImporterError('extract dir is not empty')

        try:
            shutil.unpack_archive(archive_path, extract_dir)
        except IOError as e:
            raise GenericImporterError('failed to unpack archive', str(e)) from e

        # find the "root" folder, which contains a list of student folders, by locating any default submission file
        root = None
        for dir_path, dir_names, file_names in os.walk(extract_dir):
            if any(name.lower().endswith('.pdf') for name in file_names):
                root, _ = os.path.split(dir_path)
                break
        if root is None:
            raise GenericImporterError('failed to find a submission')
        dir_list = os.listdir(root)

        for name in sorted(dir_list):
            match = self._student_folder_pattern.fullmatch(name)
            if not match:
                continue
            path = os.path.join(root, name)
            if not os.path.isdir(path):  # not a folder
                continue
            student_id = match.group(1).lower()
            yield student_id, self._import_student_folder(student_id, path)

    def _import_student_folder(self, student_id, path):
        now = datetime.utcnow()
        contents = os.listdir(path)
        pdf_files = [name for name in contents if name.lower().endswith('.pdf')]
        if len(pdf_files) != 1:
            if len(pdf_files) > 1:
                raise GenericImporterError('more than 1 pdf files exist in %s\'s submission' % student_id)
            else:  # == 0
                print('[Warning] No pdf found in %s\'s submission' % student_id, file=sys.stderr)
                return [(now, {})]  # return one submission with no files
        pdf_file_path = os.path.join(path, pdf_files[0])
        return [(now, {self.PDF_FILE_NAME: pdf_file_path})]
