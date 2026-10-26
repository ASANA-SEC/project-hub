"""Shared helpers for the user-guide tools: open Project Hub in demo mode as an example account."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = 'http://localhost:8765/'
LIVE = 'https://asana-sec.github.io/project-hub/'
SUPER = 'sam.secov@gmail.com'
MANAGER = 'ali@example.com'


def open_as(page, email, hash_='#dashboard', reset=True):
    """Load the local site in demo mode (no demo banner), signed in as an example account, with fresh data and no saved filters."""
    url = f"{BASE}?demo&clean{'&reset' if reset else ''}&as={email}{hash_}"
    page.goto(url)
    page.evaluate("() => { ['projecthub_filters','projecthub_full','projecthub_views','projecthub_rfqView'].forEach(k => localStorage.removeItem(k)); }")
    page.goto(url)
    page.wait_for_selector('#main h1')
    page.wait_for_timeout(300)


def go(page, hash_):
    page.evaluate(f"() => {{ location.hash = '{hash_}'; }}")
    page.wait_for_timeout(350)


def pick(page, selector, value):
    """Set a <select> and fire the change event the app listens for."""
    page.select_option(selector, value)
    page.wait_for_timeout(200)
