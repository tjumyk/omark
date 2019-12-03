import subprocess


def get_pdf_pages(file_path: str):
    for line in subprocess.check_output(["pdfinfo", file_path]).decode().splitlines():
        if line.startswith('Pages:'):
            return int(line.split()[-1])
    return None
