"""
tdm_routes.py  —  Tiny Dog Mafia Content Studio
Routes:
    GET  /tdm                      -> Studio HTML
    POST /tdm/api/generate         -> Generate image posts
    POST /tdm/api/generate-video   -> Generate video scripts
    POST /tdm/api/image            -> Gemini image generation
    POST /tdm/api/schedule         -> Facebook Graph API scheduling
    POST /tdm/api/schedule-buffer  -> Buffer scheduling (future)
"""

import os, json, base64, requests
from datetime import datetime
from flask import Blueprint, request, jsonify, Response

tdm_bp = Blueprint('tdm', __name__, url_prefix='/tdm')

ANTHROPIC_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
GEMINI_KEY    = os.environ.get('GEMINI_API_KEY', '')

DAY_THEMES = {
    0: {'name': 'Monday Mayhem',        'focus': 'chaos, taking over the week, Monday energy, the Yorkie refusing to acknowledge Monday rules'},
    1: {'name': 'Tiny Boss Tuesday',    'focus': 'authority, running things, executive decisions, board meetings, the Yorkie in charge'},
    2: {'name': 'Hump Day Heist',       'focus': 'mid-week operations, Wednesday chaos, executing plans, the crew in action'},
    3: {'name': 'Throwback Thursday',   'focus': 'origin stories, how it all started, nostalgic moments, the early days of the Yorkie empire'},
    4: {'name': 'Friday Operations',    'focus': 'weekend prep, letting loose, Friday energy, end of week enforcement, celebrating wins'},
    5: {'name': 'Saturday Takeover',    'focus': 'leisure, supervising the weekend, pool days, brunch, the Yorkie running Saturday'},
    6: {'name': 'Sunday Surveillance',  'focus': 'relaxing but still watching everything, lazy Sunday supervision, strategic rest, planning the week'},
}


@tdm_bp.route('/', methods=['GET'])
def studio():
    return Response(STUDIO_HTML, mimetype='text/html')


@tdm_bp.route('/api/generate', methods=['POST'])
def generate():
    data     = request.get_json()
    theme    = data.get('theme', '')
    count    = int(data.get('count', 19))
    tone     = data.get('tone', 'funny')
    cta      = data.get('cta', 'engagement')
    dog_name = data.get('dogName', 'the Yorkie')
    day_idx  = int(data.get('dayIndex', datetime.now().weekday()))

    tone_map = {'funny':'comedic and deadpan','cinematic':'dramatic and cinematic',
                'savage':'hilariously savage','wholesome':'charming and wholesome','relatable':'laugh-out-loud relatable'}
    cta_map  = {'engagement':'end with a funny question that drives comments',
                'tag':'tell followers to tag someone who acts like this',
                'save':'encourage saving or sharing','follow':'invite people to follow the page'}

    day_theme = DAY_THEMES[day_idx]
    effective_theme = theme if theme else day_theme['name']

    system_prompt = (
        'You are the creative director for "Tiny Dog Mafia," a viral Yorkie Facebook and Instagram page. '
        'The brand voice is: tiny dog, big attitude, mafia/boss persona. Every post treats the Yorkie as if '
        'it runs a crime family division operating inside everyday domestic situations. The humor is deadpan, '
        'cinematic, and absurdist. All image prompts follow a strict cinematic style: photorealistic, 4:5 aspect '
        'ratio, bold gold text overlay with a headline, and a "Tiny Dog Mafia [Division Name]" subtitle. '
        'The Yorkie always has silky steel-blue and tan fur, a mischievous expression, and is often wearing a tiny outfit. '
        'Respond ONLY with valid JSON. No markdown. No code fences. No preamble.'
    )

    user_prompt = f"""Generate exactly {count} unique Tiny Dog Mafia social media image posts.
Daily theme: "{effective_theme}" — {day_theme['focus']}
User theme override: "{theme if theme else 'none — use daily theme'}"

For each post create 3 sections:

SECTION 1 - "imagePrompt": Photorealistic cinematic 4:5 image prompt. Yorkshire Terrier with silky steel-blue and tan fur. Include specific situation, tiny outfit, bold gold text overlay with headline, Tiny Dog Mafia division subtitle. Warm cinematic lighting, shallow depth of field.

SECTION 2 - "caption": EXACT structure:
LINE 1 HOOK: scroll-stopping statement. "Your dog doesn't help. They supervise." style.
LINES 2-5 SCENE: 3-4 short punchy lines building tension one beat at a time.
LINE 6 PAYOFF: funny punchline with 2-3 emojis
LINE 7 CLOSING: dry deadpan line treating {dog_name} as authority figure
LINE 8 CTA: {cta_map[cta]}
LINE 9 HASHTAGS: 5-6 hashtags
Tone: {tone_map[tone]}

SECTION 3 - "firstComment": Engaging first comment. A fun follow-up or extra detail that rewards people who read comments. 1-2 sentences, no hashtags.

Also include: "headline" (2-6 word ALL CAPS), "division" (fake TDM division name)

Make every post fresh — vary situations, outfits, settings. Dog is ALWAYS in charge.
JSON: {{"posts":[{{"headline":"...","division":"...","imagePrompt":"...","caption":"...","firstComment":"..."}}]}}"""

    try:
        resp = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers={'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01'},
            json={'model':'claude-sonnet-4-20250514','max_tokens':8000,'system':system_prompt,
                  'messages':[{'role':'user','content':user_prompt}]},
            timeout=120
        )
        result = resp.json()
        raw = result['content'][0]['text'].strip().replace('```json','').replace('```','').strip()
        posts = json.loads(raw)
        return jsonify({'ok':True,'posts':posts['posts'],'themeName':effective_theme})
    except Exception as e:
        return jsonify({'ok':False,'error':str(e)}), 500


@tdm_bp.route('/api/generate-video', methods=['POST'])
def generate_video():
    data       = request.get_json()
    video_type = data.get('videoType', 'short')
    count      = int(data.get('count', 3))
    theme      = data.get('theme', '')
    day_idx    = int(data.get('dayIndex', datetime.now().weekday()))
    dog_name   = data.get('dogName', 'the Yorkie')

    day_theme = DAY_THEMES[day_idx]
    effective_theme = theme if theme else day_theme['name']

    if video_type == 'short':
        duration_rules = """SHORT-FORM VIDEO (12 seconds) for Hypernatural:
- 2-4 scene changes maximum
- One dominant visual concept, constant movement
- Loopable ending shot
- Comedic or hype-driven pacing
- Hook lands within first 1-2 seconds
- Extremely short CTA"""
        script_note = "Punchy 12-second Hypernatural narration. Fast cuts, visual comedy, Tiny Dog Mafia energy."
    else:
        duration_rules = """LONG-FORM VIDEO (70-90 seconds) for Hypernatural:
- Comedic opening hook establishing the Yorkie's authority
- Escalating absurdity every 10-15 seconds
- At least one unexpected twist
- Deadpan narration throughout
- Strong engagement CTA ending"""
        script_note = "Full 70-90 second Hypernatural narration with comedic escalation arc."

    system_prompt = (
        'You are the video director for Tiny Dog Mafia, a viral Yorkie social media brand. '
        'Generate cinematic, comedic video scripts treating the Yorkie as a tiny crime boss. '
        'Scripts must be pure Hypernatural-compatible narration — no scene descriptions, no production notes. '
        'Deadpan, absurdist, visually driven. Respond ONLY with valid JSON.'
    )

    user_prompt = f"""Generate exactly {count} unique Tiny Dog Mafia {video_type}-form video scripts.
Daily theme: "{effective_theme}" — {day_theme['focus']}

{duration_rules}

For each video create 3 sections:

SECTION 1 - "videoScript": {script_note} Pure narration only — Hypernatural compatible. No brackets, no scene notes. Just the script text as it would be read/displayed.

SECTION 2 - "captionAndHashtags": A powerful hook line. 2-3 lines of comedic context. CTA. 5-6 hashtags. All combined.

SECTION 3 - "firstComment": Engaging first comment that adds to the comedy or references a specific moment in the video. 1-2 sentences.

Also include:
- "imagePrompt": Cinematic still image for the key scene of this video. For OpenArt. Photorealistic, Yorkie with steel-blue and tan fur, era-appropriate tiny outfit, dramatic lighting.
- "mood": The comedic mood/energy of this video
- "videoType": "{video_type}"

Each of the {count} scripts must have a completely different premise, setting, and comedic angle.
JSON: {{"videos":[{{"videoScript":"...","captionAndHashtags":"...","firstComment":"...","imagePrompt":"...","mood":"...","videoType":"{video_type}"}}]}}"""

    try:
        resp = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers={'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01'},
            json={'model':'claude-sonnet-4-20250514','max_tokens':6000,'system':system_prompt,
                  'messages':[{'role':'user','content':user_prompt}]},
            timeout=120
        )
        result = resp.json()
        raw = result['content'][0]['text'].strip().replace('```json','').replace('```','').strip()
        videos = json.loads(raw)
        return jsonify({'ok':True,'videos':videos['videos'],'themeName':effective_theme,'videoType':video_type})
    except Exception as e:
        return jsonify({'ok':False,'error':str(e)}), 500


@tdm_bp.route('/api/image', methods=['POST'])
def generate_image():
    data   = request.get_json()
    prompt = data.get('prompt', '')
    key    = data.get('geminiKey') or GEMINI_KEY

    if not key:
        return jsonify({'ok':False,'error':'No Gemini API key configured'}), 400

    models = ['gemini-2.5-flash-image','gemini-2.0-flash-preview-image-generation']
    last_error = ''
    for model in models:
        try:
            url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}'
            body = {'contents':[{'parts':[{'text':prompt}],'role':'user'}],
                    'generationConfig':{'responseModalities':['TEXT','IMAGE']}}
            r = requests.post(url, json=body, timeout=60)
            d = r.json()
            if 'error' in d:
                last_error = f"{model}: {d['error']['message']}"; continue
            parts = d.get('candidates',[{}])[0].get('content',{}).get('parts',[])
            img_part = next((p for p in parts if 'inlineData' in p), None)
            if not img_part:
                last_error = f'{model}: No image in response'; continue
            mime = img_part['inlineData']['mimeType']
            b64  = img_part['inlineData']['data']
            return jsonify({'ok':True,'dataUrl':f'data:{mime};base64,{b64}','model':model})
        except Exception as e:
            last_error = f'{model}: {str(e)}'; continue

    return jsonify({'ok':False,'error':last_error}), 500


@tdm_bp.route('/api/schedule', methods=['POST'])
def schedule_post():
    data       = request.get_json()
    page_id    = data.get('pageId', '')
    token      = data.get('token', '')
    caption    = data.get('caption', '')
    image_b64  = data.get('imageB64', '')
    sched_time = int(data.get('scheduledTime'))

    if not all([page_id, token, caption, image_b64]):
        return jsonify({'ok':False,'error':'Missing required fields'}), 400

    try:
        header, encoded = image_b64.split(',', 1)
        img_bytes = base64.b64decode(encoded)

        upload_resp = requests.post(
            f'https://graph.facebook.com/v19.0/{page_id}/photos',
            data={'published':'false','access_token':token},
            files={'source':('image.jpg',img_bytes,'image/jpeg')},
            timeout=30
        )
        upload_data = upload_resp.json()
        if 'error' in upload_data:
            return jsonify({'ok':False,'error':upload_data['error']['message']}), 400
        photo_id = upload_data['id']

        post_resp = requests.post(
            f'https://graph.facebook.com/v19.0/{page_id}/feed',
            data={'message':caption,'attached_media':json.dumps([{'media_fbid':photo_id}]),
                  'scheduled_publish_time':sched_time,'published':'false','access_token':token},
            timeout=30
        )
        post_data = post_resp.json()
        if 'error' in post_data:
            return jsonify({'ok':False,'error':post_data['error']['message']}), 400

        return jsonify({'ok':True,'postId':post_data.get('id','')})
    except Exception as e:
        return jsonify({'ok':False,'error':str(e)}), 500


@tdm_bp.route('/api/schedule-buffer', methods=['POST'])
def schedule_buffer():
    data          = request.get_json()
    buffer_token  = data.get('bufferToken','')
    profile_ids   = data.get('profileIds',[])
    caption       = data.get('caption','')
    image_b64     = data.get('imageB64','')
    sched_time    = int(data.get('scheduledTime',0))

    if not buffer_token or not profile_ids or not caption:
        return jsonify({'ok':False,'error':'Missing required fields'}), 400

    try:
        media_id = None
        if image_b64:
            header, encoded = image_b64.split(',', 1)
            img_bytes = base64.b64decode(encoded)
            upload_resp = requests.post(
                'https://api.bufferapp.com/1/media/upload.json',
                headers={'Authorization':f'Bearer {buffer_token}'},
                files={'file':('image.jpg',img_bytes,'image/jpeg')}, timeout=30
            )
            upload_data = upload_resp.json()
            if upload_data.get('id'):
                media_id = upload_data['id']

        results = []
        for profile_id in profile_ids:
            payload = {'text':caption,'profile_ids[]':profile_id,'scheduled_at':sched_time}
            if media_id:
                payload['media[id]'] = media_id
            post_resp = requests.post(
                'https://api.bufferapp.com/1/updates/create.json',
                headers={'Authorization':f'Bearer {buffer_token}'},
                data=payload, timeout=30
            )
            post_data = post_resp.json()
            if post_data.get('success'):
                results.append({'profileId':profile_id,'updateId':post_data.get('updates',[{}])[0].get('id','')})
            else:
                results.append({'profileId':profile_id,'error':str(post_data)})

        return jsonify({'ok':True,'results':results})
    except Exception as e:
        return jsonify({'ok':False,'error':str(e)}), 500


STUDIO_HTML = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tiny Dog Mafia Content Studio</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
:root{--gold:#C9A84C;--gold-light:#E8C97A;--gold-dim:#9A7A35;--black:#0D0D0D;--dark:#141414;--dark2:#1C1C1C;--dark3:#242424;--border:rgba(201,168,76,0.2);--text:#F0EAD6;--muted:#7A7060;--hint:#4A4438;}
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
.chip-row{display:flex;flex-wrap:wrap;gap:5px;}
.chip{font-size:11px;padding:3px 9px;border-radius:3px;cursor:pointer;border:1px solid var(--dark3);color:var(--muted);background:var(--dark2);transition:all .15s;font-weight:500;}
.chip.on{background:rgba(201,168,76,.12);border-color:var(--gold-dim);color:var(--gold);}
.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;}
.stat-box{background:var(--dark3);border-radius:5px;padding:8px;text-align:center;}
.stat-num{font-family:"Bebas Neue",sans-serif;font-size:26px;color:var(--gold);letter-spacing:.04em;line-height:1;}
.stat-lbl{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--hint);margin-top:2px;}
.main{display:flex;flex-direction:column;}
.tabs{display:flex;border-bottom:1px solid var(--dark3);padding:0 20px;flex-wrap:wrap;}
.tab{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:10px 14px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .15s;}
.tab.on{color:var(--gold);border-bottom-color:var(--gold);}
.pane{display:none;padding:20px;overflow-y:auto;flex:1;}
.pane.on{display:block;}
.theme-box{background:var(--dark2);border:1px solid var(--border);border-radius:10px;padding:18px;margin-bottom:14px;}
.theme-box p{font-size:12px;color:var(--muted);margin-bottom:12px;line-height:1.6;}
.theme-row{display:flex;gap:10px;}
.theme-row input{flex:1;background:var(--dark3);border:1px solid var(--dark3);border-radius:5px;padding:9px 12px;font-family:"DM Sans",sans-serif;font-size:13px;color:var(--text);outline:none;}
.theme-row input:focus{border-color:var(--gold-dim);}
.day-name-display{font-family:"Bebas Neue",sans-serif;font-size:20px;letter-spacing:.06em;color:var(--gold);margin-bottom:4px;}
.day-focus-display{font-size:11px;color:var(--muted);margin-bottom:12px;line-height:1.5;}
.quick-row{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;}
.qchip{font-size:11px;padding:3px 9px;border-radius:3px;cursor:pointer;border:1px solid var(--dark3);color:var(--muted);background:var(--dark2);}
.qchip:hover{border-color:var(--gold-dim);color:var(--gold);}
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
.content-list{display:flex;flex-direction:column;gap:10px;}
.content-card{background:var(--dark2);border:1px solid var(--dark3);border-radius:10px;overflow:hidden;transition:border-color .2s;}
.content-card:hover{border-color:var(--border);}
.card-head{display:flex;align-items:center;gap:10px;padding:9px 14px;background:var(--dark3);border-bottom:1px solid var(--dark3);}
.card-num{font-family:"Bebas Neue",sans-serif;font-size:16px;color:var(--gold);min-width:28px;}
.card-meta{font-size:11px;color:var(--muted);flex:1;}
.card-time{font-size:11px;color:var(--hint);background:var(--dark2);padding:2px 9px;border-radius:3px;font-weight:600;}
.card-type{font-size:10px;font-weight:700;padding:2px 8px;border-radius:3px;letter-spacing:.04em;}
.type-image{background:rgba(99,153,34,.1);color:#639922;}
.type-short{background:rgba(74,128,184,.1);color:#7AAAD4;}
.type-long{background:rgba(170,100,34,.1);color:#D4AA7A;}
.sec-tabs{display:flex;border-bottom:1px solid var(--dark3);padding:0 14px;background:var(--dark2);}
.sec-tab{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--hint);padding:7px 10px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .15s;}
.sec-tab.on{color:var(--gold);border-bottom-color:var(--gold);}
.sec-pane{display:none;padding:12px 14px;}
.sec-pane.on{display:block;}
.section-text{font-size:12px;line-height:1.75;color:var(--text);white-space:pre-wrap;}
.section-text.prompt{font-style:italic;color:var(--muted);border-left:2px solid var(--gold-dim);padding-left:8px;}
.card-img-col{padding:12px;display:flex;flex-direction:column;gap:6px;align-items:center;background:var(--dark3);border-left:1px solid var(--dark3);}
.drop-zone{width:130px;height:130px;border-radius:6px;border:1.5px dashed var(--dark3);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;cursor:pointer;transition:all .2s;background:var(--dark2);}
.drop-zone:hover,.drop-zone.over{border-color:var(--gold-dim);background:rgba(201,168,76,.04);}
.dz-icon{font-size:22px;color:var(--hint);}
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
.sched-table{border:1px solid var(--dark3);border-radius:8px;overflow:hidden;}
.sched-head{display:grid;grid-template-columns:40px 60px 1fr 120px 100px;gap:8px;padding:8px 12px;background:var(--dark3);font-size:10px;color:var(--hint);text-transform:uppercase;letter-spacing:.1em;border-bottom:1px solid var(--dark3);}
.sched-row{display:grid;grid-template-columns:40px 60px 1fr 120px 100px;gap:8px;padding:9px 12px;font-size:12px;border-bottom:1px solid var(--dark3);background:var(--dark2);align-items:center;}
.sched-row:last-child{border-bottom:none;}
.s-num{font-family:"Bebas Neue",sans-serif;font-size:16px;color:var(--gold);}
.pill{font-size:10px;font-weight:700;padding:2px 8px;border-radius:3px;letter-spacing:.04em;}
.pill-p{background:rgba(201,168,76,.1);color:var(--gold-dim);}
.pill-r{background:rgba(99,153,34,.12);color:#639922;}
.pill-s{background:rgba(29,158,117,.12);color:#1D9E75;}
.setup-sec{background:var(--dark2);border:1px solid var(--dark3);border-radius:8px;padding:18px;margin-bottom:12px;}
.setup-sec h3{font-size:15px;font-weight:500;margin-bottom:6px;}
.setup-sec p{font-size:12px;color:var(--muted);line-height:1.65;margin-bottom:14px;}
.step-list{list-style:none;counter-reset:s;display:flex;flex-direction:column;gap:9px;margin-bottom:14px;}
.step-list li{counter-increment:s;display:flex;gap:10px;align-items:flex-start;font-size:12px;line-height:1.55;}
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
  <div class="day-badge" id="day-badge">Loading...</div>
  <div class="hdr-actions">
    <button class="btn btn-ghost" style="font-size:11px;padding:5px 12px;" onclick="showSettings()">&#9881; Settings</button>
    <a href="/mj" class="btn btn-ghost" style="font-size:11px;padding:5px 12px;">Switch to MJ</a>
  </div>
</header>

<div id="settings-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:500;align-items:center;justify-content:center;">
  <div style="background:var(--dark2);border:1px solid var(--border);border-radius:12px;padding:32px;width:460px;max-width:90vw;">
    <h2 style="font-family:Bebas Neue,sans-serif;font-size:22px;letter-spacing:.08em;color:var(--gold);margin-bottom:20px;">Studio Settings</h2>
    <div class="s-field"><label class="s-label">Yorkie Name (optional)</label><input type="text" id="set-name" placeholder="Bella, Boss, Coco..." /></div>
    <div class="s-field"><label class="s-label">Gemini API Key (optional)</label><input type="password" id="set-gemini" placeholder="AIza..." /></div>
    <div class="s-field"><label class="s-label">Buffer Access Token (optional — future use)</label><input type="password" id="set-buffer" placeholder="For Buffer scheduling..." /></div>
    <div style="display:flex;gap:10px;margin-top:18px;">
      <button class="btn btn-gold" onclick="saveSettings()" style="flex:1;">Save</button>
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
          <option value="0">Monday</option><option value="1">Tuesday</option>
          <option value="2">Wednesday</option><option value="3">Thursday</option>
          <option value="4">Friday</option><option value="5">Saturday</option><option value="6">Sunday</option>
        </select>
      </div>
    </div>
    <div class="s-section">
      <div class="s-title">Vibe / Tone</div>
      <div class="chip-row" id="tone-chips">
        <div class="chip on" onclick="pickChip(this,'tone','funny')">Funny</div>
        <div class="chip" onclick="pickChip(this,'tone','cinematic')">Cinematic</div>
        <div class="chip" onclick="pickChip(this,'tone','savage')">Savage</div>
        <div class="chip" onclick="pickChip(this,'tone','wholesome')">Wholesome</div>
        <div class="chip" onclick="pickChip(this,'tone','relatable')">Relatable</div>
      </div>
    </div>
    <div class="s-section">
      <div class="s-title">CTA Style</div>
      <div class="chip-row" id="cta-chips">
        <div class="chip on" onclick="pickChip(this,'cta','engagement')">Comments</div>
        <div class="chip" onclick="pickChip(this,'cta','tag')">Tag a friend</div>
        <div class="chip" onclick="pickChip(this,'cta','save')">Save/share</div>
        <div class="chip" onclick="pickChip(this,'cta','follow')">Follow</div>
      </div>
    </div>
  </div>

  <div class="main">
    <div class="tabs">
      <div class="tab on" onclick="switchTab('images',this)">Image Posts</div>
      <div class="tab" onclick="switchTab('shorts',this)">Short Videos (12s)</div>
      <div class="tab" onclick="switchTab('longs',this)">Long Videos</div>
      <div class="tab" onclick="switchTab('schedule',this)">Schedule</div>
      <div class="tab" onclick="switchTab('facebook',this)">Facebook Setup</div>
    </div>

    <!-- IMAGE POSTS -->
    <div class="pane on" id="pane-images">
      <div class="theme-box">
        <div class="day-name-display" id="theme-name-display">Loading...</div>
        <div class="day-focus-display" id="theme-focus-display"></div>
        <p>Enter a theme or leave blank to use the daily theme. Generates 19 posts with image prompts, captions, and first comments.</p>
        <div class="theme-row">
          <input type="text" id="theme-input" placeholder="Optional theme override..." />
          <button class="btn btn-gold" id="gen-img-btn" onclick="generateImages()">Generate Image Posts</button>
        </div>
        <div class="quick-row">
          <span style="font-size:10px;color:var(--hint);align-self:center;">Quick:</span>
          <div class="qchip" onclick="setT('morning chaos')">Morning</div>
          <div class="qchip" onclick="setT('pool day takeover')">Pool day</div>
          <div class="qchip" onclick="setT('grocery store heist')">Grocery</div>
          <div class="qchip" onclick="setT('spa day demands')">Spa day</div>
          <div class="qchip" onclick="setT('remote work supervision')">WFH</div>
          <div class="qchip" onclick="setT('dinner table negotiations')">Dinner</div>
        </div>
        <div id="img-prog-wrap" style="display:none;" class="prog-wrap">
          <div class="prog-track"><div class="prog-fill" id="img-prog-fill"></div></div>
          <div class="prog-label" id="img-prog-label">Generating...</div>
        </div>
      </div>
      <div class="batch-bar" id="img-batch-bar">
        <span class="batch-msg" id="img-batch-msg">Posts ready</span>
        <button class="btn btn-gold" id="gen-all-imgs-btn" onclick="generateAllImages()" style="font-size:11px;padding:7px 14px;">Generate All Images</button>
        <button class="btn btn-dark" onclick="copyAllCaptions('images')" style="font-size:11px;padding:7px 12px;">Copy All Captions</button>
        <button class="btn btn-gold" id="sched-all-img-btn" onclick="scheduleAll('img')" style="font-size:11px;padding:7px 14px;display:none;">Schedule All to FB</button>
        <button class="btn btn-ghost" onclick="clearContent('images')" style="font-size:11px;padding:7px 12px;">Clear</button>
      </div>
      <div id="gen-all-img-prog" style="display:none;padding:0 0 12px;">
        <div class="prog-track"><div class="prog-fill" id="gen-img-fill"></div></div>
        <div class="prog-label" id="gen-img-label">Generating images...</div>
      </div>
      <div id="images-container">
        <div class="empty"><span class="empty-icon">&#128081;</span><h3>Awaiting Orders</h3><p>Enter a theme and click Generate Image Posts.</p></div>
      </div>
    </div>

    <!-- SHORT VIDEOS -->
    <div class="pane" id="pane-shorts">
      <div class="theme-box">
        <div class="day-name-display" id="short-day-display">Loading...</div>
        <p>Generates 3 x 12-second cinematic Hypernatural video scripts with captions and scene image prompts for each.</p>
        <div class="btn-row">
          <button class="btn btn-gold" id="gen-short-btn" onclick="generateVideos('short')">Generate 3 Short Video Scripts</button>
          <button class="btn btn-dark" onclick="clearContent('shorts')">Clear</button>
        </div>
        <div id="short-prog-wrap" style="display:none;" class="prog-wrap">
          <div class="prog-track"><div class="prog-fill" id="short-prog-fill"></div></div>
          <div class="prog-label" id="short-prog-label">Writing short video scripts...</div>
        </div>
      </div>
      <div id="shorts-container">
        <div class="empty"><span class="empty-icon">&#127910;</span><h3>No Short Scripts Yet</h3><p>Generate 3 x 12-second Hypernatural scripts.</p></div>
      </div>
    </div>

    <!-- LONG VIDEOS -->
    <div class="pane" id="pane-longs">
      <div class="theme-box">
        <div class="day-name-display" id="long-day-display">Loading...</div>
        <p>Generates 3 x 70-90 second cinematic Hypernatural video scripts with captions and scene image prompts.</p>
        <div class="btn-row">
          <button class="btn btn-gold" id="gen-long-btn" onclick="generateVideos('long')">Generate 3 Long Video Scripts</button>
          <button class="btn btn-dark" onclick="clearContent('longs')">Clear</button>
        </div>
        <div id="long-prog-wrap" style="display:none;" class="prog-wrap">
          <div class="prog-track"><div class="prog-fill" id="long-prog-fill"></div></div>
          <div class="prog-label" id="long-prog-label">Writing long video scripts...</div>
        </div>
      </div>
      <div id="longs-container">
        <div class="empty"><span class="empty-icon">&#127909;</span><h3>No Long Scripts Yet</h3><p>Generate 3 x 70-90 second Hypernatural scripts.</p></div>
      </div>
    </div>

    <!-- SCHEDULE -->
    <div class="pane" id="pane-schedule">
      <div id="sched-container">
        <div class="empty"><span class="empty-icon">&#128197;</span><h3>No Posts Yet</h3><p>Generate content first.</p></div>
      </div>
    </div>

    <!-- FACEBOOK SETUP -->
    <div class="pane" id="pane-facebook">
      <div class="alert alert-gold" style="margin-bottom:18px;"><strong>Connect Tiny Dog Mafia page</strong> to enable one-click scheduling via the Facebook Graph API.</div>
      <div class="setup-sec">
        <h3>Step 1 - Create Facebook Developer App</h3>
        <ol class="step-list">
          <li>Go to <strong>developers.facebook.com</strong> and log in</li>
          <li>Click <strong>My Apps &rarr; Create App &rarr; Business</strong></li>
          <li>Name it "Tiny Dog Mafia Studio"</li>
          <li>Add: <strong>Facebook Login</strong> and <strong>Pages API</strong></li>
        </ol>
      </div>
      <div class="setup-sec">
        <h3>Step 2 - Get Page Access Token</h3>
        <ol class="step-list">
          <li>Go to <strong>Tools &rarr; Graph API Explorer</strong></li>
          <li>Select app and <strong>Tiny Dog Mafia</strong> page</li>
          <li>Add: <code>pages_manage_posts</code> <code>instagram_content_publish</code></li>
          <li>Click <strong>Generate Access Token</strong></li>
        </ol>
      </div>
      <div class="setup-sec">
        <h3>Step 3 - Enter Credentials</h3>
        <div class="two-col">
          <div><label class="s-label">Facebook Page ID</label><input type="text" id="fb-page-id" placeholder="123456789" style="width:100%;background:var(--dark3);border:1px solid var(--dark3);border-radius:5px;padding:8px 10px;font-size:13px;color:var(--text);outline:none;font-family:DM Sans,sans-serif;"></div>
          <div><label class="s-label">Page Access Token</label><input type="password" id="fb-token" placeholder="EAABx..." style="width:100%;background:var(--dark3);border:1px solid var(--dark3);border-radius:5px;padding:8px 10px;font-size:13px;color:var(--text);outline:none;font-family:DM Sans,sans-serif;"></div>
        </div>
        <div class="two-col">
          <div><label class="s-label">Instagram Account ID (optional)</label><input type="text" id="ig-id" placeholder="From IG Business Settings" style="width:100%;background:var(--dark3);border:1px solid var(--dark3);border-radius:5px;padding:8px 10px;font-size:13px;color:var(--text);outline:none;font-family:DM Sans,sans-serif;"></div>
          <div style="display:flex;align-items:flex-end;"><button class="btn btn-gold" onclick="testFB()" style="width:100%;">Save &amp; Test</button></div>
        </div>
        <div id="fb-result" style="display:none;margin-top:8px;"></div>
      </div>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
const DAY_THEMES={0:{name:"Monday Mayhem",focus:"chaos, taking over the week, Monday energy"},1:{name:"Tiny Boss Tuesday",focus:"authority, running things, executive decisions"},2:{name:"Hump Day Heist",focus:"mid-week operations, Wednesday chaos, executing plans"},3:{name:"Throwback Thursday",focus:"origin stories, how it all started, nostalgic moments"},4:{name:"Friday Operations",focus:"weekend prep, letting loose, Friday energy"},5:{name:"Saturday Takeover",focus:"leisure, supervising the weekend, pool days, brunch"},6:{name:"Sunday Surveillance",focus:"relaxing but still watching everything, strategic rest"}};
const S={name:localStorage.getItem("tdm_name")||"",geminiKey:localStorage.getItem("tdm_gemini")||"",bufferToken:localStorage.getItem("tdm_buffer")||"",tone:"funny",cta:"engagement",imagePosts:[],shortVideos:[],longVideos:[]};

function getDayIdx(){const o=parseInt(document.getElementById("day-override").value);if(o>=0)return o;const d=new Date().getDay();return d===0?6:d-1;}
function initTheme(){const idx=getDayIdx();const t=DAY_THEMES[idx];document.getElementById("day-badge").textContent=t.name;document.getElementById("theme-name-display").textContent=t.name;document.getElementById("theme-focus-display").textContent=t.focus;document.getElementById("short-day-display").textContent=t.name+" — Short Videos";document.getElementById("long-day-display").textContent=t.name+" — Long Videos";}
document.getElementById("day-override").addEventListener("change",initTheme);
initTheme();

function showSettings(){document.getElementById("set-name").value=S.name;document.getElementById("set-gemini").value=S.geminiKey;document.getElementById("set-buffer").value=S.bufferToken;document.getElementById("settings-modal").style.display="flex";}
function hideSettings(){document.getElementById("settings-modal").style.display="none";}
function saveSettings(){S.name=document.getElementById("set-name").value.trim();S.geminiKey=document.getElementById("set-gemini").value.trim();S.bufferToken=document.getElementById("set-buffer").value.trim();localStorage.setItem("tdm_name",S.name);localStorage.setItem("tdm_gemini",S.geminiKey);localStorage.setItem("tdm_buffer",S.bufferToken);hideSettings();toast("Settings saved!");}
function switchTab(id,el){document.querySelectorAll(".tab").forEach(t=>t.classList.remove("on"));document.querySelectorAll(".pane").forEach(p=>p.classList.remove("on"));el.classList.add("on");document.getElementById("pane-"+id).classList.add("on");}
function pickChip(el,g,v){document.querySelectorAll("#"+g+"-chips .chip").forEach(c=>c.classList.remove("on"));el.classList.add("on");S[g]=v;}
function setT(t){document.getElementById("theme-input").value=t;}
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),3500);}
function setP(fId,lId,pct,label){const f=document.getElementById(fId);const l=document.getElementById(lId);if(f)f.style.width=pct+"%";if(l)l.textContent=label;}
function updateStats(){document.getElementById("s-images").textContent=S.imagePosts.length;document.getElementById("s-videos").textContent=S.shortVideos.length+S.longVideos.length;document.getElementById("s-ready").textContent=S.imagePosts.filter(p=>p.imgUrl).length;document.getElementById("s-sched").textContent=[...S.imagePosts,...S.shortVideos,...S.longVideos].filter(p=>p.scheduled).length;}

async function generateImages(){
  const theme=document.getElementById("theme-input").value.trim();
  const count=parseInt(document.getElementById("post-count").value);
  const dayIdx=getDayIdx();
  const btn=document.getElementById("gen-img-btn");
  btn.disabled=true;btn.textContent="Generating...";
  document.getElementById("img-prog-wrap").style.display="block";
  setP("img-prog-fill","img-prog-label",15,"Briefing the crew...");
  try{
    const res=await fetch("/tdm/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({theme,count,tone:S.tone,cta:S.cta,dogName:S.name||"the Yorkie",dayIndex:dayIdx})});
    const data=await res.json();
    if(!data.ok)throw new Error(data.error);
    setP("img-prog-fill","img-prog-label",100,"Image posts ready!");
    S.imagePosts=data.posts.map((p,i)=>({id:i,type:"image",...p,imgUrl:null,status:"draft",scheduled:false}));
    setTimeout(()=>{document.getElementById("img-prog-wrap").style.display="none";renderImagePosts();updateStats();document.getElementById("img-batch-bar").classList.add("show");document.getElementById("img-batch-msg").textContent=S.imagePosts.length+" posts ready";renderSchedule();},400);
  }catch(e){toast("Error: "+e.message);document.getElementById("img-prog-wrap").style.display="none";}
  btn.disabled=false;btn.textContent="Generate Image Posts";
}

function renderImagePosts(){
  const start=parseTime(document.getElementById("start-time").value);
  const intv=parseInt(document.getElementById("interval").value)||45;
  document.getElementById("images-container").innerHTML="<div class='content-list'>"+
    S.imagePosts.map((p,i)=>{
      const t=fmtTime(addMins(start,i*intv));
      const imgHtml=p.imgUrl?'<img src="'+p.imgUrl+'" class="img-preview" onclick="triggerUpload("img",'+i+')" title="Click to replace">'
        :'<div class="drop-zone" id="dz-img-'+i+'" onclick="triggerUpload("img",'+i+')" ondragover="dzOver(event,"img",'+i+')" ondragleave="dzLeave("img",'+i+')" ondrop="dzDrop(event,"img",'+i+')"><span class="dz-icon">&#9727;</span><span>Generate or drop</span></div>';
      return '<div class="content-card" id="img-card-'+i+'">'
        +'<div class="card-head"><span class="card-num">#'+String(i+1).padStart(2,"0")+'</span><span class="card-meta">'+esc(p.division||"")+'</span><span class="card-type type-image">IMAGE</span><span class="card-time">'+t+'</span></div>'
        +'<div style="display:grid;grid-template-columns:1fr 150px">'
        +'<div><div class="sec-tabs"><div class="sec-tab on" onclick="sTab(this,["img-s1-'+i+'","img-s2-'+i+'","img-s3-'+i+'\'],"img-s1-'+i+'\')">Image Prompt</div><div class="sec-tab" onclick="sTab(this,["img-s1-'+i+'","img-s2-'+i+'","img-s3-'+i+'\'],"img-s2-'+i+'\')">Caption & Hashtags</div><div class="sec-tab" onclick="sTab(this,["img-s1-'+i+'","img-s2-'+i+'","img-s3-'+i+'\'],"img-s3-'+i+'\')">First Comment</div></div>'
        +'<div class="sec-pane on" id="img-s1-'+i+'"><div class="section-text prompt">'+esc(p.imagePrompt)+'</div></div>'
        +'<div class="sec-pane" id="img-s2-'+i+'"><div class="section-text">'+esc(p.caption)+'</div></div>'
        +'<div class="sec-pane" id="img-s3-'+i+'"><div class="section-text">'+esc(p.firstComment)+'</div></div></div>'
        +'<div class="card-img-col"><input type="file" id="file-img-'+i+'" accept="image/*" style="display:none" onchange="fileSelected(event,"img",'+i+')"><div id="img-img-'+i+'">'+imgHtml+'</div><button class="mbtn" onclick="genImage("img",'+i+')" style="font-size:10px;">&#8635; Regen</button></div>'
        +'</div>'
        +'<div class="card-foot"><div class="s-dot '+(p.imgUrl?(p.scheduled?"dot-s":"dot-r"):"dot-p")+'" id="dot-img-'+i+'"></div><span class="s-txt" id="stxt-img-'+i+'">'+(p.scheduled?"Scheduled for "+fmtTime(addMins(start,i*intv)):p.imgUrl?"Image ready — click Schedule":"Upload image then schedule")+'</span>'
        +'<button class="mbtn" onclick="copyS("img",'+i+',"caption")">Caption</button>'
        +'<button class="mbtn" onclick="copyS("img",'+i+',"imagePrompt")">Prompt</button>'
        +'<button class="mbtn '+(p.imgUrl?"mbtn-gold":"")+'" id="sched-img-'+i+'" onclick="scheduleItem("img",'+i+')" '+(p.imgUrl?"":"disabled")+'>Schedule</button>'
        +'</div></div>';
    }).join("")+"</div>";
}

async function generateVideos(type){
  const dayIdx=getDayIdx();
  const btnId="gen-"+type+"-btn";
  const btn=document.getElementById(btnId);
  btn.disabled=true;btn.textContent="Generating...";
  document.getElementById(type+"-prog-wrap").style.display="block";
  setP(type+"-prog-fill",type+"-prog-label",15,"Writing "+type+" scripts...");
  try{
    const res=await fetch("/tdm/api/generate-video",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({videoType:type,count:3,dayIndex:dayIdx,dogName:S.name||"the Yorkie"})});
    const data=await res.json();
    if(!data.ok)throw new Error(data.error);
    setP(type+"-prog-fill",type+"-prog-label",100,"Scripts ready!");
    const arr=data.videos.map((v,i)=>({id:i,type:type,...v,imgUrl:null,status:"draft",scheduled:false}));
    if(type==="short")S.shortVideos=arr;else S.longVideos=arr;
    setTimeout(()=>{document.getElementById(type+"-prog-wrap").style.display="none";renderVideos(type);updateStats();renderSchedule();},400);
  }catch(e){toast("Error: "+e.message);document.getElementById(type+"-prog-wrap").style.display="none";}
  btn.disabled=false;btn.textContent="Generate 3 "+(type==="short"?"Short":"Long")+" Video Scripts";
}

function renderVideos(type){
  const arr=type==="short"?S.shortVideos:S.longVideos;
  const container=document.getElementById(type==="short"?"shorts-container":"longs-container");
  const start=parseTime(document.getElementById("start-time").value);
  const intv=parseInt(document.getElementById("interval").value)||45;
  const baseOff=type==="long"?S.imagePosts.length+3:S.imagePosts.length;
  container.innerHTML="<div class='content-list'>"+arr.map((v,i)=>{
    const t=fmtTime(addMins(start,(baseOff+i)*intv));
    const typeCls=type==="short"?"type-short":"type-long";
    const typeLabel=type==="short"?"SHORT 12s":"LONG 70-90s";
    const imgHtml=v.imgUrl?'<img src="'+v.imgUrl+'" class="img-preview" onclick="triggerUpload(\''+type+'\','+i+')" title="Click to replace">'
      :'<div class="drop-zone" id="dz-'+type+'-'+i+'" onclick="triggerUpload(\''+type+'\','+i+')" ondragover="dzOver(event,\''+type+'\','+i+')" ondragleave="dzLeave(\''+type+'\','+i+')" ondrop="dzDrop(event,\''+type+'\','+i+')"><span class="dz-icon">&#9727;</span><span>Scene image</span></div>';
    return '<div class="content-card" id="'+type+'-card-'+i+'">'
      +'<div class="card-head"><span class="card-num">#'+String(i+1).padStart(2,"0")+'</span><span class="card-meta">'+esc(v.mood||"")+'</span><span class="card-type '+typeCls+'">'+typeLabel+'</span><span class="card-time">'+t+'</span></div>'
      +'<div style="display:grid;grid-template-columns:1fr 150px">'
      +'<div><div class="sec-tabs"><div class="sec-tab on" onclick="sTab(this,["'+type+'-s1-'+i+'","'+type+'-s2-'+i+'","'+type+'-s3-'+i+'\'],\''+type+'-s1-'+i+'\')">Video Script</div><div class="sec-tab" onclick="sTab(this,["'+type+'-s1-'+i+'","'+type+'-s2-'+i+'","'+type+'-s3-'+i+'\'],\''+type+'-s2-'+i+'\')">Caption & Hashtags</div><div class="sec-tab" onclick="sTab(this,["'+type+'-s1-'+i+'","'+type+'-s2-'+i+'","'+type+'-s3-'+i+'\'],\''+type+'-s3-'+i+'\')">First Comment</div></div>'
      +'<div class="sec-pane on" id="'+type+'-s1-'+i+'"><div class="section-text">'+esc(v.videoScript)+'</div></div>'
      +'<div class="sec-pane" id="'+type+'-s2-'+i+'"><div class="section-text">'+esc(v.captionAndHashtags)+'</div></div>'
      +'<div class="sec-pane" id="'+type+'-s3-'+i+'"><div class="section-text">'+esc(v.firstComment)+'</div></div></div>'
      +'<div class="card-img-col"><input type="file" id="file-'+type+'-'+i+'" accept="image/*" style="display:none" onchange="fileSelected(event,\''+type+'\','+i+')"><div id="img-'+type+'-'+i+'">'+imgHtml+'</div><button class="mbtn" onclick="genImage(\''+type+'\','+i+')" style="font-size:10px;">&#8635; Scene img</button></div>'
      +'</div>'
      +'<div class="card-foot"><div class="s-dot '+(v.imgUrl?(v.scheduled?"dot-s":"dot-r"):"dot-p")+'" id="dot-'+type+'-'+i+'"></div><span class="s-txt" id="stxt-'+type+'-'+i+'">'+(v.scheduled?"Scheduled":v.imgUrl?"Image ready — Schedule":"Copy script then create video in Hypernatural")+'</span>'
      +'<button class="mbtn" onclick="copyS(\''+type+'\','+i+',"videoScript")">Script</button>'
      +'<button class="mbtn" onclick="copyS(\''+type+'\','+i+',"captionAndHashtags")">Caption</button>'
      +'<button class="mbtn" onclick="copyS(\''+type+'\','+i+',"imagePrompt")">Img Prompt</button>'
      +'<button class="mbtn '+(v.imgUrl?"mbtn-gold":"")+'" id="sched-'+type+'-'+i+'" onclick="scheduleItem(\''+type+'\','+i+')" '+(v.imgUrl?"":"disabled")+'>Schedule</button>'
      +'</div></div>';
  }).join("")+"</div>";
}

function sTab(el,allIds,showId){allIds.forEach(id=>{const p=document.getElementById(id);if(p)p.classList.remove("on");});const p=document.getElementById(showId);if(p)p.classList.add("on");const tabs=el.parentElement.querySelectorAll(".sec-tab");tabs.forEach(t=>t.classList.remove("on"));el.classList.add("on");}

function triggerUpload(type,idx){document.getElementById("file-"+type+"-"+idx).click();}
function fileSelected(e,type,idx){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>applyImage(type,idx,ev.target.result);r.readAsDataURL(f);}
function dzOver(e,type,idx){e.preventDefault();const d=document.getElementById("dz-"+type+"-"+idx);if(d)d.classList.add("over");}
function dzLeave(type,idx){const d=document.getElementById("dz-"+type+"-"+idx);if(d)d.classList.remove("over");}
function dzDrop(e,type,idx){e.preventDefault();dzLeave(type,idx);const f=e.dataTransfer.files[0];if(!f||!f.type.startsWith("image/")){toast("Drop an image file");return;}const r=new FileReader();r.onload=ev=>applyImage(type,idx,ev.target.result);r.readAsDataURL(f);}

function applyImage(type,idx,dataUrl){
  const arr=type==="img"?S.imagePosts:type==="short"?S.shortVideos:S.longVideos;
  arr[idx].imgUrl=dataUrl;arr[idx].status="ready";
  document.getElementById("img-"+type+"-"+idx).innerHTML='<img src="'+dataUrl+'" class="img-preview" onclick="triggerUpload(\''+type+'\','+idx+')" title="Click to replace">';
  document.getElementById("dot-"+type+"-"+idx).className="s-dot dot-r";
  document.getElementById("stxt-"+type+"-"+idx).textContent="Image ready — click Schedule";
  const sb=document.getElementById("sched-"+type+"-"+idx);
  if(sb){sb.disabled=false;sb.className="mbtn mbtn-gold";}
  updateStats();checkSchedAll();renderSchedule();
  toast("Image set for "+(type==="img"?"post":"video")+" #"+(idx+1));
}

async function genImage(type,idx){
  const arr=type==="img"?S.imagePosts:type==="short"?S.shortVideos:S.longVideos;
  const prompt=arr[idx].imagePrompt;
  const imgDiv=document.getElementById("img-"+type+"-"+idx);
  document.getElementById("dot-"+type+"-"+idx).className="s-dot dot-p";
  document.getElementById("stxt-"+type+"-"+idx).textContent="Generating...";
  imgDiv.innerHTML='<div class="img-generating"><div class="spinner"></div><span>Generating...</span></div>';
  try{
    const res=await fetch("/tdm/api/image",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,geminiKey:S.geminiKey})});
    const data=await res.json();
    if(!data.ok)throw new Error(data.error);
    applyImage(type,idx,data.dataUrl);
  }catch(e){
    imgDiv.innerHTML='<div class="drop-zone" id="dz-'+type+'-'+idx+'" onclick="triggerUpload(\''+type+'\','+idx+')" ondragover="dzOver(event,\''+type+'\','+idx+')" ondragleave="dzLeave(\''+type+'\','+idx+')" ondrop="dzDrop(event,\''+type+'\','+idx+')"><span style="font-size:18px">&#9888;</span><span>Error - upload manually</span></div>';
    document.getElementById("dot-"+type+"-"+idx).className="s-dot";
    document.getElementById("stxt-"+type+"-"+idx).textContent="Error: "+e.message.substring(0,60);
    toast("Error: "+e.message.substring(0,60));
  }
}

async function generateAllImages(){
  const btn=document.getElementById("gen-all-imgs-btn");
  btn.disabled=true;btn.textContent="Generating...";
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
  btn.disabled=false;btn.textContent="Regenerate All Images";
  toast("All images generated!");
}

function checkSchedAll(){
  const r=S.imagePosts.filter(p=>p.imgUrl).length;
  const btn=document.getElementById("sched-all-img-btn");
  if(btn)btn.style.display=r>0?"inline-flex":"none";
  const msg=document.getElementById("img-batch-msg");
  if(msg)msg.textContent=r===S.imagePosts.length?"All "+r+" images ready — Schedule All":r+" of "+S.imagePosts.length+" images ready";
}

async function scheduleItem(type,idx){
  const fbId=document.getElementById("fb-page-id").value.trim();
  const fbTk=document.getElementById("fb-token").value.trim();
  if(!fbId||!fbTk){toast("Connect Facebook first — go to Facebook Setup tab");return;}
  const arr=type==="img"?S.imagePosts:type==="short"?S.shortVideos:S.longVideos;
  const item=arr[idx];
  if(!item.imgUrl){toast("Upload an image first");return;}
  const btn=document.getElementById("sched-"+type+"-"+idx);
  btn.textContent="...";btn.disabled=true;
  const start=parseTime(document.getElementById("start-time").value);
  const intv=parseInt(document.getElementById("interval").value)||45;
  const baseOff=type==="long"?S.imagePosts.length+3:type==="short"?S.imagePosts.length:0;
  const postTime=addMins(start,(baseOff+idx)*intv);
  const now=new Date();const schedDate=new Date(now);
  schedDate.setHours(postTime.h,postTime.m,0,0);
  if(schedDate<=now)schedDate.setDate(schedDate.getDate()+1);
  if(schedDate-now<10*60*1000)schedDate.setTime(now.getTime()+11*60*1000);
  const caption=type==="img"?item.caption:item.captionAndHashtags;
  try{
    const res=await fetch("/tdm/api/schedule",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({pageId:fbId,token:fbTk,caption,imageB64:item.imgUrl,scheduledTime:Math.floor(schedDate.getTime()/1000)})});
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
  const arr=type==="img"?S.imagePosts:type==="short"?S.shortVideos:S.longVideos;
  const ready=arr.filter(p=>p.imgUrl&&!p.scheduled);
  if(!ready.length){toast("No unscheduled items with images");return;}
  const fbId=document.getElementById("fb-page-id").value.trim();
  const fbTk=document.getElementById("fb-token").value.trim();
  if(!fbId||!fbTk){toast("Connect Facebook first");return;}
  for(let i=0;i<arr.length;i++){if(arr[i].imgUrl&&!arr[i].scheduled){await scheduleItem(type,i);await new Promise(r=>setTimeout(r,900));}}
  toast("All scheduled!");
}

function copyS(type,idx,field){
  const arr=type==="img"?S.imagePosts:type==="short"?S.shortVideos:S.longVideos;
  const item=arr[idx];
  navigator.clipboard.writeText(item[field]||"");toast("Copied!");
}
function copyAllCaptions(type){
  const arr=type==="images"?S.imagePosts:type==="short"?S.shortVideos:S.longVideos;
  navigator.clipboard.writeText(arr.map((p,i)=>"POST "+(i+1)+":\n"+(p.caption||p.captionAndHashtags)).join("\n\n---\n\n"));
  toast("All captions copied!");
}
function clearContent(type){
  if(type==="images"){S.imagePosts=[];document.getElementById("images-container").innerHTML='<div class="empty"><span class="empty-icon">&#128081;</span><h3>Awaiting Orders</h3><p>Enter a theme and click Generate.</p></div>';document.getElementById("img-batch-bar").classList.remove("show");document.getElementById("gen-all-img-prog").style.display="none";}
  else if(type==="shorts"){S.shortVideos=[];document.getElementById("shorts-container").innerHTML='<div class="empty"><span class="empty-icon">&#127910;</span><h3>No Short Scripts Yet</h3><p>Click Generate.</p></div>';}
  else{S.longVideos=[];document.getElementById("longs-container").innerHTML='<div class="empty"><span class="empty-icon">&#127909;</span><h3>No Long Scripts Yet</h3><p>Click Generate.</p></div>';}
  updateStats();
}

function renderSchedule(){
  const all=[
    ...S.imagePosts.map((p,i)=>({...p,dType:"Image Post",idx:i,tKey:"img",cap:p.caption})),
    ...S.shortVideos.map((v,i)=>({...v,dType:"Short Video",idx:i,tKey:"short",cap:v.captionAndHashtags})),
    ...S.longVideos.map((v,i)=>({...v,dType:"Long Video",idx:i,tKey:"long",cap:v.captionAndHashtags}))
  ];
  if(!all.length)return;
  const start=parseTime(document.getElementById("start-time").value);
  const intv=parseInt(document.getElementById("interval").value)||45;
  const rows=all.map((item,i)=>{
    const t=fmtTime(addMins(start,i*intv));
    const pill=item.scheduled?'<span class="pill pill-s">Scheduled</span>':item.imgUrl?'<span class="pill pill-r">Ready</span>':'<span class="pill pill-p">Pending</span>';
    const tLabel=item.dType==="Image Post"?'<span class="card-type type-image">IMG</span>':item.dType==="Short Video"?'<span class="card-type type-short">SHORT</span>':'<span class="card-type type-long">LONG</span>';
    return '<div class="sched-row"><span class="s-num">'+(i+1)+'</span>'+tLabel+'<span style="font-size:11px">'+esc((item.cap||"").substring(0,50))+'...</span><span style="font-size:11px;color:var(--muted)">'+t+'</span>'+pill+'</div>';
  }).join("");
  document.getElementById("sched-container").innerHTML='<div class="sched-table"><div class="sched-head"><span>#</span><span>Type</span><span>Caption</span><span>Time</span><span>Status</span></div>'+rows+'</div>';
}

function testFB(){
  const pageId=document.getElementById("fb-page-id").value.trim();
  const token=document.getElementById("fb-token").value.trim();
  const res=document.getElementById("fb-result");res.style.display="block";
  if(!pageId||!token){res.innerHTML='<div class="alert alert-gold">Enter both Page ID and Access Token.</div>';return;}
  res.innerHTML='<div class="alert alert-info">Testing connection...</div>';
  fetch("https://graph.facebook.com/v19.0/"+pageId+"?fields=name,fan_count&access_token="+token)
    .then(r=>r.json())
    .then(d=>{if(d.error){res.innerHTML='<div class="alert alert-err">'+d.error.message+'</div>';}else{res.innerHTML='<div class="alert alert-ok">Connected to "'+d.name+'" - '+((d.fan_count||0).toLocaleString())+' followers. Ready.</div>';toast("Connected!");}})
    .catch(e=>{res.innerHTML='<div class="alert alert-err">'+e.message+'</div>';});
}

function parseTime(s){const m=s.trim().toUpperCase().match(/([0-9]+):([0-9]+)[ ]*(AM|PM)?/);if(!m)return{h:8,m:0};let h=parseInt(m[1]),min=parseInt(m[2]);if(m[3]==="PM"&&h<12)h+=12;if(m[3]==="AM"&&h===12)h=0;return{h,m:min};}
function addMins(t,mins){const total=t.h*60+t.m+mins;return{h:Math.floor(total/60)%24,m:total%60};}
function fmtTime(t){const h=t.h%12||12,ap=t.h<12?"AM":"PM";return h+":"+String(t.m).padStart(2,"0")+" "+ap;}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
</script>
</body>
</html>'''
