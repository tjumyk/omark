import subprocess
from typing import Optional

from error import BasicError


class PDFError(BasicError):
    pass


def get_pdf_pages(file_path: str) -> Optional[int]:
    try:
        for line in subprocess.check_output(["pdfinfo", file_path]).splitlines():
            if line.startswith(b'Pages:'):
                return int(line.split()[-1])
        return None
    except subprocess.CalledProcessError as e:
        raise PDFError('pdfinfo command failed [%d]' % e.returncode) from e
    except ValueError as e:
        raise PDFError('failed to parse pdfinfo output') from e
