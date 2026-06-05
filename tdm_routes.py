"""
tdm_routes.py  —  Tiny Dog Mafia Content Studio
"""
import os, json, base64, requests, random
from flask import Blueprint, request, jsonify, Response

tdm_bp = Blueprint('tdm', __name__, url_prefix='/tdm')
ANTHROPIC_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
GEMINI_KEY    = os.environ.get('GEMINI_API_KEY', '')

PILLARS = [
    "Tiny But Mighty — showcasing the bold, fearless, oversized personality packed into a tiny Yorkie body. Moments where they stand up to bigger dogs, demand attention, or refuse to back down.",
    "Grooming Goals — coat care, haircut styles, brushing routines, and before/after transformations. The glamour and the chaos of keeping a Yorkie looking fabulous.",
    "Yorkie Health Watch — breed-specific health awareness including dental care, hypoglycemia signs, luxating patella, and responsible ownership tips.",
    "Training Terriers — the hilarious reality of housebreaking a Yorkie, their stubborn streak, selective hearing, and the small victories of teaching tricks.",
    "Yorkie Fashion — outfits, bows, accessories, and seasonal looks. The full diva wardrobe experience of dressing a Yorkie who absolutely knows they look good.",
    "Size Myths Debunked — teacup controversies, breed weight standards, breeder red flags, and educating owners about healthy size expectations.",
    "Yorkie vs. World — relatable moments of Yorkies barking at dogs ten times their size, guarding the house from squirrels, or running the entire household from the couch.",
    "Senior Yorkies — aging care, gray-faced elders still full of spirit, celebrating older dogs, and the deep bond that comes with years together.",
    "Foodie Yorkies — safe treats, picky eater moments, diet tips for sensitive stomachs, and the negotiations that happen at dinnertime.",
    "Cuddle Chronicles — the velcro dog bond, lap life, separation anxiety, and the emotional connection between Yorkies and their owners.",
]

@tdm_bp.route('/', methods=['GET'])
def studio():
    return Response(STUDIO_HTML, mimetype='text/html')

@tdm_bp.route('/api/generate', methods=['POST'])
def generate():
    data     = request.get_json()
    count    = int(data.get('count', 19))
    tone     = data.get('tone', 'funny')
    cta      = data.get('cta', 'engagement')
    dog_name = data.get('dogName', 'your Yorkie')
    override = data.get('themeOverride', '')

    tone_map = {
        'funny':     'comedic and deadpan — treat the Yorkie as a tiny crime boss with zero self-awareness',
        'cinematic': 'dramatic and cinematic — every domestic moment is an epic operation',
        'savage':    'hilariously savage — the Yorkie has opinions and is not afraid to enforce them',
        'wholesome': 'charming and wholesome — the Yorkie is ridiculous but deeply lovable',
        'relatable': 'laugh-out-loud relatable — every Yorkie owner will tag someone immediately',
    }
    cta_map = {
        'engagement': 'end with a funny question that drives comments from other Yorkie owners',
        'tag':        'tell followers to tag someone whose dog acts exactly like this',
        'save':       'encourage saving or sharing with another Yorkie owner',
        'follow':     'invite people to follow for more Yorkie content',
    }

    pillar = random.choice(PILLARS) if not override else override
    effective_theme = override if override else pillar.split(' — ')[0]

    system_prompt = (
        'You are the creative director for "Tiny Dog Mafia," a viral Yorkie Facebook and Instagram page. '
        'The brand voice is: tiny dog, big attitude, mafia/boss persona. Every post treats the Yorkie as if '
        'it runs a crime family division operating inside everyday domestic situations. '
        'The humor is deadpan, cinematic, and absurdist — the dog is always in charge, always serious, always judging. '
        'Respond ONLY with valid JSON. No markdown. No code fences. No preamble.'
    )

    user_prompt = f"""Generate exactly {count} unique Tiny Dog Mafia social media image posts.
Content pillar: {pillar}
{"Theme override: " + override if override else ""}

CAPTION STYLE — follow this exact structure and voice:
- Uses "your Yorkie" as the subject throughout (never "the dog" or generic pronouns to start)
- Short punchy lines, 1-8 words each, building an observation with rhythm and repetition
- Example structure:
  "Nobody invited your Yorkie to host the barbecue.
  Nobody handed them any responsibilities.
  Yet somehow...
  They've greeted every guest.
  Visited every conversation.
  And made sure nobody forgets they're part of the party.
  At this point, your Yorkie is networking. 🐾😂
  Your Yorkie attends one social event and suddenly knows everyone in the neighborhood 😭🐶"
- End with 1-2 emoji lines maximum
- Tone: {tone_map[tone]}

CAPTION FORMAT — exactly 3 full paragraphs:
Paragraph 1: Strong scroll-stopping hook in the "your Yorkie" voice with 2-3 emojis. Immediately pulls the reader in.
Paragraph 2: Develops the scene with short punchy lines building rhythm and absurdity. The Yorkie's authority is unquestioned.
Paragraph 3: Payoff line + {cta_map[cta]} + 2 emojis. Then exactly 5 hashtags on a new line.

FIRST COMMENT: 1-2 sentences in warm Yorkie-owner-to-owner voice. A funny or relatable extra observation about {dog_name} in this situation, ending with "Tag a fellow Yorkie parent who needs to see this" or similar. NEVER include hashtags.

IMAGE PROMPT: Cinematic 4:5 photorealistic scene. Yorkie with silky steel-blue and tan fur. Specific situation matching the pillar and caption. Tiny outfit matching the Tiny Dog Mafia aesthetic. Bold gold cinematic text overlay with a 2-6 word ALL CAPS headline. Small subtitle: "Tiny Dog Mafia [Division Name]". Warm dramatic lighting, shallow depth of field, cinematic atmosphere. End with: "Optimized for 1080x1350 format."

Also include: "headline" (2-6 word ALL CAPS), "division" (fake TDM division name matching the pillar)

Every post must cover a different specific scenario within the pillar. The dog is ALWAYS in charge.
JSON: {{"posts":[{{"headline":"...","division":"...","imagePrompt":"...","caption":"...","firstComment":"..."}}]}}"""

    try:
        resp = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers={'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01'},
            json={'model':'claude-sonnet-4-20250514','max_tokens':10000,'system':system_prompt,
                  'messages':[{'role':'user','content':user_prompt}]},
            timeout=120
        )
        result = resp.json()
        raw = result['content'][0]['text'].strip().replace('```json','').replace('```','').strip()
        posts = json.loads(raw)
        return jsonify({'ok':True,'posts':posts['posts']})
    except Exception as e:
        return jsonify({'ok':False,'error':str(e)}), 500


@tdm_bp.route('/api/generate-banner', methods=['POST'])
def generate_banner():
    data     = request.get_json()
    count    = int(data.get('count', 3))
    override = data.get('themeOverride', '')

    pillar = random.choice(PILLARS) if not override else override

    system_prompt = (
        'You are the creative director for "Tiny Dog Mafia," a viral Yorkie Facebook and Instagram page. '
        'Generate typographic banner concepts — no dogs, no people, no photography. Text on gradient background only. '
        'Banners are vibrant, scroll-stopping, and funny. The banner text must always be a QUESTION that invites '
        'comments from Yorkie owners — relatable, funny, and specific to Yorkie life. '
        'Respond ONLY with valid JSON. No markdown. No code fences. No preamble.'
    )

    user_prompt = f"""Generate exactly {count} unique Tiny Dog Mafia typographic banner concepts.
Content pillar: {pillar}
{"Theme override: " + override if override else ""}

BANNER FORMAT — typographic only, no dogs, no people, no photography:
- Vibrant saturated gradients matched to the fun/comedic mood — electric blues, deep purples, fiery oranges, hot pinks, golden bursts
- Strong contrast between lettering and background required
- Soft glow behind text, lit-from-within lettering, or dramatic radial burst
- The sole visual element is bold centered text
- The text must be a QUESTION that invites Yorkie owners to comment (relatable, funny, specific)
- Heavy condensed sans-serif font, bright lettering with glow effect
- Stack text across 2-3 lines for visual rhythm
- End with: "No dogs, no people, no photography. Text on gradient background only. Optimized for 1080x1350 format."

CAPTION FORMAT — exactly 3 full paragraphs in the Tiny Dog Mafia voice:
Paragraph 1: Strong scroll-stopping hook using "your Yorkie" with 2-3 emojis.
Paragraph 2: Develops the comedy and relatable Yorkie behavior behind the question.
Paragraph 3: Engagement CTA inviting owners to answer in comments and follow. 2 emojis. Then exactly 5 hashtags on a new line.

FIRST COMMENT: 1-2 sentences, warm owner-to-owner voice, funny observation + "Tag a fellow Yorkie parent" CTA. Never hashtags.

JSON: {{"banners":[{{"bannerPrompt":"...","caption":"...","firstComment":"...","pillar":"..."}}]}}"""

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
        banners = json.loads(raw)
        return jsonify({'ok':True,'banners':banners['banners']})
    except Exception as e:
        return jsonify({'ok':False,'error':str(e)}), 500


@tdm_bp.route('/api/generate-video', methods=['POST'])
def generate_video():
    data       = request.get_json()
    video_type = data.get('videoType', 'short')
    count      = int(data.get('count', 3))
    dog_name   = data.get('dogName', 'your Yorkie')
    override   = data.get('themeOverride', '')

    pillar = random.choice(PILLARS) if not override else override

    if video_type == 'short':
        rules = "SHORT-FORM 12 seconds (~30 words): powerful hook in first line, one comedic observation that builds, loopable ending, Hypernatural optimized"
        word_guide = "approximately 30 words (12 seconds at 2.5 words/second)"
    else:
        rules = "LONG-FORM 60 seconds (~150 words): powerful scroll-stopping hook, escalating comedic observations about Yorkie behavior, rhythm and repetition, warm relatable closing thought, Hypernatural optimized"
        word_guide = "approximately 150 words (60 seconds at 2.5 words/second)"

    system_prompt = (
        'You are the video director for Tiny Dog Mafia, a viral Yorkie social media brand. '
        'Generate spoken narration scripts — NOT visual prompts or shot descriptions. '
        'Scripts are voiceover narration the creator reads aloud over video. '
        'Voice: deadpan, observational, builds with rhythm and repetition. "Your Yorkie" as subject throughout. '
        'CRITICAL: ABSOLUTELY NO EMOJIS anywhere in the script body. Plain text only. '
        'Emojis belong only in the caption and first comment, never in the script itself. '
        'Respond ONLY with valid JSON. No markdown. No code fences. No preamble.'
    )

    user_prompt = f"""Generate exactly {count} unique Tiny Dog Mafia {video_type}-form video narration scripts.
Content pillar: {pillar}
{"Theme override: " + override if override else ""}
Rules: {rules}

VIDEO SCRIPT STYLE — follow this exact voice and structure:
- Uses "{dog_name}" as subject throughout
- Builds with rhythm and repetition — short observations that escalate
- Uses "..." for dramatic pauses and "somehow..." for comedic beats
- Stacks examples that keep building absurdity
- Ends with a warm, slightly self-aware closing thought
- Example structure:
  "Your Yorkie has a very interesting definition of helping.
  You're folding laundry? They're sitting on it.
  You're making the bed? They're already in it.
  And somehow... no matter what project you start...
  Your Yorkie becomes the most important part of it.
  Not because they understand what's happening.
  But because clearly nothing should happen without them.
  The project may take twice as long.
  But it's a lot more fun with your tiny assistant nearby."
- {word_guide}
- Open with a powerful hook that stops the scroll
- End with CTA: ask viewers to comment and follow
- ABSOLUTELY NO EMOJIS — plain text only
- NO shot descriptions or camera directions

IMAGE PROMPT: Cinematic still for this video's key scene. Yorkie with silky steel-blue and tan fur. Specific situation matching the script. Tiny outfit if appropriate. Dramatic cinematic lighting. Bold gold text overlay with headline. End with "Optimized for 1080x1350 format."

CAPTION FORMAT — exactly 3 full paragraphs:
Paragraph 1: Strong scroll-stopping hook in "your Yorkie" voice with 2-3 emojis.
Paragraph 2: Develops the comedy and relatable situation from the script.
Paragraph 3: Engagement CTA asking viewers to comment and follow. 2 emojis. Then exactly 5 hashtags on a new line.

FIRST COMMENT: 1-2 sentences, warm owner-to-owner voice, funny extra observation + "Tag a fellow Yorkie parent" CTA. Never hashtags.

Each of the {count} scripts must cover a completely different scenario within the pillar.
JSON: {{"videos":[{{"videoScript":"...","imagePrompt":"...","captionAndHashtags":"...","firstComment":"...","pillar":"..."}}]}}"""

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
        videos = json.loads(raw)
        return jsonify({'ok':True,'videos':videos['videos'],'videoType':video_type})
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
            r = requests.post(url, json={'contents':[{'parts':[{'text':prompt}],'role':'user'}],
                'generationConfig':{'responseModalities':['TEXT','IMAGE']}}, timeout=60)
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
            results.append({'profileId':pid,'ok':pd.get('success',False)})
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
.hdr-actions{margin-left:auto;display:flex;gap:8px;align-items:center;} .mobile-menu-btn{display:none;}
.layout{display:grid;grid-template-columns:200px 1fr;min-height:calc(100vh - 58px);}
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
.gen-box{background:var(--dark2);border:1px solid var(--border);border-radius:10px;padding:18px;margin-bottom:14px;}
.gen-box p{font-size:12px;color:var(--muted);margin-bottom:12px;line-height:1.6;}
.override-row{display:flex;gap:10px;margin-bottom:10px;}
.override-row input{flex:1;background:var(--dark3);border:1px solid var(--dark3);border-radius:5px;padding:9px 12px;font-family:"DM Sans",sans-serif;font-size:13px;color:var(--text);outline:none;}
.override-row input:focus{border-color:var(--gold-dim);}
.btn-row{display:flex;gap:8px;flex-wrap:wrap;}
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
.content-list{display:flex;flex-direction:column;gap:10px;}
.content-card{background:var(--dark2);border:1px solid var(--dark3);border-radius:10px;overflow:hidden;}
.content-card:hover{border-color:var(--border);}
.card-head{display:flex;align-items:center;gap:8px;padding:9px 14px;background:var(--dark3);border-bottom:1px solid var(--dark3);}
.card-num{font-family:"Bebas Neue",sans-serif;font-size:16px;color:var(--gold);min-width:28px;}
.card-pillar{font-size:10px;color:var(--gold-dim);background:rgba(201,168,76,.1);padding:2px 8px;border-radius:3px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;}
.card-div{font-size:11px;color:var(--muted);flex:1;}
.card-type{font-size:10px;font-weight:700;padding:2px 8px;border-radius:3px;letter-spacing:.04em;}
.type-image{background:rgba(99,153,34,.1);color:#639922;}
.type-banner{background:rgba(138,43,226,.15);color:#B87FFF;}
.type-short{background:rgba(74,128,184,.1);color:#7AAAD4;}
.type-long{background:rgba(170,100,34,.1);color:#D4AA7A;}
.card-time{font-size:11px;color:var(--hint);background:var(--dark2);padding:2px 9px;border-radius:3px;font-weight:600;margin-left:auto;}
.card-body{display:grid;grid-template-columns:1fr 150px;}
.card-text{padding:12px 14px;border-right:1px solid var(--dark3);}
.sec-tabs{display:flex;border-bottom:1px solid var(--dark3);margin:-12px -14px 10px;}
.sec-tab{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--hint);padding:7px 10px;cursor:pointer;border-bottom:2px solid transparent;transition:all .15s;}
.sec-tab.on{color:var(--gold);border-bottom-color:var(--gold);}
.sec-pane{display:none;}
.sec-pane.on{display:block;}
.section-text{font-size:12px;line-height:1.75;color:var(--text);white-space:pre-wrap;}
.section-text.prompt{font-style:italic;color:var(--muted);border-left:2px solid var(--gold-dim);padding-left:8px;}
.first-comment-block{margin-top:8px;padding:8px 10px;background:var(--dark3);border-radius:5px;border-left:2px solid var(--gold-dim);}
.first-comment-label{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--hint);margin-bottom:4px;}
.first-comment-text{font-size:12px;color:var(--muted);line-height:1.6;}
.card-img-col{padding:12px;display:flex;flex-direction:column;gap:6px;align-items:center;background:var(--dark3);}
.drop-zone{width:126px;height:126px;border-radius:6px;border:1.5px dashed var(--dark3);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;cursor:pointer;transition:all .2s;background:var(--dark2);}
.drop-zone:hover,.drop-zone.over{border-color:var(--gold-dim);background:rgba(201,168,76,.04);}
.dz-icon{font-size:22px;color:var(--hint);}
.drop-zone span{font-size:10px;color:var(--hint);text-align:center;line-height:1.4;}
.banner-placeholder{width:126px;height:126px;border-radius:6px;border:1px solid var(--dark3);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:linear-gradient(135deg,#1a0a2e,#2d1b4e);font-size:10px;color:#B87FFF;text-align:center;padding:8px;}
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
.sched-head{display:grid;grid-template-columns:36px 60px 1fr 110px 90px;gap:8px;padding:8px 12px;background:var(--dark3);font-size:10px;color:var(--hint);text-transform:uppercase;letter-spacing:.1em;border-bottom:1px solid var(--dark3);}
.sched-row{display:grid;grid-template-columns:36px 60px 1fr 110px 90px;gap:8px;padding:9px 12px;font-size:12px;border-bottom:1px solid var(--dark3);background:var(--dark2);align-items:center;}
.sched-row:last-child{border-bottom:none;}
.s-num{font-family:"Bebas Neue",sans-serif;font-size:16px;color:var(--gold);}
.pill{font-size:10px;font-weight:700;padding:2px 8px;border-radius:3px;}
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
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;}
code{background:var(--dark3);padding:1px 6px;border-radius:3px;font-size:11px;color:var(--gold);font-family:monospace;}
.empty{text-align:center;padding:60px 20px;color:var(--hint);}
.empty-icon{font-size:44px;margin-bottom:14px;display:block;}
.empty h3{font-family:"Bebas Neue",sans-serif;font-size:24px;letter-spacing:.08em;color:var(--muted);margin-bottom:8px;}
.empty p{font-size:13px;line-height:1.7;max-width:320px;margin:0 auto;}
.toast{position:fixed;bottom:20px;right:20px;background:var(--dark2);color:var(--gold-light);border:1px solid var(--border);padding:11px 18px;border-radius:6px;font-size:12px;font-weight:500;box-shadow:0 8px 32px rgba(0,0,0,.4);transform:translateY(80px);opacity:0;transition:all .3s;z-index:9999;max-width:320px;}
.toast.show{transform:translateY(0);opacity:1;}

/* ── MOBILE ─────────────────────────────────────────────── */
@media (max-width: 680px) {
  header{padding:0 14px;gap:8px;}
  .logo{font-size:18px;} .logo span{display:none;}
  .hdr-actions{gap:6px;}
  .hdr-actions a,.hdr-actions button{font-size:10px!important;padding:4px 8px!important;}
  .layout{grid-template-columns:1fr;}
  .sidebar{display:none;position:fixed;top:58px;left:0;right:0;bottom:0;z-index:200;overflow-y:auto;border-right:none;border-top:1px solid var(--border);}
  .sidebar.open{display:block;}
  .mobile-menu-btn{display:flex!important;align-items:center;justify-content:center;width:34px;height:34px;background:var(--dark3);border:1px solid var(--dark3);border-radius:5px;cursor:pointer;color:var(--muted);font-size:16px;flex-shrink:0;}
  .mobile-menu-btn.on{border-color:var(--gold-dim);color:var(--gold);}
  .tabs{padding:0 10px;overflow-x:auto;flex-wrap:nowrap;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
  .tabs::-webkit-scrollbar{display:none;}
  .tab{padding:10px 10px;font-size:10px;white-space:nowrap;flex-shrink:0;}
  .pane{padding:12px;}
  .gen-box{padding:12px;} .gen-box p{font-size:11px;margin-bottom:10px;}
  .override-row{flex-direction:column;gap:8px;} .override-row input{width:100%;}
  .btn-row{flex-direction:column;} .btn-row .btn{width:100%;}
  .btn{font-size:12px;padding:10px 14px;}
  .card-body{grid-template-columns:1fr;}
  .card-text{border-right:none;border-bottom:1px solid var(--dark3);padding:10px 12px;}
  .card-img-col{padding:10px 12px;flex-direction:row;align-items:center;gap:10px;justify-content:flex-start;}
  .drop-zone,.img-preview,.img-gen,.banner-placeholder{width:80px!important;height:80px!important;}
  .drop-zone span{font-size:9px;} .dz-icon{font-size:18px;}
  .card-head{padding:8px 12px;flex-wrap:wrap;gap:6px;} .card-time{margin-left:0;}
  .card-foot{padding:8px 12px;gap:5px;}
  .mbtn{font-size:10px;padding:4px 8px;}
  .s-txt{font-size:10px;width:100%;order:-1;margin-bottom:2px;}
  .section-text{font-size:11px;} .first-comment-text{font-size:11px;}
  .sched-head{grid-template-columns:28px 50px 1fr 80px;font-size:9px;padding:6px 10px;}
  .sched-row{grid-template-columns:28px 50px 1fr 80px;font-size:10px;padding:7px 10px;}
  #settings-modal>div{width:95vw!important;padding:20px!important;}
  .stat-num{font-size:22px;}
  .toast{left:10px;right:10px;max-width:none;bottom:14px;}
  .two-col{grid-template-columns:1fr;}
}
</style>
</head>
<body>

<header>
  <button class="mobile-menu-btn" id="mobile-menu-btn">&#9776;</button>
  <div class="logo">Tiny Dog Mafia<span>Content Studio</span></div>
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
    <div class="s-field"><label class="s-label">Facebook Page ID</label><input type="text" id="set-fbid" placeholder="123456789"></div>
    <div class="s-field"><label class="s-label">Facebook Page Access Token</label><input type="password" id="set-fbtoken" placeholder="EAABx..."></div>
    <div style="display:flex;gap:10px;margin-top:18px;">
      <button class="btn btn-gold" id="save-settings-btn" style="flex:1;">Save Settings</button>
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
        <div class="stat-box"><div class="stat-num" id="s-banners">0</div><div class="stat-lbl">Banners</div></div>
        <div class="stat-box"><div class="stat-num" id="s-videos">0</div><div class="stat-lbl">Videos</div></div>
        <div class="stat-box"><div class="stat-num" id="s-sched">0</div><div class="stat-lbl">Scheduled</div></div>
      </div>
    </div>
    <div class="s-section">
      <div class="s-title">Post Settings</div>
      <div class="s-field"><label class="s-label">Image posts per day</label>
        <select id="post-count">
          <option value="19" selected>19 Daily</option>
          <option value="5">5 Test</option>
          <option value="10">10 Half day</option>
        </select>
      </div>
      <div class="s-field"><label class="s-label">First post time</label><input type="text" id="start-time" value="8:00 AM"></div>
      <div class="s-field"><label class="s-label">Interval (minutes)</label><input type="text" id="interval" value="45"></div>
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
    <div class="s-section">
      <div class="s-title">Content Pillars</div>
      <div style="font-size:11px;color:var(--hint);line-height:1.7;">Pillars are randomly selected on each generation across all 10 Yorkie topics.</div>
    </div>
  </div>

  <div class="main">
    <div class="tabs">
      <div class="tab on" data-tab="images">Image Posts</div>
      <div class="tab" data-tab="banners">Banners</div>
      <div class="tab" data-tab="shorts">Short Videos</div>
      <div class="tab" data-tab="longs">Long Videos</div>
      <div class="tab" data-tab="schedule">Schedule</div>
      <div class="tab" data-tab="facebook">FB Setup</div>
    </div>

    <div class="pane on" id="pane-images">
      <div class="gen-box">
        <p>Generates Tiny Dog Mafia image posts with cinematic prompts, 3-paragraph captions, hashtags, and first comments. Pillars randomly selected for variety.</p>
        <div class="override-row"><input type="text" id="img-theme-override" placeholder="Optional theme override..."></div>
        <div class="btn-row">
          <button class="btn btn-gold" id="gen-img-btn">Generate Image Posts</button>
          <button class="btn btn-ghost" id="clear-images-btn">Clear</button>
        </div>
        <div id="img-prog-wrap" style="display:none;" class="prog-wrap">
          <div class="prog-track"><div class="prog-fill" id="img-prog-fill"></div></div>
          <div class="prog-label" id="img-prog-label">Generating...</div>
        </div>
      </div>
      <div id="images-container"><div class="empty"><span class="empty-icon">&#128081;</span><h3>Awaiting Orders</h3><p>Click Generate to brief the crew across the 10 Yorkie content pillars.</p></div></div>
    </div>

    <div class="pane" id="pane-banners">
      <div class="gen-box">
        <p>Generates typographic banner concepts — vibrant gradients with a question that invites Yorkie owner comments. Paste into OpenArt, Gemini, or any image tool.</p>
        <div class="override-row"><input type="text" id="banner-theme-override" placeholder="Optional theme override..."></div>
        <div class="btn-row">
          <button class="btn btn-gold" id="gen-banner-btn">Generate 3 Banners</button>
          <button class="btn btn-ghost" id="clear-banners-btn">Clear</button>
        </div>
        <div id="banner-prog-wrap" style="display:none;" class="prog-wrap">
          <div class="prog-track"><div class="prog-fill" id="banner-prog-fill"></div></div>
          <div class="prog-label" id="banner-prog-label">Generating banners...</div>
        </div>
      </div>
      <div id="banners-container"><div class="empty"><span class="empty-icon">&#127775;</span><h3>No Banners Yet</h3><p>Generate typographic banner concepts for the Tiny Dog Mafia page.</p></div></div>
    </div>

    <div class="pane" id="pane-shorts">
      <div class="gen-box">
        <p>12-second narration scripts for Hypernatural. No emojis in script body. Each includes a scene image prompt for OpenArt.</p>
        <div class="btn-row">
          <button class="btn btn-gold" id="gen-short-btn">Generate 3 Short Scripts</button>
          <button class="btn btn-ghost" id="clear-shorts-btn">Clear</button>
        </div>
        <div id="short-prog-wrap" style="display:none;" class="prog-wrap">
          <div class="prog-track"><div class="prog-fill" id="short-prog-fill"></div></div>
          <div class="prog-label" id="short-prog-label">Writing scripts...</div>
        </div>
      </div>
      <div id="shorts-container"><div class="empty"><span class="empty-icon">&#127910;</span><h3>No Short Scripts Yet</h3><p>Generate 3 x 12-second Hypernatural narration scripts.</p></div></div>
    </div>

    <div class="pane" id="pane-longs">
      <div class="gen-box">
        <p>60-second narration scripts for Hypernatural. No emojis in script body. Each includes a scene image prompt for OpenArt.</p>
        <div class="btn-row">
          <button class="btn btn-gold" id="gen-long-btn">Generate 3 Long Scripts</button>
          <button class="btn btn-ghost" id="clear-longs-btn">Clear</button>
        </div>
        <div id="long-prog-wrap" style="display:none;" class="prog-wrap">
          <div class="prog-track"><div class="prog-fill" id="long-prog-fill"></div></div>
          <div class="prog-label" id="long-prog-label">Writing scripts...</div>
        </div>
      </div>
      <div id="longs-container"><div class="empty"><span class="empty-icon">&#127909;</span><h3>No Long Scripts Yet</h3><p>Generate 3 x 60-second Hypernatural narration scripts.</p></div></div>
    </div>

    <div class="pane" id="pane-schedule">
      <div id="sched-container"><div class="empty"><span class="empty-icon">&#128197;</span><h3>No Posts Yet</h3><p>Generate content first.</p></div></div>
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
          <li>Add permissions: <code>pages_manage_posts</code> <code>instagram_content_publish</code></li>
          <li>Click <strong>Generate Access Token</strong></li>
        </ol>
      </div>
      <div class="setup-sec">
        <h3>Step 3 - Test Connection</h3>
        <div class="two-col">
          <div><label class="s-label">Facebook Page ID</label><input type="text" id="fb-page-id" placeholder="123456789" style="width:100%;background:var(--dark3);border:1px solid var(--dark3);border-radius:5px;padding:8px 10px;font-size:13px;color:var(--text);outline:none;font-family:DM Sans,sans-serif;"></div>
          <div><label class="s-label">Page Access Token</label><input type="password" id="fb-token" placeholder="EAABx..." style="width:100%;background:var(--dark3);border:1px solid var(--dark3);border-radius:5px;padding:8px 10px;font-size:13px;color:var(--text);outline:none;font-family:DM Sans,sans-serif;"></div>
        </div>
        <button class="btn btn-gold" id="test-fb-btn" style="width:100%;margin-top:8px;">Save &amp; Test Connection</button>
        <div id="fb-result" style="display:none;margin-top:8px;"></div>
      </div>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
const S = {
  name: localStorage.getItem('tdm_name') || '',
  geminiKey: localStorage.getItem('tdm_gemini') || '',
  fbPageId: localStorage.getItem('tdm_fbid') || '',
  fbToken: localStorage.getItem('tdm_fbtoken') || '',
  tone: 'funny', cta: 'engagement',
  imagePosts: [], banners: [], shortVideos: [], longVideos: []
};

function savePosts() {
  try {
    localStorage.setItem('tdm_imagePosts', JSON.stringify(S.imagePosts));
    localStorage.setItem('tdm_banners', JSON.stringify(S.banners));
    localStorage.setItem('tdm_shortVideos', JSON.stringify(S.shortVideos));
    localStorage.setItem('tdm_longVideos', JSON.stringify(S.longVideos));
  } catch(e) { console.warn('Save error:', e); }
}
function loadPosts() {
  try {
    const ip = localStorage.getItem('tdm_imagePosts');
    const bn = localStorage.getItem('tdm_banners');
    const sv = localStorage.getItem('tdm_shortVideos');
    const lv = localStorage.getItem('tdm_longVideos');
    if (ip) S.imagePosts = JSON.parse(ip);
    if (bn) S.banners = JSON.parse(bn);
    if (sv) S.shortVideos = JSON.parse(sv);
    if (lv) S.longVideos = JSON.parse(lv);
  } catch(e) { console.warn('Load error:', e); }
}

// Settings
document.getElementById('settings-btn').addEventListener('click', () => {
  document.getElementById('set-name').value = S.name;
  document.getElementById('set-gemini').value = S.geminiKey;
  document.getElementById('set-fbid').value = S.fbPageId;
  document.getElementById('set-fbtoken').value = S.fbToken;
  document.getElementById('settings-modal').style.display = 'flex';
});
document.getElementById('cancel-settings-btn').addEventListener('click', () => {
  document.getElementById('settings-modal').style.display = 'none';
});
document.getElementById('save-settings-btn').addEventListener('click', () => {
  S.name = document.getElementById('set-name').value.trim();
  S.geminiKey = document.getElementById('set-gemini').value.trim();
  S.fbPageId = document.getElementById('set-fbid').value.trim();
  S.fbToken = document.getElementById('set-fbtoken').value.trim();
  localStorage.setItem('tdm_name', S.name);
  localStorage.setItem('tdm_gemini', S.geminiKey);
  localStorage.setItem('tdm_fbid', S.fbPageId);
  localStorage.setItem('tdm_fbtoken', S.fbToken);
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
    if (window.innerWidth <= 680) {
      document.querySelector('.sidebar').classList.remove('open');
      document.getElementById('mobile-menu-btn').classList.remove('on');
    }
  });
});

// Tone/CTA chips
document.getElementById('tone-chips').addEventListener('click', e => {
  const chip = e.target.closest('.chip'); if (!chip) return;
  document.querySelectorAll('#tone-chips .chip').forEach(c => c.classList.remove('on'));
  chip.classList.add('on'); S.tone = chip.dataset.tone;
});
document.getElementById('cta-chips').addEventListener('click', e => {
  const chip = e.target.closest('.chip'); if (!chip) return;
  document.querySelectorAll('#cta-chips .chip').forEach(c => c.classList.remove('on'));
  chip.classList.add('on'); S.cta = chip.dataset.cta;
});

// Mobile menu
document.getElementById('mobile-menu-btn').addEventListener('click', () => {
  document.querySelector('.sidebar').classList.toggle('open');
  document.getElementById('mobile-menu-btn').classList.toggle('on');
});

// Buttons
document.getElementById('gen-img-btn').addEventListener('click', generateImages);
document.getElementById('clear-images-btn').addEventListener('click', () => clearContent('images'));
document.getElementById('gen-banner-btn').addEventListener('click', generateBanners);
document.getElementById('clear-banners-btn').addEventListener('click', () => clearContent('banners'));
document.getElementById('gen-short-btn').addEventListener('click', () => generateVideos('short'));
document.getElementById('clear-shorts-btn').addEventListener('click', () => clearContent('shorts'));
document.getElementById('gen-long-btn').addEventListener('click', () => generateVideos('long'));
document.getElementById('clear-longs-btn').addEventListener('click', () => clearContent('longs'));
document.getElementById('test-fb-btn').addEventListener('click', testFB);

// Event delegation for dynamic cards
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]'); if (!btn) return;
  const action = btn.dataset.action;
  const type = btn.dataset.type || 'img';
  const idx = parseInt(btn.dataset.idx || '0');
  const field = btn.dataset.field || '';
  if (action === 'upload') document.getElementById('file-' + type + '-' + idx).click();
  if (action === 'regen') genImage(type, idx);
  if (action === 'copy') { const item = getArr(type)[idx]; copyToClipboard(item[field]||''); }
  if (action === 'schedule') scheduleItem(type, idx);
  if (action === 'sectab') {
    const panes = btn.dataset.panes.split(',');
    const show = btn.dataset.show;
    panes.forEach(id => { const p = document.getElementById(id); if(p) p.classList.remove('on'); });
    const sp = document.getElementById(show); if(sp) sp.classList.add('on');
    btn.closest('.sec-tabs').querySelectorAll('.sec-tab').forEach(t => t.classList.remove('on'));
    btn.classList.add('on');
  }
});
document.addEventListener('change', e => {
  const input = e.target;
  if (input.dataset.fileType) {
    const f = input.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => applyImage(input.dataset.fileType, parseInt(input.dataset.fileIdx), ev.target.result);
    r.readAsDataURL(f);
  }
});
document.addEventListener('dragover', e => { if (e.target.closest('.drop-zone')) e.preventDefault(); });
document.addEventListener('dragleave', e => { const dz = e.target.closest('.drop-zone'); if(dz) dz.classList.remove('over'); });
document.addEventListener('dragenter', e => { const dz = e.target.closest('.drop-zone'); if(dz) dz.classList.add('over'); });
document.addEventListener('drop', e => {
  const dz = e.target.closest('[data-drop-type]'); if (!dz) return;
  e.preventDefault(); dz.classList.remove('over');
  const f = e.dataTransfer.files[0];
  if (!f || !f.type.startsWith('image/')) { toast('Drop an image file'); return; }
  const r = new FileReader();
  r.onload = ev => applyImage(dz.dataset.dropType, parseInt(dz.dataset.dropIdx), ev.target.result);
  r.readAsDataURL(f);
});

// Helpers
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
function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => toast('Copied!')).catch(() => fallbackCopy(text));
  } else { fallbackCopy(text); }
}
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
  document.body.appendChild(ta); ta.focus(); ta.select();
  try { document.execCommand('copy'); toast('Copied!'); }
  catch(e) { toast('Copy failed — long press to copy manually', true); }
  document.body.removeChild(ta);
}
function setP(fId, lId, pct, label) {
  const f = document.getElementById(fId); if(f) f.style.width = pct + '%';
  const l = document.getElementById(lId); if(l) l.textContent = label;
}
function updateStats() {
  document.getElementById('s-images').textContent = S.imagePosts.length;
  document.getElementById('s-banners').textContent = S.banners.length;
  document.getElementById('s-videos').textContent = S.shortVideos.length + S.longVideos.length;
  document.getElementById('s-sched').textContent = [...S.imagePosts,...S.banners,...S.shortVideos,...S.longVideos].filter(p=>p.scheduled).length;
}
function parseTime(s) {
  const m = s.trim().toUpperCase().match(/([0-9]+):([0-9]+)[ ]*(AM|PM)?/);
  if (!m) return {h:8,m:0};
  let h = parseInt(m[1]), min = parseInt(m[2]);
  if (m[3]==='PM'&&h<12) h+=12; if (m[3]==='AM'&&h===12) h=0;
  return {h, m:min};
}
function addMins(t, mins) { const total=t.h*60+t.m+mins; return {h:Math.floor(total/60)%24,m:total%60}; }
function fmtTime(t) { const h=t.h%12||12,ap=t.h<12?'AM':'PM'; return h+':'+String(t.m).padStart(2,'0')+' '+ap; }
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function getArr(type) { return type==='img'?S.imagePosts:type==='banner'?S.banners:type==='short'?S.shortVideos:S.longVideos; }

// Generate
async function generateImages() {
  const count = parseInt(document.getElementById('post-count').value);
  const override = document.getElementById('img-theme-override').value.trim();
  const btn = document.getElementById('gen-img-btn');
  btn.disabled=true; btn.textContent='Generating...';
  document.getElementById('img-prog-wrap').style.display='block';
  setP('img-prog-fill','img-prog-label',15,'Briefing the crew...');
  try {
    const res = await fetch('/tdm/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({count,tone:S.tone,cta:S.cta,dogName:S.name||'your Yorkie',themeOverride:override})});
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    setP('img-prog-fill','img-prog-label',100,'Posts ready!');
    S.imagePosts = data.posts.map((p,i)=>({id:i,type:'image',...p,imgUrl:null,scheduled:false}));
    savePosts();
    setTimeout(()=>{document.getElementById('img-prog-wrap').style.display='none';renderImagePosts();updateStats();renderSchedule();},400);
  } catch(e){toast('Error: '+e.message,true);document.getElementById('img-prog-wrap').style.display='none';}
  btn.disabled=false; btn.textContent='Generate Image Posts';
}

async function generateBanners() {
  const override = document.getElementById('banner-theme-override').value.trim();
  const btn = document.getElementById('gen-banner-btn');
  btn.disabled=true; btn.textContent='Generating...';
  document.getElementById('banner-prog-wrap').style.display='block';
  setP('banner-prog-fill','banner-prog-label',15,'Creating banner concepts...');
  try {
    const res = await fetch('/tdm/api/generate-banner',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({count:3,themeOverride:override})});
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    setP('banner-prog-fill','banner-prog-label',100,'Banners ready!');
    S.banners = data.banners.map((b,i)=>({id:i,type:'banner',...b,imgUrl:null,scheduled:false}));
    savePosts();
    setTimeout(()=>{document.getElementById('banner-prog-wrap').style.display='none';renderBanners();updateStats();renderSchedule();},400);
  } catch(e){toast('Error: '+e.message,true);document.getElementById('banner-prog-wrap').style.display='none';}
  btn.disabled=false; btn.textContent='Generate 3 Banners';
}

async function generateVideos(type) {
  const btn = document.getElementById('gen-'+type+'-btn');
  btn.disabled=true; btn.textContent='Generating...';
  document.getElementById(type+'-prog-wrap').style.display='block';
  setP(type+'-prog-fill',type+'-prog-label',15,'Writing scripts...');
  try {
    const res = await fetch('/tdm/api/generate-video',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({videoType:type,count:3,dogName:S.name||'your Yorkie'})});
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    setP(type+'-prog-fill',type+'-prog-label',100,'Scripts ready!');
    const arr = data.videos.map((v,i)=>({id:i,type,...v,imgUrl:null,scheduled:false}));
    if (type==='short') S.shortVideos=arr; else S.longVideos=arr;
    savePosts();
    setTimeout(()=>{document.getElementById(type+'-prog-wrap').style.display='none';renderVideos(type);updateStats();renderSchedule();},400);
  } catch(e){toast('Error: '+e.message,true);document.getElementById(type+'-prog-wrap').style.display='none';}
  btn.disabled=false; btn.textContent='Generate 3 '+(type==='short'?'Short':'Long')+' Scripts';
}

// Card builder
function buildCard(type, idx, item, time, typeLabel, typeCls, s1text, s2text, s3text, tab1, tab2, field1, field2) {
  const dotCls = item.imgUrl?(item.scheduled?'dot-s':'dot-r'):'dot-p';
  const statusTxt = item.scheduled?'Scheduled':item.imgUrl?'Image ready':type==='banner'?'Paste prompt into image tool':'Upload or generate image';
  const p1 = type+'-s1-'+idx, p2 = type+'-s2-'+idx;
  const imgColHTML = item.imgUrl
    ? '<img src="'+esc(item.imgUrl)+'" class="img-preview" data-action="upload" data-type="'+type+'" data-idx="'+idx+'" title="Click to replace">'
    : type==='banner'
      ? '<div class="banner-placeholder"><span style="font-size:20px">&#127775;</span><span>Generate in<br>OpenArt or<br>Gemini</span></div>'
      : '<div class="drop-zone" data-drop-type="'+type+'" data-drop-idx="'+idx+'" data-action="upload" data-type="'+type+'" data-idx="'+idx+'"><span class="dz-icon">&#9727;</span><span>Generate or drop</span></div>';

  return '<div class="card-head">'
    +'<span class="card-num">#'+String(idx+1).padStart(2,'0')+'</span>'
    +(item.division?'<span class="card-div">'+esc(item.division)+'</span>':'')
    +(item.pillar?'<span class="card-pillar">'+esc(item.pillar.split(' ')[0])+'</span>':'')
    +'<span class="card-type '+typeCls+'">'+typeLabel+'</span>'
    +'<span class="card-time">'+time+'</span>'
    +'</div>'
    +'<div class="card-body">'
    +'<div class="card-text">'
    +'<div class="sec-tabs">'
    +'<div class="sec-tab" data-action="sectab" data-panes="'+p1+','+p2+'" data-show="'+p1+'">'+tab1+'</div>'
    +'<div class="sec-tab on" data-action="sectab" data-panes="'+p1+','+p2+'" data-show="'+p2+'">'+tab2+'</div>'
    +'</div>'
    +'<div class="sec-pane" id="'+p1+'"><div class="section-text'+(type==='img'||type==='banner'?' prompt':'')+'">'+esc(s1text||'')+'</div></div>'
    +'<div class="sec-pane on" id="'+p2+'"><div class="section-text">'+esc(s2text||'')+'</div></div>'
    +'<div class="first-comment-block"><div class="first-comment-label">First Comment</div><div class="first-comment-text">'+esc(s3text||'')+'</div></div>'
    +'</div>'
    +'<div class="card-img-col">'
    +'<input type="file" id="file-'+type+'-'+idx+'" accept="image/*" data-file-type="'+type+'" data-file-idx="'+idx+'" style="display:none">'
    +'<div id="img-'+type+'-'+idx+'">'+imgColHTML+'</div>'
    +(type!=='banner'?'<button class="mbtn" data-action="regen" data-type="'+type+'" data-idx="'+idx+'" style="font-size:10px;">&#8635; Regen</button>':'<button class="mbtn" data-action="upload" data-type="'+type+'" data-idx="'+idx+'" style="font-size:10px;">&#8679; Upload</button>')
    +'</div>'
    +'</div>'
    +'<div class="card-foot">'
    +'<div class="s-dot '+dotCls+'" id="dot-'+type+'-'+idx+'"></div>'
    +'<span class="s-txt" id="stxt-'+type+'-'+idx+'">'+statusTxt+'</span>'
    +'<button class="mbtn" data-action="copy" data-type="'+type+'" data-idx="'+idx+'" data-field="'+field1+'">'+tab1.split(' ')[0]+'</button>'
    +'<button class="mbtn" data-action="copy" data-type="'+type+'" data-idx="'+idx+'" data-field="'+field2+'">Caption</button>'
    +'<button class="mbtn" data-action="copy" data-type="'+type+'" data-idx="'+idx+'" data-field="firstComment">Comment</button>'
    +(type!=='banner'?'<button class="'+(item.imgUrl?'mbtn mbtn-gold':'mbtn')+'" id="sched-'+type+'-'+idx+'" data-action="schedule" data-type="'+type+'" data-idx="'+idx+'"'+(item.imgUrl?'':' disabled')+'>Schedule</button>':'')
    +'</div>';
}

function renderImagePosts() {
  const start=parseTime(document.getElementById('start-time').value);
  const intv=parseInt(document.getElementById('interval').value)||45;
  const container=document.getElementById('images-container');
  container.innerHTML='';
  const list=document.createElement('div'); list.className='content-list';
  S.imagePosts.forEach((p,i)=>{
    const card=document.createElement('div'); card.className='content-card'; card.id='img-card-'+i;
    card.innerHTML=buildCard('img',i,p,fmtTime(addMins(start,i*intv)),'IMAGE','type-image',p.imagePrompt,p.caption,p.firstComment,'Prompt','Caption & Hashtags','imagePrompt','caption');
    list.appendChild(card);
  });
  container.appendChild(list);
}

function renderBanners() {
  const start=parseTime(document.getElementById('start-time').value);
  const intv=parseInt(document.getElementById('interval').value)||45;
  const baseOff=S.imagePosts.length;
  const container=document.getElementById('banners-container');
  container.innerHTML='';
  const list=document.createElement('div'); list.className='content-list';
  S.banners.forEach((b,i)=>{
    const card=document.createElement('div'); card.className='content-card'; card.id='banner-card-'+i;
    card.innerHTML=buildCard('banner',i,b,fmtTime(addMins(start,(baseOff+i)*intv)),'BANNER','type-banner',b.bannerPrompt,b.caption,b.firstComment,'Banner Prompt','Caption & Hashtags','bannerPrompt','caption');
    list.appendChild(card);
  });
  container.appendChild(list);
}

function renderVideos(type) {
  const arr=type==='short'?S.shortVideos:S.longVideos;
  const container=document.getElementById(type==='short'?'shorts-container':'longs-container');
  const start=parseTime(document.getElementById('start-time').value);
  const intv=parseInt(document.getElementById('interval').value)||45;
  const baseOff=S.imagePosts.length+S.banners.length+(type==='long'?3:0);
  container.innerHTML='';
  const list=document.createElement('div'); list.className='content-list';
  arr.forEach((v,i)=>{
    const typeCls=type==='short'?'type-short':'type-long';
    const typeLabel=type==='short'?'SHORT 12s':'LONG 60s';
    const card=document.createElement('div'); card.className='content-card'; card.id=type+'-card-'+i;
    card.innerHTML=buildCard(type,i,v,fmtTime(addMins(start,(baseOff+i)*intv)),typeLabel,typeCls,v.videoScript,v.captionAndHashtags,v.firstComment,'Script','Caption & Hashtags','videoScript','captionAndHashtags');
    list.appendChild(card);
  });
  container.appendChild(list);
}

function applyImage(type,idx,dataUrl) {
  const arr=getArr(type); arr[idx].imgUrl=dataUrl;
  const imgDiv=document.getElementById('img-'+type+'-'+idx);
  if(imgDiv) imgDiv.innerHTML='<img src="'+dataUrl+'" class="img-preview" data-action="upload" data-type="'+type+'" data-idx="'+idx+'" title="Click to replace">';
  const dot=document.getElementById('dot-'+type+'-'+idx); if(dot) dot.className='s-dot dot-r';
  const stxt=document.getElementById('stxt-'+type+'-'+idx); if(stxt) stxt.textContent='Image ready';
  const sb=document.getElementById('sched-'+type+'-'+idx); if(sb){sb.disabled=false;sb.className='mbtn mbtn-gold';}
  savePosts(); updateStats(); renderSchedule();
  toast('Image set for #'+(idx+1));
}

async function genImage(type,idx) {
  const arr=getArr(type);
  const prompt=type==='banner'?arr[idx].bannerPrompt:arr[idx].imagePrompt;
  const imgDiv=document.getElementById('img-'+type+'-'+idx);
  const dot=document.getElementById('dot-'+type+'-'+idx);
  const stxt=document.getElementById('stxt-'+type+'-'+idx);
  if(dot) dot.className='s-dot dot-p';
  if(stxt) stxt.textContent='Generating...';
  if(imgDiv) imgDiv.innerHTML='<div class="img-gen"><div class="spinner"></div><span>Generating...</span></div>';
  try {
    const res=await fetch('/tdm/api/image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,geminiKey:S.geminiKey})});
    const data=await res.json();
    if(!data.ok) throw new Error(data.error);
    applyImage(type,idx,data.dataUrl);
  } catch(e){
    if(imgDiv) imgDiv.innerHTML='<div class="drop-zone" data-drop-type="'+type+'" data-drop-idx="'+idx+'"><span style="font-size:18px">&#9888;</span><span>Error - upload manually</span></div>';
    if(dot) dot.className='s-dot';
    if(stxt) stxt.textContent='Error: '+e.message.substring(0,60);
    toast('Error: '+e.message,true);
  }
}

async function scheduleItem(type,idx) {
  const fbId=S.fbPageId||document.getElementById('fb-page-id').value.trim();
  const fbTk=S.fbToken||document.getElementById('fb-token').value.trim();
  if(!fbId||!fbTk){toast('Connect Facebook first — go to FB Setup tab',true);return;}
  const arr=getArr(type); const item=arr[idx];
  if(!item.imgUrl){toast('Upload an image first',true);return;}
  const btn=document.getElementById('sched-'+type+'-'+idx);
  btn.textContent='...'; btn.disabled=true;
  const start=parseTime(document.getElementById('start-time').value);
  const intv=parseInt(document.getElementById('interval').value)||45;
  const baseOff=type==='long'?S.imagePosts.length+S.banners.length+3:type==='short'?S.imagePosts.length+S.banners.length:0;
  const postTime=addMins(start,(baseOff+idx)*intv);
  const now=new Date(); const schedDate=new Date(now);
  schedDate.setHours(postTime.h,postTime.m,0,0);
  if(schedDate<=now) schedDate.setDate(schedDate.getDate()+1);
  if(schedDate-now<10*60*1000) schedDate.setTime(now.getTime()+11*60*1000);
  const caption=item.caption||item.captionAndHashtags||'';
  try {
    const res=await fetch('/tdm/api/schedule',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({pageId:fbId,token:fbTk,caption,imageB64:item.imgUrl,scheduledTime:Math.floor(schedDate.getTime()/1000)})});
    const data=await res.json();
    if(!data.ok) throw new Error(data.error);
    arr[idx].scheduled=true;
    btn.textContent='Scheduled'; btn.style.color='#1D9E75'; btn.style.borderColor='#1D9E75';
    const dot=document.getElementById('dot-'+type+'-'+idx); if(dot) dot.className='s-dot dot-s';
    const stxt=document.getElementById('stxt-'+type+'-'+idx); if(stxt) stxt.textContent='Scheduled for '+fmtTime(postTime);
    savePosts(); updateStats(); renderSchedule();
    toast((type==='img'?'Post':'Video')+' #'+(idx+1)+' scheduled!');
  } catch(e){btn.textContent='Schedule';btn.disabled=false;toast('Error: '+e.message,true);}
}

function clearContent(type) {
  if(type==='images'){S.imagePosts=[];localStorage.removeItem('tdm_imagePosts');document.getElementById('images-container').innerHTML='<div class="empty"><span class="empty-icon">&#128081;</span><h3>Awaiting Orders</h3><p>Click Generate.</p></div>';}
  else if(type==='banners'){S.banners=[];localStorage.removeItem('tdm_banners');document.getElementById('banners-container').innerHTML='<div class="empty"><span class="empty-icon">&#127775;</span><h3>No Banners Yet</h3><p>Click Generate.</p></div>';}
  else if(type==='shorts'){S.shortVideos=[];localStorage.removeItem('tdm_shortVideos');document.getElementById('shorts-container').innerHTML='<div class="empty"><span class="empty-icon">&#127910;</span><h3>No Short Scripts Yet</h3><p>Click Generate.</p></div>';}
  else{S.longVideos=[];localStorage.removeItem('tdm_longVideos');document.getElementById('longs-container').innerHTML='<div class="empty"><span class="empty-icon">&#127909;</span><h3>No Long Scripts Yet</h3><p>Click Generate.</p></div>';}
  updateStats();
}

function renderSchedule() {
  const all=[...S.imagePosts.map((p,i)=>({...p,dType:'Image',cap:p.caption})),...S.banners.map((b,i)=>({...b,dType:'Banner',cap:b.caption})),...S.shortVideos.map((v,i)=>({...v,dType:'Short',cap:v.captionAndHashtags})),...S.longVideos.map((v,i)=>({...v,dType:'Long',cap:v.captionAndHashtags}))];
  if(!all.length) return;
  const start=parseTime(document.getElementById('start-time').value);
  const intv=parseInt(document.getElementById('interval').value)||45;
  const rows=all.map((item,i)=>{
    const t=fmtTime(addMins(start,i*intv));
    const pill=item.scheduled?'<span class="pill pill-s">Scheduled</span>':item.imgUrl?'<span class="pill pill-r">Ready</span>':'<span class="pill pill-p">Pending</span>';
    const tLabel=item.dType==='Image'?'<span class="card-type type-image">IMG</span>':item.dType==='Banner'?'<span class="card-type type-banner">BNR</span>':item.dType==='Short'?'<span class="card-type type-short">SHORT</span>':'<span class="card-type type-long">LONG</span>';
    return '<div class="sched-row"><span class="s-num">'+(i+1)+'</span>'+tLabel+'<span style="font-size:11px">'+esc((item.cap||'').substring(0,45))+'...</span><span style="font-size:11px;color:var(--muted)">'+t+'</span>'+pill+'</div>';
  }).join('');
  document.getElementById('sched-container').innerHTML='<div class="sched-table"><div class="sched-head"><span>#</span><span>Type</span><span>Caption</span><span>Time</span><span>Status</span></div>'+rows+'</div>';
}

function testFB() {
  const pageId=document.getElementById('fb-page-id').value.trim();
  const token=document.getElementById('fb-token').value.trim();
  const res=document.getElementById('fb-result'); res.style.display='block';
  if(!pageId||!token){res.innerHTML='<div class="alert alert-gold">Enter both Page ID and Access Token.</div>';return;}
  res.innerHTML='<div class="alert" style="background:rgba(74,128,184,.08);color:#7AAAD4;border-color:#4A80B8;border-left:2px solid;">Testing...</div>';
  fetch('https://graph.facebook.com/v19.0/'+pageId+'?fields=name,fan_count&access_token='+token)
    .then(r=>r.json())
    .then(d=>{
      if(d.error){res.innerHTML='<div class="alert alert-err">'+esc(d.error.message)+'</div>';}
      else{
        S.fbPageId=pageId; S.fbToken=token;
        localStorage.setItem('tdm_fbid',pageId); localStorage.setItem('tdm_fbtoken',token);
        res.innerHTML='<div class="alert alert-ok">Connected to "'+esc(d.name)+'" — '+((d.fan_count||0).toLocaleString())+' followers. Ready to schedule.</div>';
        toast('Connected!');
      }
    })
    .catch(e=>{res.innerHTML='<div class="alert alert-err">'+esc(e.message)+'</div>';});
}

// Load saved posts on init
loadPosts();
if(S.imagePosts.length){renderImagePosts();updateStats();renderSchedule();}
if(S.banners.length){renderBanners();updateStats();}
if(S.shortVideos.length) renderVideos('short');
if(S.longVideos.length) renderVideos('long');
updateStats();
</script>
</body>
</html>
'''
