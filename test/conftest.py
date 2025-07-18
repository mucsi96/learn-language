from pathlib import Path
import sys
import requests
from pytest import fixture

sys.path.append(str(Path(__file__).resolve().parent.parent))  # noqa

from utils import cleanup_db, cleanup_storage, populate_db, populate_storage


@fixture(scope="session")
def browser_context_args(browser_context_args):
    return {
        **browser_context_args,
        "ignore_https_errors": True,
        "record_har_path": "test-results/test.har",
    }


# @fixture(autouse=True)
# def configure_timeouts(page):
    # Set longer timeouts for debugging
    # page.set_default_timeout(300000)  # 5 minutes
    # page.set_default_navigation_timeout(300000)  # 5 minutes


@fixture(scope="session")
def browser_type_launch_args(browser_type_launch_args):
    return {
        **browser_type_launch_args,
        # "devtools": True,
        # "headless": False,
    }


@fixture(autouse=True)
def cleanup():
    cleanup_db()
    populate_db()
    cleanup_storage()
    populate_storage()
    try:
        requests.post("http://localhost:3000/reset", timeout=5)
    except requests.RequestException as e:
        print(f"Warning: Could not reset mock OpenAI server: {e}")

    yield
