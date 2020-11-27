from error import BasicError


class ImporterError(BasicError):
    pass


class Importer:
    def import_archive(self, archive_path: str, extract_dir: str):
        raise NotImplementedError()
