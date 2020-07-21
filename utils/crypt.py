import hashlib
from typing import Union


def md5s(content: Union[str, bytes]):
    if isinstance(content, str):
        content = content.encode()
    md5 = hashlib.md5(content)
    return md5.hexdigest()


def md5sum(file_path, block_size=65536):
    md5 = hashlib.md5()
    with open(file_path, 'rb') as f:
        block = f.read(block_size)
        while block:
            md5.update(block)
            block = f.read(block_size)
        return md5.hexdigest()
