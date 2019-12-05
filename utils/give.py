import os
import re
import shutil
import sys
from tarfile import TarFile
from typing import Iterable

from error import BasicError


class GiveImporterError(BasicError):
    pass


class GiveImporter:
    def __init__(self, required_file_names: Iterable[str]):
        self.required_file_names = set(required_file_names)

        self._default_submission_name = 'submission.tar'
        self._numbered_submission_name_pattern = re.compile(r'^sub(\d+).tar$')

    def _import_student_folder(self, student_id: str, folder_path: str):
        tars = []
        for file_name in os.listdir(folder_path):
            if file_name.lower().endswith('.tar'):
                if file_name == self._default_submission_name:
                    order = 1000
                else:
                    match = self._numbered_submission_name_pattern.match(file_name)
                    if match:
                        order = int(match.group(1))
                    else:
                        order = -1
                tars.append((file_name, order))
        tars.sort(key=lambda x: x[1], reverse=True)  # sort by order

        extract_dir = os.path.join(folder_path, '_extracted')
        if os.path.exists(extract_dir):
            raise GiveImporterError('extract folder for tar already exists')
        os.mkdir(extract_dir)

        # Extract required files in order of submission tars.
        # If any required file is not found in the current tar or the current tar is corrupted, the next tar will be
        # tried.
        # Once all required files are found, all the remaining tars will be ignored.
        files_to_extract = set(self.required_file_names)
        extracted = {}
        for tar, _ in tars:
            try:
                if tar != self._default_submission_name:
                    print('[Warning] Trying to use non-default submission tar "%s" for %s' % (tar, student_id),
                          file=sys.stderr)
                with TarFile.open(os.path.join(folder_path, tar)) as f_tar:
                    for member in f_tar.getmembers():
                        member_name = member.name
                        if member_name in files_to_extract:
                            f_tar.extract(member, extract_dir, set_attrs=False)
                            files_to_extract.remove(member_name)
                            extracted[member_name] = os.path.join(extract_dir, member_name)
                if files_to_extract:
                    print('[Warning] Submission is incomplete for %s' % student_id, file=sys.stderr)
                else:
                    break  # finish extraction
            except IOError as e:
                print('[Waring] Failed to extract files in tar "%s" for %s: %s' % (tar, student_id, str(e)),
                      file=sys.stderr)
        return extracted

    def import_archive(self, archive_path: str, extract_dir: str):
        if not os.path.exists(extract_dir):
            os.makedirs(extract_dir)
        if os.listdir(extract_dir):
            raise GiveImporterError('extract dir is not empty')

        try:
            shutil.unpack_archive(archive_path, extract_dir)
        except IOError as e:
            raise GiveImporterError('failed to unpack archive', str(e)) from e

        root = extract_dir
        dir_list = os.listdir(root)
        if len(dir_list) == 1:
            child = os.path.join(root, dir_list[0])
            if os.path.isdir(child):  # there is a wrapper folder
                root = child
                dir_list = os.listdir(root)

        for name in sorted(dir_list):
            if name.startswith('.'):
                continue
            path = os.path.join(root, name)
            if not os.path.isdir(path):
                raise GiveImporterError('unexpected file: %s' % path)
            student_id = name
            if student_id[0] != 'z':
                student_id = 'z' + student_id
            yield student_id, self._import_student_folder(student_id, path)


def _test():
    import tempfile

    with tempfile.TemporaryDirectory() as work_dir:
        for result in GiveImporter(['ass1.pdf']).import_archive('/home/kelvin/Documents/all_submissions.zip', work_dir):
            print(result)


if __name__ == '__main__':
    _test()
