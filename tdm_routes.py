"""
tdm_routes.py  —  Tiny Dog Mafia Content Studio
"""
import os, json, base64, requests, random
from flask import Blueprint, request, jsonify, Response

tdm_bp = Blueprint('tdm', __name__, url_prefix='/tdm')
ANTHROPIC_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
GEMINI_KEY    = os.environ.get('GEMINI_API_KEY', '')

PILLARS = [
    "Tiny But Mighty — the bold fearless personality packed into their small body: charging at big dogs, guarding the house, demanding attention, refusing to back down",
    "Grooming Goals — coat care, haircut styles, brushing routines, before/after transformations, groomer visits, the long silky coat vs puppy cut debate",
    "Yorkie Health Watch — breed-specific health issues including dental problems, hypoglycemia, luxating patella, tracheal collapse, and what owners need to watch for",
    "Training Terriers — housebreaking struggles, the stubborn streak, trick tutorials, crate training battles, and solutions that actually work for the breed",
    "Yorkie Fashion — outfits, bows, accessories, seasonal looks, the diva wardrobe, matching owner and dog outfits, and the Yorkie who tolerates it all",
    "Size Myths Debunked — teacup controversies, AKC weight standards, breeder red flags, what healthy really looks like, and why size isn't everything",
    "Yorkie vs World — relatable moments of them barking at big dogs, guarding the house from the mailman, ruling the household, and winning every standoff",
    "Senior Yorkies — aging care, gray faces full of wisdom, mobility tips, celebrating older dogs still full of spirit, and the irreplaceable bond with a long-time companion",
    "Foodie Yorkies — safe treats, picky eater hacks, diet tips for sensitive stomachs, foods to avoid, and the drama of introducing a new food",
    "Cuddle Chronicles — the velcro dog bond, lap life, separation anxiety, sleeping habits, and the emotional connection that makes Yorkie owners say they could never have another breed",
]

import random as _random

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
    tone_map = {'funny':'comedic and deadpan','cinematic':'dramatic and cinematic','savage':'hilariously savage','wholesome':'charming and wholesome','relatable':'laugh-out-loud relatable'}
    cta_map  = {'engagement':'end with a funny question that drives comments','tag':'tell followers to tag someone who acts like this','save':'encourage saving or sharing','follow':'invite people to follow the page'}
    day_theme = DAY_THEMES[day_idx]
    effective_theme = theme if theme else day_theme['name']
    system_prompt = ('You are the creative director for "Tiny Dog Mafia," a viral Yorkie Facebook and Instagram page. '
        'The brand voice is: tiny dog, big attitude, mafia/boss persona. Every post treats the Yorkie as if '
        'it runs a crime family division operating inside everyday domestic situations. The humor is deadpan, '
        'cinematic, and absurdist. '
        'CRITICAL ANTI-REPETITION: Every post MUST cover a completely different situation, setting, and comedic angle. '
        'No two posts should reference the same activity, location, or scenario. '
        'Spread content across ALL provided pillars. '
        'Respond ONLY with valid JSON. No markdown. No code fences. No preamble.')
    user_prompt = f"""Generate exactly {count} unique Tiny Dog Mafia social media image posts.
{"Theme override: " + theme + ". " if theme else ""}

Draw from these content pillars — assign each post to a DIFFERENT pillar to maximize variety:
1. {selected[0] if 0 < len(selected) else PILLARS[0 % len(PILLARS)]}
2. {selected[1] if 1 < len(selected) else PILLARS[1 % len(PILLARS)]}
3. {selected[2] if 2 < len(selected) else PILLARS[2 % len(PILLARS)]}
4. {selected[3] if 3 < len(selected) else PILLARS[3 % len(PILLARS)]}
5. {selected[4] if 4 < len(selected) else PILLARS[4 % len(PILLARS)]}
6. {selected[5] if 5 < len(selected) else PILLARS[5 % len(PILLARS)]}
7. {selected[6] if 6 < len(selected) else PILLARS[6 % len(PILLARS)]}
8. {selected[7] if 7 < len(selected) else PILLARS[7 % len(PILLARS)]}
9. {selected[8] if 8 < len(selected) else PILLARS[8 % len(PILLARS)]}
10. {selected[9] if 9 < len(selected) else PILLARS[9 % len(PILLARS)]}

STRICT ANTI-REPETITION RULES:
- Every post MUST have a completely different situation, setting, room, activity, and scenario
- Never repeat the same activity (e.g. only one post about laundry, one about cooking, one about the couch)
- Vary the location: kitchen, living room, bedroom, backyard, car, front door, bathroom, office, etc.
- Vary the comedic angle: supervising, claiming territory, demanding attention, causing chaos, refusing orders, etc.

CAPTION STYLE — "your Yorkie" voice, short punchy lines building an observation:
- Example: "Nobody invited your Yorkie to host the barbecue. Nobody handed them responsibilities. Yet somehow... They've greeted every guest. Visited every conversation. At this point, your Yorkie is networking. 🐾😂"
- 3 full paragraphs: Para 1 = scroll-stopping hook with emojis, Para 2 = build the scene/story, Para 3 = CTA asking followers to comment + follow
- Exactly 5 hashtags on final line
- Tone: {tone_map[tone]}
- CTA style: {cta_map[cta]}

IMAGE PROMPT: Photorealistic cinematic 4:5 Yorkie scene. Steel-blue and tan fur. Specific situation, tiny outfit, bold gold text overlay with headline, Tiny Dog Mafia division subtitle. Warm cinematic lighting, shallow depth of field.

FIRST COMMENT: 1-2 sentences, warm owner-to-owner voice. Funny extra observation about this specific situation + "Tag a friend who needs to see this" or similar. Never hashtags.

Also: "headline" (2-6 word ALL CAPS), "division" (fake TDM division name matching the situation)

JSON: {{"posts":[{{"headline":"...","division":"...","imagePrompt":"...","caption":"...","firstComment":"..."}}]}}"""
    try:
        resp = requests.post('https://api.anthropic.com/v1/messages',
            headers={'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01'},
            json={'model':'claude-sonnet-4-20250514','max_tokens':8000,'system':system_prompt,'messages':[{'role':'user','content':user_prompt}]},
            timeout=120)
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
    day_idx    = int(data.get('dayIndex', datetime.now().weekday()))
    dog_name   = data.get('dogName', 'the Yorkie')
    day_theme  = DAY_THEMES[day_idx]
    effective_theme = day_theme['name']
    if video_type == 'short':
        rules = "SHORT-FORM 12 seconds: 2-4 scene changes, loopable ending, comedic hook in first 2 seconds, Hypernatural optimized"
        note  = "Punchy 12-second Hypernatural narration. Fast cuts, visual comedy."
    else:
        rules = "LONG-FORM 70-90 seconds: comedic escalation every 10-15 seconds, unexpected twist, deadpan narration, strong CTA ending, Hypernatural optimized"
        note  = "Full 70-90 second Hypernatural narration with comedic escalation arc."
    system_prompt = ('You are the video director for Tiny Dog Mafia. Generate comedic video scripts treating the Yorkie as a tiny crime boss. '
        'Scripts must be pure Hypernatural-compatible narration — no scene descriptions, no brackets. Respond ONLY with valid JSON.')
    user_prompt = f"""Generate exactly {count} unique Tiny Dog Mafia {video_type}-form video scripts.
Theme: "{effective_theme}" — {day_theme['focus']}
Rules: {rules}

VIDEO SCRIPT STYLE — follow this exact voice and structure:
- Uses "your Yorkie" as subject throughout
- Builds with rhythm and repetition — short observations that escalate
- Uses "..." for dramatic pauses
- Stacks examples in threes
- Ends with a warm reflective thought + emojis
- Example structure:
  "Your Yorkie has a very interesting definition of helping.
  You're folding laundry? They're sitting on it.
  You're making the bed? They're already in it.
  You're cleaning the house? They're following behind making sure none of your progress lasts too long.
  And somehow... no matter what project you're working on... your Yorkie becomes involved immediately.
  Not because they understand what's happening. Not because they have useful skills.
  But because clearly no activity should happen without them.
  [more escalating examples...]
  And honestly... the project may take twice as long. But it's a lot more fun with your tiny assistant nearby.
  🐾😂 Your Yorkie may not make projects easier... but they definitely make them more entertaining. 🐶❤️"

For each video:
1. "videoScript": {note} Follow the VIDEO SCRIPT STYLE above. Pure narration — no brackets, no scene notes.
2. "captionAndHashtags": Short hook using "your Yorkie" + 2-3 punchy lines + CTA + 5-6 hashtags.
3. "firstComment": 1-2 funny sentences. An extra observation that rewards people who read comments.
4. "imagePrompt": Cinematic still for key scene. Photorealistic Yorkie with steel-blue and tan fur, dramatic lighting. For OpenArt.
5. "mood": comedic mood/energy

Each of the {count} scripts must cover a completely different premise.
JSON: {{"videos":[{{"videoScript":"...","captionAndHashtags":"...","firstComment":"...","imagePrompt":"...","mood":"..."}}]}}"""
    try:
        resp = requests.post('https://api.anthropic.com/v1/messages',
            headers={'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01'},
            json={'model':'claude-sonnet-4-20250514','max_tokens':6000,'system':system_prompt,'messages':[{'role':'user','content':user_prompt}]},
            timeout=120)
        result = resp.json()
        raw = result['content'][0]['text'].strip().replace('```json','').replace('```','').strip()
        videos = json.loads(raw)
        return jsonify({'ok':True,'videos':videos['videos'],'themeName':effective_theme,'videoType':video_type})
    except Exception as e:
        return jsonify({'ok':False,'error':str(e)}), 500

@tdm_bp.route('/api/generate-banner', methods=['POST'])
def generate_banner():
    data     = request.get_json()
    count    = int(data.get('count', 3))
    override = data.get('theme', '')

    pillar = random.choice(PILLARS)

    system_prompt = ('You are the creative director for Tiny Dog Mafia, a viral Yorkie Facebook page. '
        'Generate typographic banner concepts — no people, no photography, text on gradient background only. '
        'Banners must be vibrant, scroll-stopping, and use the Tiny Dog Mafia mafia/boss voice. '
        'The banner text must always be a QUESTION that invites comments. '
        'Respond ONLY with valid JSON. No markdown. No code fences. No preamble.')

    theme_note = f'Theme override: "{override}". ' if override else ''

    user_prompt = f"""Generate exactly {count} unique Tiny Dog Mafia typographic banner concepts.
{theme_note}Draw from this content pillar: {pillar}

BANNER FORMAT — typographic only, no people or photography:
- Vibrant saturated color gradients — electric blues, deep purples, fiery oranges, warm golds, hot pinks
- Strong contrast between lettering and background required
- Soft glow or radial burst behind text for energy
- The sole visual element is bold centered text — a QUESTION that invites comments
- Heavy condensed sans-serif font, bright lettering with glow effect
- Stack text across 2-3 lines for visual rhythm
- Tiny Dog Mafia brand energy — bold, funny, mafia-boss attitude in the question
- End with: "No people, no photography, no illustrations. Text on gradient background only. Optimized for 1080x1350 format."

CAPTION: 3 full paragraphs. Para 1: scroll-stopping hook with 2-3 emojis tied to the banner question. Para 2: funny relatable Yorkie context. Para 3: CTA inviting followers to answer in comments and follow. Exactly 5 hashtags on final line.

FIRST COMMENT: 1-2 sentences, warm owner-to-owner voice, funny Yorkie observation + "Tag a friend" CTA. Never hashtags.

JSON: {{"banners":[{{"bannerPrompt":"...","caption":"...","firstComment":"...","pillar":"..."}}]}}"""

    try:
        resp = requests.post('https://api.anthropic.com/v1/messages',
            headers={'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01'},
            json={'model':'claude-sonnet-4-20250514','max_tokens':6000,'system':system_prompt,
                  'messages':[{'role':'user','content':user_prompt}]},
            timeout=120)
        result = resp.json()
        raw = result['content'][0]['text'].strip().replace('```json','').replace('```','').strip()
        banners = json.loads(raw)
        return jsonify({'ok':True,'banners':banners['banners']})
    except Exception as e:
        return jsonify({'ok':False,'error':str(e)}), 500


@tdm_bp.route('/api/image', methods=['POST'])
def generate_image():
    data = request.get_json()
    prompt = data.get('prompt', '')
    key = data.get('geminiKey') or GEMINI_KEY
    if not key:
        return jsonify({'ok':False,'error':'No Gemini API key configured'}), 400
    models = ['gemini-2.5-flash-image','gemini-2.0-flash-preview-image-generation']
    last_error = ''
    for model in models:
        try:
            url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}'
            r = requests.post(url, json={'contents':[{'parts':[{'text':prompt}],'role':'user'}],'generationConfig':{'responseModalities':['TEXT','IMAGE']}}, timeout=60)
            d = r.json()
            if 'error' in d: last_error = f"{model}: {d['error']['message']}"; continue
            parts = d.get('candidates',[{}])[0].get('content',{}).get('parts',[])
            img_part = next((p for p in parts if 'inlineData' in p), None)
            if not img_part: last_error = f'{model}: No image'; continue
            return jsonify({'ok':True,'dataUrl':f"data:{img_part['inlineData']['mimeType']};base64,{img_part['inlineData']['data']}",'model':model})
        except Exception as e:
            last_error = f'{model}: {str(e)}'; continue
    return jsonify({'ok':False,'error':last_error}), 500

@tdm_bp.route('/api/schedule', methods=['POST'])
def schedule_post():
    data = request.get_json()
    page_id = data.get('pageId',''); token = data.get('token','')
    caption = data.get('caption',''); image_b64 = data.get('imageB64','')
    sched_time = int(data.get('scheduledTime'))
    if not all([page_id, token, caption, image_b64]):
        return jsonify({'ok':False,'error':'Missing required fields'}), 400
    try:
        header, encoded = image_b64.split(',', 1)
        img_bytes = base64.b64decode(encoded)
        upload_resp = requests.post(f'https://graph.facebook.com/v19.0/{page_id}/photos',
            data={'published':'false','access_token':token},
            files={'source':('image.jpg',img_bytes,'image/jpeg')}, timeout=30)
        upload_data = upload_resp.json()
        if 'error' in upload_data:
            return jsonify({'ok':False,'error':upload_data['error']['message']}), 400
        photo_id = upload_data['id']
        post_resp = requests.post(f'https://graph.facebook.com/v19.0/{page_id}/feed',
            data={'message':caption,'attached_media':json.dumps([{'media_fbid':photo_id}]),
                  'scheduled_publish_time':sched_time,'published':'false','access_token':token}, timeout=30)
        post_data = post_resp.json()
        if 'error' in post_data:
            return jsonify({'ok':False,'error':post_data['error']['message']}), 400
        return jsonify({'ok':True,'postId':post_data.get('id','')})
    except Exception as e:
        return jsonify({'ok':False,'error':str(e)}), 500

@tdm_bp.route('/api/schedule-buffer', methods=['POST'])
def schedule_buffer():
    data = request.get_json()
    buffer_token = data.get('bufferToken',''); profile_ids = data.get('profileIds',[])
    caption = data.get('caption',''); image_b64 = data.get('imageB64','')
    sched_time = int(data.get('scheduledTime',0))
    if not buffer_token or not profile_ids or not caption:
        return jsonify({'ok':False,'error':'Missing required fields'}), 400
    try:
        media_id = None
        if image_b64:
            header, encoded = image_b64.split(',', 1)
            img_bytes = base64.b64decode(encoded)
            up = requests.post('https://api.bufferapp.com/1/media/upload.json',
                headers={'Authorization':f'Bearer {buffer_token}'},
                files={'file':('image.jpg',img_bytes,'image/jpeg')}, timeout=30)
            if up.json().get('id'): media_id = up.json()['id']
        results = []
        for pid in profile_ids:
            payload = {'text':caption,'profile_ids[]':pid,'scheduled_at':sched_time}
            if media_id: payload['media[id]'] = media_id
            pr = requests.post('https://api.bufferapp.com/1/updates/create.json',
                headers={'Authorization':f'Bearer {buffer_token}'}, data=payload, timeout=30)
            pd = pr.json()
            results.append({'profileId':pid,'updateId':pd.get('updates',[{}])[0].get('id','') if pd.get('success') else pd})
        return jsonify({'ok':True,'results':results})
    except Exception as e:
        return jsonify({'ok':False,'error':str(e)}), 500


# HTML is loaded from a separate template to avoid Python/JS escaping conflicts
import os as _os
_html_path = _os.path.join(_os.path.dirname(__file__), 'tdm_studio.html')
try:
    with open(_html_path) as _f:
        STUDIO_HTML = _f.read()
except:
    STUDIO_HTML = '<h1>Studio HTML not found. Ensure tdm_studio.html is in the app directory.</h1>'

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
.hdr-actions{margin-left:auto;display:flex;gap:8px;align-items:center;} .mobile-menu-btn{display:none;}
.layout{display:grid;grid-template-columns:220px 1fr;min-height:calc(100vh - 58px);}
.sidebar{background:var(--dark);border-right:1px solid var(--border);padding:16px 12px;overflow-y:auto;}
.s-title{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--hint);margin-bottom:10px;padding-bottom:7px;border-bottom:1px solid var(--dark3);}
.s-section{margin-bottom:20px;}
.s-label{font-size:11px;color:var(--muted);margin-bottom:5px;display:block;}
.s-field{margin-bottom:11px;}
.s-field select,.s-field input{width:100%;background:var(--dark3);border:1px solid var(--dark3);border-radius:5px;padding:7px 9px;font-family:"DM Sans",sans-serif;font-size:12px;color:var(--text);outline:none;}
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
.day-name-d{font-family:"Bebas Neue",sans-serif;font-size:20px;letter-spacing:.06em;color:var(--gold);margin-bottom:4px;}
.day-focus-d{font-size:11px;color:var(--muted);margin-bottom:12px;line-height:1.5;}
.theme-row{display:flex;gap:10px;}
.theme-row input{flex:1;background:var(--dark3);border:1px solid var(--dark3);border-radius:5px;padding:9px 12px;font-family:"DM Sans",sans-serif;font-size:13px;color:var(--text);outline:none;}
.theme-row input:focus{border-color:var(--gold-dim);}
.quick-row{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;}
.qchip{font-size:11px;padding:3px 9px;border-radius:3px;cursor:pointer;border:1px solid var(--dark3);color:var(--muted);background:var(--dark2);}
.qchip:hover{border-color:var(--gold-dim);color:var(--gold);}
.btn-row{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:9px 18px;border-radius:5px;font-family:"DM Sans",sans-serif;font-size:12px;font-weight:600;cursor:pointer;border:none;transition:all .2s;}
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
.content-card{background:var(--dark2);border:1px solid var(--dark3);border-radius:10px;overflow:hidden;}
.card-head{display:flex;align-items:center;gap:10px;padding:9px 14px;background:var(--dark3);border-bottom:1px solid var(--dark3);}
.card-num{font-family:"Bebas Neue",sans-serif;font-size:16px;color:var(--gold);min-width:28px;}
.card-meta{font-size:11px;color:var(--muted);flex:1;}
.card-time{font-size:11px;color:var(--hint);background:var(--dark2);padding:2px 9px;border-radius:3px;font-weight:600;}
.card-type{font-size:10px;font-weight:700;padding:2px 8px;border-radius:3px;letter-spacing:.04em;}
.type-image{background:rgba(99,153,34,.1);color:#639922;}
.type-short{background:rgba(74,128,184,.1);color:#7AAAD4;}
.type-long{background:rgba(170,100,34,.1);color:#D4AA7A;}
.card-body{display:grid;grid-template-columns:1fr 150px;}
.card-text{padding:12px 14px;border-right:1px solid var(--dark3);}
.sec-tabs{display:flex;border-bottom:1px solid var(--dark3);margin:-12px -14px 10px;}
.sec-tab{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--hint);padding:7px 10px;cursor:pointer;border-bottom:2px solid transparent;transition:all .15s;}
.sec-tab.on{color:var(--gold);border-bottom-color:var(--gold);}
.sec-pane{display:none;}
.sec-pane.on{display:block;}
.section-text{font-size:12px;line-height:1.75;color:var(--text);white-space:pre-wrap;}
.section-text.prompt{font-style:italic;color:var(--muted);border-left:2px solid var(--gold-dim);padding-left:8px;}
.card-img-col{padding:12px;display:flex;flex-direction:column;gap:6px;align-items:center;background:var(--dark3);}
.drop-zone{width:126px;height:126px;border-radius:6px;border:1.5px dashed var(--dark3);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;cursor:pointer;transition:all .2s;background:var(--dark2);}
.drop-zone:hover,.drop-zone.over{border-color:var(--gold-dim);background:rgba(201,168,76,.04);}
.drop-zone .dz-icon{font-size:22px;color:var(--hint);}
.drop-zone span{font-size:10px;color:var(--hint);text-align:center;line-height:1.4;}
.img-gen{width:126px;height:126px;border-radius:6px;border:1px solid var(--dark3);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:var(--dark2);font-size:10px;color:var(--hint);text-align:center;}
.img-preview{width:126px;height:126px;object-fit:cover;border-radius:6px;cursor:pointer;}
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

/* ── MOBILE RESPONSIVE ─────────────────────────────────── */
@media (max-width: 680px) {

  /* Header */
  header { padding: 0 14px; gap: 8px; }
  .logo { font-size: 18px; }
  .logo span { display: none; }
  .hdr-actions { gap: 6px; }
  .hdr-actions a, .hdr-actions button { font-size: 10px !important; padding: 4px 8px !important; }

  /* Layout — sidebar hidden by default on mobile */
  .layout { grid-template-columns: 1fr; }
  .sidebar {
    display: none;
    position: fixed;
    top: 58px; left: 0; right: 0; bottom: 0;
    z-index: 200;
    overflow-y: auto;
    border-right: none;
    border-top: 1px solid var(--border);
  }
  .sidebar.open { display: block; }
  .main { min-width: 0; }

  /* Mobile menu button */
  .mobile-menu-btn {
    display: flex !important;
    align-items: center;
    justify-content: center;
    width: 34px; height: 34px;
    background: var(--dark3);
    border: 1px solid var(--dark3);
    border-radius: 5px;
    cursor: pointer;
    color: var(--muted);
    font-size: 16px;
    flex-shrink: 0;
  }
  .mobile-menu-btn.on { border-color: var(--gold-dim); color: var(--gold); }

  /* Tabs — horizontal scroll */
  .tabs { padding: 0 10px; overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
  .tabs::-webkit-scrollbar { display: none; }
  .tab { padding: 10px 10px; font-size: 10px; white-space: nowrap; flex-shrink: 0; }

  /* Pane padding */
  .pane { padding: 12px; }

  /* Gen/theme boxes */
  .gen-box, .theme-box { padding: 12px; }
  .gen-box p, .theme-box p { font-size: 11px; margin-bottom: 10px; }
  .override-row, .theme-row { flex-direction: column; gap: 8px; }
  .override-row input, .theme-row input { width: 100%; }
  .btn-row { flex-direction: column; }
  .btn-row .btn { width: 100%; }
  .btn { font-size: 12px; padding: 10px 14px; }
  .quick-row { gap: 4px; }
  .qchip { font-size: 10px; }

  /* Cards — stack image below text */
  .card-body { grid-template-columns: 1fr; }
  .card-text { border-right: none; border-bottom: 1px solid var(--dark3); padding: 10px 12px; }
  .card-img-col {
    padding: 10px 12px;
    flex-direction: row;
    align-items: center;
    gap: 10px;
    background: var(--dark3);
    justify-content: flex-start;
  }
  .drop-zone, .img-preview, .img-gen, .banner-placeholder {
    width: 80px !important; height: 80px !important;
  }
  .drop-zone span { font-size: 9px; }
  .dz-icon { font-size: 18px; }

  /* Card head */
  .card-head { padding: 8px 12px; flex-wrap: wrap; gap: 6px; }
  .card-time { margin-left: 0; }

  /* Card foot */
  .card-foot { padding: 8px 12px; gap: 5px; }
  .mbtn { font-size: 10px; padding: 4px 8px; }
  .s-txt { font-size: 10px; width: 100%; order: -1; margin-bottom: 2px; }

  /* Section text */
  .section-text { font-size: 11px; }
  .first-comment-text { font-size: 11px; }

  /* Batch bar */
  .batch-bar { padding: 8px 10px; gap: 6px; }
  .batch-bar .btn { font-size: 10px !important; padding: 6px 10px !important; width: auto; }
  .batch-msg { font-size: 10px; width: 100%; }

  /* Schedule table */
  .sched-head { grid-template-columns: 28px 50px 1fr 80px; font-size: 9px; padding: 6px 10px; }
  .sched-row { grid-template-columns: 28px 50px 1fr 80px; font-size: 10px; padding: 7px 10px; }
  .sched-head span:nth-child(5), .sched-row span:nth-child(5),
  .sched-head span:last-child, .sched-row .pill { display: none; }

  /* Settings modal */
  #settings-modal > div { width: 95vw !important; padding: 20px !important; }

  /* Stat grid */
  .stat-grid { grid-template-columns: 1fr 1fr; }
  .stat-num { font-size: 22px; }

  /* Toast */
  .toast { left: 10px; right: 10px; max-width: none; bottom: 14px; }

  /* Two col forms */
  .two-col { grid-template-columns: 1fr; }

  /* Progress */
  .prog-label { font-size: 10px; }
}

</style>
</head>
<body>

<header>
  <div class="logo">Tiny Dog Mafia<span>Content Studio</span></div>
  <div class="day-badge" id="day-badge">Loading...</div>
  <button class="mobile-menu-btn" id="mobile-menu-btn">&#9776;</button>
  <div class="hdr-actions">
    <button class="btn btn-ghost" style="font-size:11px;padding:5px 12px;" id="settings-btn">&#9881; Settings</button>
    <a href="/mj" class="btn btn-ghost" style="font-size:11px;padding:5px 12px;">Switch to MJ</a>
  </div>
</header>

<div id="settings-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:500;align-items:center;justify-content:center;">
  <div style="background:var(--dark2);border:1px solid var(--border);border-radius:12px;padding:32px;width:460px;max-width:90vw;">
    <h2 style="font-family:Bebas Neue,sans-serif;font-size:22px;letter-spacing:.08em;color:var(--gold);margin-bottom:20px;">Studio Settings</h2>
    <div class="s-field"><label class="s-label">Yorkie Name (optional)</label><input type="text" id="set-name" placeholder="Bella, Boss, Coco..."></div>
    <div class="s-field"><label class="s-label">Gemini API Key (optional)</label><input type="password" id="set-gemini" placeholder="AIza..."></div>
    <div class="s-field"><label class="s-label">Buffer Access Token (future use)</label><input type="password" id="set-buffer" placeholder="For Buffer scheduling..."></div>
    <div style="display:flex;gap:10px;margin-top:18px;">
      <button class="btn btn-gold" id="save-settings-btn" style="flex:1;">Save</button>
      <button class="btn btn-ghost" id="cancel-settings-btn">Cancel</button>
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
      <div class="s-field"><label class="s-label">First post time</label><input type="text" id="start-time" value="8:00 AM"></div>
      <div class="s-field"><label class="s-label">Interval (minutes)</label><input type="text" id="interval" value="45"></div>

    </div>
    <div class="s-section">
      <div class="s-title">Content Pillars</div>
      <div style="font-size:11px;color:var(--hint);line-height:1.7;margin-bottom:10px;">10 Yorkie pillars randomly selected on each generation for maximum variety.</div>
    </div>
    <div class="s-section">
      <div class="s-title">Vibe / Tone</div>
      <div class="chip-row" id="tone-chips">
        <div class="chip on" data-tone="funny">Funny</div>
        <div class="chip" data-tone="cinematic">Cinematic</div>
        <div class="chip" data-tone="savage">Savage</div>
        <div class="chip" data-tone="wholesome">Wholesome</div>
        <div class="chip" data-tone="relatable">Relatable</div>
      </div>
    </div>
    <div class="s-section">
      <div class="s-title">CTA Style</div>
      <div class="chip-row" id="cta-chips">
        <div class="chip on" data-cta="engagement">Comments</div>
        <div class="chip" data-cta="tag">Tag a friend</div>
        <div class="chip" data-cta="save">Save/share</div>
        <div class="chip" data-cta="follow">Follow</div>
      </div>
    </div>
  </div>

  <div class="main">
    <div class="tabs">
      <div class="tab on" data-tab="images">Image Posts</div>
      <div class="tab" data-tab="banners">Banners</div>
      <div class="tab" data-tab="shorts">Short Videos (12s)</div>
      <div class="tab" data-tab="longs">Long Videos</div>
      <div class="tab" data-tab="schedule">Schedule</div>
      <div class="tab" data-tab="facebook">Facebook Setup</div>
    </div>

    <div class="pane on" id="pane-images">
      <div class="theme-box">
        <div class="day-name-d" id="theme-name-d">Loading...</div>
        <div class="day-focus-d" id="theme-focus-d"></div>
        <p>Enter a theme or leave blank to use the daily theme.</p>
        <div class="theme-row">
          <input type="text" id="theme-input" placeholder="Optional theme override...">
          <button class="btn btn-gold" id="gen-img-btn">Generate Image Posts</button>
        </div>
        <div class="quick-row">
          <span style="font-size:10px;color:var(--hint);align-self:center;">Quick:</span>
          <div class="qchip" data-theme="morning chaos">Morning</div>
          <div class="qchip" data-theme="pool day takeover">Pool day</div>
          <div class="qchip" data-theme="grocery store heist">Grocery</div>
          <div class="qchip" data-theme="spa day demands">Spa day</div>
          <div class="qchip" data-theme="remote work supervision">WFH</div>
          <div class="qchip" data-theme="dinner table negotiations">Dinner</div>
        </div>
        <div id="img-prog-wrap" style="display:none;" class="prog-wrap">
          <div class="prog-track"><div class="prog-fill" id="img-prog-fill"></div></div>
          <div class="prog-label" id="img-prog-label">Generating...</div>
        </div>
      </div>
      <div class="batch-bar" id="img-batch-bar">
        <span class="batch-msg" id="img-batch-msg">Posts ready</span>
        <button class="btn btn-gold" id="gen-all-imgs-btn" style="font-size:11px;padding:7px 14px;">&#10024; Generate All Images</button>
        <button class="btn btn-dark" id="copy-all-captions-btn" style="font-size:11px;padding:7px 12px;">&#128203; Copy All Captions</button>
        <button class="btn btn-gold" id="sched-all-btn" style="font-size:11px;padding:7px 14px;display:none;">&#128640; Schedule All to FB</button>
        <button class="btn btn-ghost" id="clear-images-btn" style="font-size:11px;padding:7px 12px;">&#10005; Clear</button>
      </div>
      <div id="gen-all-prog" style="display:none;padding:0 0 12px;">
        <div class="prog-track"><div class="prog-fill" id="gen-all-fill"></div></div>
        <div class="prog-label" id="gen-all-label">Generating images...</div>
      </div>
      <div id="images-container">
        <div class="empty"><span class="empty-icon">&#128081;</span><h3>Awaiting Orders</h3><p>Enter a theme and click Generate Image Posts.</p></div>
      </div>
    </div>

    <div class="pane" id="pane-banners">
      <div class="theme-box">
        <div class="day-name-d">Tiny Dog Mafia Banners</div>
        <div class="day-focus-d">Typographic banners with bold questions that drive comments. Paste prompt into OpenArt or Gemini.</div>
        <p>Vibrant gradient backgrounds, mafia-boss attitude, scroll-stopping questions.</p>
        <div class="btn-row">
          <button class="btn btn-gold" id="gen-banner-btn">Generate 3 Banners</button>
          <button class="btn btn-ghost" id="clear-banners-btn">Clear</button>
        </div>
        <div id="banner-prog-wrap" style="display:none;" class="prog-wrap">
          <div class="prog-track"><div class="prog-fill" id="banner-prog-fill"></div></div>
          <div class="prog-label" id="banner-prog-label">Generating banners...</div>
        </div>
      </div>
      <div id="banners-container">
        <div class="empty"><span class="empty-icon">&#127775;</span><h3>No Banners Yet</h3><p>Generate typographic banner concepts with Tiny Dog Mafia attitude.</p></div>
      </div>
    </div>

    <div class="pane" id="pane-shorts">
      <div class="theme-box">
        <div class="day-name-d" id="short-day-d">Loading...</div>
        <p>Generates 3 x 12-second Hypernatural video scripts with captions and scene image prompts.</p>
        <div class="btn-row">
          <button class="btn btn-gold" id="gen-short-btn">Generate 3 Short Video Scripts</button>
          <button class="btn btn-dark" id="clear-shorts-btn">Clear</button>
        </div>
        <div id="short-prog-wrap" style="display:none;" class="prog-wrap">
          <div class="prog-track"><div class="prog-fill" id="short-prog-fill"></div></div>
          <div class="prog-label" id="short-prog-label">Writing scripts...</div>
        </div>
      </div>
      <div id="shorts-container">
        <div class="empty"><span class="empty-icon">&#127910;</span><h3>No Short Scripts Yet</h3><p>Click Generate to create 3 x 12-second scripts.</p></div>
      </div>
    </div>

    <div class="pane" id="pane-longs">
      <div class="theme-box">
        <div class="day-name-d" id="long-day-d">Loading...</div>
        <p>Generates 3 x 70-90 second Hypernatural video scripts with captions and scene image prompts.</p>
        <div class="btn-row">
          <button class="btn btn-gold" id="gen-long-btn">Generate 3 Long Video Scripts</button>
          <button class="btn btn-dark" id="clear-longs-btn">Clear</button>
        </div>
        <div id="long-prog-wrap" style="display:none;" class="prog-wrap">
          <div class="prog-track"><div class="prog-fill" id="long-prog-fill"></div></div>
          <div class="prog-label" id="long-prog-label">Writing scripts...</div>
        </div>
      </div>
      <div id="longs-container">
        <div class="empty"><span class="empty-icon">&#127909;</span><h3>No Long Scripts Yet</h3><p>Click Generate to create 3 x 70-90 second scripts.</p></div>
      </div>
    </div>

    <div class="pane" id="pane-schedule">
      <div id="sched-container">
        <div class="empty"><span class="empty-icon">&#128197;</span><h3>No Posts Yet</h3><p>Generate content first.</p></div>
      </div>
    </div>

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
          <div style="display:flex;align-items:flex-end;"><button class="btn btn-gold" id="test-fb-btn" style="width:100%;">Save &amp; Test</button></div>
        </div>
        <div id="fb-result" style="display:none;margin-top:8px;"></div>
      </div>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<!-- Mobile copy modal -->
<div id="copy-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9000;align-items:flex-end;justify-content:center;padding:0;">
  <div style="background:var(--dark2);border:1px solid var(--border);border-radius:16px 16px 0 0;padding:20px;width:100%;max-height:70vh;display:flex;flex-direction:column;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <span style="font-size:12px;font-weight:700;color:var(--gold);letter-spacing:.06em;text-transform:uppercase;" id="copy-modal-title">Copy Text</span>
      <button id="copy-modal-close" style="background:var(--dark3);border:none;color:var(--muted);font-size:18px;width:28px;height:28px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;">&#10005;</button>
    </div>
    <textarea id="copy-modal-text" style="flex:1;background:var(--dark3);border:1px solid var(--dark3);border-radius:8px;padding:12px;font-family:DM Sans,sans-serif;font-size:12px;color:var(--text);resize:none;min-height:150px;outline:none;line-height:1.7;" readonly></textarea>
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button id="copy-modal-btn" class="btn btn-gold" style="flex:1;">Copy to Clipboard</button>
      <button id="copy-modal-close2" class="btn btn-ghost">Done</button>
    </div>
  </div>
</div>

<script>
const DAY_THEMES = {
  0:{name:'Monday Mayhem',focus:'chaos, taking over the week, Monday energy'},
  1:{name:'Tiny Boss Tuesday',focus:'authority, running things, executive decisions'},
  2:{name:'Hump Day Heist',focus:'mid-week operations, Wednesday chaos'},
  3:{name:'Throwback Thursday',focus:'origin stories, nostalgic moments'},
  4:{name:'Friday Operations',focus:'weekend prep, letting loose, Friday energy'},
  5:{name:'Saturday Takeover',focus:'leisure, supervising the weekend, pool days'},
  6:{name:'Sunday Surveillance',focus:'relaxing but still watching everything'}
};

const S = {
  name: localStorage.getItem('tdm_name') || '',
  geminiKey: localStorage.getItem('tdm_gemini') || '',
  bufferToken: localStorage.getItem('tdm_buffer') || '',
  tone: 'funny', cta: 'engagement',
  imagePosts: [], banners: [], shortVideos: [], longVideos: []
};

// ── PERSISTENCE ───────────────────────────────────────────
function savePosts() {
  try {
    localStorage.setItem('tdm_imagePosts', JSON.stringify(S.imagePosts));
    localStorage.setItem('tdm_banners', JSON.stringify(S.banners));
    localStorage.setItem('tdm_shortVideos', JSON.stringify(S.shortVideos));
    localStorage.setItem('tdm_longVideos', JSON.stringify(S.longVideos));
  } catch(e) { console.warn('Could not save posts:', e); }
}

function loadPosts() {
  try {
    const ip = localStorage.getItem('tdm_imagePosts');
    const sv = localStorage.getItem('tdm_shortVideos');
    const lv = localStorage.getItem('tdm_longVideos');
    const bn = localStorage.getItem('tdm_banners');
    if (ip) S.imagePosts = JSON.parse(ip);
    if (bn) S.banners = JSON.parse(bn);
    if (sv) S.shortVideos = JSON.parse(sv);
    if (lv) S.longVideos = JSON.parse(lv);
  } catch(e) { console.warn('Could not load posts:', e); }
}

function clearSavedPosts() {
  localStorage.removeItem('tdm_imagePosts');
  localStorage.removeItem('tdm_shortVideos');
  localStorage.removeItem('tdm_longVideos');
  S.imagePosts = []; S.shortVideos = []; S.longVideos = [];
}


// ── INIT ─────────────────────────────────────────────────
function initTheme() {
  // Pillars are randomly selected server-side on each generation
  const el = document.getElementById('day-badge');
  if (el) el.textContent = 'Tiny Dog Mafia';
  const tn = document.getElementById('theme-name-d');
  if (tn) tn.textContent = 'Tiny Dog Mafia Content Studio';
  const tf = document.getElementById('theme-focus-d');
  if (tf) tf.textContent = 'Pillars randomly selected for maximum variety across all 10 Yorkie topics';
  const sd = document.getElementById('short-day-d');
  if (sd) sd.textContent = 'Short Video Scripts';
  const ld = document.getElementById('long-day-d');
  if (ld) ld.textContent = 'Long Video Scripts';
}
initTheme();


// ── MOBILE MENU ───────────────────────────────────────────
document.getElementById('mobile-menu-btn').addEventListener('click', () => {
  const sidebar = document.querySelector('.sidebar');
  const btn = document.getElementById('mobile-menu-btn');
  sidebar.classList.toggle('open');
  btn.classList.toggle('on');
});
// Close sidebar when tab is clicked on mobile
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    if (window.innerWidth <= 680) {
      document.querySelector('.sidebar').classList.remove('open');
      document.getElementById('mobile-menu-btn').classList.remove('on');
    }
  });
});


// ── COPY MODAL ────────────────────────────────────────────
document.getElementById('copy-modal-close').addEventListener('click', closeCopyModal);
document.getElementById('copy-modal-close2').addEventListener('click', closeCopyModal);
document.getElementById('copy-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('copy-modal')) closeCopyModal();
});
document.getElementById('copy-modal-btn').addEventListener('click', () => {
  const text = document.getElementById('copy-modal-text').value;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => { toast('Copied!'); closeCopyModal(); }).catch(() => toast('Select all text above and copy manually'));
  } else {
    const ta = document.getElementById('copy-modal-text');
    ta.select(); ta.setSelectionRange(0, 99999);
    try { document.execCommand('copy'); toast('Copied!'); closeCopyModal(); }
    catch(e) { toast('Select all text above and copy manually'); }
  }
});

// Load any saved posts
loadPosts();
if (S.banners.length) { renderBanners(); updateStats(); renderSchedule(); }
if (S.imagePosts.length) { renderImagePosts(); updateStats(); document.getElementById('img-batch-bar') && document.getElementById('img-batch-bar').classList.add('show'); renderSchedule(); }
if (S.shortVideos.length) renderVideos('short');
if (S.longVideos.length) renderVideos('long');

// ── EVENT LISTENERS (no inline handlers) ─────────────────
document.getElementById('settings-btn').addEventListener('click', () => {
  document.getElementById('set-name').value = S.name;
  document.getElementById('set-gemini').value = S.geminiKey;
  document.getElementById('set-buffer').value = S.bufferToken;
  document.getElementById('settings-modal').style.display = 'flex';
});
document.getElementById('cancel-settings-btn').addEventListener('click', () => {
  document.getElementById('settings-modal').style.display = 'none';
});
document.getElementById('save-settings-btn').addEventListener('click', () => {
  S.name = document.getElementById('set-name').value.trim();
  S.geminiKey = document.getElementById('set-gemini').value.trim();
  S.bufferToken = document.getElementById('set-buffer').value.trim();
  localStorage.setItem('tdm_name', S.name);
  localStorage.setItem('tdm_gemini', S.geminiKey);
  localStorage.setItem('tdm_buffer', S.bufferToken);
  document.getElementById('settings-modal').style.display = 'none';
  toast('Settings saved!');
});

// Tabs
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
    document.querySelectorAll('.pane').forEach(p => p.classList.remove('on'));
    tab.classList.add('on');
    document.getElementById('pane-' + tab.dataset.tab).classList.add('on');
  });
});

// Tone/CTA chips
document.getElementById('tone-chips').addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  document.querySelectorAll('#tone-chips .chip').forEach(c => c.classList.remove('on'));
  chip.classList.add('on');
  S.tone = chip.dataset.tone;
});
document.getElementById('cta-chips').addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  document.querySelectorAll('#cta-chips .chip').forEach(c => c.classList.remove('on'));
  chip.classList.add('on');
  S.cta = chip.dataset.cta;
});

// Quick chips
document.querySelectorAll('.qchip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.getElementById('theme-input').value = chip.dataset.theme;
  });
});

// Buttons
document.getElementById('gen-img-btn').addEventListener('click', generateImages);
document.getElementById('gen-all-imgs-btn').addEventListener('click', generateAllImages);
document.getElementById('copy-all-captions-btn').addEventListener('click', () => {
  const txt = S.imagePosts.map((p, i) => 'POST ' + (i+1) + ':' + String.fromCharCode(10) + p.caption).join(String.fromCharCode(10,10) + '---' + String.fromCharCode(10,10));
  copyToClipboard(txt); toast('All captions copied!');
});
document.getElementById('sched-all-btn').addEventListener('click', () => scheduleAll('img'));
document.getElementById('clear-images-btn').addEventListener('click', () => clearContent('images'));
document.getElementById('gen-banner-btn').addEventListener('click', generateBanners);
document.getElementById('clear-banners-btn').addEventListener('click', () => clearContent('banners'));
document.getElementById('gen-short-btn').addEventListener('click', () => generateVideos('short'));
document.getElementById('clear-shorts-btn').addEventListener('click', () => clearContent('shorts'));
document.getElementById('gen-long-btn').addEventListener('click', () => generateVideos('long'));
document.getElementById('clear-longs-btn').addEventListener('click', () => clearContent('longs'));
document.getElementById('test-fb-btn').addEventListener('click', testFB);

// Event delegation for dynamically created cards
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const type = btn.dataset.type || 'img';
  const idx = parseInt(btn.dataset.idx || '0');
  const field = btn.dataset.field || '';

  if (action === 'upload') document.getElementById('file-' + type + '-' + idx).click();
  if (action === 'regen') genImage(type, idx);
  if (action === 'copy') { copyField(type, idx, field); }
  if (action === 'schedule') scheduleItem(type, idx);
  if (action === 'sectab') {
    const panes = btn.dataset.panes.split(',');
    const show = btn.dataset.show;
    panes.forEach(id => { const p = document.getElementById(id); if (p) p.classList.remove('on'); });
    const sp = document.getElementById(show); if (sp) sp.classList.add('on');
    btn.closest('.sec-tabs').querySelectorAll('.sec-tab').forEach(t => t.classList.remove('on'));
    btn.classList.add('on');
  }
});

document.addEventListener('change', e => {
  const input = e.target;
  if (input.dataset.fileType) {
    const type = input.dataset.fileType;
    const idx = parseInt(input.dataset.fileIdx);
    const f = input.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => applyImage(type, idx, ev.target.result);
    r.readAsDataURL(f);
  }
});

document.addEventListener('dragover', e => {
  if (e.target.closest('.drop-zone')) e.preventDefault();
});
document.addEventListener('dragleave', e => {
  const dz = e.target.closest('.drop-zone');
  if (dz) dz.classList.remove('over');
});
document.addEventListener('drop', e => {
  const dz = e.target.closest('[data-drop-type]');
  if (!dz) return;
  e.preventDefault();
  dz.classList.remove('over');
  const type = dz.dataset.dropType;
  const idx = parseInt(dz.dataset.dropIdx);
  const f = e.dataTransfer.files[0];
  if (!f || !f.type.startsWith('image/')) { toast('Drop an image file'); return; }
  const r = new FileReader();
  r.onload = ev => applyImage(type, idx, ev.target.result);
  r.readAsDataURL(f);
});

document.addEventListener('dragenter', e => {
  const dz = e.target.closest('.drop-zone');
  if (dz) dz.classList.add('over');
});

// ── HELPERS ───────────────────────────────────────────────
function toast(msg, isError) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = isError ? '#3A1010' : 'var(--dark2)';
  t.style.borderColor = isError ? '#AA3D3D' : 'var(--border)';
  t.style.color = isError ? '#D48A8A' : 'var(--gold-light)';
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), isError ? 12000 : 3500);
}
function setP(fillId, labelId, pct, label) {
  const f = document.getElementById(fillId); if (f) f.style.width = pct + '%';
  const l = document.getElementById(labelId); if (l) l.textContent = label;
}
function updateStats() {
  document.getElementById('s-images').textContent = S.imagePosts.length;
  document.getElementById('s-videos').textContent = S.shortVideos.length + S.longVideos.length;
  document.getElementById('s-ready').textContent = S.imagePosts.filter(p => p.imgUrl).length;
  document.getElementById('s-sched').textContent = [...S.imagePosts, ...S.shortVideos, ...S.longVideos].filter(p => p.scheduled).length;
}
function parseTime(s) {
  const m = s.trim().toUpperCase().match(/([0-9]+):([0-9]+)[ ]*(AM|PM)?/);
  if (!m) return {h:8,m:0};
  let h = parseInt(m[1]), min = parseInt(m[2]);
  if (m[3]==='PM' && h<12) h+=12;
  if (m[3]==='AM' && h===12) h=0;
  return {h, m:min};
}
function addMins(t, mins) {
  const total = t.h*60 + t.m + mins;
  return {h: Math.floor(total/60)%24, m: total%60};
}
function fmtTime(t) {
  const h = t.h%12||12, ap = t.h<12?'AM':'PM';
  return h + ':' + String(t.m).padStart(2,'0') + ' ' + ap;
}
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function getArr(type) {
  return type === 'img' ? S.imagePosts : type === 'banner' ? S.banners : type === 'short' ? S.shortVideos : S.longVideos;
}
function copyField(type, idx, field) {
  const item = getArr(type)[idx];
  const text = item[field] || '';
  const titles = {imagePrompt:'Image Prompt', bannerPrompt:'Banner Prompt', caption:'Caption & Hashtags', captionAndHashtags:'Caption & Hashtags', videoScript:'Video Script', firstComment:'First Comment'};
  copyToClipboard(text, titles[field] || 'Copy');
}

function copyToClipboard(text, title) {
  // On mobile, show a modal with the text for easy selection/copy
  if (window.innerWidth <= 680) {
    showCopyModal(text, title || 'Copy Text');
    return;
  }
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => toast('Copied!')).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:0;left:0;width:2px;height:2px;opacity:0;';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  try { document.execCommand('copy'); toast('Copied!'); }
  catch(e) { showCopyModal(text, 'Copy Text'); }
  document.body.removeChild(ta);
}

function showCopyModal(text, title) {
  document.getElementById('copy-modal-title').textContent = title || 'Copy Text';
  document.getElementById('copy-modal-text').value = text;
  document.getElementById('copy-modal').style.display = 'flex';
  setTimeout(() => {
    const ta = document.getElementById('copy-modal-text');
    ta.focus(); ta.select();
    ta.setSelectionRange(0, 99999);
  }, 100);
}

function closeCopyModal() {
  document.getElementById('copy-modal').style.display = 'none';
}

// ── GENERATE IMAGE POSTS ──────────────────────────────────
async function generateImages() {
  const theme = document.getElementById('theme-input').value.trim();
  const count = parseInt(document.getElementById('post-count').value);
  const dayIdx = getDayIdx();
  const btn = document.getElementById('gen-img-btn');
  btn.disabled = true; btn.textContent = 'Generating...';
  document.getElementById('img-prog-wrap').style.display = 'block';
  setP('img-prog-fill','img-prog-label',15,'Briefing the crew...');
  try {
    const res = await fetch('/tdm/api/generate', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({theme, count, tone:S.tone, cta:S.cta, dogName:S.name||'the Yorkie', dayIndex:dayIdx})
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    setP('img-prog-fill','img-prog-label',100,'Posts ready!');
    S.imagePosts = data.posts.map((p,i) => ({id:i, type:'image', ...p, imgUrl:null, status:'draft', scheduled:false})); savePosts();
    setTimeout(() => {
      document.getElementById('img-prog-wrap').style.display = 'none';
      renderImagePosts(); updateStats();
      document.getElementById('img-batch-bar').classList.add('show');
      document.getElementById('img-batch-msg').textContent = S.imagePosts.length + ' posts ready';
      renderSchedule();
    }, 400);
  } catch(e) { toast('Error: '+e.message, true); document.getElementById('img-prog-wrap').style.display = 'none'; }
  btn.disabled = false; btn.textContent = 'Generate Image Posts';
}

// ── RENDER IMAGE POSTS ────────────────────────────────────
function renderImagePosts() {
  const start = parseTime(document.getElementById('start-time').value);
  const intv = parseInt(document.getElementById('interval').value) || 45;
  const container = document.getElementById('images-container');
  container.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'content-list';

  S.imagePosts.forEach((p, i) => {
    const t = fmtTime(addMins(start, i * intv));
    const card = document.createElement('div');
    card.className = 'content-card'; card.id = 'img-card-' + i;
    card.innerHTML = buildCardHTML('img', i, p, t, 'IMAGE', 'type-image',
      p.imagePrompt, p.caption, p.firstComment,
      [{label:'Image Prompt', field:'imagePrompt'}, {label:'Caption & Hashtags', field:'caption'}, {label:'First Comment', field:'firstComment'}]
    );
    list.appendChild(card);
  });
  container.appendChild(list);
}

// ── RENDER VIDEO CARDS ────────────────────────────────────
function renderVideos(type) {
  const arr = getArr(type);
  const container = document.getElementById(type === 'short' ? 'shorts-container' : 'longs-container');
  const start = parseTime(document.getElementById('start-time').value);
  const intv = parseInt(document.getElementById('interval').value) || 45;
  const baseOff = type === 'long' ? S.imagePosts.length + 3 : S.imagePosts.length;
  container.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'content-list';

  arr.forEach((v, i) => {
    const t = fmtTime(addMins(start, (baseOff + i) * intv));
    const typeCls = type === 'short' ? 'type-short' : 'type-long';
    const typeLabel = type === 'short' ? 'SHORT 12s' : 'LONG 70-90s';
    const card = document.createElement('div');
    card.className = 'content-card'; card.id = type + '-card-' + i;
    card.innerHTML = buildCardHTML(type, i, v, t, typeLabel, typeCls,
      v.videoScript, v.captionAndHashtags, v.firstComment,
      [{label:'Video Script', field:'videoScript'}, {label:'Caption & Hashtags', field:'captionAndHashtags'}, {label:'First Comment', field:'firstComment'}],
      v.mood
    );
    list.appendChild(card);
  });
  container.appendChild(list);
}

// ── CARD HTML BUILDER ─────────────────────────────────────
function buildCardHTML(type, idx, item, time, typeLabel, typeCls, s1text, s2text, s3text, tabs, metaExtra) {
  const dotCls = item.imgUrl ? (item.scheduled ? 'dot-s' : 'dot-r') : 'dot-p';
  const statusTxt = item.scheduled ? 'Scheduled' : item.imgUrl ? 'Image ready — click Schedule' : 'Upload image or generate';
  const schedBtnCls = item.imgUrl ? 'mbtn mbtn-gold' : 'mbtn';
  const imgContent = item.imgUrl
    ? '<img src="' + esc(item.imgUrl) + '" class="img-preview" data-action="upload" data-type="' + type + '" data-idx="' + idx + '" title="Click to replace">'
    : '<div class="drop-zone" data-drop-type="' + type + '" data-drop-idx="' + idx + '" data-action="upload" data-type="' + type + '" data-idx="' + idx + '"><span class="dz-icon">&#9727;</span><span>Generate or drop</span></div>';

  const tabsHTML = tabs.slice(0,2).map((tab, ti) => {
    const paneId = type + '-s' + (ti+1) + '-' + idx;
    const allPanes = tabs.slice(0,2).map((_, tii) => type + '-s' + (tii+1) + '-' + idx).join(',');
    return '<div class="sec-tab ' + (ti===1?'on':'') + '" data-action="sectab" data-panes="' + allPanes + '" data-show="' + paneId + '">' + tab.label + '</div>';
  }).join('');

  const panesHTML = tabs.slice(0,2).map((tab, ti) => {
    const paneId = type + '-s' + (ti+1) + '-' + idx;
    const text = ti===0 ? s1text : s2text;
    const cls = ti===0 && (type==='img') ? 'section-text prompt' : 'section-text';
    return '<div class="sec-pane ' + (ti===1?'on':'') + '" id="' + paneId + '"><div class="' + cls + '">' + esc(text||'') + '</div></div>';
  }).join('') + '<div style="margin-top:8px;padding:8px 10px;background:var(--dark3);border-radius:5px;border-left:2px solid var(--gold-dim);"><div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--hint);margin-bottom:4px;">First Comment</div><div style="font-size:12px;color:var(--muted);line-height:1.6;">' + esc(s3text||'') + '</div></div>';

  const copyBtns = tabs.map(tab =>
    '<button class="mbtn" data-action="copy" data-type="' + type + '" data-idx="' + idx + '" data-field="' + tab.field + '">' + tab.label.split(' ')[0] + '</button>'
  ).join('');

  return '<div class="card-head">' +
    '<span class="card-num">#' + String(idx+1).padStart(2,'0') + '</span>' +
    '<span class="card-meta">' + esc(item.division||item.mood||metaExtra||'') + '</span>' +
    '<span class="card-type ' + typeCls + '">' + typeLabel + '</span>' +
    '<span class="card-time">' + time + '</span>' +
    '</div>' +
    '<div class="card-body">' +
    '<div class="card-text">' +
    '<div class="sec-tabs">' + tabsHTML + '</div>' +
    panesHTML +
    '</div>' +
    '<div class="card-img-col">' +
    '<input type="file" id="file-' + type + '-' + idx + '" accept="image/*" data-file-type="' + type + '" data-file-idx="' + idx + '" style="display:none">' +
    '<div id="img-' + type + '-' + idx + '">' + imgContent + '</div>' +
    '<button class="mbtn" data-action="regen" data-type="' + type + '" data-idx="' + idx + '" style="font-size:10px;">&#8635; Regen</button>' +
    '</div>' +
    '</div>' +
    '<div class="card-foot">' +
    '<div class="s-dot ' + dotCls + '" id="dot-' + type + '-' + idx + '"></div>' +
    '<span class="s-txt" id="stxt-' + type + '-' + idx + '">' + statusTxt + '</span>' +
    copyBtns +
    '<button class="' + schedBtnCls + '" id="sched-' + type + '-' + idx + '" data-action="schedule" data-type="' + type + '" data-idx="' + idx + '"' + (item.imgUrl?'':' disabled') + '>Schedule</button>' +
    '</div>';
}

// ── IMAGE GENERATION ──────────────────────────────────────
function applyImage(type, idx, dataUrl) {
  const arr = getArr(type);
  arr[idx].imgUrl = dataUrl; arr[idx].status = 'ready';
  const imgDiv = document.getElementById('img-' + type + '-' + idx);
  if (imgDiv) imgDiv.innerHTML = '<img src="' + dataUrl + '" class="img-preview" data-action="upload" data-type="' + type + '" data-idx="' + idx + '" title="Click to replace">';
  const dot = document.getElementById('dot-' + type + '-' + idx);
  if (dot) dot.className = 's-dot dot-r';
  const stxt = document.getElementById('stxt-' + type + '-' + idx);
  if (stxt) stxt.textContent = 'Image ready — click Schedule';
  const sb = document.getElementById('sched-' + type + '-' + idx);
  if (sb) { sb.disabled = false; sb.className = 'mbtn mbtn-gold'; }
  updateStats(); checkSchedAll(); renderSchedule();
  toast('Image set for ' + (type==='img'?'post':'video') + ' #' + (idx+1));
}

async function genImage(type, idx) {
  const arr = getArr(type);
  const prompt = arr[idx].imagePrompt;
  const imgDiv = document.getElementById('img-' + type + '-' + idx);
  const dot = document.getElementById('dot-' + type + '-' + idx);
  const stxt = document.getElementById('stxt-' + type + '-' + idx);
  if (dot) dot.className = 's-dot dot-p';
  if (stxt) stxt.textContent = 'Generating...';
  if (imgDiv) imgDiv.innerHTML = '<div class="img-gen"><div class="spinner"></div><span>Generating...</span></div>';
  try {
    const res = await fetch('/tdm/api/image', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({prompt, geminiKey:S.geminiKey})
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    applyImage(type, idx, data.dataUrl);
  } catch(e) {
    if (imgDiv) imgDiv.innerHTML = '<div class="drop-zone" data-drop-type="' + type + '" data-drop-idx="' + idx + '"><span style="font-size:18px">&#9888;</span><span>Error - upload manually</span></div>';
    if (dot) dot.className = 's-dot';
    if (stxt) stxt.textContent = 'Error: ' + e.message.substring(0,60);
    toast('Error: '+e.message, true);
  }
}

async function generateAllImages() {
  const btn = document.getElementById('gen-all-imgs-btn');
  btn.disabled = true; btn.textContent = 'Generating...';
  const total = S.imagePosts.length;
  document.getElementById('gen-all-prog').style.display = 'block';
  for (let i = 0; i < total; i++) {
    if (!S.imagePosts[i].imgUrl) {
      setP('gen-all-fill','gen-all-label', Math.round((i/total)*100), 'Generating image ' + (i+1) + ' of ' + total + '...');
      await genImage('img', i);
      await new Promise(r => setTimeout(r, 1200));
    }
  }
  setP('gen-all-fill','gen-all-label',100,'All images done!');
  setTimeout(() => { document.getElementById('gen-all-prog').style.display = 'none'; }, 2500);
  btn.disabled = false; btn.textContent = 'Regenerate All Images';
  toast('All images generated!');
}

function checkSchedAll() {
  const r = S.imagePosts.filter(p => p.imgUrl).length;
  const btn = document.getElementById('sched-all-btn');
  if (btn) btn.style.display = r > 0 ? 'inline-flex' : 'none';
  const msg = document.getElementById('img-batch-msg');
  if (msg) msg.textContent = r === S.imagePosts.length ? 'All ' + r + ' images ready — Schedule All' : r + ' of ' + S.imagePosts.length + ' images ready';
}

// ── VIDEO GENERATION ──────────────────────────────────────

async function generateBanners() {
  const btn = document.getElementById('gen-banner-btn');
  btn.disabled = true; btn.textContent = 'Generating...';
  document.getElementById('banner-prog-wrap').style.display = 'block';
  setP('banner-prog-fill','banner-prog-label',15,'Creating banner concepts...');
  try {
    const res = await fetch('/tdm/api/generate-banner', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({count:3})
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    setP('banner-prog-fill','banner-prog-label',100,'Banners ready!');
    S.banners = data.banners.map((b,i) => ({id:i, type:'banner', ...b, imgUrl:null, scheduled:false}));
    savePosts();
    setTimeout(() => {
      document.getElementById('banner-prog-wrap').style.display = 'none';
      renderBanners(); updateStats(); renderSchedule();
    }, 400);
  } catch(e) { toast('Error: '+e.message, true); document.getElementById('banner-prog-wrap').style.display='none'; }
  btn.disabled = false; btn.textContent = 'Generate 3 Banners';
}

function renderBanners() {
  const start = parseTime(document.getElementById('start-time').value);
  const intv = parseInt(document.getElementById('interval').value) || 45;
  const baseOff = S.imagePosts.length;
  const container = document.getElementById('banners-container');
  container.innerHTML = '';
  const list = document.createElement('div'); list.className = 'content-list';
  S.banners.forEach((b, i) => {
    const t = fmtTime(addMins(start, (baseOff+i)*intv));
    const card = document.createElement('div');
    card.className = 'content-card'; card.id = 'banner-card-'+i;
    card.innerHTML = buildCardHTML('banner', i, b, t, 'BANNER', 'type-banner',
      b.bannerPrompt, b.caption, b.firstComment,
      [{label:'Banner Prompt', field:'bannerPrompt'}, {label:'Caption & Hashtags', field:'caption'}, {label:'First Comment', field:'firstComment'}]
    );
    list.appendChild(card);
  });
  container.appendChild(list);
}

async function generateVideos(type) {
  const dayIdx = getDayIdx();
  const btn = document.getElementById('gen-' + type + '-btn');
  btn.disabled = true; btn.textContent = 'Generating...';
  document.getElementById(type + '-prog-wrap').style.display = 'block';
  setP(type + '-prog-fill', type + '-prog-label', 15, 'Writing ' + type + ' scripts...');
  try {
    const res = await fetch('/tdm/api/generate-video', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({videoType:type, count:3, dayIndex:dayIdx, dogName:S.name||'the Yorkie'})
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    setP(type + '-prog-fill', type + '-prog-label', 100, 'Scripts ready!');
    const arr = data.videos.map((v,i) => ({id:i, type, ...v, imgUrl:null, status:'draft', scheduled:false}));
    if (type === 'short') S.shortVideos = arr; else S.longVideos = arr; savePosts();
    setTimeout(() => {
      document.getElementById(type + '-prog-wrap').style.display = 'none';
      renderVideos(type); updateStats(); renderSchedule();
    }, 400);
  } catch(e) { toast('Error: '+e.message, true); document.getElementById(type + '-prog-wrap').style.display = 'none'; }
  btn.disabled = false; btn.textContent = 'Generate 3 ' + (type==='short'?'Short':'Long') + ' Video Scripts';
}

// ── SCHEDULING ────────────────────────────────────────────
function getScheduleTime(type, idx) {
  const start = parseTime(document.getElementById('start-time').value);
  const intv = parseInt(document.getElementById('interval').value) || 45;
  const baseOff = type === 'long' ? S.imagePosts.length + 3 : type === 'short' ? S.imagePosts.length : 0;
  return addMins(start, (baseOff + idx) * intv);
}

async function scheduleItem(type, idx) {
  const fbId = document.getElementById('fb-page-id').value.trim();
  const fbTk = document.getElementById('fb-token').value.trim();
  if (!fbId || !fbTk) { toast('Connect Facebook first — go to Facebook Setup tab'); return; }
  const arr = getArr(type);
  const item = arr[idx];
  if (!item.imgUrl) { toast('Upload an image first'); return; }
  const btn = document.getElementById('sched-' + type + '-' + idx);
  btn.textContent = '...'; btn.disabled = true;
  const postTime = getScheduleTime(type, idx);
  const now = new Date(); const schedDate = new Date(now);
  schedDate.setHours(postTime.h, postTime.m, 0, 0);
  if (schedDate <= now) schedDate.setDate(schedDate.getDate() + 1);
  if (schedDate - now < 10*60*1000) schedDate.setTime(now.getTime() + 11*60*1000);
  const caption = item.caption || item.captionAndHashtags || '';
  try {
    const res = await fetch('/tdm/api/schedule', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({pageId:fbId, token:fbTk, caption, imageB64:item.imgUrl, scheduledTime:Math.floor(schedDate.getTime()/1000)})
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    arr[idx].scheduled = true;
    btn.textContent = '✓ Scheduled'; btn.style.color = '#1D9E75'; btn.style.borderColor = '#1D9E75';
    const dot = document.getElementById('dot-' + type + '-' + idx);
    if (dot) dot.className = 's-dot dot-s';
    const stxt = document.getElementById('stxt-' + type + '-' + idx);
    if (stxt) stxt.textContent = 'Scheduled for ' + fmtTime(postTime);
    updateStats(); renderSchedule();
    toast((type==='img'?'Post':'Video') + ' #' + (idx+1) + ' scheduled!');
  } catch(e) { btn.textContent = 'Schedule'; btn.disabled = false; toast('Error: '+e.message, true); }
}

async function scheduleAll(type) {
  const arr = getArr(type);
  const ready = arr.filter(p => p.imgUrl && !p.scheduled);
  if (!ready.length) { toast('No unscheduled items with images'); return; }
  const fbId = document.getElementById('fb-page-id').value.trim();
  const fbTk = document.getElementById('fb-token').value.trim();
  if (!fbId || !fbTk) { toast('Connect Facebook first'); return; }
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].imgUrl && !arr[i].scheduled) {
      await scheduleItem(type, i);
      await new Promise(r => setTimeout(r, 900));
    }
  }
  toast('All scheduled!');
}

function clearContent(type) {
  if (type === 'banners') {
    S.banners = []; localStorage.removeItem('tdm_banners');
    document.getElementById('banners-container').innerHTML = '<div class="empty"><span class="empty-icon">&#127775;</span><h3>No Banners Yet</h3><p>Click Generate.</p></div>';
  } else if (type === 'images') {
    S.imagePosts = []; localStorage.removeItem('tdm_imagePosts');
    document.getElementById('images-container').innerHTML = '<div class="empty"><span class="empty-icon">&#128081;</span><h3>Awaiting Orders</h3><p>Enter a theme and click Generate.</p></div>';
    document.getElementById('img-batch-bar').classList.remove('show');
    document.getElementById('gen-all-prog').style.display = 'none';
  } else if (type === 'shorts') {
    S.shortVideos = []; localStorage.removeItem('tdm_shortVideos');
    document.getElementById('shorts-container').innerHTML = '<div class="empty"><span class="empty-icon">&#127910;</span><h3>No Short Scripts Yet</h3><p>Click Generate.</p></div>';
  } else {
    S.longVideos = []; localStorage.removeItem('tdm_longVideos');
    document.getElementById('longs-container').innerHTML = '<div class="empty"><span class="empty-icon">&#127909;</span><h3>No Long Scripts Yet</h3><p>Click Generate.</p></div>';
  }
  updateStats();
}

// ── SCHEDULE VIEW ─────────────────────────────────────────
function renderSchedule() {
  const all = [
    ...S.imagePosts.map((p,i) => ({...p, dType:'Image Post', idx:i, tKey:'img', cap:p.caption})),
    ...S.shortVideos.map((v,i) => ({...v, dType:'Short Video', idx:i, tKey:'short', cap:v.captionAndHashtags})),
    ...S.longVideos.map((v,i) => ({...v, dType:'Long Video', idx:i, tKey:'long', cap:v.captionAndHashtags}))
  ];
  if (!all.length) return;
  const start = parseTime(document.getElementById('start-time').value);
  const intv = parseInt(document.getElementById('interval').value) || 45;
  const rows = all.map((item, i) => {
    const t = fmtTime(addMins(start, i * intv));
    const pill = item.scheduled ? '<span class="pill pill-s">Scheduled</span>' : item.imgUrl ? '<span class="pill pill-r">Ready</span>' : '<span class="pill pill-p">Pending</span>';
    const tLabel = item.dType==='Image Post' ? '<span class="card-type type-image">IMG</span>' : item.dType==='Short Video' ? '<span class="card-type type-short">SHORT</span>' : '<span class="card-type type-long">LONG</span>';
    return '<div class="sched-row"><span class="s-num">' + (i+1) + '</span>' + tLabel + '<span style="font-size:11px">' + esc((item.cap||'').substring(0,50)) + '...</span><span style="font-size:11px;color:var(--muted)">' + t + '</span>' + pill + '</div>';
  }).join('');
  document.getElementById('sched-container').innerHTML = '<div class="sched-table"><div class="sched-head"><span>#</span><span>Type</span><span>Caption</span><span>Time</span><span>Status</span></div>' + rows + '</div>';
}

// ── FACEBOOK TEST ─────────────────────────────────────────
function testFB() {
  const pageId = document.getElementById('fb-page-id').value.trim();
  const token = document.getElementById('fb-token').value.trim();
  const res = document.getElementById('fb-result');
  res.style.display = 'block';
  if (!pageId || !token) { res.innerHTML = '<div class="alert alert-gold">Enter both Page ID and Access Token.</div>'; return; }
  res.innerHTML = '<div class="alert alert-info">Testing connection...</div>';
  fetch('https://graph.facebook.com/v19.0/' + pageId + '?fields=name,fan_count&access_token=' + token)
    .then(r => r.json())
    .then(d => {
      if (d.error) { res.innerHTML = '<div class="alert alert-err">' + esc(d.error.message) + '</div>'; }
      else { res.innerHTML = '<div class="alert alert-ok">Connected to "' + esc(d.name) + '" — ' + (d.fan_count||0).toLocaleString() + ' followers. Ready.</div>'; toast('Connected!'); }
    })
    .catch(e => { res.innerHTML = '<div class="alert alert-err">' + esc(e.message) + '</div>'; });
}
</script>
</body>
</html>
'''
