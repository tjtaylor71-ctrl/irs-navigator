"""
tdm_routes.py
=============
Tiny Dog Mafia Content Studio — Flask blueprint for IRS Pilot / Railway.

Routes:
    GET  /tdm                 → Studio HTML page
    POST /tdm/api/generate    → Generate captions + image prompts via Claude
    POST /tdm/api/image       → Generate single image via Gemini
    POST /tdm/api/schedule    → Schedule post to Facebook via Graph API

Add to server.py:
    from tdm_routes import tdm_bp
    app.register_blueprint(tdm_bp)
"""

import os
import json
import base64
import requests
from flask import Blueprint, request, jsonify, Response

tdm_bp = Blueprint('tdm', __name__, url_prefix='/tdm')

ANTHROPIC_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
GEMINI_KEY    = os.environ.get('GEMINI_API_KEY', '')


# ── HTML page ──────────────────────────────────────────────────────────────────

@tdm_bp.route('/', methods=['GET'])
def studio():
    return Response(STUDIO_HTML, mimetype='text/html')


# ── Generate captions + image prompts ─────────────────────────────────────────

@tdm_bp.route('/api/generate', methods=['POST'])
def generate():
    data      = request.get_json()
    theme     = data.get('theme', '')
    count     = int(data.get('count', 19))
    tone      = data.get('tone', 'funny')
    cta       = data.get('cta', 'engagement')
    dog_name  = data.get('dogName', 'the Yorkie')

    tone_map = {
        'funny':      'comedic and deadpan',
        'cinematic':  'dramatic and cinematic',
        'savage':     'hilariously savage',
        'wholesome':  'charming and wholesome',
        'relatable':  'laugh-out-loud relatable',
    }
    cta_map = {
        'engagement': 'end with a funny question that drives comments',
        'tag':        'tell followers to tag someone who acts like this',
        'save':       'encourage saving or sharing',
        'follow':     'invite people to follow the page',
    }

    system_prompt = (
        'You are the creative director for "Tiny Dog Mafia," a viral Yorkie Facebook and Instagram page. '
        'The brand voice is: tiny dog, big attitude, mafia/boss persona. Every post treats the Yorkie as if '
        'it runs a crime family division operating inside everyday domestic situations. The humor is deadpan, '
        'cinematic, and absurdist. All image prompts follow a strict cinematic style: photorealistic, 4:5 aspect '
        'ratio, bold gold text overlay with a headline, and a "Tiny Dog Mafia [Division Name]" subtitle. '
        'The Yorkie always has silky steel-blue and tan fur, a mischievous expression, and is often wearing a tiny outfit. '
        'Respond ONLY with valid JSON. No markdown. No code fences. No preamble.'
    )

    user_prompt = f"""Generate exactly {count} unique Tiny Dog Mafia social media posts on this theme: "{theme}"

For each post:
1. "headline" — 2-6 word ALL CAPS punchy statement like "INSPECTION NOT COMPLETE"
2. "division" — fake Tiny Dog Mafia division name like "Tiny Dog Mafia Brunch Division"
3. "caption" — EXACT structure:
LINE 1 HOOK: scroll-stopping statement. Examples: "Your dog doesn't help. They supervise."
LINES 2-5 SCENE: 3-4 short punchy lines building tension one beat at a time. Example:
"Everyone started wrapping presents.
Everything was organized.
The tape was easy to find.
Then your Yorkie arrived."
LINE 6 PAYOFF: funny punchline with 2-3 emojis
LINE 7 CLOSING: dry deadpan line treating {dog_name} as authority figure
LINE 8 CTA: {cta_map[cta]}
LINE 9 HASHTAGS: 5-6 hashtags
Tone: {tone_map[tone]}
4. "imagePrompt" — "Photorealistic cinematic 4:5 image of a Yorkshire Terrier with silky steel-blue and tan fur [SPECIFIC SITUATION]. The Yorkie wears [TINY OUTFIT] with mischievous self-important expression. [DETAILED SCENE, warm cinematic lighting, shallow depth of field]. Bold gold cinematic text overlay: '[HEADLINE]'. Small subtitle: '[DIVISION]'. Highly detailed fur, photorealistic lighting."

Make every post fresh — vary situations, outfits, settings. Dog is ALWAYS in charge.
JSON: {{"posts":[{{"headline":"...","division":"...","caption":"...","imagePrompt":"..."}}]}}"""

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
        return jsonify({'ok': True, 'posts': posts['posts']})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


# ── Generate image via Gemini ──────────────────────────────────────────────────

@tdm_bp.route('/api/image', methods=['POST'])
def generate_image():
    data   = request.get_json()
    prompt = data.get('prompt', '')
    key    = data.get('geminiKey') or GEMINI_KEY

    if not key:
        return jsonify({'ok': False, 'error': 'No Gemini API key configured'}), 400

    models = [
        'gemini-2.5-flash-image',
        'gemini-2.0-flash-preview-image-generation',
        'gemini-2.0-flash-exp',
    ]

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


# ── Schedule post to Facebook ──────────────────────────────────────────────────

@tdm_bp.route('/api/schedule', methods=['POST'])
def schedule_post():
    data       = request.get_json()
    page_id    = data.get('pageId', '')
    token      = data.get('token', '')
    caption    = data.get('caption', '')
    image_b64  = data.get('imageB64', '')       # base64 data URL
    sched_time = int(data.get('scheduledTime'))  # unix timestamp

    if not all([page_id, token, caption, image_b64]):
        return jsonify({'ok': False, 'error': 'Missing required fields'}), 400

    try:
        # Decode base64 image
        header, encoded = image_b64.split(',', 1)
        img_bytes = base64.b64decode(encoded)

        # Step 1: upload photo unpublished
        upload_resp = requests.post(
            f'https://graph.facebook.com/v19.0/{page_id}/photos',
            data={'published': 'false', 'access_token': token},
            files={'source': ('image.jpg', img_bytes, 'image/jpeg')},
            timeout=30
        )
        upload_data = upload_resp.json()
        if 'error' in upload_data:
            return jsonify({'ok': False, 'error': upload_data['error']['message']}), 400
        photo_id = upload_data['id']

        # Step 2: create scheduled post
        post_resp = requests.post(
            f'https://graph.facebook.com/v19.0/{page_id}/feed',
            data={
                'message': caption,
                'attached_media': json.dumps([{'media_fbid': photo_id}]),
                'scheduled_publish_time': sched_time,
                'published': 'false',
                'access_token': token,
            },
            timeout=30
        )
        post_data = post_resp.json()
        if 'error' in post_data:
            return jsonify({'ok': False, 'error': post_data['error']['message']}), 400

        return jsonify({'ok': True, 'postId': post_data.get('id', '')})

    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


# ── Studio HTML ────────────────────────────────────────────────────────────────

STUDIO_HTML = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tiny Dog Mafia — Content Studio</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,700;1,400&display=swap" rel="stylesheet">
<style>
:root{--gold:#C9A84C;--gold-light:#E8C97A;--gold-dim:#9A7A35;--black:#0D0D0D;--dark:#141414;--dark2:#1C1C1C;--dark3:#242424;--border:rgba(201,168,76,0.2);--text:#F0EAD6;--muted:#7A7060;--hint:#4A4438;}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:"DM Sans",sans-serif;background:var(--black);color:var(--text);min-height:100vh;font-size:14px;}
a{color:var(--gold);}
header{background:var(--dark);border-bottom:1px solid var(--border);padding:0 28px;height:58px;display:flex;align-items:center;gap:14px;position:sticky;top:0;z-index:100;}
.logo{font-family:"Bebas Neue",sans-serif;font-size:22px;letter-spacing:.1em;color:var(--gold);line-height:1;}
.logo span{color:var(--muted);font-size:10px;font-family:"DM Sans",sans-serif;font-weight:400;letter-spacing:.15em;text-transform:uppercase;display:block;margin-top:1px;}
.hdr-divider{width:1px;height:24px;background:var(--dark3);}
.hdr-badge{background:rgba(201,168,76,.15);color:var(--gold);font-size:10px;font-weight:700;padding:3px 10px;border-radius:3px;letter-spacing:.08em;text-transform:uppercase;}
.hdr-actions{margin-left:auto;display:flex;gap:8px;align-items:center;}

.layout{display:grid;grid-template-columns:220px 1fr;min-height:calc(100vh - 58px);}
.sidebar{background:var(--dark);border-right:1px solid var(--border);padding:16px 12px;overflow-y:auto;}
.s-title{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--hint);margin-bottom:10px;padding-bottom:7px;border-bottom:1px solid var(--dark3);}
.s-section{margin-bottom:20px;}
.s-label{font-size:11px;color:var(--muted);margin-bottom:5px;display:block;}
.s-field{margin-bottom:11px;}
.s-field select,.s-field input[type=text],.s-field input[type=password]{width:100%;background:var(--dark3);border:1px solid var(--dark3);border-radius:5px;padding:7px 9px;font-family:"DM Sans",sans-serif;font-size:12px;color:var(--text);outline:none;transition:border-color .2s;}
.s-field select:focus,.s-field input:focus{border-color:var(--gold-dim);}
.chip-row{display:flex;flex-wrap:wrap;gap:5px;}
.chip{font-size:11px;padding:3px 9px;border-radius:3px;cursor:pointer;border:1px solid var(--dark3);color:var(--muted);background:var(--dark2);transition:all .15s;font-weight:500;}
.chip.on{background:rgba(201,168,76,.12);border-color:var(--gold-dim);color:var(--gold);}
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
.theme-box p{font-size:12px;color:var(--muted);margin-bottom:12px;line-height:1.6;}
.theme-row{display:flex;gap:10px;}
.theme-row input{flex:1;background:var(--dark3);border:1px solid var(--dark3);border-radius:5px;padding:9px 12px;font-family:"DM Sans",sans-serif;font-size:13px;color:var(--text);outline:none;}
.theme-row input:focus{border-color:var(--gold-dim);}
.quick-row{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px;}
.qchip{font-size:11px;padding:3px 9px;border-radius:3px;cursor:pointer;border:1px solid var(--dark3);color:var(--muted);background:var(--dark2);}
.qchip:hover{border-color:var(--gold-dim);color:var(--gold);}

.prog-wrap{margin-top:14px;}
.prog-track{height:3px;background:var(--dark3);border-radius:99px;overflow:hidden;}
.prog-fill{height:100%;background:linear-gradient(90deg,var(--gold-dim),var(--gold-light));border-radius:99px;width:0%;transition:width .4s;}
.prog-label{font-size:11px;color:var(--hint);text-align:center;margin-top:6px;}

.batch-bar{display:none;align-items:center;gap:8px;padding:10px 14px;background:var(--dark2);border:1px solid var(--border);border-radius:8px;margin-bottom:14px;flex-wrap:wrap;}
.batch-bar.show{display:flex;}
.batch-msg{font-size:11px;color:var(--gold);flex:1;font-weight:600;letter-spacing:.04em;}

.posts-list{display:flex;flex-direction:column;gap:10px;}
.post-card{background:var(--dark2);border:1px solid var(--dark3);border-radius:10px;overflow:hidden;transition:border-color .2s;}
.post-card:hover{border-color:var(--border);}
.card-head{display:flex;align-items:center;gap:10px;padding:9px 14px;background:var(--dark3);border-bottom:1px solid var(--dark3);}
.card-num{font-family:"Bebas Neue",sans-serif;font-size:16px;color:var(--gold);letter-spacing:.05em;min-width:28px;}
.card-div{font-size:11px;color:var(--muted);flex:1;letter-spacing:.04em;}
.card-time{font-size:11px;color:var(--hint);background:var(--dark2);padding:2px 9px;border-radius:3px;font-weight:600;}
.card-body{display:grid;grid-template-columns:1fr 175px;}
.card-text{padding:13px 15px;border-right:1px solid var(--dark3);}
.card-hl{font-family:"Bebas Neue",sans-serif;font-size:17px;letter-spacing:.05em;color:var(--gold-light);margin-bottom:7px;}
.card-cap{font-size:12px;line-height:1.75;color:var(--text);white-space:pre-wrap;margin-bottom:10px;}
.prompt-lbl{font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--hint);margin-bottom:5px;}
.card-prompt{font-size:11px;color:var(--muted);line-height:1.55;font-style:italic;border-left:2px solid var(--gold-dim);padding:6px 10px;border-radius:0 4px 4px 0;background:var(--dark3);}
.card-img-col{padding:13px;display:flex;flex-direction:column;gap:8px;align-items:center;justify-content:center;background:var(--dark3);}
.drop-zone{width:149px;height:149px;border-radius:6px;border:1.5px dashed var(--dark3);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;cursor:pointer;transition:all .2s;background:var(--dark2);}
.drop-zone:hover,.drop-zone.over{border-color:var(--gold-dim);background:rgba(201,168,76,.04);}
.drop-zone .dz-icon{font-size:24px;color:var(--hint);}
.drop-zone span{font-size:10px;color:var(--hint);text-align:center;line-height:1.4;}
.img-generating{width:149px;height:149px;border-radius:6px;border:1px solid var(--dark3);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:var(--dark2);font-size:10px;color:var(--hint);text-align:center;}
.img-preview{width:149px;height:149px;object-fit:cover;border-radius:6px;cursor:pointer;}
.spinner{width:22px;height:22px;border:2px solid var(--dark3);border-top-color:var(--gold);border-radius:50%;animation:spin .7s linear infinite;}
@keyframes spin{to{transform:rotate(360deg)}}
.card-foot{display:flex;align-items:center;gap:6px;padding:9px 14px;border-top:1px solid var(--dark3);background:var(--dark3);flex-wrap:wrap;}
.s-dot{width:6px;height:6px;border-radius:50%;background:var(--dark3);flex-shrink:0;}
.dot-r{background:#639922;}
.dot-p{background:var(--gold-dim);animation:pulse 1.2s infinite;}
.dot-s{background:#1D9E75;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.s-txt{font-size:11px;color:var(--muted);flex:1;}
.mbtn{font-size:11px;padding:3px 8px;color:var(--muted);border:1px solid var(--dark3);background:var(--dark2);border-radius:4px;cursor:pointer;font-family:"DM Sans",sans-serif;transition:all .15s;font-weight:500;}
.mbtn:hover{border-color:var(--gold-dim);color:var(--gold);}
.mbtn:disabled{opacity:.35;cursor:not-allowed;}
.mbtn-gold{border-color:var(--gold-dim)!important;color:var(--gold)!important;}

.btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:9px 18px;border-radius:5px;font-family:"DM Sans",sans-serif;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:all .2s;letter-spacing:.03em;}
.btn-gold{background:linear-gradient(135deg,var(--gold-dim),var(--gold-light));color:var(--black);}
.btn-gold:hover{filter:brightness(1.08);transform:translateY(-1px);}
.btn-dark{background:var(--dark3);color:var(--muted);border:1px solid var(--dark3);}
.btn-dark:hover{border-color:var(--border);color:var(--text);}
.btn-ghost{background:transparent;color:var(--muted);border:1px solid var(--dark3);}
.btn-ghost:hover{border-color:var(--border);color:var(--gold);}
.btn:disabled{opacity:.4;cursor:not-allowed;transform:none!important;}

.sched-table{border:1px solid var(--dark3);border-radius:8px;overflow:hidden;}
.sched-head{display:grid;grid-template-columns:40px 1fr 120px 100px;gap:10px;padding:9px 14px;background:var(--dark3);font-size:10px;color:var(--hint);text-transform:uppercase;letter-spacing:.1em;border-bottom:1px solid var(--dark3);}
.sched-row{display:grid;grid-template-columns:40px 1fr 120px 100px;gap:10px;padding:10px 14px;font-size:12px;border-bottom:1px solid var(--dark3);background:var(--dark2);align-items:center;}
.sched-row:last-child{border-bottom:none;}
.sched-row:hover{background:var(--dark3);}
.s-num{font-family:"Bebas Neue",sans-serif;font-size:16px;color:var(--gold);}
.pill{font-size:10px;font-weight:700;padding:2px 8px;border-radius:3px;letter-spacing:.04em;}
.pill-p{background:rgba(201,168,76,.1);color:var(--gold-dim);}
.pill-r{background:rgba(99,153,34,.12);color:#639922;}
.pill-s{background:rgba(29,158,117,.12);color:#1D9E75;}

.setup-sec{background:var(--dark2);border:1px solid var(--dark3);border-radius:8px;padding:18px;margin-bottom:12px;}
.setup-sec h3{font-family:"Playfair Display",serif;font-size:16px;color:var(--text);margin-bottom:6px;}
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
</style>
</head>
<body>

<header>
  <div class="logo">Tiny Dog Mafia<span>Content Studio</span></div>
  <div class="hdr-divider"></div>
  <div class="hdr-badge" id="name-badge" style="display:none"></div>
  <div class="hdr-actions">
    <button class="btn btn-ghost" style="font-size:11px;padding:5px 12px;" onclick="showSettings()">&#9881; Settings</button>
  </div>
</header>

<!-- SETTINGS MODAL -->
<div id="settings-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:500;align-items:center;justify-content:center;">
  <div style="background:var(--dark2);border:1px solid var(--border);border-radius:12px;padding:32px;width:420px;max-width:90vw;">
    <h2 style="font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.08em;color:var(--gold);margin-bottom:20px;">Studio Settings</h2>
    <div class="s-field"><label class="s-label">Yorkie\'s Name (optional)</label><input type="text" id="set-name" placeholder="Bella, Boss, Coco..." /></div>
    <div class="s-field"><label class="s-label">Gemini API Key &mdash; <a href="https://aistudio.google.com/apikey" target="_blank">get free key</a></label><input type="password" id="set-gemini" placeholder="AIza..." /></div>
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
        <div class="stat-box"><div class="stat-num" id="s-posts">0</div><div class="stat-lbl">Posts</div></div>
        <div class="stat-box"><div class="stat-num" id="s-imgs">0</div><div class="stat-lbl">Images</div></div>
        <div class="stat-box"><div class="stat-num" id="s-ready">0</div><div class="stat-lbl">Ready</div></div>
        <div class="stat-box"><div class="stat-num" id="s-sched">0</div><div class="stat-lbl">Scheduled</div></div>
      </div>
    </div>
    <div class="s-section">
      <div class="s-title">Post Settings</div>
      <div class="s-field"><label class="s-label">Posts to generate</label>
        <select id="post-count"><option value="19" selected>19 &mdash; Daily</option><option value="5">5 &mdash; Test</option><option value="10">10 &mdash; Half day</option><option value="25">25 &mdash; Full day</option></select>
      </div>
      <div class="s-field"><label class="s-label">First post time</label><input type="text" id="start-time" value="8:00 AM" /></div>
      <div class="s-field"><label class="s-label">Interval (minutes)</label><input type="text" id="interval" value="45" /></div>
    </div>
    <div class="s-section">
      <div class="s-title">Vibe / Tone</div>
      <div class="chip-row" id="tone-chips">
        <div class="chip on" onclick="pickChip(this,\'tone\',\'funny\')">Funny</div>
        <div class="chip" onclick="pickChip(this,\'tone\',\'cinematic\')">Cinematic</div>
        <div class="chip" onclick="pickChip(this,\'tone\',\'savage\')">Savage</div>
        <div class="chip" onclick="pickChip(this,\'tone\',\'wholesome\')">Wholesome</div>
        <div class="chip" onclick="pickChip(this,\'tone\',\'relatable\')">Relatable</div>
      </div>
    </div>
    <div class="s-section">
      <div class="s-title">CTA Style</div>
      <div class="chip-row" id="cta-chips">
        <div class="chip on" onclick="pickChip(this,\'cta\',\'engagement\')">Comments</div>
        <div class="chip" onclick="pickChip(this,\'cta\',\'tag\')">Tag a friend</div>
        <div class="chip" onclick="pickChip(this,\'cta\',\'save\')">Save / share</div>
        <div class="chip" onclick="pickChip(this,\'cta\',\'follow\')">Follow</div>
      </div>
    </div>
  </div>

  <div class="main">
    <div class="tabs">
      <div class="tab on" onclick="switchTab(\'generate\',this)">Generate</div>
      <div class="tab" onclick="switchTab(\'schedule\',this)">Schedule</div>
      <div class="tab" onclick="switchTab(\'facebook\',this)">Facebook Setup</div>
    </div>

    <div class="pane on" id="pane-generate">
      <div class="theme-box">
        <p>Enter today\'s theme &mdash; one idea generates all posts with captions, hooks, CTAs, and Gemini image prompts.</p>
        <div class="theme-row">
          <input type="text" id="theme-input" placeholder="e.g. morning chaos, pool day, grocery heist, spa demands..." />
          <button class="btn btn-gold" id="gen-btn" onclick="generateContent()">Generate &#10022;</button>
        </div>
        <div class="quick-row">
          <span style="font-size:10px;color:var(--hint);align-self:center;letter-spacing:.06em;text-transform:uppercase;">Quick:</span>
          <div class="qchip" onclick="setTheme(\'Monday morning chaos\')">Monday</div>
          <div class="qchip" onclick="setTheme(\'pool day takeover\')">Pool day</div>
          <div class="qchip" onclick="setTheme(\'grocery store heist\')">Grocery</div>
          <div class="qchip" onclick="setTheme(\'spa day demands\')">Spa day</div>
          <div class="qchip" onclick="setTheme(\'holiday gift chaos\')">Holiday</div>
          <div class="qchip" onclick="setTheme(\'remote work supervision\')">WFH</div>
          <div class="qchip" onclick="setTheme(\'dinner table negotiations\')">Dinner</div>
        </div>
        <div id="prog-wrap" style="display:none;" class="prog-wrap">
          <div class="prog-track"><div class="prog-fill" id="prog-fill"></div></div>
          <div class="prog-label" id="prog-label">Briefing the crew...</div>
        </div>
      </div>

      <div class="batch-bar" id="batch-bar">
        <span class="batch-msg" id="batch-msg">Posts ready</span>
        <button class="btn btn-gold" id="gen-imgs-btn" onclick="generateAllImages()" style="font-size:11px;padding:7px 14px;">&#9728; Generate All Images</button>
        <button class="btn btn-dark" onclick="copyAllCaptions()" style="font-size:11px;padding:7px 12px;">&#128203; Copy Captions</button>
        <button class="btn btn-gold" id="sched-all-btn" onclick="scheduleAllPosts()" style="font-size:11px;padding:7px 14px;display:none;">&#128640; Schedule All to FB</button>
        <button class="btn btn-ghost" onclick="clearAll()" style="font-size:11px;padding:7px 12px;">&#10005; Clear</button>
      </div>

      <div id="img-progress" style="display:none;padding:0 0 14px;">
        <div class="prog-track"><div class="prog-fill" id="img-prog-fill"></div></div>
        <div class="prog-label" id="img-prog-label">Generating images...</div>
      </div>

      <div id="posts-container">
        <div class="empty"><span class="empty-icon">&#128081;</span><h3>Awaiting Orders</h3><p>Enter a theme above and click Generate to brief the crew. 19 cinematic posts ready to deploy.</p></div>
      </div>
    </div>

    <div class="pane" id="pane-schedule">
      <div id="sched-container">
        <div class="empty"><span class="empty-icon">&#128197;</span><h3>No Posts Yet</h3><p>Generate content first &mdash; your daily schedule will appear here.</p></div>
      </div>
    </div>

    <div class="pane" id="pane-facebook">
      <div class="alert alert-gold" style="margin-bottom:18px;"><strong>Current status:</strong> Complete the steps below to enable one-click scheduling to Facebook &amp; Instagram via the Graph API.</div>

      <div class="setup-sec">
        <h3>Step 1 &mdash; Create a Facebook Developer App</h3>
        <p>Free setup, ~15 minutes. Gives the studio permission to post to your page on your behalf.</p>
        <ol class="step-list">
          <li>Go to <strong>developers.facebook.com</strong> and log in</li>
          <li>Click <strong>My Apps &rarr; Create App &rarr; Business</strong></li>
          <li>Name it "Tiny Dog Mafia Studio"</li>
          <li>Add products: <strong>Facebook Login</strong> and <strong>Pages API</strong></li>
        </ol>
      </div>

      <div class="setup-sec">
        <h3>Step 2 &mdash; Get Your Page Access Token</h3>
        <ol class="step-list">
          <li>In your Developer App go to <strong>Tools &rarr; Graph API Explorer</strong></li>
          <li>Select your app, then select <strong>Tiny Dog Mafia</strong> as the page</li>
          <li>Add permissions: <code>pages_manage_posts</code> <code>pages_read_engagement</code> <code>instagram_content_publish</code></li>
          <li>Click <strong>Generate Access Token</strong> and copy it</li>
        </ol>
      </div>

      <div class="setup-sec">
        <h3>Step 3 &mdash; Enter Credentials</h3>
        <div class="two-col">
          <div><label class="s-label">Facebook Page ID</label><input type="text" id="fb-page-id" placeholder="123456789012345" style="width:100%;background:var(--dark3);border:1px solid var(--dark3);border-radius:5px;padding:8px 10px;font-family:\'DM Sans\',sans-serif;font-size:13px;color:var(--text);outline:none;"></div>
          <div><label class="s-label">Page Access Token</label><input type="password" id="fb-token" placeholder="EAABx..." style="width:100%;background:var(--dark3);border:1px solid var(--dark3);border-radius:5px;padding:8px 10px;font-family:\'DM Sans\',sans-serif;font-size:13px;color:var(--text);outline:none;"></div>
        </div>
        <div class="two-col">
          <div><label class="s-label">Instagram Account ID <span style="color:var(--hint)">(optional)</span></label><input type="text" id="ig-id" placeholder="From IG Business Settings" style="width:100%;background:var(--dark3);border:1px solid var(--dark3);border-radius:5px;padding:8px 10px;font-family:\'DM Sans\',sans-serif;font-size:13px;color:var(--text);outline:none;"></div>
          <div style="display:flex;align-items:flex-end;"><button class="btn btn-gold" onclick="testFB()" style="width:100%;">Save &amp; Test Connection</button></div>
        </div>
        <div id="fb-result" style="display:none;margin-top:8px;"></div>
      </div>

      <div class="alert alert-info">
        <strong>Token expiry:</strong> Long-lived page tokens can be extended to never-expire via the Token Debugger in your Facebook Developer dashboard.
      </div>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
const S = {
  name: localStorage.getItem(\'tdm_name\') || \'\',
  geminiKey: localStorage.getItem(\'tdm_gemini\') || \'\',
  tone: \'funny\', cta: \'engagement\',
  posts: [], fbPageId: \'\', fbToken: \'\', igId: \'\'
};

// Init name badge
if (S.name) { document.getElementById(\'name-badge\').textContent = S.name + "\'s Page"; document.getElementById(\'name-badge\').style.display = \'inline-flex\'; }

function showSettings() {
  document.getElementById(\'set-name\').value = S.name;
  document.getElementById(\'set-gemini\').value = S.geminiKey;
  document.getElementById(\'settings-modal\').style.display = \'flex\';
}
function hideSettings() { document.getElementById(\'settings-modal\').style.display = \'none\'; }
function saveSettings() {
  S.name = document.getElementById(\'set-name\').value.trim();
  S.geminiKey = document.getElementById(\'set-gemini\').value.trim();
  localStorage.setItem(\'tdm_name\', S.name);
  localStorage.setItem(\'tdm_gemini\', S.geminiKey);
  const b = document.getElementById(\'name-badge\');
  if (S.name) { b.textContent = S.name + "\'s Page"; b.style.display = \'inline-flex\'; } else { b.style.display = \'none\'; }
  hideSettings(); toast(\'Settings saved!\');
}

function switchTab(id, el) {
  document.querySelectorAll(\'.tab\').forEach(t => t.classList.remove(\'on\'));
  document.querySelectorAll(\'.pane\').forEach(p => p.classList.remove(\'on\'));
  el.classList.add(\'on\'); document.getElementById(\'pane-\' + id).classList.add(\'on\');
}
function pickChip(el, group, val) {
  document.querySelectorAll(\'#\' + group + \'-chips .chip\').forEach(c => c.classList.remove(\'on\'));
  el.classList.add(\'on\'); S[group] = val;
}
function setTheme(t) { document.getElementById(\'theme-input\').value = t; }
function toast(msg) {
  const t = document.getElementById(\'toast\');
  t.textContent = msg; t.classList.add(\'show\');
  setTimeout(() => t.classList.remove(\'show\'), 3500);
}
function setProgress(pct, label, id) {
  document.getElementById(id || \'prog-fill\').style.width = pct + \'%\';
  document.getElementById(id === \'img-prog-fill\' ? \'img-prog-label\' : \'prog-label\').textContent = label;
}
function updateStats() {
  document.getElementById(\'s-posts\').textContent = S.posts.length;
  document.getElementById(\'s-imgs\').textContent = S.posts.filter(p => p.imgUrl).length;
  document.getElementById(\'s-ready\').textContent = S.posts.filter(p => p.status === \'ready\').length;
  document.getElementById(\'s-sched\').textContent = S.posts.filter(p => p.scheduled).length;
}

async function generateContent() {
  const theme = document.getElementById(\'theme-input\').value.trim();
  if (!theme) { toast(\'Enter a theme first\'); return; }
  const count = parseInt(document.getElementById(\'post-count\').value);
  const btn = document.getElementById(\'gen-btn\');
  btn.disabled = true; btn.textContent = \'Briefing...\';
  document.getElementById(\'prog-wrap\').style.display = \'block\';
  setProgress(10, \'Briefing the crew...\');
  try {
    setProgress(25, \'Writing \' + count + \' cinematic posts...\');
    const res = await fetch(\'/tdm/api/generate\', {
      method: \'POST\',
      headers: {\'Content-Type\': \'application/json\'},
      body: JSON.stringify({ theme, count, tone: S.tone, cta: S.cta, dogName: S.name || \'the Yorkie\' })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    setProgress(100, \'The crew is ready.\');
    S.posts = data.posts.map((p, i) => ({ id: i, headline: p.headline, division: p.division, caption: p.caption, imagePrompt: p.imagePrompt, imgUrl: null, status: \'draft\', scheduled: false }));
    setTimeout(() => {
      document.getElementById(\'prog-wrap\').style.display = \'none\';
      renderPosts(); updateStats();
      document.getElementById(\'batch-bar\').classList.add(\'show\');
      document.getElementById(\'batch-msg\').textContent = S.posts.length + \' posts ready — generate images then schedule\';
      renderSchedule();
    }, 400);
  } catch(err) {
    toast(\'Error: \' + err.message);
    document.getElementById(\'prog-wrap\').style.display = \'none\';
  }
  btn.disabled = false; btn.textContent = \'Generate \u2726\';
}

function renderPosts() {
  const start = parseTime(document.getElementById(\'start-time\').value);
  const intv = parseInt(document.getElementById(\'interval\').value) || 45;
  document.getElementById(\'posts-container\').innerHTML = \'<div class="posts-list">\' +
    S.posts.map((p, i) => {
      const t = fmtTime(addMins(start, i * intv));
      const imgHtml = p.imgUrl
        ? \'<img src="\' + p.imgUrl + \'" class="img-preview" alt="Post \' + (i+1) + \'" onclick="triggerUpload(\' + i + \')" title="Click to replace">\'
        : \'<div class="drop-zone" id="dz-\' + i + \'" onclick="triggerUpload(\' + i + \')" ondragover="dzOver(event,\' + i + \')" ondragleave="dzLeave(\' + i + \')" ondrop="dzDrop(event,\' + i + \')"><span class="dz-icon">\u2606</span><span>Generate or drop image</span></div>\';
      const sc = (p.imgUrl && !p.scheduled) ? \'mbtn mbtn-gold\' : \'mbtn\';
      const st = p.scheduled ? \'\u2713 Scheduled\' : \'\u25B6 Schedule\';
      return \'<div class="post-card" id="card-\' + i + \'">\' +
        \'<div class="card-head"><span class="card-num">#\' + String(i+1).padStart(2,\'0\') + \'</span><span class="card-div">\' + esc(p.division) + \'</span><span class="card-time">\' + t + \'</span></div>\' +
        \'<div class="card-body"><div class="card-text"><div class="card-hl">\' + esc(p.headline) + \'</div><div class="card-cap">\' + esc(p.caption) + \'</div><div class="prompt-lbl">Image Prompt</div><div class="card-prompt">\' + esc(p.imagePrompt) + \'</div></div>\' +
        \'<div class="card-img-col"><input type="file" id="file-\' + i + \'" accept="image/*" style="display:none" onchange="fileSelected(event,\' + i + \')"><div id="img-\' + i + \'">\' + imgHtml + \'</div><button class="mbtn" onclick="genSingleImage(\' + i + \')" style="font-size:10px;">\u21BB Regen</button></div></div>\' +
        \'<div class="card-foot"><div class="s-dot \' + (p.imgUrl ? (p.scheduled ? \'dot-s\' : \'dot-r\') : \'dot-p\') + \'" id="dot-\' + i + \'"></div><span class="s-txt" id="stxt-\' + i + \'">\' + (p.scheduled ? \'Scheduled for \' + t : p.imgUrl ? \'Image ready \u2014 click Schedule\' : \'Awaiting image\') + \'</span><button class="mbtn" onclick="copyCaption(\' + i + \')">\u27a4 Caption</button><button class="\' + sc + \'" id="sched-btn-\' + i + \'" onclick="schedulePost(\' + i + \')" \' + (p.imgUrl ? \'\' : \'disabled\') + \'>\' + st + \'</button></div>\' +
        \'</div>\';
    }).join(\'\') + \'</div>\';
}

function triggerUpload(idx) { document.getElementById(\'file-\' + idx).click(); }
function fileSelected(e, idx) { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => applyImage(idx, ev.target.result); r.readAsDataURL(f); }
function dzOver(e, idx) { e.preventDefault(); const d = document.getElementById(\'dz-\' + idx); if(d) d.classList.add(\'over\'); }
function dzLeave(idx) { const d = document.getElementById(\'dz-\' + idx); if(d) d.classList.remove(\'over\'); }
function dzDrop(e, idx) { e.preventDefault(); dzLeave(idx); const f = e.dataTransfer.files[0]; if (!f||!f.type.startsWith(\'image/\')) { toast(\'Drop an image file\'); return; } const r = new FileReader(); r.onload = ev => applyImage(idx, ev.target.result); r.readAsDataURL(f); }

function applyImage(idx, dataUrl) {
  S.posts[idx].imgUrl = dataUrl; S.posts[idx].status = \'ready\';
  document.getElementById(\'img-\' + idx).innerHTML = \'<img src="\' + dataUrl + \'" class="img-preview" onclick="triggerUpload(\' + idx + \')" title="Click to replace">\';
  document.getElementById(\'dot-\' + idx).className = \'s-dot dot-r\';
  document.getElementById(\'stxt-\' + idx).textContent = \'Image ready \u2014 click Schedule\';
  const sb = document.getElementById(\'sched-btn-\' + idx);
  if (sb) { sb.disabled = false; sb.className = \'mbtn mbtn-gold\'; }
  updateStats(); checkSchedAll(); renderSchedule();
  toast(\'Image set for post #\' + (idx+1));
}

async function genSingleImage(idx) {
  const p = S.posts[idx];
  const imgDiv = document.getElementById(\'img-\' + idx);
  document.getElementById(\'dot-\' + idx).className = \'s-dot dot-p\';
  document.getElementById(\'stxt-\' + idx).textContent = \'Generating with Gemini...\';
  imgDiv.innerHTML = \'<div class="img-generating"><div class="spinner"></div><span>Generating...</span></div>\';
  try {
    const res = await fetch(\'/tdm/api/image\', {
      method: \'POST\',
      headers: {\'Content-Type\': \'application/json\'},
      body: JSON.stringify({ prompt: p.imagePrompt, geminiKey: S.geminiKey })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    applyImage(idx, data.dataUrl);
  } catch(err) {
    imgDiv.innerHTML = \'<div class="drop-zone" id="dz-\' + idx + \'" onclick="triggerUpload(\' + idx + \')" ondragover="dzOver(event,\' + idx + \')" ondragleave="dzLeave(\' + idx + \')" ondrop="dzDrop(event,\' + idx + \')"><span style="font-size:18px">\u26a0\ufe0f</span><span>Error \u2014 retry or upload</span></div>\';
    document.getElementById(\'dot-\' + idx).className = \'s-dot\';
    document.getElementById(\'stxt-\' + idx).textContent = \'Error: \' + err.message.substring(0, 70);
    toast(\'Image error: \' + err.message.substring(0, 60));
  }
}

async function generateAllImages() {
  const btn = document.getElementById(\'gen-imgs-btn\');
  btn.disabled = true; btn.textContent = \'Generating...\';
  const total = S.posts.length;
  document.getElementById(\'img-progress\').style.display = \'block\';
  for (let i = 0; i < total; i++) {
    if (!S.posts[i].imgUrl) {
      document.getElementById(\'img-prog-fill\').style.width = Math.round((i/total)*100) + \'%\';
      document.getElementById(\'img-prog-label\').textContent = \'Generating image \' + (i+1) + \' of \' + total + \'...\';
      await genSingleImage(i);
      await new Promise(r => setTimeout(r, 1200));
    }
  }
  document.getElementById(\'img-prog-fill\').style.width = \'100%\';
  document.getElementById(\'img-prog-label\').textContent = \'All images done!\';
  setTimeout(() => { document.getElementById(\'img-progress\').style.display = \'none\'; }, 2500);
  btn.disabled = false; btn.textContent = \'\u2728 Regenerate Images\';
  toast(\'All \' + total + \' images generated!\');
}

async function schedulePost(idx) {
  const fbId = document.getElementById(\'fb-page-id\').value.trim();
  const fbTk = document.getElementById(\'fb-token\').value.trim();
  if (!fbId || !fbTk) { toast(\'Connect Facebook first \u2014 go to Facebook Setup tab\'); return; }
  const p = S.posts[idx]; if (!p.imgUrl) { toast(\'Generate or upload an image first\'); return; }
  const btn = document.getElementById(\'sched-btn-\' + idx); btn.textContent = \'...\'; btn.disabled = true;
  const start = parseTime(document.getElementById(\'start-time\').value);
  const intv = parseInt(document.getElementById(\'interval\').value) || 45;
  const postTime = addMins(start, idx * intv);
  const now = new Date(); const schedDate = new Date(now);
  schedDate.setHours(postTime.h, postTime.m, 0, 0);
  if (schedDate <= now) schedDate.setDate(schedDate.getDate() + 1);
  if (schedDate - now < 10*60*1000) schedDate.setTime(now.getTime() + 11*60*1000);
  const unixTime = Math.floor(schedDate.getTime() / 1000);
  try {
    const res = await fetch(\'/tdm/api/schedule\', {
      method: \'POST\',
      headers: {\'Content-Type\': \'application/json\'},
      body: JSON.stringify({ pageId: fbId, token: fbTk, caption: p.caption, imageB64: p.imgUrl, scheduledTime: unixTime })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    S.posts[idx].scheduled = true;
    btn.textContent = \'\u2713 Scheduled\'; btn.style.color = \'#1D9E75\'; btn.style.borderColor = \'#1D9E75\';
    document.getElementById(\'dot-\' + idx).className = \'s-dot dot-s\';
    document.getElementById(\'stxt-\' + idx).textContent = \'Scheduled for \' + fmtTime(postTime);
    updateStats(); renderSchedule(); toast(\'Post #\' + (idx+1) + \' scheduled for \' + fmtTime(postTime));
  } catch(err) { btn.textContent = \'\u25B6 Schedule\'; btn.disabled = false; toast(\'Error: \' + err.message); }
}

async function scheduleAllPosts() {
  const ready = S.posts.filter(p => p.imgUrl && !p.scheduled);
  if (!ready.length) { toast(\'No unscheduled posts with images\'); return; }
  const fbId = document.getElementById(\'fb-page-id\').value.trim();
  const fbTk = document.getElementById(\'fb-token\').value.trim();
  if (!fbId || !fbTk) { toast(\'Connect Facebook first\'); return; }
  const btn = document.getElementById(\'sched-all-btn\'); btn.disabled = true; btn.textContent = \'Scheduling...\';
  for (let i = 0; i < S.posts.length; i++) {
    if (S.posts[i].imgUrl && !S.posts[i].scheduled) { await schedulePost(i); await new Promise(r => setTimeout(r, 900)); }
  }
  btn.disabled = false; btn.textContent = \'\u2713 All Scheduled\'; toast(\'All posts scheduled!\');
}

function checkSchedAll() {
  const r = S.posts.filter(p => p.imgUrl).length;
  const btn = document.getElementById(\'sched-all-btn\');
  if (btn) btn.style.display = r > 0 ? \'inline-flex\' : \'none\';
  const msg = document.getElementById(\'batch-msg\');
  if (msg) msg.textContent = r === S.posts.length ? \'All \' + r + \' images ready \u2014 click Schedule All\' : r + \' of \' + S.posts.length + \' images ready\';
}

function copyCaption(i) { navigator.clipboard.writeText(S.posts[i].caption); toast(\'Caption copied!\'); }
function copyAllCaptions() { navigator.clipboard.writeText(S.posts.map((p,i) => \'POST \' + (i+1) + \' \u2014 \' + p.headline + \'\\n\' + p.caption).join(\'\\n\\n---\\n\\n\')); toast(\'All captions copied!\'); }

function clearAll() {
  S.posts = [];
  document.getElementById(\'posts-container\').innerHTML = \'<div class="empty"><span class="empty-icon">\u{1F451}</span><h3>Awaiting Orders</h3><p>Enter a theme above and click Generate to brief the crew.</p></div>\';
  document.getElementById(\'batch-bar\').classList.remove(\'show\');
  document.getElementById(\'img-progress\').style.display = \'none\';
  document.getElementById(\'sched-container\').innerHTML = \'<div class="empty"><span class="empty-icon">\u{1F4C5}</span><h3>No Posts Yet</h3><p>Generate content first.</p></div>\';
  updateStats();
}

function renderSchedule() {
  if (!S.posts.length) return;
  const start = parseTime(document.getElementById(\'start-time\').value);
  const intv = parseInt(document.getElementById(\'interval\').value) || 45;
  const rows = S.posts.map((p,i) => {
    const t = fmtTime(addMins(start, i*intv));
    const pill = p.scheduled ? \'<span class="pill pill-s">Scheduled</span>\' : p.imgUrl ? \'<span class="pill pill-r">Image ready</span>\' : \'<span class="pill pill-p">No image</span>\';
    return \'<div class="sched-row"><span class="s-num">\' + (i+1) + \'</span><span style="font-size:11px">\' + esc(p.caption.substring(0,58)) + \'...</span><span class="s-time">\' + t + \'</span>\' + pill + \'</div>\';
  }).join(\'\');
  document.getElementById(\'sched-container\').innerHTML = \'<div class="sched-table"><div class="sched-head"><span>#</span><span>Caption</span><span>Time</span><span>Status</span></div>\' + rows + \'</div>\';
}

function testFB() {
  const pageId = document.getElementById(\'fb-page-id\').value.trim();
  const token = document.getElementById(\'fb-token\').value.trim();
  S.fbPageId = pageId; S.fbToken = token;
  const res = document.getElementById(\'fb-result\'); res.style.display = \'block\';
  if (!pageId || !token) { res.innerHTML = \'<div class="alert alert-gold">Enter both Page ID and Access Token.</div>\'; return; }
  res.innerHTML = \'<div class="alert alert-info">Testing connection...</div>\';
  fetch(\'https://graph.facebook.com/v19.0/\' + pageId + \'?fields=name,fan_count&access_token=\' + token)
    .then(r => r.json())
    .then(d => {
      if (d.error) { res.innerHTML = \'<div class="alert alert-err">\u274C \' + d.error.message + \'</div>\'; }
      else { res.innerHTML = \'<div class="alert alert-ok">\u2705 Connected to "\' + d.name + \'" \u2014 \' + (d.fan_count||0).toLocaleString() + \' followers. Ready to schedule.</div>\'; toast(\'Connected!\'); }
    })
    .catch(e => { res.innerHTML = \'<div class="alert alert-err">\u274C \' + e.message + \'</div>\'; });
}

function parseTime(s) { const m = s.trim().toUpperCase().match(/(\\d+):(\\d+)\\s*(AM|PM)?/); if (!m) return {h:8,m:0}; let h=parseInt(m[1]),min=parseInt(m[2]); if(m[3]==="PM"&&h<12)h+=12; if(m[3]==="AM"&&h===12)h=0; return {h,m:min}; }
function addMins(t,mins) { const total=t.h*60+t.m+mins; return {h:Math.floor(total/60)%24,m:total%60}; }
function fmtTime(t) { const h=t.h%12||12,ap=t.h<12?"AM":"PM"; return h+":"+String(t.m).padStart(2,"0")+" "+ap; }
function esc(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
</script>
</body>
</html>'''
