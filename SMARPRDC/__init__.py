import pymysql
pymysql.install_as_MySQLdb()

# ── Monkey-patch: allow MySQL 5.7 with Django 4.2 ────────────────────────────
# Django 4.2.16+ backported a MySQL 8 version check that rejects 5.7.
# The remote data server runs MySQL 5.7.44 and we only use raw SQL queries
# (no Django migrations on this unmanaged DB), so this check is safe to skip.
import django
from django.utils.version import get_version as _gv

_orig_setup = django.setup

def _patched_setup(*args, **kwargs):
    _orig_setup(*args, **kwargs)
    try:
        from django.db.backends.mysql.base import DatabaseWrapper
        DatabaseWrapper.check_database_version_supported = lambda self: None
    except Exception:
        pass

django.setup = _patched_setup
