import os
import threading
from supabase import create_client, Client

_local = threading.local()


def get_supabase() -> Client:
    if not hasattr(_local, 'client'):
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set")
        _local.client = create_client(url, key)
    return _local.client
