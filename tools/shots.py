"""Take the user-guide screenshots from the local demo (run the local server on :8765 first).

    py -3 tools/shots.py
"""
from playwright.sync_api import sync_playwright

from hub import ROOT, LIVE, SUPER, open_as, go, pick

OUT = ROOT / 'guide' / 'img'
OUT.mkdir(parents=True, exist_ok=True)


def shot(page, name, full=False):
    page.wait_for_timeout(250)
    page.screenshot(path=str(OUT / f'{name}.png'), full_page=full)
    print('saved', name)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        ctx = browser.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=2, color_scheme='light')
        ctx.grant_permissions(['clipboard-read', 'clipboard-write'], origin='http://localhost:8765')
        page = ctx.new_page()

        # Real sign-in page (live site, Google button)
        page.goto(LIVE)
        page.wait_for_selector('#gbtn iframe', timeout=20000)
        page.wait_for_timeout(1200)
        box = page.locator('.signin .box').bounding_box()
        pad = 70
        page.screenshot(path=str(OUT / '01_signin.png'), clip={
            'x': box['x'] - pad * 2, 'y': box['y'] - pad, 'width': box['width'] + pad * 4, 'height': box['height'] + pad * 2})
        print('saved 01_signin')

        open_as(page, SUPER, '#dashboard')
        shot(page, '02_dashboard')

        page.keyboard.press('Control+K')
        page.fill('#gsInput', 'valve')
        page.wait_for_timeout(300)
        shot(page, '03_search')
        page.keyboard.press('Escape')

        go(page, '#s/s_rfq')
        shot(page, '04_board')

        page.click('[data-act=view][data-v=table]')
        shot(page, '05_table')

        page.click('[data-act=fr-toggle]')
        pick(page, '[data-fr="0"][data-p=key]', 'category')
        pick(page, '[data-fr="0"][data-p=value]', 'supply')
        pick(page, 'select[data-sort]', 'estValue')
        page.click('[data-act=sort-dir]')
        shot(page, '06_filter')
        page.click('[data-act=fr-clear]')
        page.click('[data-act=view][data-v=board]')

        page.click('.menu summary')
        shot(page, '07_export_menu')
        page.click('.menu summary')

        page.click('article.card[data-id="i_r7"]')
        page.wait_for_selector('#itemForm')
        shot(page, '08_item')
        page.click('[data-act=copy-link]')
        page.wait_for_timeout(300)
        shot(page, '09_copy_link')
        page.click('[data-act=full-toggle]')
        shot(page, '10_item_full')
        page.click('[data-act=full-toggle]')
        page.click('.pane-tools .x')

        go(page, '#s/s_tasks')
        page.click('[data-act=new][data-section=s_tasks]')
        page.fill('#itemForm [name=title]', 'Submit as-built drawings')
        pick(page, '#itemForm [name=project]', 'i_p1')
        page.fill('#itemForm [name=dueDate]', '2026-11-06')
        page.click('#itemForm details.pick summary >> nth=0')
        page.check('#itemForm input[name=editors][value="ali@example.com"]')
        shot(page, '11_new_item')
        page.click('.pane-tools .x')

        go(page, '#mywork')
        shot(page, '12_mywork')

        go(page, '#calendar')
        pick(page, 'select[data-cal=who]', 'team')
        page.click('[data-act=cal-view][data-v=month]')
        shot(page, '13_calendar')

        go(page, '#s/s_rfq/customize')
        page.locator('.tf.stage').scroll_into_view_if_needed()
        page.evaluate('() => window.scrollBy(0, -120)')
        shot(page, '14_customize')

        go(page, '#performance')
        shot(page, '15_performance')

        go(page, '#dashboard')
        page.click('[data-act=dash-export]')
        shot(page, '16_dash_export')
        page.click('.pane-h .x')

        go(page, '#team')
        shot(page, '17_users_access')
        page.click('[data-act=user-new]')
        page.fill('#userForm [name=email]', 'new.engineer@gmail.com')
        page.fill('#userForm [name=name]', 'New Engineer')
        pick(page, '#userForm select[name=acc_s_rfq]', 'contributor')
        pick(page, '#userForm select[name=acc_s_tasks]', 'editor')
        shot(page, '18_add_user')
        page.click('.pane-h .x')

        go(page, '#sections')
        shot(page, '19_manage_sections')
        page.click('[data-act=sec-new]')
        page.fill('#sectionForm [name=name]', 'Procurement')
        shot(page, '20_new_section')

        browser.close()


if __name__ == '__main__':
    main()
