"""
mj_routes.py
============
Michael Jackson Content Studio — Flask blueprint for IRS Pilot / Railway.

Routes:
    GET  /mj                      -> Studio HTML page
    POST /mj/api/generate         -> Generate image posts via Claude
    POST /mj/api/generate-video   -> Generate video scripts via Claude
    POST /mj/api/image            -> Generate image via Gemini
    POST /mj/api/schedule-buffer  -> Schedule post to Buffer

Add to server.py:
    from mj_routes import mj_bp
    app.register_blueprint(mj_bp)
"""

import os
import json
import base64
import requests
from datetime import datetime
from flask import Blueprint, request, jsonify, Response

mj_bp = Blueprint('mj', __name__, url_prefix='/mj')

ANTHROPIC_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
GEMINI_KEY    = os.environ.get('GEMINI_API_KEY', '')

# Day-of-week themes
DAY_THEMES = {
    0: {'name': 'Moonwalk Monday',      'focus': 'iconic dance moments, moonwalk origins, dance rehearsals, movement mastery'},
    1: {'name': 'Thriller Tuesday',     'focus': 'Thriller era, zombie aesthetic, horror pop, iconic red jacket, Vincent Price'},
    2: {'name': 'Rare MJ Wednesday',    'focus': 'rare footage, behind-the-scenes, unseen moments, studio sessions, private rehearsals'},
    3: {'name': 'Thriller to HIStory Thursday', 'focus': 'evolution from Thriller through Bad, Dangerous to HIStory, transformation arc'},
    4: {'name': 'Live Performance Friday', 'focus': 'stadium concerts, live energy, crowd reactions, iconic live moments, tour highlights'},
    5: {'name': 'Style and Aura Saturday', 'focus': 'fashion, iconic outfits, military jackets, fedora, single glove, style evolution'},
    6: {'name': 'Emotional Legacy Sunday', 'focus': 'humanitarian work, legacy, emotional performances, This Is It, fan connection, inspiration'},
}

ERA_LIST = ['Jackson 5 Era', 'The Jacksons Era', 'Off The Wall Era', 'Thriller Era', 'Bad Era',
            'Dangerous Era', 'HIStory Era', 'Invincible Era', 'This Is It Era',
            'Humanitarian/Public Appearance Era', 'Behind-the-Scenes/Rehearsal Era',
            'Award Show Era', 'Rare Interview Era']

MOOD_LIST = ['Electrifying', 'Emotional', 'Mysterious', 'Inspirational', 'Nostalgic',
             'Aggressive stage energy', 'Elegant', 'Dreamlike', 'Epic', 'Dark cinematic',
             'Hopeful', 'Triumphant', 'Playful', 'Intense', 'Emotional comeback energy']

CAMERA_LIST = ['Fast whip-pan cuts', 'Handheld concert feel', 'Slow cinematic push-in',
               'VHS retro texture', '35mm film look', 'Flash-frame transitions',
               'Spotlight silhouette shots', 'Crowd POV', 'Wide stadium shots',
               'Close-up emotional expressions', 'Black-and-white contrast edits',
               'Gold spotlight aesthetic', 'Neon stage lighting', 'Rain performance aesthetic']


@mj_bp.route('/', methods=['GET'])
def studio():
    return Response(MJ_STUDIO_HTML, mimetype='text/html')


@mj_bp.route('/api/generate', methods=['POST'])
def generate():
    data     = request.get_json()
    count    = int(data.get('count', 19))
    day_idx  = int(data.get('dayIndex', datetime.now().weekday()))
    override = data.get('themeOverride', '')

    theme = DAY_THEMES[day_idx]
    theme_name  = override if override else theme['name']
    theme_focus = theme['focus']

    system_prompt = (
        'You are the creative director for a viral Michael Jackson tribute Facebook and Instagram page. '
        'Your content is cinematic, emotionally powerful, historically accurate, and visually addictive. '
        'You deeply understand every era of Michael Jackson\'s career and life. '
        'Apply strict anti-repetition logic — vary eras, moods, camera styles, and storytelling angles across every post. '
        'Respond ONLY with valid JSON. No markdown. No code fences. No preamble.'
    )

    user_prompt = f"""Generate exactly {count} unique Michael Jackson social media image posts for today's theme: "{theme_name}"
Theme focus: {theme_focus}

Apply rotating combinations from these systems for each post:
Eras: {', '.join(ERA_LIST)}
Moods: {', '.join(MOOD_LIST)}
Camera styles: {', '.join(CAMERA_LIST)}

For each post generate 3 sections:

SECTION 1 - "imagePrompt": Detailed cinematic image description. Semi-realistic cinematic stylization, strong silhouettes, dramatic lighting, premium textures, atmospheric depth. Include era-accurate wardrobe, hairstyles, staging. Enhance cinematically with high contrast, spotlight lighting, fog, smoke, rain, embers, dust, VHS textures, 35mm aesthetics, neon stage lighting, gold spotlights. Specify the era, mood, and camera style used.

SECTION 2 - "caption": A scroll-stopping hook on line 1. Then 3-4 short punchy lines building emotional tension. Then a payoff line with 2-3 emojis. Then a closing line that honors MJ's legacy. Then a CTA driving comments or shares. Then 5-6 relevant hashtags. All combined in one block.

SECTION 3 - "firstComment": An engaging first comment that adds context, a lesser-known fact, or deepens the emotional connection. 2-3 sentences. No hashtags.

Make every post emotionally distinct — vary the era, mood, energy, and storytelling angle. Apply strict anti-repetition across all {count} posts.

JSON: {{"posts":[{{"imagePrompt":"...","caption":"...","firstComment":"..."}}]}}"""

    try:
        resp = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers={'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01'},
            json={
                'model': 'claude-sonnet-4-20250514',
                'max_tokens': 8000,
                'system': system_prompt,
                'messages': [{'role': 'user', 'content': user_prompt}]
            },
            timeout=120
        )
        result = resp.json()
        raw = result['content'][0]['text'].strip().replace('```json', '').replace('```', '').strip()
        posts = json.loads(raw)
        return jsonify({'ok': True, 'posts': posts['posts'], 'themeName': theme_name})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


@mj_bp.route('/api/generate-video', methods=['POST'])
def generate_video():
    data       = request.get_json()
    video_type = data.get('videoType', 'short')  # 'short' or 'long'
    count      = int(data.get('count', 3))
    day_idx    = int(data.get('dayIndex', datetime.now().weekday()))
    override   = data.get('themeOverride', '')

    theme = DAY_THEMES[day_idx]
    theme_name  = override if override else theme['name']
    theme_focus = theme['focus']

    if video_type == 'short':
        duration_rules = """SHORT-FORM VIDEO (12 seconds) RULES:
- 2-4 scene changes maximum
- One dominant visual concept
- Visual-first storytelling
- Constant movement in every shot
- Loopable ending shot
- Emotional or hype-driven pacing
- Seedance 1.5 Pro / Hypernatural optimized
- Extremely short CTA
- Hook must land within first 1-2 seconds"""
        script_note = "Concise 12-second Hypernatural-compatible cinematic narration. Fast-paced, visually intense."
    else:
        duration_rules = """LONG-FORM VIDEO (70-90 seconds) RULES:
- Emotional or shocking opening hook
- Momentum increase every 10-15 seconds
- Include at least one emotional shift
- Include one lesser-known detail or insight
- Alternate hype and emotional pacing
- Strong engagement CTA ending
- Optimized for Hypernatural"""
        script_note = "Full 70-90 second Hypernatural-compatible cinematic narration with emotional arc."

    system_prompt = (
        'You are the creative director for a viral Michael Jackson tribute page. '
        'Generate cinematic, emotionally powerful video scripts optimized for AI video generation tools. '
        'Apply strict anti-repetition logic across all scripts — vary eras, moods, visual approaches. '
        'Respond ONLY with valid JSON. No markdown. No code fences. No preamble.'
    )

    user_prompt = f"""Generate exactly {count} unique Michael Jackson {video_type}-form video scripts for today's theme: "{theme_name}"
Theme focus: {theme_focus}

{duration_rules}

For each video generate 3 sections:

SECTION 1 - "videoScript": {script_note} Full cinematic narrative only — no scene descriptions or production notes. Pure Hypernatural-compatible narration text. Include era, mood, camera style naturally woven into the narrative.

SECTION 2 - "captionAndHashtags": A powerful hook line. Then 2-3 lines of emotional context. Then a strong CTA. Then 5-6 hashtags. All combined.

SECTION 3 - "firstComment": Engaging first comment adding a lesser-known MJ fact or emotional context relevant to this video. 2-3 sentences.

Also generate for each:
- "imagePrompt": A cinematic still image prompt for this video's key scene. For use in OpenArt to create the hero image. Semi-realistic, era-accurate, dramatically lit.
- "era": Which MJ era this covers
- "mood": The emotional mood
- "videoType": "{video_type}"

Apply strict anti-repetition — each of the {count} scripts must cover different eras, moods, and visual approaches.

JSON: {{"videos":[{{"videoScript":"...","captionAndHashtags":"...","firstComment":"...","imagePrompt":"...","era":"...","mood":"..."}}]}}"""

    try:
        resp = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers={'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01'},
            json={
                'model': 'claude-sonnet-4-20250514',
                'max_tokens': 8000,
                'system': system_prompt,
                'messages': [{'role': 'user', 'content': user_prompt}]
            },
            timeout=120
        )
        result = resp.json()
        raw = result['content'][0]['text'].strip().replace('```json', '').replace('```', '').strip()
        videos = json.loads(raw)
        return jsonify({'ok': True, 'videos': videos['videos'], 'themeName': theme_name, 'videoType': video_type})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


@mj_bp.route('/api/image', methods=['POST'])
def generate_image():
    data   = request.get_json()
    prompt = data.get('prompt', '')
    key    = data.get('geminiKey') or GEMINI_KEY

    if not key:
        return jsonify({'ok': False, 'error': 'No Gemini API key configured'}), 400

    models = ['gemini-2.5-flash-image', 'gemini-2.0-flash-preview-image-generation']
    last_error = ''
    for model in models:
        try:
            url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}'
            body = {
                'contents': [{'parts': [{'text': prompt}], 'role': 'user'}],
                'generationConfig': {'responseModalities': ['TEXT', 'IMAGE']}
            }
            r = requests.post(url, json=body, timeout=60)
            d = r.json()
            if 'error' in d:
                last_error = f"{model}: {d['error']['message']}"
                continue
            parts = d.get('candidates', [{}])[0].get('content', {}).get('parts', [])
            img_part = next((p for p in parts if 'inlineData' in p), None)
            if not img_part:
                last_error = f'{model}: No image in response'
                continue
            mime = img_part['inlineData']['mimeType']
            b64  = img_part['inlineData']['data']
            return jsonify({'ok': True, 'dataUrl': f'data:{mime};base64,{b64}', 'model': model})
        except Exception as e:
            last_error = f'{model}: {str(e)}'
            continue

    return jsonify({'ok': False, 'error': last_error}), 500


@mj_bp.route('/api/schedule-buffer', methods=['POST'])
def schedule_buffer():
    data         = request.get_json()
    buffer_token = data.get('bufferToken', '')
    profile_ids  = data.get('profileIds', [])  # list of Buffer profile IDs
    caption      = data.get('caption', '')
    image_b64    = data.get('imageB64', '')
    sched_time   = int(data.get('scheduledTime', 0))
    first_comment = data.get('firstComment', '')

    if not buffer_token or not profile_ids or not caption:
        return jsonify({'ok': False, 'error': 'Missing required fields'}), 400

    try:
        # If image provided, upload to Buffer first
        media_id = None
        if image_b64:
            header, encoded = image_b64.split(',', 1)
            img_bytes = base64.b64decode(encoded)

            upload_resp = requests.post(
                'https://api.bufferapp.com/1/media/upload.json',
                headers={'Authorization': f'Bearer {buffer_token}'},
                files={'file': ('image.jpg', img_bytes, 'image/jpeg')},
                timeout=30
            )
            upload_data = upload_resp.json()
            if upload_data.get('id'):
                media_id = upload_data['id']

        # Schedule to each profile
        results = []
        for profile_id in profile_ids:
            payload = {
                'text': caption,
                'profile_ids[]': profile_id,
                'scheduled_at': sched_time,
            }
            if media_id:
                payload['media[id]'] = media_id

            post_resp = requests.post(
                'https://api.bufferapp.com/1/updates/create.json',
                headers={'Authorization': f'Bearer {buffer_token}'},
                data=payload,
                timeout=30
            )
            post_data = post_resp.json()
            if post_data.get('success'):
                results.append({'profileId': profile_id, 'updateId': post_data.get('updates', [{}])[0].get('id', '')})
            else:
                results.append({'profileId': profile_id, 'error': str(post_data)})

        return jsonify({'ok': True, 'results': results})

    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


MJ_STUDIO_HTML = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MJ Content Studio</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
:root{--gold:#C9A84C;--gold-light:#E8C97A;--gold-dim:#9A7A35;--black:#0D0D0D;--dark:#111;--dark2:#181818;--dark3:#222;--border:rgba(201,168,76,0.18);--text:#F0EAD6;--muted:#7A7060;--hint:#4A4438;--red:#8B2020;}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:"DM Sans",sans-serif;background:var(--black);color:var(--text);min-height:100vh;font-size:14px;}
header{background:var(--dark);border-bottom:1px solid var(--border);padding:0 28px;height:58px;display:flex;align-items:center;gap:14px;position:sticky;top:0;z-index:100;}
.logo{font-family:"Bebas Neue",sans-serif;font-size:22px;letter-spacing:.1em;color:var(--gold);line-height:1;}
.logo span{color:var(--muted);font-size:10px;font-family:"DM Sans",sans-serif;font-weight:400;letter-spacing:.15em;text-transform:uppercase;display:block;margin-top:1px;}
.day-badge{background:rgba(201,168,76,.15);color:var(--gold);font-size:11px;font-weight:700;padding:4px 12px;border-radius:3px;letter-spacing:.06em;}
.hdr-actions{margin-left:auto;display:flex;gap:8px;align-items:center;}
.layout{display:grid;grid-template-columns:220px 1fr;min-height:calc(100vh - 58px);}
.sidebar{background:var(--dark);border-right:1px solid var(--border);padding:16px 12px;overflow-y:auto;}
.s-title{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--hint);margin-bottom:10px;padding-bottom:7px;border-bottom:1px solid var(--dark3);}
.s-section{margin-bottom:20px;}
.s-label{font-size:11px;color:var(--muted);margin-bottom:5px;display:block;}
.s-field{margin-bottom:11px;}
.s-field select,.s-field input[type=text],.s-field input[type=password]{width:100%;background:var(--dark3);border:1px solid var(--dark3);border-radius:5px;padding:7px 9px;font-family:"DM Sans",sans-serif;font-size:12px;color:var(--text);outline:none;transition:border-color .2s;}
.s-field select:focus,.s-field input:focus{border-color:var(--gold-dim);}
.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;}
.stat-box{background:var(--dark3);border-radius:5px;padding:8px;text-align:center;}
.stat-num{font-family:"Bebas Neue",sans-serif;font-size:26px;color:var(--gold);letter-spacing:.04em;line-height:1;}
.stat-lbl{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--hint);margin-top:2px;}
.main{display:flex;flex-direction:column;}
.tabs{display:flex;border-bottom:1px solid var(--dark3);padding:0 20px;}
.tab{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:10px 14px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .15s;}
.tab.on{color:var(--gold);border-bottom-color:var(--gold);}
.pane{display:none;padding:20px;overflow-y:auto;flex:1;}
.pane.on{display:block;}
.theme-box{background:var(--dark2);border:1px solid var(--border);border-radius:10px;padding:18px;margin-bottom:14px;}
.theme-box .day-info{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
.theme-box .day-name{font-family:"Bebas Neue",sans-serif;font-size:20px;letter-spacing:.06em;color:var(--gold);}
.theme-box .day-focus{font-size:11px;color:var(--muted);line-height:1.5;margin-top:2px;}
.override-row{display:flex;gap:10px;}
.override-row input{flex:1;background:var(--dark3);border:1px solid var(--dark3);border-radius:5px;padding:9px 12px;font-family:"DM Sans",sans-serif;font-size:13px;color:var(--text);outline:none;}
.override-row input:focus{border-color:var(--gold-dim);}
.btn-row{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:9px 18px;border-radius:5px;font-family:"DM Sans",sans-serif;font-size:12px;font-weight:600;cursor:pointer;border:none;transition:all .2s;letter-spacing:.03em;}
.btn-gold{background:linear-gradient(135deg,var(--gold-dim),var(--gold-light));color:var(--black);}
.btn-gold:hover{filter:brightness(1.08);transform:translateY(-1px);}
.btn-dark{background:var(--dark3);color:var(--muted);border:1px solid var(--dark3);}
.btn-dark:hover{border-color:var(--border);color:var(--text);}
.btn-ghost{background:transparent;color:var(--muted);border:1px solid var(--dark3);}
.btn-ghost:hover{border-color:var(--border);color:var(--gold);}
.btn:disabled{opacity:.4;cursor:not-allowed;transform:none!important;}
.prog-wrap{margin-top:14px;}
.prog-track{height:3px;background:var(--dark3);border-radius:99px;overflow:hidden;}
.prog-fill{height:100%;background:linear-gradient(90deg,var(--gold-dim),var(--gold-light));border-radius:99px;width:0%;transition:width .4s;}
.prog-label{font-size:11px;color:var(--hint);text-align:center;margin-top:6px;}
.batch-bar{display:none;align-items:center;gap:8px;padding:10px 14px;background:var(--dark2);border:1px solid var(--border);border-radius:8px;margin-bottom:14px;flex-wrap:wrap;}
.batch-bar.show{display:flex;}
.batch-msg{font-size:11px;color:var(--gold);flex:1;font-weight:600;}

/* Content cards */
.content-list{display:flex;flex-direction:column;gap:12px;}
.content-card{background:var(--dark2);border:1px solid var(--dark3);border-radius:10px;overflow:hidden;transition:border-color .2s;}
.content-card:hover{border-color:var(--border);}
.card-head{display:flex;align-items:center;gap:10px;padding:9px 14px;background:var(--dark3);border-bottom:1px solid var(--dark3);}
.card-num{font-family:"Bebas Neue",sans-serif;font-size:16px;color:var(--gold);min-width:28px;}
.card-meta{font-size:11px;color:var(--muted);flex:1;}
.card-era{font-size:10px;color:var(--gold-dim);background:rgba(201,168,76,.08);padding:2px 8px;border-radius:3px;font-weight:600;}
.card-time{font-size:11px;color:var(--hint);background:var(--dark2);padding:2px 9px;border-radius:3px;font-weight:600;}
.card-type{font-size:10px;font-weight:700;padding:2px 8px;border-radius:3px;letter-spacing:.04em;}
.type-image{background:rgba(99,153,34,.1);color:#639922;}
.type-short{background:rgba(74,128,184,.1);color:#7AAAD4;}
.type-long{background:rgba(170,100,34,.1);color:#D4AA7A;}

/* Three sections layout */
.sections-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;}
.section-block{padding:12px 14px;border-right:1px solid var(--dark3);}
.section-block:last-child{border-right:none;}
.section-block.full-width{grid-column:1/-1;border-right:none;border-top:1px solid var(--dark3);}
.section-label{font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--hint);margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;}
.section-text{font-size:12px;line-height:1.7;color:var(--text);white-space:pre-wrap;}
.section-text.prompt{font-style:italic;color:var(--muted);border-left:2px solid var(--gold-dim);padding-left:8px;}
.section-text.script{color:var(--text);}

/* Image column */
.card-img-col{padding:12px;display:flex;flex-direction:column;gap:6px;align-items:center;background:var(--dark3);border-left:1px solid var(--dark3);}
.drop-zone{width:130px;height:130px;border-radius:6px;border:1.5px dashed var(--dark3);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;cursor:pointer;transition:all .2s;background:var(--dark2);}
.drop-zone:hover,.drop-zone.over{border-color:var(--gold-dim);background:rgba(201,168,76,.04);}
.drop-zone .dz-icon{font-size:22px;color:var(--hint);}
.drop-zone span{font-size:10px;color:var(--hint);text-align:center;line-height:1.4;}
.img-generating{width:130px;height:130px;border-radius:6px;border:1px solid var(--dark3);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:var(--dark2);font-size:10px;color:var(--hint);text-align:center;}
.img-preview{width:130px;height:130px;object-fit:cover;border-radius:6px;cursor:pointer;}
.spinner{width:20px;height:20px;border:2px solid var(--dark3);border-top-color:var(--gold);border-radius:50%;animation:spin .7s linear infinite;}
@keyframes spin{to{transform:rotate(360deg)}}

.card-foot{display:flex;align-items:center;gap:6px;padding:8px 14px;border-top:1px solid var(--dark3);background:var(--dark3);flex-wrap:wrap;}
.s-dot{width:6px;height:6px;border-radius:50%;background:var(--dark3);flex-shrink:0;}
.dot-r{background:#639922;}.dot-p{background:var(--gold-dim);animation:pulse 1.2s infinite;}.dot-s{background:#1D9E75;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.s-txt{font-size:11px;color:var(--muted);flex:1;}
.mbtn{font-size:11px;padding:3px 8px;color:var(--muted);border:1px solid var(--dark3);background:var(--dark2);border-radius:4px;cursor:pointer;font-family:"DM Sans",sans-serif;transition:all .15s;font-weight:500;}
.mbtn:hover{border-color:var(--gold-dim);color:var(--gold);}
.mbtn:disabled{opacity:.35;cursor:not-allowed;}
.mbtn-gold{border-color:var(--gold-dim)!important;color:var(--gold)!important;}

/* Schedule */
.sched-table{border:1px solid var(--dark3);border-radius:8px;overflow:hidden;}
.sched-head{display:grid;grid-template-columns:40px 60px 1fr 120px 100px;gap:8px;padding:8px 12px;background:var(--dark3);font-size:10px;color:var(--hint);text-transform:uppercase;letter-spacing:.1em;border-bottom:1px solid var(--dark3);}
.sched-row{display:grid;grid-template-columns:40px 60px 1fr 120px 100px;gap:8px;padding:9px 12px;font-size:12px;border-bottom:1px solid var(--dark3);background:var(--dark2);align-items:center;}
.sched-row:last-child{border-bottom:none;}
.s-num{font-family:"Bebas Neue",sans-serif;font-size:16px;color:var(--gold);}
.pill{font-size:10px;font-weight:700;padding:2px 8px;border-radius:3px;letter-spacing:.04em;}
.pill-p{background:rgba(201,168,76,.1);color:var(--gold-dim);}
.pill-r{background:rgba(99,153,34,.12);color:#639922;}
.pill-s{background:rgba(29,158,117,.12);color:#1D9E75;}

/* Buffer setup */
.setup-sec{background:var(--dark2);border:1px solid var(--dark3);border-radius:8px;padding:18px;margin-bottom:12px;}
.setup-sec h3{font-size:15px;font-weight:500;color:var(--text);margin-bottom:6px;}
.setup-sec p{font-size:12px;color:var(--muted);line-height:1.65;margin-bottom:14px;}
.step-list{list-style:none;counter-reset:s;display:flex;flex-direction:column;gap:9px;margin-bottom:14px;}
.step-list li{counter-increment:s;display:flex;gap:10px;align-items:flex-start;font-size:12px;color:var(--text);line-height:1.55;}
.step-list li::before{content:counter(s);min-width:19px;height:19px;background:rgba(201,168,76,.15);color:var(--gold);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;margin-top:1px;}
.alert{padding:10px 13px;border-radius:0 5px 5px 0;font-size:12px;line-height:1.6;margin-bottom:12px;border-left:2px solid;}
.alert-gold{background:rgba(201,168,76,.07);color:var(--gold);border-color:var(--gold-dim);}
.alert-ok{background:rgba(29,158,117,.07);color:#1D9E75;border-color:#1D9E75;}
.alert-err{background:rgba(170,61,61,.08);color:#D48A8A;border-color:#AA3D3D;}
.alert-info{background:rgba(74,128,184,.08);color:#7AAAD4;border-color:#4A80B8;}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;}
code{background:var(--dark3);padding:1px 6px;border-radius:3px;font-size:11px;color:var(--gold);font-family:monospace;}

.empty{text-align:center;padding:60px 20px;color:var(--hint);}
.empty-icon{font-size:44px;margin-bottom:14px;display:block;}
.empty h3{font-family:"Bebas Neue",sans-serif;font-size:24px;letter-spacing:.08em;color:var(--muted);margin-bottom:8px;}
.empty p{font-size:13px;line-height:1.7;max-width:320px;margin:0 auto;}

.toast{position:fixed;bottom:20px;right:20px;background:var(--dark2);color:var(--gold-light);border:1px solid var(--border);padding:11px 18px;border-radius:6px;font-size:12px;font-weight:500;box-shadow:0 8px 32px rgba(0,0,0,.4);transform:translateY(80px);opacity:0;transition:all .3s;z-index:9999;max-width:300px;}
.toast.show{transform:translateY(0);opacity:1;}

/* Section tabs inside card */
.sec-tabs{display:flex;border-bottom:1px solid var(--dark3);padding:0 14px;background:var(--dark2);}
.sec-tab{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--hint);padding:7px 10px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .15s;}
.sec-tab.on{color:var(--gold);border-bottom-color:var(--gold);}
.sec-pane{display:none;padding:12px 14px;}
.sec-pane.on{display:block;}
</style>
</head>
<body>

<header>
  <div class="logo">MJ Content Studio<span>Michael Jackson Tribute Page</span></div>
  <div class="day-badge" id="day-badge">Loading...</div>
  <div class="hdr-actions">
    <button class="btn btn-ghost" style="font-size:11px;padding:5px 12px;" onclick="showSettings()">&#9881; Settings</button>
    <a href="/tdm" class="btn btn-ghost" style="font-size:11px;padding:5px 12px;">Switch to TDM</a>
  </div>
</header>

<!-- SETTINGS MODAL -->
<div id="settings-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:500;align-items:center;justify-content:center;">
  <div style="background:var(--dark2);border:1px solid var(--border);border-radius:12px;padding:32px;width:460px;max-width:90vw;">
    <h2 style="font-family:Bebas Neue,sans-serif;font-size:22px;letter-spacing:.08em;color:var(--gold);margin-bottom:20px;">Studio Settings</h2>
    <div class="s-field"><label class="s-label">Buffer Access Token</label><input type="password" id="set-buffer" placeholder="Paste your Buffer access token..." /></div>
    <div class="s-field"><label class="s-label">Buffer Profile IDs <span style="color:var(--hint)">(comma-separated FB and IG profile IDs)</span></label><input type="text" id="set-profiles" placeholder="e.g. 5eb4c93c5e03..." /></div>
    <div class="s-field"><label class="s-label">Gemini API Key <span style="color:var(--hint)">(optional — for image generation)</span></label><input type="password" id="set-gemini" placeholder="AIza..." /></div>
    <div style="display:flex;gap:10px;margin-top:18px;">
      <button class="btn btn-gold" onclick="saveSettings()" style="flex:1;">Save Settings</button>
      <button class="btn btn-ghost" onclick="hideSettings()">Cancel</button>
    </div>
  </div>
</div>

<div class="layout">
  <div class="sidebar">
    <div class="s-section">
      <div class="s-title">Session Stats</div>
      <div class="stat-grid">
        <div class="stat-box"><div class="stat-num" id="s-images">0</div><div class="stat-lbl">Images</div></div>
        <div class="stat-box"><div class="stat-num" id="s-videos">0</div><div class="stat-lbl">Videos</div></div>
        <div class="stat-box"><div class="stat-num" id="s-ready">0</div><div class="stat-lbl">Ready</div></div>
        <div class="stat-box"><div class="stat-num" id="s-sched">0</div><div class="stat-lbl">Scheduled</div></div>
      </div>
    </div>
    <div class="s-section">
      <div class="s-title">Post Settings</div>
      <div class="s-field"><label class="s-label">Image posts per day</label>
        <select id="post-count"><option value="19" selected>19 Daily</option><option value="5">5 Test</option><option value="10">10 Half</option></select>
      </div>
      <div class="s-field"><label class="s-label">First post time</label><input type="text" id="start-time" value="8:00 AM" /></div>
      <div class="s-field"><label class="s-label">Interval (minutes)</label><input type="text" id="interval" value="45" /></div>
      <div class="s-field"><label class="s-label">Day override</label>
        <select id="day-override">
          <option value="-1" selected>Auto (today)</option>
          <option value="0">Monday</option>
          <option value="1">Tuesday</option>
          <option value="2">Wednesday</option>
          <option value="3">Thursday</option>
          <option value="4">Friday</option>
          <option value="5">Saturday</option>
          <option value="6">Sunday</option>
        </select>
      </div>
    </div>
  </div>

  <div class="main">
    <div class="tabs">
      <div class="tab on" onclick="switchTab('images',this)">Image Posts</div>
      <div class="tab" onclick="switchTab('shorts',this)">Short Videos (12s)</div>
      <div class="tab" onclick="switchTab('longs',this)">Long Videos (70-90s)</div>
      <div class="tab" onclick="switchTab('schedule',this)">Schedule</div>
      <div class="tab" onclick="switchTab('buffer',this)">Buffer Setup</div>
    </div>

    <!-- IMAGE POSTS -->
    <div class="pane on" id="pane-images">
      <div class="theme-box">
        <div class="day-info">
          <div>
            <div class="day-name" id="theme-name-display">Loading theme...</div>
            <div class="day-focus" id="theme-focus-display"></div>
          </div>
        </div>
        <div class="override-row">
          <input type="text" id="theme-override" placeholder="Override theme (optional)..." />
        </div>
        <div class="btn-row">
          <button class="btn btn-gold" id="gen-img-btn" onclick="generateImages()">Generate 19 Image Posts</button>
          <button class="btn btn-dark" onclick="clearImages()">Clear</button>
        </div>
        <div id="img-prog-wrap" style="display:none;" class="prog-wrap">
          <div class="prog-track"><div class="prog-fill" id="img-prog-fill"></div></div>
          <div class="prog-label" id="img-prog-label">Generating image posts...</div>
        </div>
      </div>

      <div class="batch-bar" id="img-batch-bar">
        <span class="batch-msg" id="img-batch-msg">Image posts ready</span>
        <button class="btn btn-gold" id="gen-all-imgs-btn" onclick="generateAllImages()" style="font-size:11px;padding:7px 14px;">Generate All Images</button>
        <button class="btn btn-dark" onclick="copyAllCaptions('images')" style="font-size:11px;padding:7px 12px;">Copy All Captions</button>
        <button class="btn btn-gold" id="sched-all-img-btn" onclick="scheduleAll('images')" style="font-size:11px;padding:7px 14px;display:none;">Schedule All to Buffer</button>
      </div>

      <div id="gen-all-img-prog" style="display:none;padding:0 0 12px;">
        <div class="prog-track"><div class="prog-fill" id="gen-img-fill"></div></div>
        <div class="prog-label" id="gen-img-label">Generating images...</div>
      </div>

      <div id="images-container">
        <div class="empty"><span class="empty-icon">&#127911;</span><h3>No Image Posts Yet</h3><p>Click Generate to create today\'s 19 image posts based on the daily theme.</p></div>
      </div>
    </div>

    <!-- SHORT VIDEOS -->
    <div class="pane" id="pane-shorts">
      <div class="theme-box">
        <div class="day-info">
          <div>
            <div class="day-name" id="short-theme-display">Loading theme...</div>
            <div style="font-size:11px;color:var(--muted);">12-second cinematic scripts optimized for Hypernatural/Seedance</div>
          </div>
        </div>
        <div class="btn-row">
          <button class="btn btn-gold" id="gen-short-btn" onclick="generateVideos('short')">Generate 3 Short Video Scripts</button>
          <button class="btn btn-dark" onclick="clearVideos('short')">Clear</button>
        </div>
        <div id="short-prog-wrap" style="display:none;" class="prog-wrap">
          <div class="prog-track"><div class="prog-fill" id="short-prog-fill"></div></div>
          <div class="prog-label" id="short-prog-label">Writing short video scripts...</div>
        </div>
      </div>
      <div id="shorts-container">
        <div class="empty"><span class="empty-icon">&#127910;</span><h3>No Short Video Scripts Yet</h3><p>Generate 3 cinematic 12-second scripts for today\'s theme.</p></div>
      </div>
    </div>

    <!-- LONG VIDEOS -->
    <div class="pane" id="pane-longs">
      <div class="theme-box">
        <div class="day-info">
          <div>
            <div class="day-name" id="long-theme-display">Loading theme...</div>
            <div style="font-size:11px;color:var(--muted);">70-90 second cinematic scripts optimized for Hypernatural</div>
          </div>
        </div>
        <div class="btn-row">
          <button class="btn btn-gold" id="gen-long-btn" onclick="generateVideos('long')">Generate 3 Long Video Scripts</button>
          <button class="btn btn-dark" onclick="clearVideos('long')">Clear</button>
        </div>
        <div id="long-prog-wrap" style="display:none;" class="prog-wrap">
          <div class="prog-track"><div class="prog-fill" id="long-prog-fill"></div></div>
          <div class="prog-label" id="long-prog-label">Writing long video scripts...</div>
        </div>
      </div>
      <div id="longs-container">
        <div class="empty"><span class="empty-icon">&#127909;</span><h3>No Long Video Scripts Yet</h3><p>Generate 3 cinematic 70-90 second scripts for today\'s theme.</p></div>
      </div>
    </div>

    <!-- SCHEDULE -->
    <div class="pane" id="pane-schedule">
      <div id="sched-container">
        <div class="empty"><span class="empty-icon">&#128197;</span><h3>No Posts Yet</h3><p>Generate content first.</p></div>
      </div>
    </div>

    <!-- BUFFER SETUP -->
    <div class="pane" id="pane-buffer">
      <div class="alert alert-gold" style="margin-bottom:18px;"><strong>Buffer Setup:</strong> Connect your MJ page profiles to enable one-click scheduling via the Buffer API.</div>

      <div class="setup-sec">
        <h3>Step 1 — Get Your Buffer Access Token</h3>
        <ol class="step-list">
          <li>Go to <strong>buffer.com/developers/apps</strong> and log in</li>
          <li>Click <strong>Create an App</strong></li>
          <li>Fill in the app details — name it "MJ Content Studio"</li>
          <li>Set the callback URL to <code>https://www.irspilot.com/mj</code></li>
          <li>After creating, go to your app and find the <strong>Access Token</strong></li>
          <li>Copy it and paste it in Settings above</li>
        </ol>
      </div>

      <div class="setup-sec">
        <h3>Step 2 — Get Your Buffer Profile IDs</h3>
        <ol class="step-list">
          <li>With your access token, call: <code>https://api.bufferapp.com/1/profiles.json?access_token=YOUR_TOKEN</code></li>
          <li>Find the <strong>id</strong> fields for your Facebook and Instagram profiles</li>
          <li>Paste them comma-separated in Settings</li>
        </ol>
      </div>

      <div class="setup-sec">
        <h3>Step 3 — Test Connection</h3>
        <div class="two-col">
          <div><label class="s-label">Buffer Access Token</label><input type="password" id="buf-token-test" placeholder="Paste token to test..." style="width:100%;background:var(--dark3);border:1px solid var(--dark3);border-radius:5px;padding:8px 10px;font-family:DM Sans,sans-serif;font-size:13px;color:var(--text);outline:none;"></div>
          <div style="display:flex;align-items:flex-end;"><button class="btn btn-gold" onclick="testBuffer()" style="width:100%;">Test Connection</button></div>
        </div>
        <div id="buf-result" style="display:none;margin-top:8px;"></div>
      </div>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
const DAY_THEMES = {
  0: {name:"Moonwalk Monday", focus:"iconic dance moments, moonwalk origins, dance rehearsals, movement mastery"},
  1: {name:"Thriller Tuesday", focus:"Thriller era, zombie aesthetic, horror pop, iconic red jacket, Vincent Price"},
  2: {name:"Rare MJ Wednesday", focus:"rare footage, behind-the-scenes, unseen moments, studio sessions, private rehearsals"},
  3: {name:"Thriller to HIStory Thursday", focus:"evolution from Thriller through Bad, Dangerous to HIStory, transformation arc"},
  4: {name:"Live Performance Friday", focus:"stadium concerts, live energy, crowd reactions, iconic live moments, tour highlights"},
  5: {name:"Style and Aura Saturday", focus:"fashion, iconic outfits, military jackets, fedora, single glove, style evolution"},
  6: {name:"Emotional Legacy Sunday", focus:"humanitarian work, legacy, emotional performances, This Is It, fan connection, inspiration"}
};

const S = {
  bufferToken: localStorage.getItem("mj_buffer") || "",
  profileIds: (localStorage.getItem("mj_profiles") || "").split(",").filter(Boolean),
  geminiKey: localStorage.getItem("mj_gemini") || "",
  imagePosts: [],
  shortVideos: [],
  longVideos: [],
  currentTheme: ""
};

function getDayIndex() {
  const override = parseInt(document.getElementById("day-override").value);
  return override >= 0 ? override : new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
}

function initTheme() {
  const idx = getDayIndex();
  const theme = DAY_THEMES[idx];
  document.getElementById("day-badge").textContent = theme.name;
  document.getElementById("theme-name-display").textContent = theme.name;
  document.getElementById("theme-focus-display").textContent = theme.focus;
  document.getElementById("short-theme-display").textContent = theme.name + " — Short Videos";
  document.getElementById("long-theme-display").textContent = theme.name + " — Long Videos";
  S.currentTheme = theme.name;
}

document.getElementById("day-override").addEventListener("change", initTheme);
initTheme();

function showSettings() {
  document.getElementById("set-buffer").value = S.bufferToken;
  document.getElementById("set-profiles").value = S.profileIds.join(",");
  document.getElementById("set-gemini").value = S.geminiKey;
  document.getElementById("settings-modal").style.display = "flex";
}
function hideSettings() { document.getElementById("settings-modal").style.display = "none"; }
function saveSettings() {
  S.bufferToken = document.getElementById("set-buffer").value.trim();
  S.profileIds = document.getElementById("set-profiles").value.split(",").map(s=>s.trim()).filter(Boolean);
  S.geminiKey = document.getElementById("set-gemini").value.trim();
  localStorage.setItem("mj_buffer", S.bufferToken);
  localStorage.setItem("mj_profiles", S.profileIds.join(","));
  localStorage.setItem("mj_gemini", S.geminiKey);
  hideSettings(); toast("Settings saved!");
}

function switchTab(id, el) {
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("on"));
  document.querySelectorAll(".pane").forEach(p=>p.classList.remove("on"));
  el.classList.add("on"); document.getElementById("pane-"+id).classList.add("on");
}

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"), 3500);
}

function updateStats() {
  document.getElementById("s-images").textContent = S.imagePosts.length;
  document.getElementById("s-videos").textContent = S.shortVideos.length + S.longVideos.length;
  document.getElementById("s-ready").textContent = S.imagePosts.filter(p=>p.imgUrl).length;
  document.getElementById("s-sched").textContent = [...S.imagePosts,...S.shortVideos,...S.longVideos].filter(p=>p.scheduled).length;
}

// ── GENERATE IMAGE POSTS ─────────────────────────────────
async function generateImages() {
  const count = parseInt(document.getElementById("post-count").value);
  const override = document.getElementById("theme-override").value.trim();
  const dayIdx = getDayIndex();
  const btn = document.getElementById("gen-img-btn");
  btn.disabled = true; btn.textContent = "Generating...";
  document.getElementById("img-prog-wrap").style.display = "block";
  setP("img-prog-fill", "img-prog-label", 15, "Briefing the crew...");
  try {
    const res = await fetch("/mj/api/generate", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({count, dayIndex: dayIdx, themeOverride: override})
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    setP("img-prog-fill","img-prog-label",100,"Image posts ready!");
    S.imagePosts = data.posts.map((p,i)=>({id:i,type:"image",...p,imgUrl:null,status:"draft",scheduled:false}));
    setTimeout(()=>{
      document.getElementById("img-prog-wrap").style.display="none";
      renderImagePosts(); updateStats();
      document.getElementById("img-batch-bar").classList.add("show");
      document.getElementById("img-batch-msg").textContent = S.imagePosts.length+" image posts ready";
      renderSchedule();
    },400);
  } catch(e){ toast("Error: "+e.message); document.getElementById("img-prog-wrap").style.display="none"; }
  btn.disabled=false; btn.textContent="Generate 19 Image Posts";
}

function renderImagePosts() {
  const start = parseTime(document.getElementById("start-time").value);
  const intv = parseInt(document.getElementById("interval").value)||45;
  document.getElementById("images-container").innerHTML = "<div class='content-list'>" +
    S.imagePosts.map((p,i)=>{
      const t = fmtTime(addMins(start, i*intv));
      const imgHtml = p.imgUrl
        ? '<img src="'+p.imgUrl+'" class="img-preview" onclick="triggerUpload(\'img\','+i+')" title="Click to replace">'
        : '<div class="drop-zone" id="dz-img-'+i+'" onclick="triggerUpload(\'img\','+i+')" ondragover="dzOver(event,\'img\','+i+')" ondragleave="dzLeave(\'img\','+i+')" ondrop="dzDrop(event,\'img\','+i+')"><span class="dz-icon">&#9733;</span><span>Upload or generate</span></div>';
      return '<div class="content-card" id="img-card-'+i+'">' +
        '<div class="card-head"><span class="card-num">#'+String(i+1).padStart(2,"0")+'</span><span class="card-meta">Image Post</span><span class="card-type type-image">IMAGE</span><span class="card-time">'+t+'</span></div>' +
        '<div style="display:grid;grid-template-columns:1fr 150px">' +
        '<div>' +
        '<div class="sec-tabs"><div class="sec-tab on" onclick="switchSecTab(this,\'img-s1-'+i+'\',[\'img-s1-'+i+'\',\'img-s2-'+i+'\',\'img-s3-'+i+'\'])">Image Prompt</div><div class="sec-tab" onclick="switchSecTab(this,\'img-s2-'+i+'\',[\'img-s1-'+i+'\',\'img-s2-'+i+'\',\'img-s3-'+i+'\'])">Caption & Hashtags</div><div class="sec-tab" onclick="switchSecTab(this,\'img-s3-'+i+'\',[\'img-s1-'+i+'\',\'img-s2-'+i+'\',\'img-s3-'+i+'\'])">First Comment</div></div>' +
        '<div class="sec-pane on" id="img-s1-'+i+'"><div class="section-text prompt">'+esc(p.imagePrompt)+'</div></div>' +
        '<div class="sec-pane" id="img-s2-'+i+'"><div class="section-text">'+esc(p.caption)+'</div></div>' +
        '<div class="sec-pane" id="img-s3-'+i+'"><div class="section-text">'+esc(p.firstComment)+'</div></div>' +
        '</div>' +
        '<div class="card-img-col"><input type="file" id="file-img-'+i+'" accept="image/*" style="display:none" onchange="fileSelected(event,\'img\','+i+')"><div id="img-img-'+i+'">'+imgHtml+'</div><button class="mbtn" onclick="genImage(\'img\','+i+')" style="font-size:10px;">&#8635; Regen</button></div>' +
        '</div>' +
        '<div class="card-foot"><div class="s-dot '+(p.imgUrl?(p.scheduled?"dot-s":"dot-r"):"dot-p")+'" id="dot-img-'+i+'"></div><span class="s-txt" id="stxt-img-'+i+'">'+(p.scheduled?"Scheduled":"Upload image then schedule")+'</span>' +
        '<button class="mbtn" onclick="copySection(\'img\','+i+',\'caption\')">Caption</button>' +
        '<button class="mbtn" onclick="copySection(\'img\','+i+',\'prompt\')">Prompt</button>' +
        '<button class="mbtn '+(p.imgUrl?"mbtn-gold":"")+'" id="sched-img-'+i+'" onclick="scheduleItem(\'img\','+i+')" '+(p.imgUrl?"":"disabled")+'>Schedule</button>' +
        '</div></div>';
    }).join("") + "</div>";
}

// ── GENERATE VIDEOS ──────────────────────────────────────
async function generateVideos(type) {
  const dayIdx = getDayIndex();
  const btnId = "gen-"+type+"-btn";
  const progWrap = type+"-prog-wrap";
  const btn = document.getElementById(btnId);
  btn.disabled=true; btn.textContent="Generating...";
  document.getElementById(progWrap).style.display="block";
  setP(type+"-prog-fill",type+"-prog-label",15,"Writing "+type+" video scripts...");
  try {
    const res = await fetch("/mj/api/generate-video",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({videoType:type,count:3,dayIndex:dayIdx})
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    setP(type+"-prog-fill",type+"-prog-label",100,"Scripts ready!");
    const arr = data.videos.map((v,i)=>({id:i,type:type,...v,imgUrl:null,status:"draft",scheduled:false}));
    if (type==="short") S.shortVideos=arr; else S.longVideos=arr;
    setTimeout(()=>{
      document.getElementById(progWrap).style.display="none";
      renderVideos(type); updateStats(); renderSchedule();
    },400);
  } catch(e){ toast("Error: "+e.message); document.getElementById(progWrap).style.display="none"; }
  btn.disabled=false; btn.textContent="Generate 3 "+(type==="short"?"Short":"Long")+" Video Scripts";
}

function renderVideos(type) {
  const arr = type==="short" ? S.shortVideos : S.longVideos;
  const container = document.getElementById(type==="short"?"shorts-container":"longs-container");
  const start = parseTime(document.getElementById("start-time").value);
  const intv = parseInt(document.getElementById("interval").value)||45;
  const baseOffset = S.imagePosts.length + (type==="long" ? 3 : 0);

  container.innerHTML = "<div class='content-list'>" +
    arr.map((v,i)=>{
      const t = fmtTime(addMins(start, (baseOffset+i)*intv));
      const typeLabel = type==="short" ? "SHORT 12s" : "LONG 70-90s";
      const typeCls = type==="short" ? "type-short" : "type-long";
      const imgHtml = v.imgUrl
        ? '<img src="'+v.imgUrl+'" class="img-preview" onclick="triggerUpload(\''+type+'\','+i+')" title="Click to replace">'
        : '<div class="drop-zone" id="dz-'+type+'-'+i+'" onclick="triggerUpload(\''+type+'\','+i+')" ondragover="dzOver(event,\''+type+'\','+i+')" ondragleave="dzLeave(\''+type+'\','+i+')" ondrop="dzDrop(event,\''+type+'\','+i+')"><span class="dz-icon">&#9733;</span><span>Upload scene image</span></div>';
      return '<div class="content-card" id="'+type+'-card-'+i+'">' +
        '<div class="card-head"><span class="card-num">#'+String(i+1).padStart(2,"0")+'</span><span class="card-meta">'+esc(v.era||"")+'</span><span class="card-era">'+esc(v.mood||"")+'</span><span class="card-type '+typeCls+'">'+typeLabel+'</span><span class="card-time">'+t+'</span></div>' +
        '<div style="display:grid;grid-template-columns:1fr 150px">' +
        '<div>' +
        '<div class="sec-tabs"><div class="sec-tab on" onclick="switchSecTab(this,\''+type+'-s1-'+i+'\',[\''+type+'-s1-'+i+'\',\''+type+'-s2-'+i+'\',\''+type+'-s3-'+i+'\'])">Video Script</div><div class="sec-tab" onclick="switchSecTab(this,\''+type+'-s2-'+i+'\',[\''+type+'-s1-'+i+'\',\''+type+'-s2-'+i+'\',\''+type+'-s3-'+i+'\'])">Caption & Hashtags</div><div class="sec-tab" onclick="switchSecTab(this,\''+type+'-s3-'+i+'\',[\''+type+'-s1-'+i+'\',\''+type+'-s2-'+i+'\',\''+type+'-s3-'+i+'\'])">First Comment</div></div>' +
        '<div class="sec-pane on" id="'+type+'-s1-'+i+'"><div class="section-text script">'+esc(v.videoScript)+'</div></div>' +
        '<div class="sec-pane" id="'+type+'-s2-'+i+'"><div class="section-text">'+esc(v.captionAndHashtags)+'</div></div>' +
        '<div class="sec-pane" id="'+type+'-s3-'+i+'"><div class="section-text">'+esc(v.firstComment)+'</div></div>' +
        '</div>' +
        '<div class="card-img-col"><input type="file" id="file-'+type+'-'+i+'" accept="image/*" style="display:none" onchange="fileSelected(event,\''+type+'\','+i+')"><div id="img-'+type+'-'+i+'">'+imgHtml+'</div><button class="mbtn" onclick="genImage(\''+type+'\','+i+')" style="font-size:10px;">&#8635; Scene image</button></div>' +
        '</div>' +
        '<div class="card-foot"><div class="s-dot '+(v.imgUrl?(v.scheduled?"dot-s":"dot-r"):"dot-p")+'" id="dot-'+type+'-'+i+'"></div><span class="s-txt" id="stxt-'+type+'-'+i+'">'+(v.scheduled?"Scheduled":"Copy script, generate scene image, schedule post")+'</span>' +
        '<button class="mbtn" onclick="copyVideoSection(\''+type+'\','+i+',\'script\')">Script</button>' +
        '<button class="mbtn" onclick="copyVideoSection(\''+type+'\','+i+',\'caption\')">Caption</button>' +
        '<button class="mbtn" onclick="copyVideoSection(\''+type+'\','+i+',\'imagePrompt\')">Img Prompt</button>' +
        '<button class="mbtn '+(v.imgUrl?"mbtn-gold":"")+'" id="sched-'+type+'-'+i+'" onclick="scheduleItem(\''+type+'\','+i+')" '+(v.imgUrl?"":"disabled")+'>Schedule</button>' +
        '</div></div>';
    }).join("") + "</div>";
}

// ── IMAGE UPLOAD & GENERATION ────────────────────────────
function triggerUpload(type, idx) { document.getElementById("file-"+type+"-"+idx).click(); }
function fileSelected(e,type,idx) { const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=ev=>applyImage(type,idx,ev.target.result); r.readAsDataURL(f); }
function dzOver(e,type,idx){e.preventDefault();const d=document.getElementById("dz-"+type+"-"+idx);if(d)d.classList.add("over");}
function dzLeave(type,idx){const d=document.getElementById("dz-"+type+"-"+idx);if(d)d.classList.remove("over");}
function dzDrop(e,type,idx){e.preventDefault();dzLeave(type,idx);const f=e.dataTransfer.files[0];if(!f||!f.type.startsWith("image/")){toast("Drop an image file");return;}const r=new FileReader();r.onload=ev=>applyImage(type,idx,ev.target.result);r.readAsDataURL(f);}

function applyImage(type,idx,dataUrl){
  const arr = type==="img" ? S.imagePosts : type==="short" ? S.shortVideos : S.longVideos;
  arr[idx].imgUrl=dataUrl; arr[idx].status="ready";
  document.getElementById("img-"+type+"-"+idx).innerHTML='<img src="'+dataUrl+'" class="img-preview" onclick="triggerUpload(\''+type+'\','+idx+')" title="Click to replace">';
  document.getElementById("dot-"+type+"-"+idx).className="s-dot dot-r";
  document.getElementById("stxt-"+type+"-"+idx).textContent="Image ready — click Schedule";
  const sb=document.getElementById("sched-"+type+"-"+idx);
  if(sb){sb.disabled=false;sb.className="mbtn mbtn-gold";}
  updateStats(); renderSchedule();
  toast("Image set for "+(type==="img"?"post":"video")+" #"+(idx+1));
}

async function genImage(type,idx){
  const arr = type==="img" ? S.imagePosts : type==="short" ? S.shortVideos : S.longVideos;
  const prompt = arr[idx].imagePrompt;
  const imgDiv=document.getElementById("img-"+type+"-"+idx);
  document.getElementById("dot-"+type+"-"+idx).className="s-dot dot-p";
  document.getElementById("stxt-"+type+"-"+idx).textContent="Generating...";
  imgDiv.innerHTML='<div class="img-generating"><div class="spinner"></div><span>Generating...</span></div>';
  try{
    const res=await fetch("/mj/api/image",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,geminiKey:S.geminiKey})});
    const data=await res.json();
    if(!data.ok) throw new Error(data.error);
    applyImage(type,idx,data.dataUrl);
  }catch(e){
    imgDiv.innerHTML='<div class="drop-zone" id="dz-'+type+'-'+idx+'" onclick="triggerUpload(\''+type+'\','+idx+')" ondragover="dzOver(event,\''+type+'\','+idx+')" ondragleave="dzLeave(\''+type+'\','+idx+')" ondrop="dzDrop(event,\''+type+'\','+idx+')"><span style="font-size:18px">&#9888;</span><span>Error - upload manually</span></div>';
    document.getElementById("dot-"+type+"-"+idx).className="s-dot";
    document.getElementById("stxt-"+type+"-"+idx).textContent="Error: "+e.message.substring(0,60);
    toast("Image error: "+e.message.substring(0,60));
  }
}

async function generateAllImages(){
  const btn=document.getElementById("gen-all-imgs-btn");
  btn.disabled=true; btn.textContent="Generating...";
  const total=S.imagePosts.length;
  document.getElementById("gen-all-img-prog").style.display="block";
  for(let i=0;i<total;i++){
    if(!S.imagePosts[i].imgUrl){
      setP("gen-img-fill","gen-img-label",Math.round((i/total)*100),"Generating image "+(i+1)+" of "+total+"...");
      await genImage("img",i);
      await new Promise(r=>setTimeout(r,1200));
    }
  }
  setP("gen-img-fill","gen-img-label",100,"All images done!");
  setTimeout(()=>{document.getElementById("gen-all-img-prog").style.display="none";},2500);
  btn.disabled=false; btn.textContent="Regenerate All Images";
  toast("All images generated!");
}

// ── BUFFER SCHEDULING ────────────────────────────────────
async function scheduleItem(type,idx){
  if(!S.bufferToken||!S.profileIds.length){toast("Connect Buffer first — go to Buffer Setup tab");return;}
  const arr = type==="img"?S.imagePosts:type==="short"?S.shortVideos:S.longVideos;
  const item=arr[idx];
  if(!item.imgUrl){toast("Upload an image first");return;}
  const btn=document.getElementById("sched-"+type+"-"+idx);
  btn.textContent="...";btn.disabled=true;
  const start=parseTime(document.getElementById("start-time").value);
  const intv=parseInt(document.getElementById("interval").value)||45;
  const baseOffset=type==="long"?S.imagePosts.length+3:type==="short"?S.imagePosts.length:0;
  const postTime=addMins(start,(baseOffset+idx)*intv);
  const now=new Date();const schedDate=new Date(now);
  schedDate.setHours(postTime.h,postTime.m,0,0);
  if(schedDate<=now)schedDate.setDate(schedDate.getDate()+1);
  if(schedDate-now<10*60*1000)schedDate.setTime(now.getTime()+11*60*1000);
  const caption=type==="img"?item.caption:item.captionAndHashtags;
  try{
    const res=await fetch("/mj/api/schedule-buffer",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({bufferToken:S.bufferToken,profileIds:S.profileIds,caption,imageB64:item.imgUrl,scheduledTime:Math.floor(schedDate.getTime()/1000),firstComment:item.firstComment})
    });
    const data=await res.json();
    if(!data.ok)throw new Error(data.error);
    arr[idx].scheduled=true;
    btn.textContent="\u2713 Scheduled";btn.style.color="#1D9E75";btn.style.borderColor="#1D9E75";
    document.getElementById("dot-"+type+"-"+idx).className="s-dot dot-s";
    document.getElementById("stxt-"+type+"-"+idx).textContent="Scheduled for "+fmtTime(postTime);
    updateStats();renderSchedule();
    toast((type==="img"?"Post":"Video")+" #"+(idx+1)+" scheduled!");
  }catch(e){btn.textContent="Schedule";btn.disabled=false;toast("Error: "+e.message);}
}

async function scheduleAll(type){
  const arr=type==="images"?S.imagePosts:type==="short"?S.shortVideos:S.longVideos;
  const ready=arr.filter(p=>p.imgUrl&&!p.scheduled);
  if(!ready.length){toast("No unscheduled items with images");return;}
  if(!S.bufferToken||!S.profileIds.length){toast("Connect Buffer first");return;}
  for(let i=0;i<arr.length;i++){
    if(arr[i].imgUrl&&!arr[i].scheduled){
      await scheduleItem(type==="images"?"img":type,i);
      await new Promise(r=>setTimeout(r,800));
    }
  }
  toast("All scheduled!");
}

// ── COPY HELPERS ─────────────────────────────────────────
function switchSecTab(el,showId,allIds){
  allIds.forEach(id=>{
    const p=document.getElementById(id);if(p)p.classList.remove("on");
  });
  const p=document.getElementById(showId);if(p)p.classList.add("on");
  const tabs=el.parentElement.querySelectorAll(".sec-tab");
  tabs.forEach(t=>t.classList.remove("on"));
  el.classList.add("on");
}

function copySection(type,idx,section){
  const arr=type==="img"?S.imagePosts:type==="short"?S.shortVideos:S.longVideos;
  const item=arr[idx];
  const text=section==="caption"?item.caption:section==="prompt"?item.imagePrompt:item.firstComment;
  navigator.clipboard.writeText(text);toast("Copied!");
}
function copyVideoSection(type,idx,section){
  const arr=type==="short"?S.shortVideos:S.longVideos;
  const item=arr[idx];
  const text=section==="script"?item.videoScript:section==="caption"?item.captionAndHashtags:section==="imagePrompt"?item.imagePrompt:item.firstComment;
  navigator.clipboard.writeText(text);toast("Copied!");
}
function copyAllCaptions(type){
  const arr=type==="images"?S.imagePosts:type==="short"?S.shortVideos:S.longVideos;
  navigator.clipboard.writeText(arr.map((p,i)=>"POST "+(i+1)+":\n"+(p.caption||p.captionAndHashtags)).join("\n\n---\n\n"));
  toast("All captions copied!");
}

function clearImages(){S.imagePosts=[];document.getElementById("images-container").innerHTML='<div class="empty"><span class="empty-icon">&#127911;</span><h3>No Image Posts Yet</h3><p>Click Generate to create today\'s image posts.</p></div>';document.getElementById("img-batch-bar").classList.remove("show");updateStats();}
function clearVideos(type){if(type==="short")S.shortVideos=[];else S.longVideos=[];document.getElementById(type==="short"?"shorts-container":"longs-container").innerHTML='<div class="empty"><span class="empty-icon">&#127909;</span><h3>No Scripts Yet</h3><p>Click Generate to create video scripts.</p></div>';updateStats();}

function renderSchedule(){
  const all=[
    ...S.imagePosts.map((p,i)=>({...p,displayType:"Image Post",idx:i,typeKey:"img"})),
    ...S.shortVideos.map((v,i)=>({...v,displayType:"Short Video",idx:i,typeKey:"short",caption:v.captionAndHashtags})),
    ...S.longVideos.map((v,i)=>({...v,displayType:"Long Video",idx:i,typeKey:"long",caption:v.captionAndHashtags}))
  ];
  if(!all.length)return;
  const start=parseTime(document.getElementById("start-time").value);
  const intv=parseInt(document.getElementById("interval").value)||45;
  const rows=all.map((item,i)=>{
    const t=fmtTime(addMins(start,i*intv));
    const pill=item.scheduled?'<span class="pill pill-s">Scheduled</span>':item.imgUrl?'<span class="pill pill-r">Ready</span>':'<span class="pill pill-p">Pending</span>';
    const typeLabel=item.displayType==="Image Post"?'<span class="card-type type-image">IMG</span>':item.displayType==="Short Video"?'<span class="card-type type-short">SHORT</span>':'<span class="card-type type-long">LONG</span>';
    return '<div class="sched-row"><span class="s-num">'+(i+1)+'</span>'+typeLabel+'<span style="font-size:11px">'+esc((item.caption||"").substring(0,50))+'...</span><span style="font-size:11px;color:var(--muted)">'+t+'</span>'+pill+'</div>';
  }).join("");
  document.getElementById("sched-container").innerHTML='<div class="sched-table"><div class="sched-head"><span>#</span><span>Type</span><span>Content</span><span>Time</span><span>Status</span></div>'+rows+'</div>';
}

async function testBuffer(){
  const token=document.getElementById("buf-token-test").value.trim();
  const res=document.getElementById("buf-result");res.style.display="block";
  if(!token){res.innerHTML='<div class="alert alert-gold">Enter your Buffer access token.</div>';return;}
  res.innerHTML='<div class="alert alert-info">Testing connection...</div>';
  try{
    const r=await fetch("https://api.bufferapp.com/1/user.json?access_token="+token);
    const d=await r.json();
    if(d.error){res.innerHTML='<div class="alert alert-err">Error: '+d.error+'</div>';}
    else{res.innerHTML='<div class="alert alert-ok">Connected as '+d.name+'. Ready to schedule.</div>';toast("Buffer connected!");}
  }catch(e){res.innerHTML='<div class="alert alert-err">'+e.message+'</div>';}
}

function setP(fillId,labelId,pct,label){
  const f=document.getElementById(fillId);const l=document.getElementById(labelId);
  if(f)f.style.width=pct+"%";if(l)l.textContent=label;
}
function parseTime(s){const m=s.trim().toUpperCase().match(/([0-9]+):([0-9]+)[ ]*(AM|PM)?/);if(!m)return{h:8,m:0};let h=parseInt(m[1]),min=parseInt(m[2]);if(m[3]==="PM"&&h<12)h+=12;if(m[3]==="AM"&&h===12)h=0;return{h,m:min};}
function addMins(t,mins){const total=t.h*60+t.m+mins;return{h:Math.floor(total/60)%24,m:total%60};}
function fmtTime(t){const h=t.h%12||12,ap=t.h<12?"AM":"PM";return h+":"+String(t.m).padStart(2,"0")+" "+ap;}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
</script>
</body>
</html>'''
