import time
from urllib.parse import urlsplit, urlunsplit
from uuid import uuid4

import oss2

from utils.crypt import md5s


class MirrorConfig:
    def __init__(self,
                 provider,
                 regions,
                 endpoint,
                 bucket_name,
                 access_key_id,
                 access_key_secret,
                 domain,
                 secret,
                 expire,
                 expire_time_unit,
                 randomize):
        self.provider = provider
        self.regions = regions
        self.endpoint = endpoint
        self.bucket_name = bucket_name
        self.access_key_id = access_key_id
        self.access_key_secret = access_key_secret
        self.domain = domain
        self.secret = secret
        self.expire = expire
        self.expire_time_unit = expire_time_unit
        self.randomize = randomize


class MirrorProgressController:
    def __init__(self, callback_fn, callback_min_gap: int = 10):
        self._callback_fn = callback_fn
        self._callback_min_delay = callback_min_gap
        self._last_callback_time = 0

    def progress(self, consumed_bytes, total_bytes):
        now = time.time()
        if now - self._last_callback_time > self._callback_min_delay:
            self._callback_fn(consumed_bytes, total_bytes)
            self._last_callback_time = now


class MirrorProvider:
    def __init__(self, cfg: MirrorConfig):
        self._cfg = cfg

    def put(self, remote_path: str, local_path: str, progress_controller: MirrorProgressController = None):
        raise NotImplementedError()

    def get_url(self, file_path: str) -> str:
        raise NotImplementedError()

    def delete(self, file_path: str):
        raise NotImplementedError()

    def exists(self, file_path: str) -> bool:
        raise NotImplementedError()


class AliyunOSSMirror(MirrorProvider):
    def __init__(self, cfg: MirrorConfig):
        super().__init__(cfg)

    def _get_bucket(self):
        auth = oss2.Auth(self._cfg.access_key_id, self._cfg.access_key_secret)
        return oss2.Bucket(auth, self._cfg.endpoint, self._cfg.bucket_name)

    def put(self, remote_path: str, local_path: str, progress_controller: MirrorProgressController = None):
        if progress_controller:
            progress_callback = progress_controller.progress
        else:
            progress_callback = None
        self._get_bucket().put_object_from_file(remote_path, local_path, progress_callback=progress_callback)

    def get_url(self, file_path: str) -> str:
        url = '%s/%s' % (self._cfg.domain, file_path)
        expire = int(time.time() + self._cfg.expire)
        unit = self._cfg.expire_time_unit
        expire = int(round(expire / unit) * unit)
        return self.a_auth(url, self._cfg.secret, expire, self._cfg.randomize)

    def delete(self, file_path: str):
        self._get_bucket().delete_object(file_path)

    def exists(self, file_path: str) -> bool:
        return self._get_bucket().object_exists(file_path)

    @staticmethod
    def a_auth(uri: str, key: str, exp_time: int, randomize: bool):
        exp_time = str(exp_time)
        scheme, host, path, args, fragment = urlsplit(uri)
        scheme = scheme or "https://"
        path = path or "/"
        if randomize:
            rand = str(uuid4()).replace('-', '')
        else:
            rand = '0'
        uid = "0"  # not used
        payload = '-'.join((path, exp_time, rand, uid, key))
        auth_key = '-'.join((exp_time, rand, uid, md5s(payload)))
        if args:
            args += "&auth_key=%s" % auth_key
        else:
            args = "auth_key=%s" % auth_key
        return urlunsplit((scheme, host, path, args, fragment))


class MirrorTool:
    enabled: bool = False
    _cfg: MirrorConfig = None
    _provider: MirrorProvider = None

    @classmethod
    def init(cls, app_config: dict):
        cfg_dict = app_config.get('FILE_MIRROR')
        if cfg_dict:
            cfg = MirrorConfig(**cfg_dict)
            cls._cfg = cfg
            if cfg.provider == 'aliyun-oss':
                cls._provider = AliyunOSSMirror(cfg)
            else:
                raise ValueError('invalid mirror provider: %s' % cfg.provider)
            cls.enabled = True
        else:
            cls.enabled = False

    @classmethod
    def is_region_supported(cls, region: str):
        return region in cls._cfg.regions

    @classmethod
    def put(cls, remote_path: str, local_path: str, progress_controller: MirrorProgressController = None):
        if not cls.enabled:
            raise RuntimeError('mirror not enabled')
        cls._provider.put(remote_path, local_path, progress_controller)

    @classmethod
    def get_url(cls, file_path: str) -> str:
        if not cls.enabled:
            raise RuntimeError('mirror not enabled')
        return cls._provider.get_url(file_path)

    @classmethod
    def delete(cls, file_path: str):
        if not cls.enabled:
            raise RuntimeError('mirror not enabled')
        cls._provider.delete(file_path)

    @classmethod
    def exists(cls, file_path: str) -> bool:
        if not cls.enabled:
            raise RuntimeError('mirror not enabled')
        return cls._provider.exists(file_path)
