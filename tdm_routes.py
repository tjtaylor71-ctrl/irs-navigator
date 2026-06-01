"""
tdm_routes.py  —  Tiny Dog Mafia Content Studio
"""
import os, json, base64, requests
from datetime import datetime
from flask import Blueprint, request, jsonify, Response

tdm_bp = Blueprint('tdm', __name__, url_prefix='/tdm')
ANTHROPIC_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
GEMINI_KEY    = os.environ.get('GEMINI_API_KEY', '')

DAY_THEMES = {
    0: {'name':'Monday Mayhem',       'focus':'chaos, taking over the week, Monday energy'},
    1: {'name':'Tiny Boss Tuesday',   'focus':'authority, running things, executive decisions'},
    2: {'name':'Hump Day Heist',      'focus':'mid-week operations, Wednesday chaos, executing plans'},
    3: {'name':'Throwback Thursday',  'focus':'origin stories, how it all started, nostalgic moments'},
    4: {'name':'Friday Operations',   'focus':'weekend prep, letting loose, Friday energy'},
    5: {'name':'Saturday Takeover',   'focus':'leisure, supervising the weekend, pool days, brunch'},
    6: {'name':'Sunday Surveillance', 'focus':'relaxing but still watching everything, strategic rest'},
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
    tone_map = {'funny':'comedic and deadpan','cinematic':'dramatic and cinematic','savage':'hilariously savage','wholesome':'charming and wholesome','relatable':'laugh-out-loud relatable'}
    cta_map  = {'engagement':'end with a funny question that drives comments','tag':'tell followers to tag someone who acts like this','save':'encourage saving or sharing','follow':'invite people to follow the page'}
    day_theme = DAY_THEMES[day_idx]
    effective_theme = theme if theme else day_theme['name']
    system_prompt = ('You are the creative director for "Tiny Dog Mafia," a viral Yorkie Facebook and Instagram page. '
        'The brand voice is: tiny dog, big attitude, mafia/boss persona. Every post treats the Yorkie as if '
        'it runs a crime family division operating inside everyday domestic situations. The humor is deadpan, '
        'cinematic, and absurdist. Respond ONLY with valid JSON. No markdown. No code fences. No preamble.')
    user_prompt = f"""Generate exactly {count} unique Tiny Dog Mafia social media image posts.
Daily theme: "{effective_theme}" — {day_theme['focus']}

CAPTION STYLE — follow this exact structure and voice:
- Uses "your Yorkie" as the subject throughout
- Short punchy lines, 1-6 words each, building an observation
- Example structure:
  "Nobody invited your Yorkie to host the barbecue.
  Nobody handed them any responsibilities.
  Yet somehow...
  They've greeted every guest.
  Visited every conversation.
  And made sure nobody forgets they're part of the party.
  At this point, your Yorkie is networking. 🐾😂
  Your Yorkie attends one social event and suddenly knows everyone in the neighborhood 😭🐶"
- End with 2 emoji lines max
- CTA: {cta_map[cta]}
- 5-6 hashtags on the final line
- Tone: {tone_map[tone]}

For each post create 3 sections:
1. "imagePrompt": Photorealistic cinematic 4:5 image. Yorkie with silky steel-blue and tan fur. Specific situation matching the caption, tiny outfit, bold gold text overlay with headline, Tiny Dog Mafia division subtitle. Warm cinematic lighting, shallow depth of field.
2. "caption": Follow the CAPTION STYLE above exactly. Include CTA and hashtags.
3. "firstComment": 1-2 sentences. A funny extra observation about {dog_name} in this specific situation. Conversational, no hashtags.

Also include: "headline" (2-6 word ALL CAPS matching the situation), "division" (fake TDM division name)
Every post must cover a different situation. Dog is ALWAYS the center of attention.
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
.hdr-actions{margin-left:auto;display:flex;gap:8px;align-items:center;}
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
</style>
</head>
<body>

<header>
  <div class="logo">Tiny Dog Mafia<span>Content Studio</span></div>
  <div class="day-badge" id="day-badge">Loading...</div>
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
  imagePosts: [], shortVideos: [], longVideos: []
};

// ── INIT ─────────────────────────────────────────────────
function getDayIdx() {
  const o = parseInt(document.getElementById('day-override').value);
  if (o >= 0) return o;
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

function initTheme() {
  const idx = getDayIdx();
  const t = DAY_THEMES[idx];
  document.getElementById('day-badge').textContent = t.name;
  document.getElementById('theme-name-d').textContent = t.name;
  document.getElementById('theme-focus-d').textContent = t.focus;
  document.getElementById('short-day-d').textContent = t.name + ' — Short Videos';
  document.getElementById('long-day-d').textContent = t.name + ' — Long Videos';
}

document.getElementById('day-override').addEventListener('change', initTheme);
initTheme();

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
  navigator.clipboard.writeText(txt); toast('All captions copied!');
});
document.getElementById('sched-all-btn').addEventListener('click', () => scheduleAll('img'));
document.getElementById('clear-images-btn').addEventListener('click', () => clearContent('images'));
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
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
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
  return type === 'img' ? S.imagePosts : type === 'short' ? S.shortVideos : S.longVideos;
}
function copyField(type, idx, field) {
  const item = getArr(type)[idx];
  const text = item[field] || '';
  navigator.clipboard.writeText(text); toast('Copied!');
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
    S.imagePosts = data.posts.map((p,i) => ({id:i, type:'image', ...p, imgUrl:null, status:'draft', scheduled:false}));
    setTimeout(() => {
      document.getElementById('img-prog-wrap').style.display = 'none';
      renderImagePosts(); updateStats();
      document.getElementById('img-batch-bar').classList.add('show');
      document.getElementById('img-batch-msg').textContent = S.imagePosts.length + ' posts ready';
      renderSchedule();
    }, 400);
  } catch(e) { toast('Error: ' + e.message); document.getElementById('img-prog-wrap').style.display = 'none'; }
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
    return '<div class="sec-tab ' + (ti===0?'on':'') + '" data-action="sectab" data-panes="' + allPanes + '" data-show="' + paneId + '">' + tab.label + '</div>';
  }).join('');

  const panesHTML = tabs.slice(0,2).map((tab, ti) => {
    const paneId = type + '-s' + (ti+1) + '-' + idx;
    const text = ti===0 ? s1text : s2text;
    const cls = ti===0 && (type==='img') ? 'section-text prompt' : 'section-text';
    return '<div class="sec-pane ' + (ti===0?'on':'') + '" id="' + paneId + '"><div class="' + cls + '">' + esc(text||'') + '</div></div>';
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
    toast('Error: ' + e.message.substring(0,60));
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
    if (type === 'short') S.shortVideos = arr; else S.longVideos = arr;
    setTimeout(() => {
      document.getElementById(type + '-prog-wrap').style.display = 'none';
      renderVideos(type); updateStats(); renderSchedule();
    }, 400);
  } catch(e) { toast('Error: ' + e.message); document.getElementById(type + '-prog-wrap').style.display = 'none'; }
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
  } catch(e) { btn.textContent = 'Schedule'; btn.disabled = false; toast('Error: ' + e.message); }
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
  if (type === 'images') {
    S.imagePosts = [];
    document.getElementById('images-container').innerHTML = '<div class="empty"><span class="empty-icon">&#128081;</span><h3>Awaiting Orders</h3><p>Enter a theme and click Generate.</p></div>';
    document.getElementById('img-batch-bar').classList.remove('show');
    document.getElementById('gen-all-prog').style.display = 'none';
  } else if (type === 'shorts') {
    S.shortVideos = [];
    document.getElementById('shorts-container').innerHTML = '<div class="empty"><span class="empty-icon">&#127910;</span><h3>No Short Scripts Yet</h3><p>Click Generate.</p></div>';
  } else {
    S.longVideos = [];
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
