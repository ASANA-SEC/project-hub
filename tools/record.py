"""Record the Project Hub user-guide videos: real clicks in the local demo, English voice-over, burned-in subtitles.

Run the local server on :8765 first, then:
    py -3 tools/record.py            # all chapters
    py -3 tools/record.py 2          # only chapter 2

Output: ../pm-platform-videos/  (one MP4 per chapter, plus the full guide in one file)
"""
import hashlib
import json
import subprocess
import sys
import time
import wave
from pathlib import Path

from playwright.sync_api import sync_playwright

from hub import LIVE, MANAGER, ROOT, SUPER, go, open_as

OUT = ROOT.parent / 'pm-platform-videos'
WORK = OUT / '_work'
W, H = 1280, 720
GAP = 0.6  # seconds of quiet after each line

# Words the voice should say differently from the subtitle
SAY = {'RFQ': 'R F Q', 'Ctrl + K': 'Control K', 'PDF': 'P D F', 'e.g.': 'for example', 'RM': 'ringgit'}

CURSOR_JS = r"""
(() => {
  const add = () => {
    if (document.getElementById('__cur')) return;
    const c = document.createElement('div');
    c.id = '__cur';
    c.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2l15 11-6.5 1.2L16 21l-3 1.3-3.4-6.6L4 20z" fill="#111" stroke="#fff" stroke-width="1.4"/></svg>';
    Object.assign(c.style, {position:'fixed', left:'640px', top:'360px', zIndex:2147483647, pointerEvents:'none', transform:'translate(-3px,-2px)', transition:'none'});
    document.documentElement.appendChild(c);
    const st = document.createElement('style');
    st.textContent = '.__rip{position:fixed;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:3px solid rgba(29,91,121,.85);pointer-events:none;z-index:2147483646;animation:__r .5s ease-out forwards}@keyframes __r{from{transform:scale(.3);opacity:1}to{transform:scale(1.4);opacity:0}}';
    document.documentElement.appendChild(st);
    const p = window.__curPos || {x: 640, y: 360};
    c.style.left = p.x + 'px'; c.style.top = p.y + 'px';
  };
  document.addEventListener('mousemove', e => { add(); const c = document.getElementById('__cur'); c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; window.__curPos = {x: e.clientX, y: e.clientY}; }, true);
  document.addEventListener('mousedown', e => { const r = document.createElement('div'); r.className = '__rip'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px'; document.documentElement.appendChild(r); setTimeout(() => r.remove(), 600); }, true);
  if (document.readyState !== 'loading') add(); else document.addEventListener('DOMContentLoaded', add);
})();
"""

CARD = """<html><body style="margin:0;height:100vh;display:grid;place-items:center;background:#17232c;font-family:'Segoe UI',sans-serif;color:#fff">
<div style="text-align:center"><div style="display:inline-grid;place-items:center;width:64px;height:64px;border-radius:14px;background:linear-gradient(135deg,#2d7aa0,#16455c);font:600 26px 'Segoe UI'">PH</div>
<div style="margin-top:22px;font-size:20px;letter-spacing:.12em;text-transform:uppercase;color:#9eb6c4">Project Hub user guide · {n}</div>
<div style="margin-top:10px;font-size:46px;font-weight:600">{title}</div>
<div style="margin-top:12px;font-size:20px;color:#b9c6cf">{sub}</div></div></body></html>"""


# ------------------------------------------------------------------ pointer helpers

def move(page, sel, steps=18):
    loc = page.locator(sel).first
    loc.scroll_into_view_if_needed()
    b = loc.bounding_box()
    page.mouse.move(b['x'] + b['width'] / 2, b['y'] + b['height'] / 2, steps=steps)
    page.wait_for_timeout(180)


def click(page, sel):
    move(page, sel)
    page.mouse.down()
    page.wait_for_timeout(70)
    page.mouse.up()
    page.wait_for_timeout(450)


def type_into(page, sel, text, delay=55):
    click(page, sel)
    page.keyboard.type(text, delay=delay)
    page.wait_for_timeout(250)


def choose(page, sel, value):
    move(page, sel)
    page.select_option(sel, value)
    page.wait_for_timeout(400)


def drag(page, src, dst):
    s = page.locator(src).first.bounding_box()
    d = page.locator(dst).first.bounding_box()
    page.mouse.move(s['x'] + s['width'] / 2, s['y'] + 20, steps=15)
    page.mouse.down()
    page.mouse.move(s['x'] + s['width'] / 2 + 10, s['y'] + 30, steps=5)
    page.mouse.move(d['x'] + d['width'] / 2, d['y'] + 80, steps=30)
    page.wait_for_timeout(200)
    page.mouse.up()
    page.wait_for_timeout(600)


def card(page, n, title, sub):
    page.set_content(CARD.format(n=n, title=title, sub=sub))


# ------------------------------------------------------------------ chapters
# Each chapter: (file name, title, subtitle, account, [(line, action or None), ...])

def ch1():
    def start(p): card(p, 'Part 1', 'Getting started', 'Sign in, the dashboard, search, My Work and the calendar')

    def signin(p):
        p.goto(LIVE)
        p.wait_for_selector('#gbtn iframe', timeout=20000)
        p.wait_for_timeout(500)
        move(p, '#gbtn')

    def dash(p):
        open_as(p, MANAGER, '#dashboard')
        move(p, '.scard >> nth=0')
        p.wait_for_timeout(600)
        move(p, '.scard >> nth=1')

    def lists(p):
        p.mouse.wheel(0, 420)
        p.wait_for_timeout(500)
        move(p, '.alerts li >> nth=0')

    def nav(p):
        p.mouse.wheel(0, -800)
        for s in ('#nav a[data-nav=mywork]', '#nav a[data-nav=calendar]', '#nav .nav-h'):
            move(p, s)
            p.wait_for_timeout(250)

    def search(p):
        click(p, '.gs-btn')
        p.wait_for_timeout(300)
        p.keyboard.type('pump', delay=120)
        p.wait_for_timeout(500)

    def enter(p):
        p.keyboard.press('ArrowDown')
        p.wait_for_timeout(500)
        p.keyboard.press('ArrowUp')
        p.wait_for_timeout(500)
        p.keyboard.press('Enter')
        p.wait_for_timeout(1500)
        click(p, '.pane-tools .x')

    def mywork(p):
        click(p, '#nav a[data-nav=mywork]')
        move(p, '.group h2 >> nth=0')

    def cal(p):
        click(p, '#nav a[data-nav=calendar]')
        click(p, '[data-act=cal-view][data-v=month]')
        p.wait_for_timeout(800)
        click(p, '[data-act=cal-view][data-v=week]')
        p.wait_for_timeout(800)
        click(p, '[data-act=cal-view][data-v=agenda]')

    def end(p): card(p, 'Part 1', 'That’s the basics', 'Next: working with items')

    return ('01_Getting_started', MANAGER, [
        ('Welcome to Project Hub. In this video you will sign in, find your way around, and use search, My Work and the calendar.', start),
        ('Open the Project Hub address and click Sign in with Google. Use the Google account your super admin added for you.', signin),
        ('After signing in, you land on the dashboard. Each card is a section shared with you, with its open, late and waiting items.', dash),
        ('Further down, Needs attention lists late and waiting items, most urgent first. My open work lists the items you are named on.', lists),
        ('The menu on the left takes you to My Work, the calendar, and every section shared with you.', nav),
        ('To find anything, click Search or press Ctrl + K, then type a few words, such as a client, an RFQ number or a person.', search),
        ('Use the arrow keys to choose a result and press Enter to open it.', enter),
        ('My Work groups everything you are named on by due date: late first, then today, the next seven days and later.', mywork),
        ('The calendar shows deadlines by month, by week or as an agenda. Items you are named on also appear in your own Google Calendar.', cal),
        ('That is the basics. The next video shows how to work with items.', end),
    ])


def ch2():
    def start(p): card(p, 'Part 2', 'Working with items', 'Add, assign, move, comment, share and full screen')

    def board(p):
        open_as(p, MANAGER, '#dashboard')
        click(p, '#nav a[data-nav="s/s_tasks"]')
        move(p, '.col-h >> nth=0')
        p.wait_for_timeout(300)
        move(p, '.col-h >> nth=1')

    def anatomy(p):
        move(p, 'article.card >> nth=0')
        move(p, 'article.card >> nth=0 >> .chip >> nth=0')
        move(p, 'article.card >> nth=0 >> .avs')

    def new(p):
        click(p, '[data-act=new][data-section=s_tasks]')
        type_into(p, '#itemForm [name=title]', 'Submit as-built drawings')
        choose(p, '#itemForm [name=project]', 'i_p1')
        choose(p, '#itemForm [name=priority]', 'high')
        click(p, '#itemForm [name=dueDate]')
        p.fill('#itemForm [name=dueDate]', '2026-11-06')
        p.wait_for_timeout(300)

    def people(p):
        click(p, '#itemForm details.pick >> nth=0 >> summary')
        click(p, '#itemForm input[name=editors][value="raj@example.com"]')
        click(p, '#itemForm details.pick >> nth=1 >> summary')
        click(p, '#itemForm input[name=collaborators][value="meiling@example.com"]')

    def save(p):
        click(p, '#saveBtn')
        p.wait_for_timeout(700)
        move(p, 'article.card:has-text("Submit as-built drawings")')

    def move_stage(p):
        drag(p, 'article.card:has-text("Submit as-built drawings")', 'section.col[data-drop-stage="doing"]')

    def comment(p):
        click(p, 'article.card:has-text("Submit as-built drawings")')
        p.wait_for_timeout(500)
        type_into(p, '#commentText', 'Drawings from the site team expected on Friday.', delay=35)
        click(p, '[data-act=add-comment]')

    def files(p):
        move(p, '[data-act=upload]')
        p.wait_for_timeout(600)

    def share(p):
        click(p, '[data-act=copy-link]')
        p.wait_for_timeout(900)

    def full(p):
        click(p, '[data-act=full-toggle]')
        p.wait_for_timeout(1500)
        click(p, '[data-act=full-toggle]')
        p.wait_for_timeout(400)
        click(p, '.pane-tools .x')

    def end(p): card(p, 'Part 2', 'You are ready to work', 'Next: filters, sorting and reports')

    return ('02_Working_with_items', MANAGER, [
        ('In this video you will add an item, assign people, move it through stages, comment, share a link and use full screen.', start),
        ('Open a section from the menu. Items move through stages, shown as columns on the board.', board),
        ('Each card shows its deadline, any alerts, and the people working on it.', anatomy),
        ('To add an item, click New item. Type a title, then pick the project, the priority and the due date.', new),
        ('Under Editors, choose who will work on it. Collaborators can follow it and add comments.', people),
        ('Click Add item. It appears on the board right away.', save),
        ('To change its stage, drag the card to another column. The move is saved and recorded.', move_stage),
        ('Click a card to open it. Write an update in Comments and click Post comment.', comment),
        ('Use Attach file to add quotations or drawings. They are stored in the company Google Drive.', files),
        ('Copy link gives you a direct link to share in WhatsApp or email. Only people with access to the item can open it.', share),
        ('Full screen gives the item the whole window. Click it again to go back.', full),
        ('You are ready to work. The next video covers filters, sorting and reports.', end),
    ])


def ch3():
    def start(p): card(p, 'Part 3', 'Filters, sorting and reports', 'Find exactly what you need and export it')

    def table(p):
        open_as(p, SUPER, '#dashboard')
        click(p, '#nav a[data-nav="s/s_rfq"]')
        click(p, '[data-act=view][data-v=table]')
        click(p, '[data-act=sort-col][data-key=estValue]')
        p.wait_for_timeout(600)
        click(p, '[data-act=sort-col][data-key=estValue]')

    def filt(p):
        click(p, '#frBtn')
        choose(p, '[data-fr="0"][data-p=key]', 'stage')
        choose(p, '[data-fr="0"][data-p=value]', 'todo')
        p.wait_for_timeout(500)

    def more(p):
        choose(p, '[data-fr="0"][data-p=value]', '')
        choose(p, '[data-fr="0"][data-p=key]', 'category')
        choose(p, '[data-fr="0"][data-p=value]', 'supply')
        click(p, '[data-act=fr-add]')
        choose(p, '[data-fr="1"][data-p=key]', 'closingDate')
        choose(p, '[data-fr="1"][data-p=op]', 'next7')
        p.wait_for_timeout(600)

    def export(p):
        click(p, '.menu > summary')
        p.wait_for_timeout(500)
        with p.expect_download():
            click(p, '[data-act=export][data-fmt=xlsx]')
        p.wait_for_timeout(800)

    def clear(p):
        click(p, '[data-act=fr-clear]')
        click(p, '[data-act=view][data-v=board]')

    def end(p): card(p, 'Part 3', 'Reports in two clicks', 'Next: tools for section managers')

    return ('03_Filters_and_reports', SUPER, [
        ('In this video you will sort and filter a section and export a report.', start),
        ('Switch to Table to see every column. Click a heading to sort by it, and click again to reverse the order.', table),
        ('Click Filter to narrow the list. Choose a column, a condition and a value, for example Stage is To Do.', filt),
        ('Add more filters to combine conditions. Here, supply RFQs closing in the next seven days.', more),
        ('Section managers can export exactly what is shown, as Excel or PDF, from Export report.', export),
        ('Clear all filters to see everything again. Your filters and sort are remembered for each section.', clear),
        ('Reports in two clicks. The next video shows the tools for section managers.', end),
    ])


def ch4():
    def start(p): card(p, 'Part 4', 'For section managers', 'Columns, team performance, calendars and dashboard reports')

    def customize(p):
        open_as(p, SUPER, '#s/s_projects')
        click(p, 'a.btn[href$="/customize"]')
        p.wait_for_timeout(500)
        move(p, '[data-tf="2"][data-prop=label]')

    def add_col(p):
        click(p, '[data-act=tpl-add]')
        p.keyboard.press('Control+A')
        p.keyboard.type('Site visit date', delay=60)
        last = p.locator('[data-tf][data-prop=type]').last
        last.scroll_into_view_if_needed()
        b = last.bounding_box()
        p.mouse.move(b['x'] + b['width'] / 2, b['y'] + b['height'] / 2, steps=15)
        last.select_option('date')
        p.wait_for_timeout(500)

    def stage(p):
        move(p, '.tf.stage')
        move(p, '.tf.stage [data-prop=alertDays] >> nth=0')
        p.wait_for_timeout(2600)
        click(p, '[data-act=tpl-save] >> nth=0')
        p.wait_for_timeout(600)

    def perf(p):
        click(p, '#nav a[data-nav=performance]')
        move(p, 'table.perf thead')
        choose(p, 'select[data-perf=period]', 'all')
        click(p, '[data-act=perf-sort][data-k=late]')

    def watch(p):
        click(p, 'table.perf tbody tr >> nth=0 >> [data-act=perf-cal]')
        p.wait_for_timeout(600)
        move(p, 'select[data-cal=who]')

    def dash(p):
        click(p, '#nav a[data-nav=dashboard]')
        click(p, '[data-act=dash-export]')
        click(p, '#dashExportForm input[value=mywork]')
        click(p, '#dashExportForm input[value=pdf]')
        with p.expect_download():
            click(p, '#saveBtn')
        p.wait_for_timeout(800)

    def end(p): card(p, 'Part 4', 'Manage with confidence', 'Next: tools for super admins')

    return ('04_For_section_managers', SUPER, [
        ('This video covers the tools for section managers: columns, team performance, calendars and dashboard reports.', start),
        ('Managers can change a section’s columns. Open the section and click Customize columns.', customize),
        ('Rename a column by typing over it, or click Add column and choose its type, here a date.', add_col),
        ('For the stage column, set how many days an item may wait in each stage before it is flagged. Then click Save columns.', stage),
        ('Team performance shows each person’s open, late and completed work, and their on-time rate. Pick a period and sort by any heading.', perf),
        ('Click Calendar to see that person’s deadlines. Managers can view the people in the sections they manage.', watch),
        ('On the dashboard, Export dashboard lets you pick the displays you need and download one Excel or PDF report.', dash),
        ('Manage with confidence. The last video covers the super admin tools.', end),
    ])


def ch5():
    def start(p): card(p, 'Part 5', 'For super admins', 'Users, access levels and sections')

    def grid(p):
        open_as(p, SUPER, '#team')
        move(p, 'table.matrix thead')
        choose(p, 'select[data-access="s_rfq|raj@example.com"]', 'viewer')

    def add(p):
        click(p, '[data-act=user-new]')
        type_into(p, '#userForm [name=email]', 'new.engineer@gmail.com', delay=45)
        type_into(p, '#userForm [name=name]', 'New Engineer', delay=60)

    def access(p):
        choose(p, '#userForm select[name=acc_s_tasks]', 'contributor')
        choose(p, '#userForm select[name=acc_s_projects]', 'viewer')
        click(p, '#saveBtn')
        p.wait_for_timeout(700)

    def sections(p):
        click(p, '#nav a[data-nav=sections]')
        click(p, '[data-act=sec-new]')
        type_into(p, '#sectionForm [name=name]', 'Procurement', delay=70)
        click(p, '#sectionForm input[name=tpl][value=""]')

    def create(p):
        click(p, '#saveBtn')
        p.wait_for_timeout(1200)
        p.mouse.wheel(0, 300)

    def remove(p):
        click(p, '#nav a[data-nav=sections]')
        sel = 'tr:has-text("Procurement") [data-act=sec-archive]'
        click(p, sel)
        click(p, sel)
        p.wait_for_timeout(600)
        move(p, '[data-act=sec-restore]')

    def end(p): card(p, 'Project Hub', 'Thank you for watching', 'Open Help in Project Hub any time for the full user guide')

    return ('05_For_super_admins', SUPER, [
        ('This video covers the super admin tools: users, access levels and sections.', start),
        ('In Users and access, each row is a person and each column a section. Change a level and it saves at once.', grid),
        ('To add someone, click Add user and enter their Google email. The name is optional.', add),
        ('Set their access for each section, then click Add user. They can sign in straight away with that Google account.', access),
        ('In Manage sections, click New section, give it a name, and start from blank or from a template.', sections),
        ('Click Create section, then adjust its columns. Give people access to it under Users and access.', create),
        ('Remove hides a section from everyone. Its data is kept, and Restore brings it back.', remove),
        ('Thank you for watching. Open Help in Project Hub any time for the full user guide.', end),
    ])


CHAPTERS = [ch1, ch2, ch3, ch4, ch5]


# ------------------------------------------------------------------ voice, recording, encoding

def key(text):
    return hashlib.md5(text.encode('utf-8')).hexdigest()[:12]


def speech(text):
    for a, b in SAY.items():
        text = text.replace(a, b)
    return text


def make_voice(lines):
    WORK.mkdir(parents=True, exist_ok=True)
    todo = [{'id': key(t), 'text': speech(t)} for t in lines if not (WORK / f'{key(t)}.wav').exists()]
    if todo:
        (WORK / 'tts.json').write_text(json.dumps(todo), encoding='utf-8')
        subprocess.run(['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', str(ROOT / 'tools' / 'tts.ps1'),
                        '-Json', str(WORK / 'tts.json'), '-OutDir', str(WORK)], check=True)
    dur = {}
    for t in lines:
        with wave.open(str(WORK / f'{key(t)}.wav')) as w:
            dur[t] = w.getnframes() / w.getframerate()
    return dur


def srt_time(s):
    ms = int(round(s * 1000))
    return f'{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02},{ms % 1000:03}'


def subtitle_cues(start, dur, text):
    """Split long lines at sentence or comma boundaries into cues of about two short lines each."""
    parts, cur = [], ''
    for word in text.split():
        if len(cur) + len(word) > 72 and cur:
            parts.append(cur.strip())
            cur = ''
        cur += word + ' '
    parts.append(cur.strip())
    total = sum(len(p) for p in parts)
    t = start
    out = []
    for p in parts:
        d = dur * len(p) / total
        out.append((t, t + d, p))
        t += d
    return out


def record(build, dur):
    name, account, scenes = build()
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel='msedge', headless=True)
        ctx = browser.new_context(viewport={'width': W, 'height': H}, record_video_dir=str(WORK), record_video_size={'width': W, 'height': H},
                                  accept_downloads=True, color_scheme='light')
        ctx.grant_permissions(['clipboard-read', 'clipboard-write'], origin='http://localhost:8765')
        ctx.add_init_script(CURSOR_JS)
        page = ctx.new_page()
        t0 = time.monotonic()
        cues = []
        for text, action in scenes:
            start = time.monotonic() - t0
            cues.append((start, dur[text], text))
            if action:
                action(page)
            rest = start + dur[text] + GAP - (time.monotonic() - t0)
            if rest > 0:
                page.wait_for_timeout(rest * 1000)
        page.wait_for_timeout(800)
        total = time.monotonic() - t0
        video = page.video.path()
        ctx.close()
        browser.close()
    return name, Path(video), cues, total


def encode(name, video, cues, total):
    OUT.mkdir(parents=True, exist_ok=True)
    srt = WORK / f'{name}.srt'
    lines, n = [], 0
    for start, d, text in cues:
        for a, b, part in subtitle_cues(start, d, text):
            n += 1
            lines += [str(n), f'{srt_time(a)} --> {srt_time(b)}', part, '']
    srt.write_text('\n'.join(lines), encoding='utf-8')

    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-i', video.name]
    for start, d, text in cues:
        cmd += ['-i', f'{key(text)}.wav']
    delays = ''.join(f'[{i + 1}:a]adelay={int(c[0] * 1000)}|{int(c[0] * 1000)}[a{i}];' for i, c in enumerate(cues))
    mix = ''.join(f'[a{i}]' for i in range(len(cues))) + f'amix=inputs={len(cues)}:normalize=0,apad[aout]'
    style = "FontName=Segoe UI,FontSize=17,PrimaryColour=&H00FFFFFF,BackColour=&H99000000,BorderStyle=4,Outline=0,Shadow=0,MarginV=26"
    vf = f"[0:v]subtitles={srt.name}:force_style='{style}'[vout]"
    out_file = OUT / f'{name}.mp4'
    cmd += ['-filter_complex', delays + mix + ';' + vf, '-map', '[vout]', '-map', '[aout]', '-t', f'{total:.2f}',
            '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', '25',
            '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', str(out_file)]
    subprocess.run(cmd, check=True, cwd=str(WORK))
    print('video', out_file.name, f'{total:.0f}s', out_file.stat().st_size // 1024, 'KB')
    return out_file


def join_all(files):
    lst = WORK / 'all.txt'
    lst.write_text(''.join(f"file '{f.as_posix()}'\n" for f in files), encoding='utf-8')
    out = OUT / 'Project_Hub_User_Guide_full.mp4'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', str(lst), '-c', 'copy', '-movflags', '+faststart', str(out)], check=True)
    print('video', out.name, out.stat().st_size // 1024, 'KB')


def main():
    pick = [int(a) for a in sys.argv[1:]] or list(range(1, len(CHAPTERS) + 1))
    files = []
    for i in pick:
        build = CHAPTERS[i - 1]
        lines = [t for t, _ in build()[2]]
        dur = make_voice(lines)
        name, video, cues, total = record(build, dur)
        files.append(encode(name, video, cues, total))
        video.unlink(missing_ok=True)
    if len(pick) == len(CHAPTERS):
        join_all(files)


if __name__ == '__main__':
    main()
