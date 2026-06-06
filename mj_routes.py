"""
mj_routes.py  —  MJ Content Studio
Routes:
    GET  /mj                        -> Studio HTML
    POST /mj/api/generate           -> Generate image posts (12 pillars)
    POST /mj/api/generate-banner    -> Generate banner concepts (12 pillars)
    POST /mj/api/generate-video     -> Generate video scripts (12 pillars)
    POST /mj/api/image              -> Gemini image generation
    POST /mj/api/schedule-buffer    -> Buffer scheduling
"""

import os, json, base64, requests, random
from flask import Blueprint, request, jsonify, Response

mj_bp = Blueprint('mj', __name__, url_prefix='/mj')

ANTHROPIC_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
GEMINI_KEY    = os.environ.get('GEMINI_API_KEY', '')

PILLARS = [
    "Iconic music videos — breakdowns, cultural impact, and the creative process behind Thriller, Beat It, Billie Jean, Black or White, Smooth Criminal, and others",
    "Album deep dives — Off the Wall, Thriller, Bad, Dangerous, HIStory, and Invincible: the recording process, documented collaborators, chart performance, and lasting impact",
    "Live performances and concert tours — documented concerts, setlists, and moments from the Victory Tour, Bad Tour, Dangerous Tour, HIStory Tour, and This Is It",
    "Dance — the moonwalk debut on Motown 25 (May 16 1983), signature moves, documented choreography evolution, and influence on dancers and choreographers",
    "Fashion evolution — documented iconic outfits across eras, from Jackson 5 through solo career: the red jacket, military jackets, fedora, single glove, and collaborations with designers",
    "Collaborations with legendary artists — documented studio and performance collaborations with Paul McCartney, Quincy Jones, Siedah Garrett, Eddie Van Halen, and others",
    "Humanitarian work and charitable legacy — Heal the World Foundation, We Are the World, documented charity contributions, and confirmed philanthropic milestones",
    "Rare and lesser-known documented photos and footage — confirmed public appearances, documented interviews, and publicly recorded behind-the-scenes moments",
    "Influence on modern artists across all genres — documented tributes, confirmed statements from artists about MJ's influence, and his legacy in contemporary music",
    "Fan stories and community celebrations — the global fan community, documented fan events, and the enduring connection between MJ and his audience",
    "Record-breaking achievements and milestones — confirmed chart records, Grammy wins, Thriller as best-selling album, documented Guinness World Records",
    "The making of specific songs — documented studio stories, confirmed creative process details, and publicly known facts about iconic tracks",
]


@mj_bp.route('/', methods=['GET'])
def studio():
    return Response(MJ_STUDIO_HTML, mimetype='text/html')


@mj_bp.route('/api/generate', methods=['POST'])
def generate():
    data     = request.get_json()
    count    = int(data.get('count', 19))
    override = data.get('themeOverride', '')

    # Pick random pillars for variety
    selected_pillars = random.choices(PILLARS, k=count)
    pillar_list = '\n'.join([f"{i+1}. {p}" for i, p in enumerate(set(selected_pillars))])

    system_prompt = (
        'You are the creative director for a viral Michael Jackson tribute Facebook and Instagram page. '
        'Your content is cinematic, emotionally powerful, and strictly based on documented, publicly verifiable facts. '
        'CRITICAL: Only reference events, quotes, performances, and facts that are widely documented — '
        'Billboard chart records, Grammy wins, documented concert setlists, confirmed album credits, '
        'recorded TV performances, and other publicly verifiable historical facts. '
        'Never invent, speculate about, or claim knowledge of private moments, unverified behind-the-scenes events, '
        'or unconfirmed quotes. Every specific claim must be something a fan could verify online. '
        'REAL-PERSON LIKENESS RULE: All image prompts must anchor Michael Jackson\'s authentic likeness to the '
        'correct era with specific physical descriptors (age, hairstyle, outfit, era-accurate details). '
        'Always state it is the real Michael Jackson, not an actor, impersonator, or tribute artist. '
        'Respond ONLY with valid JSON. No markdown. No code fences. No preamble.'
    )

    theme_note = f'Theme override: "{override}". ' if override else ''

    user_prompt = f"""Generate exactly {count} unique Michael Jackson social media image posts.
{theme_note}Draw from these content pillars, varying across all {count} posts:
{pillar_list}

IMAGE PROMPT FORMAT: One rich photorealistic cinematic scene paragraph. Must include:
- Michael Jackson's authentic likeness anchored to the correct era with specific physical descriptors
- State it is the real Michael Jackson (not an actor or tribute artist)
- Era-accurate wardrobe, hairstyle, setting
- Cinematic lighting, dramatic atmosphere, specific scene details
- End with: "Optimized for 1080x1350 format."

CAPTION FORMAT — exactly 3 full paragraphs:
Paragraph 1: Strong scroll-stopping hook with 2-3 emojis. Immediately draws the reader in.
Paragraph 2: Develops the story, context, or emotion. References the specific documented fact or moment.
Paragraph 3: Clear engagement CTA asking followers to comment and follow. Include 2 emojis.
Then on a new line: exactly 5 hashtags.

FIRST COMMENT: 1-2 sentences in warm fan-to-fan voice. Include one memorable documented fact and end with "Tag a friend who needs to see this" or similar. NEVER include hashtags in the first comment.

For each post also include: "pillar" (which of the 12 pillars this post uses, 1-word summary)

JSON: {{"posts":[{{"imagePrompt":"...","caption":"...","firstComment":"...","pillar":"..."}}]}}"""

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


@mj_bp.route('/api/generate-banner', methods=['POST'])
def generate_banner():
    data     = request.get_json()
    count    = int(data.get('count', 3))
    override = data.get('themeOverride', '')

    pillar = random.choice(PILLARS)

    system_prompt = (
        'You are the creative director for a viral Michael Jackson tribute Facebook and Instagram page. '
        'Generate typographic banner concepts — no people, no photography, text on gradient background only. '
        'Banners must be vibrant, scroll-stopping, and emotionally powerful. '
        'The banner text must always be a QUESTION that invites comments, not a declarative statement. '
        'Strictly based on documented, publicly verifiable facts about Michael Jackson. '
        'Respond ONLY with valid JSON. No markdown. No code fences. No preamble.'
    )

    theme_note = f'Theme override: "{override}". ' if override else ''

    user_prompt = f"""Generate exactly {count} unique Michael Jackson typographic banner concepts.
{theme_note}Draw from this content pillar: {pillar}

BANNER FORMAT — typographic only, no people or photography:
- Vibrant saturated color gradients matched to the emotional mood — electric blues, deep purples, fiery oranges, emerald greens, golden bursts
- Strong contrast between lettering and background required
- Soft glow behind text, gradient or lit-from-within lettering, or dramatic radial burst
- The sole visual element is bold centered text
- The text must be a QUESTION that invites comments (not a declarative statement)
- Heavy condensed sans-serif font, bright lettering with glow effect
- Stack text across 2-3 lines for visual rhythm
- End description with: "No people, no instruments, no illustrations, no photography. Text on gradient background only. Optimized for 1080x1350 format."

CAPTION FORMAT — exactly 3 full paragraphs:
Paragraph 1: Strong scroll-stopping hook with 2-3 emojis tied to the banner question.
Paragraph 2: Context and story behind the question — documented facts only.
Paragraph 3: Clear engagement CTA inviting followers to answer the question in comments and follow.
Then on a new line: exactly 5 hashtags.

FIRST COMMENT: 1-2 sentences, warm fan-to-fan voice, documented fact + "Tag a friend" CTA. Never hashtags.

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


@mj_bp.route('/api/generate-video', methods=['POST'])
def generate_video():
    data       = request.get_json()
    video_type = data.get('videoType', 'short')
    count      = int(data.get('count', 3))
    override   = data.get('themeOverride', '')

    pillar = random.choice(PILLARS)

    if video_type == 'short':
        duration_rules = "SHORT-FORM 12 seconds (~30 words): 2-4 scene changes, powerful hook in first line, loopable ending, Hypernatural optimized"
        word_guide = "approximately 30 words (12 seconds at 2.5 words/second)"
    else:
        duration_rules = "LONG-FORM 60 seconds (~150 words): powerful scroll-stopping hook, emotionally resonant story, escalating momentum, strong CTA ending, Hypernatural optimized"
        word_guide = "approximately 150 words (60 seconds at 2.5 words/second)"

    system_prompt = (
        'You are the video director for a viral Michael Jackson tribute page. '
        'Generate spoken narration scripts — NOT visual prompts or shot descriptions. '
        'Scripts are voiceover narration the creator reads aloud. '
        'CRITICAL: ABSOLUTELY NO EMOJIS anywhere in the script body. Plain text only. '
        'Emojis belong only in the caption and first comment, never in the script itself. '
        'Only reference documented, publicly verifiable facts about Michael Jackson. '
        'Never speculate about private moments or invent unverified details. '
        'Respond ONLY with valid JSON. No markdown. No code fences. No preamble.'
    )

    theme_note = f'Theme override: "{override}". ' if override else ''

    user_prompt = f"""Generate exactly {count} unique Michael Jackson video narration scripts.
{theme_note}Draw from this content pillar: {pillar}
Rules: {duration_rules}

VIDEO SCRIPT FORMAT — spoken narration only:
- {word_guide}
- Open with a powerful hook in the very first line that stops the scroll
- Tell a true, emotionally resonant story using documented facts
- Short punchy lines with line breaks for pacing
- Build emotional momentum throughout
- End with a clear CTA: ask viewers to drop a comment and follow
- ABSOLUTELY NO EMOJIS in the script — plain text only
- NO shot descriptions, camera directions, or visual notes

Also generate for each video:
- "imagePrompt": A cinematic still image prompt for this video's key scene. For use in OpenArt. Must include Michael Jackson's authentic likeness anchored to the correct era with specific physical descriptors. State it is the real Michael Jackson. End with "Optimized for 1080x1350 format."

CAPTION FORMAT — exactly 3 full paragraphs (written AFTER the script, separate deliverable):
Paragraph 1: Strong scroll-stopping hook with 2-3 emojis
Paragraph 2: Develops the story and context from the script with documented details
Paragraph 3: Clear engagement CTA asking viewers to comment and follow. Include 2 emojis.
Then on a new line: exactly 5 hashtags.

FIRST COMMENT: 1-2 sentences, warm fan-to-fan voice, memorable documented fact + "Tag a friend" CTA. Never hashtags.

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


@mj_bp.route('/api/image', methods=['POST'])
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


@mj_bp.route('/api/schedule-buffer', methods=['POST'])
def schedule_buffer():
    data = request.get_json()
    buffer_token = data.get('bufferToken','')
    profile_ids  = data.get('profileIds',[])
    caption      = data.get('caption','')
    image_b64    = data.get('imageB64','')
    sched_time   = int(data.get('scheduledTime',0))
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
            results.append({'profileId':pid,'updateId':pd.get('updates',[{}])[0].get('id','') if pd.get('success') else str(pd)})
        return jsonify({'ok':True,'results':results})
    except Exception as e:
        return jsonify({'ok':False,'error':str(e)}), 500


MJ_STUDIO_HTML = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MJ Content Studio</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
:root{--gold:#C9A84C;--gold-light:#E8C97A;--gold-dim:#9A7A35;--black:#0D0D0D;--dark:#111;--dark2:#181818;--dark3:#222;--border:rgba(201,168,76,0.18);--text:#F0EAD6;--muted:#7A7060;--hint:#4A4438;}
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
.alert-info{background:rgba(74,128,184,.08);color:#7AAAD4;border-color:#4A80B8;}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;}
code{background:var(--dark3);padding:1px 6px;border-radius:3px;font-size:11px;color:var(--gold);font-family:monospace;}
.empty{text-align:center;padding:60px 20px;color:var(--hint);}
.empty-icon{font-size:44px;margin-bottom:14px;display:block;}
.empty h3{font-family:"Bebas Neue",sans-serif;font-size:24px;letter-spacing:.08em;color:var(--muted);margin-bottom:8px;}
.empty p{font-size:13px;line-height:1.7;max-width:320px;margin:0 auto;}
.toast{position:fixed;bottom:20px;right:20px;background:var(--dark2);color:var(--gold-light);border:1px solid var(--border);padding:11px 18px;border-radius:6px;font-size:12px;font-weight:500;box-shadow:0 8px 32px rgba(0,0,0,.4);transform:translateY(80px);opacity:0;transition:all .3s;z-index:9999;max-width:320px;}
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
  <div class="logo">MJ Content Studio<span>Michael Jackson Tribute Page</span></div>
  <button class="mobile-menu-btn" id="mobile-menu-btn">&#9776;</button>
  <div class="hdr-actions">
    <button class="btn btn-ghost" style="font-size:11px;padding:5px 12px;" id="settings-btn">&#9881; Settings</button>
    <a href="/tdm" class="btn btn-ghost" style="font-size:11px;padding:5px 12px;">Switch to TDM</a>
  </div>
</header>

<div id="settings-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:500;align-items:center;justify-content:center;">
  <div style="background:var(--dark2);border:1px solid var(--border);border-radius:12px;padding:32px;width:460px;max-width:90vw;">
    <h2 style="font-family:Bebas Neue,sans-serif;font-size:22px;letter-spacing:.08em;color:var(--gold);margin-bottom:20px;">Studio Settings</h2>
    <div class="s-field"><label class="s-label">Buffer Access Token</label><input type="password" id="set-buffer" placeholder="Paste your Buffer access token..."></div>
    <div class="s-field"><label class="s-label">Buffer Profile IDs (comma-separated)</label><input type="text" id="set-profiles" placeholder="e.g. 69e8277c031bfa423c2c788d,..."></div>
    <div class="s-field"><label class="s-label">Gemini API Key (optional)</label><input type="password" id="set-gemini" placeholder="AIza..."></div>
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
      <div class="s-title">Content Pillars</div>
      <div style="font-size:11px;color:var(--hint);line-height:1.7;">
        Pillars are selected randomly on each generation for maximum variety across all 12 topics.
      </div>
    </div>
  </div>

  <div class="main">
    <div class="tabs">
      <div class="tab on" data-tab="images">Image Posts</div>
      <div class="tab" data-tab="banners">Banners</div>
      <div class="tab" data-tab="shorts">Short Videos (12s)</div>
      <div class="tab" data-tab="longs">Long Videos (60s)</div>
      <div class="tab" data-tab="schedule">Schedule</div>
    </div>

    <!-- IMAGE POSTS -->
    <div class="pane on" id="pane-images">
      <div class="gen-box">
        <p>Generates image posts with cinematic prompts, 3-paragraph captions, hashtags, and first comments. Pillars are randomly selected for variety.</p>
        <div class="override-row">
          <input type="text" id="img-theme-override" placeholder="Optional theme override...">
        </div>
        <div class="btn-row">
          <button class="btn btn-gold" id="gen-img-btn">Generate Image Posts</button>
          <button class="btn btn-ghost" id="clear-images-btn">Clear</button>
        </div>
        <div id="img-prog-wrap" style="display:none;" class="prog-wrap">
          <div class="prog-track"><div class="prog-fill" id="img-prog-fill"></div></div>
          <div class="prog-label" id="img-prog-label">Generating...</div>
        </div>
      </div>
      <div id="images-container">
        <div class="empty"><span class="empty-icon">&#127911;</span><h3>No Image Posts Yet</h3><p>Click Generate to create image posts drawn from the 12 content pillars.</p></div>
      </div>
    </div>

    <!-- BANNERS -->
    <div class="pane" id="pane-banners">
      <div class="gen-box">
        <p>Generates typographic banner concepts — vibrant gradient backgrounds with a comment-inviting question. Paste the prompt into OpenArt, Gemini, or any AI image tool.</p>
        <div class="override-row">
          <input type="text" id="banner-theme-override" placeholder="Optional theme override...">
        </div>
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
        <div class="empty"><span class="empty-icon">&#127775;</span><h3>No Banners Yet</h3><p>Generate typographic banner concepts with question text and vibrant gradients.</p></div>
      </div>
    </div>

    <!-- SHORT VIDEOS -->
    <div class="pane" id="pane-shorts">
      <div class="gen-box">
        <p>12-second narration scripts for Hypernatural/Seedance. No emojis in script body. Each script includes a scene image prompt for OpenArt.</p>
        <div class="btn-row">
          <button class="btn btn-gold" id="gen-short-btn">Generate 3 Short Scripts</button>
          <button class="btn btn-ghost" id="clear-shorts-btn">Clear</button>
        </div>
        <div id="short-prog-wrap" style="display:none;" class="prog-wrap">
          <div class="prog-track"><div class="prog-fill" id="short-prog-fill"></div></div>
          <div class="prog-label" id="short-prog-label">Writing scripts...</div>
        </div>
      </div>
      <div id="shorts-container">
        <div class="empty"><span class="empty-icon">&#127910;</span><h3>No Short Scripts Yet</h3><p>Generate 3 x 12-second narration scripts.</p></div>
      </div>
    </div>

    <!-- LONG VIDEOS -->
    <div class="pane" id="pane-longs">
      <div class="gen-box">
        <p>60-second narration scripts for Hypernatural. No emojis in script body. Each script includes a scene image prompt for OpenArt.</p>
        <div class="btn-row">
          <button class="btn btn-gold" id="gen-long-btn">Generate 3 Long Scripts</button>
          <button class="btn btn-ghost" id="clear-longs-btn">Clear</button>
        </div>
        <div id="long-prog-wrap" style="display:none;" class="prog-wrap">
          <div class="prog-track"><div class="prog-fill" id="long-prog-fill"></div></div>
          <div class="prog-label" id="long-prog-label">Writing scripts...</div>
        </div>
      </div>
      <div id="longs-container">
        <div class="empty"><span class="empty-icon">&#127909;</span><h3>No Long Scripts Yet</h3><p>Generate 3 x 60-second narration scripts.</p></div>
      </div>
    </div>

    <!-- SCHEDULE -->
    <div class="pane" id="pane-schedule">
      <div id="sched-container">
        <div class="empty"><span class="empty-icon">&#128197;</span><h3>No Posts Yet</h3><p>Generate content first.</p></div>
      </div>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
const S = {
  bufferToken: localStorage.getItem('mj_buffer') || '',
  profileIds: (localStorage.getItem('mj_profiles') || '').split(',').filter(Boolean),
  geminiKey: localStorage.getItem('mj_gemini') || '',
  imagePosts: [], banners: [], shortVideos: [], longVideos: []
};

// ── PERSISTENCE ───────────────────────────────────────────
function savePosts() {
  try {
    localStorage.setItem('mj_imagePosts', JSON.stringify(S.imagePosts));
    localStorage.setItem('mj_banners', JSON.stringify(S.banners));
    localStorage.setItem('mj_shortVideos', JSON.stringify(S.shortVideos));
    localStorage.setItem('mj_longVideos', JSON.stringify(S.longVideos));
  } catch(e) { console.warn('Save error:', e); }
}
function loadPosts() {
  try {
    const ip = localStorage.getItem('mj_imagePosts');
    const bn = localStorage.getItem('mj_banners');
    const sv = localStorage.getItem('mj_shortVideos');
    const lv = localStorage.getItem('mj_longVideos');
    if (ip) S.imagePosts = JSON.parse(ip);
    if (bn) S.banners = JSON.parse(bn);
    if (sv) S.shortVideos = JSON.parse(sv);
    if (lv) S.longVideos = JSON.parse(lv);
  } catch(e) { console.warn('Load error:', e); }
}

// ── INIT ──────────────────────────────────────────────────
document.getElementById('settings-btn').addEventListener('click', () => {
  document.getElementById('set-buffer').value = S.bufferToken;
  document.getElementById('set-profiles').value = S.profileIds.join(',');
  document.getElementById('set-gemini').value = S.geminiKey;
  document.getElementById('settings-modal').style.display = 'flex';
});
document.getElementById('cancel-settings-btn').addEventListener('click', () => {
  document.getElementById('settings-modal').style.display = 'none';
});
document.getElementById('save-settings-btn').addEventListener('click', () => {
  S.bufferToken = document.getElementById('set-buffer').value.trim();
  S.profileIds = document.getElementById('set-profiles').value.split(',').map(s=>s.trim()).filter(Boolean);
  S.geminiKey = document.getElementById('set-gemini').value.trim();
  localStorage.setItem('mj_buffer', S.bufferToken);
  localStorage.setItem('mj_profiles', S.profileIds.join(','));
  localStorage.setItem('mj_gemini', S.geminiKey);
  document.getElementById('settings-modal').style.display = 'none';
  toast('Settings saved!');
});

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
    document.querySelectorAll('.pane').forEach(p => p.classList.remove('on'));
    tab.classList.add('on');
    document.getElementById('pane-' + tab.dataset.tab).classList.add('on');
  });
});

document.getElementById('gen-img-btn').addEventListener('click', generateImages);
document.getElementById('clear-images-btn').addEventListener('click', () => clearContent('images'));
document.getElementById('gen-banner-btn').addEventListener('click', generateBanners);
document.getElementById('clear-banners-btn').addEventListener('click', () => clearContent('banners'));
document.getElementById('gen-short-btn').addEventListener('click', () => generateVideos('short'));
document.getElementById('clear-shorts-btn').addEventListener('click', () => clearContent('shorts'));
document.getElementById('gen-long-btn').addEventListener('click', () => generateVideos('long'));
document.getElementById('clear-longs-btn').addEventListener('click', () => clearContent('longs'));

// Event delegation
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const type = btn.dataset.type || 'img';
  const idx = parseInt(btn.dataset.idx || '0');
  const field = btn.dataset.field || '';
  if (action === 'upload') document.getElementById('file-' + type + '-' + idx).click();
  if (action === 'regen') genImage(type, idx);
  if (action === 'copy') { const item = getArr(type)[idx]; copyToClipboard(item[field]||''); }
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
  const dz = e.target.closest('[data-drop-type]');
  if (!dz) return;
  e.preventDefault(); dz.classList.remove('over');
  const f = e.dataTransfer.files[0];
  if (!f || !f.type.startsWith('image/')) { toast('Drop an image file'); return; }
  const r = new FileReader();
  r.onload = ev => applyImage(dz.dataset.dropType, parseInt(dz.dataset.dropIdx), ev.target.result);
  r.readAsDataURL(f);
});

// ── HELPERS ───────────────────────────────────────────────
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


function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => toast('Copied!')).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  try { document.execCommand('copy'); toast('Copied!'); }
  catch(e) { toast('Copy failed — long press text to copy', true); }
  document.body.removeChild(ta);
}
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
  if (m[3]==='PM'&&h<12) h+=12;
  if (m[3]==='AM'&&h===12) h=0;
  return {h, m:min};
}
function addMins(t, mins) { const total = t.h*60+t.m+mins; return {h:Math.floor(total/60)%24, m:total%60}; }
function fmtTime(t) { const h=t.h%12||12, ap=t.h<12?'AM':'PM'; return h+':'+String(t.m).padStart(2,'0')+' '+ap; }
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function getArr(type) {
  return type==='img'?S.imagePosts:type==='banner'?S.banners:type==='short'?S.shortVideos:S.longVideos;
}

// ── GENERATE IMAGE POSTS ──────────────────────────────────
async function generateImages() {
  const count = parseInt(document.getElementById('post-count').value);
  const override = document.getElementById('img-theme-override').value.trim();
  const btn = document.getElementById('gen-img-btn');
  btn.disabled = true; btn.textContent = 'Generating...';
  document.getElementById('img-prog-wrap').style.display = 'block';
  setP('img-prog-fill','img-prog-label',15,'Selecting pillars and generating posts...');
  try {
    const res = await fetch('/mj/api/generate', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({count, themeOverride: override})
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    setP('img-prog-fill','img-prog-label',100,'Posts ready!');
    S.imagePosts = data.posts.map((p,i) => ({id:i, type:'image', ...p, imgUrl:null, scheduled:false}));
    savePosts();
    setTimeout(() => {
      document.getElementById('img-prog-wrap').style.display = 'none';
      renderImagePosts(); updateStats(); renderSchedule();
    }, 400);
  } catch(e) { toast('Error: '+e.message, true); document.getElementById('img-prog-wrap').style.display='none'; }
  btn.disabled = false; btn.textContent = 'Generate Image Posts';
}

// ── GENERATE BANNERS ──────────────────────────────────────
async function generateBanners() {
  const override = document.getElementById('banner-theme-override').value.trim();
  const btn = document.getElementById('gen-banner-btn');
  btn.disabled = true; btn.textContent = 'Generating...';
  document.getElementById('banner-prog-wrap').style.display = 'block';
  setP('banner-prog-fill','banner-prog-label',15,'Creating banner concepts...');
  try {
    const res = await fetch('/mj/api/generate-banner', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({count:3, themeOverride:override})
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

// ── GENERATE VIDEOS ───────────────────────────────────────
async function generateVideos(type) {
  const btn = document.getElementById('gen-'+type+'-btn');
  btn.disabled = true; btn.textContent = 'Generating...';
  document.getElementById(type+'-prog-wrap').style.display = 'block';
  setP(type+'-prog-fill', type+'-prog-label', 15, 'Writing scripts...');
  try {
    const res = await fetch('/mj/api/generate-video', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({videoType:type, count:3})
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    setP(type+'-prog-fill', type+'-prog-label', 100, 'Scripts ready!');
    const arr = data.videos.map((v,i) => ({id:i, type, ...v, imgUrl:null, scheduled:false}));
    if (type==='short') S.shortVideos = arr; else S.longVideos = arr;
    savePosts();
    setTimeout(() => {
      document.getElementById(type+'-prog-wrap').style.display = 'none';
      renderVideos(type); updateStats(); renderSchedule();
    }, 400);
  } catch(e) { toast('Error: '+e.message, true); document.getElementById(type+'-prog-wrap').style.display='none'; }
  btn.disabled = false; btn.textContent = 'Generate 3 '+(type==='short'?'Short':'Long')+' Scripts';
}

// ── CARD BUILDER ──────────────────────────────────────────
function buildCard(type, idx, item, time, typeLabel, typeCls, s1text, s2text, s3text, tab1label, tab2label) {
  const dotCls = item.imgUrl ? (item.scheduled?'dot-s':'dot-r') : 'dot-p';
  const statusTxt = item.scheduled ? 'Scheduled' : item.imgUrl ? 'Image ready' : type==='banner' ? 'Paste prompt into image tool' : 'Upload or generate image';
  const pane1id = type+'-s1-'+idx;
  const pane2id = type+'-s2-'+idx;
  const allPanes = pane1id+','+pane2id;

  let imgColHTML;
  if (type === 'banner') {
    imgColHTML = item.imgUrl
      ? '<img src="'+esc(item.imgUrl)+'" class="img-preview" data-action="upload" data-type="'+type+'" data-idx="'+idx+'" title="Click to replace">'
      : '<div class="banner-placeholder"><span style="font-size:20px">&#127775;</span><span>Generate in<br>OpenArt or<br>Gemini</span></div>';
  } else {
    imgColHTML = item.imgUrl
      ? '<img src="'+esc(item.imgUrl)+'" class="img-preview" data-action="upload" data-type="'+type+'" data-idx="'+idx+'" title="Click to replace">'
      : '<div class="drop-zone" data-drop-type="'+type+'" data-drop-idx="'+idx+'" data-action="upload" data-type="'+type+'" data-idx="'+idx+'"><span class="dz-icon">&#9727;</span><span>Generate or drop</span></div>';
  }

  const copyBtnField1 = type==='img'?'imagePrompt':type==='banner'?'bannerPrompt':'videoScript';
  const copyBtn1Label = type==='img'?'Prompt':type==='banner'?'Banner Prompt':'Script';
  const schedDisabled = (type==='banner' && !item.imgUrl) || (type!=='banner' && !item.imgUrl) ? ' disabled' : '';

  return '<div class="card-head">'
    +'<span class="card-num">#'+String(idx+1).padStart(2,'0')+'</span>'
    +(item.pillar ? '<span class="card-pillar">'+esc(item.pillar)+'</span>' : '')
    +'<span class="card-type '+typeCls+'">'+typeLabel+'</span>'
    +'<span class="card-time">'+time+'</span>'
    +'</div>'
    +'<div class="card-body">'
    +'<div class="card-text">'
    +'<div class="sec-tabs">'
    +'<div class="sec-tab on" data-action="sectab" data-panes="'+allPanes+'" data-show="'+pane1id+'">'+tab1label+'</div>'
    +'<div class="sec-tab" data-action="sectab" data-panes="'+allPanes+'" data-show="'+pane2id+'">'+tab2label+'</div>'
    +'</div>'
    +'<div class="sec-pane on" id="'+pane1id+'"><div class="section-text'+(type==='img'?' prompt':'')+'">'+esc(s1text||'')+'</div></div>'
    +'<div class="sec-pane" id="'+pane2id+'"><div class="section-text">'+esc(s2text||'')+'</div></div>'
    +'<div class="first-comment-block"><div class="first-comment-label">First Comment</div><div class="first-comment-text">'+esc(s3text||'')+'</div></div>'
    +'</div>'
    +'<div class="card-img-col">'
    +'<input type="file" id="file-'+type+'-'+idx+'" accept="image/*" data-file-type="'+type+'" data-file-idx="'+idx+'" style="display:none">'
    +'<div id="img-'+type+'-'+idx+'">'+imgColHTML+'</div>'
    +(type!=='banner' ? '<button class="mbtn" data-action="regen" data-type="'+type+'" data-idx="'+idx+'" style="font-size:10px;">&#8635; Regen</button>' : '<button class="mbtn" data-action="upload" data-type="'+type+'" data-idx="'+idx+'" style="font-size:10px;">&#8679; Upload</button>')
    +'</div>'
    +'</div>'
    +'<div class="card-foot">'
    +'<div class="s-dot '+dotCls+'" id="dot-'+type+'-'+idx+'"></div>'
    +'<span class="s-txt" id="stxt-'+type+'-'+idx+'">'+statusTxt+'</span>'
    +'<button class="mbtn" data-action="copy" data-type="'+type+'" data-idx="'+idx+'" data-field="'+copyBtnField1+'">'+copyBtn1Label+'</button>'
    +'<button class="mbtn" data-action="copy" data-type="'+type+'" data-idx="'+idx+'" data-field="captionAndHashtags"'+(type==='img'?' data-field="caption"':'')+'>Caption</button>'
    +'<button class="mbtn" data-action="copy" data-type="'+type+'" data-idx="'+idx+'" data-field="firstComment">Comment</button>'
    +'</div>';
}

// Fix caption field name for image posts
function buildCardHTML(type, idx, item, time, typeLabel, typeCls) {
  const start = parseTime(document.getElementById('start-time').value);
  const intv = parseInt(document.getElementById('interval').value) || 45;
  if (type === 'img') {
    return buildCard(type, idx, item, time, typeLabel, typeCls,
      item.imagePrompt, item.caption, item.firstComment, 'Image Prompt', 'Caption & Hashtags');
  } else if (type === 'banner') {
    return buildCard(type, idx, item, time, typeLabel, typeCls,
      item.bannerPrompt, item.caption, item.firstComment, 'Banner Prompt', 'Caption & Hashtags');
  } else {
    return buildCard(type, idx, item, time, typeLabel, typeCls,
      item.videoScript, item.captionAndHashtags, item.firstComment, 'Video Script', 'Caption & Hashtags');
  }
}

// ── RENDER FUNCTIONS ──────────────────────────────────────
function renderImagePosts() {
  const start = parseTime(document.getElementById('start-time').value);
  const intv = parseInt(document.getElementById('interval').value) || 45;
  const container = document.getElementById('images-container');
  container.innerHTML = '';
  const list = document.createElement('div'); list.className = 'content-list';
  S.imagePosts.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'content-card'; card.id = 'img-card-'+i;
    card.innerHTML = buildCardHTML('img', i, p, fmtTime(addMins(start, i*intv)), 'IMAGE', 'type-image');
    list.appendChild(card);
  });
  container.appendChild(list);
}

function renderBanners() {
  const start = parseTime(document.getElementById('start-time').value);
  const intv = parseInt(document.getElementById('interval').value) || 45;
  const baseOff = S.imagePosts.length;
  const container = document.getElementById('banners-container');
  container.innerHTML = '';
  const list = document.createElement('div'); list.className = 'content-list';
  S.banners.forEach((b, i) => {
    const card = document.createElement('div');
    card.className = 'content-card'; card.id = 'banner-card-'+i;
    card.innerHTML = buildCardHTML('banner', i, b, fmtTime(addMins(start, (baseOff+i)*intv)), 'BANNER', 'type-banner');
    list.appendChild(card);
  });
  container.appendChild(list);
}

function renderVideos(type) {
  const arr = type==='short' ? S.shortVideos : S.longVideos;
  const container = document.getElementById(type==='short'?'shorts-container':'longs-container');
  const start = parseTime(document.getElementById('start-time').value);
  const intv = parseInt(document.getElementById('interval').value) || 45;
  const baseOff = S.imagePosts.length + S.banners.length + (type==='long' ? 3 : 0);
  container.innerHTML = '';
  const list = document.createElement('div'); list.className = 'content-list';
  arr.forEach((v, i) => {
    const typeCls = type==='short'?'type-short':'type-long';
    const typeLabel = type==='short'?'SHORT 12s':'LONG 60s';
    const card = document.createElement('div');
    card.className = 'content-card'; card.id = type+'-card-'+i;
    card.innerHTML = buildCardHTML(type, i, v, fmtTime(addMins(start, (baseOff+i)*intv)), typeLabel, typeCls);
    list.appendChild(card);
  });
  container.appendChild(list);
}

// ── IMAGE UPLOAD & GENERATION ─────────────────────────────
function applyImage(type, idx, dataUrl) {
  const arr = getArr(type);
  arr[idx].imgUrl = dataUrl;
  const imgDiv = document.getElementById('img-'+type+'-'+idx);
  if (imgDiv) imgDiv.innerHTML = '<img src="'+dataUrl+'" class="img-preview" data-action="upload" data-type="'+type+'" data-idx="'+idx+'" title="Click to replace">';
  const dot = document.getElementById('dot-'+type+'-'+idx); if(dot) dot.className = 's-dot dot-r';
  const stxt = document.getElementById('stxt-'+type+'-'+idx); if(stxt) stxt.textContent = 'Image ready';
  savePosts(); updateStats(); renderSchedule();
  toast('Image set for #'+(idx+1));
}

async function genImage(type, idx) {
  const arr = getArr(type);
  const promptField = type==='img' ? 'imagePrompt' : type==='banner' ? 'bannerPrompt' : 'imagePrompt';
  const prompt = arr[idx][promptField];
  const imgDiv = document.getElementById('img-'+type+'-'+idx);
  const dot = document.getElementById('dot-'+type+'-'+idx);
  const stxt = document.getElementById('stxt-'+type+'-'+idx);
  if(dot) dot.className = 's-dot dot-p';
  if(stxt) stxt.textContent = 'Generating...';
  if(imgDiv) imgDiv.innerHTML = '<div class="img-gen"><div class="spinner"></div><span>Generating...</span></div>';
  try {
    const res = await fetch('/mj/api/image', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({prompt, geminiKey: S.geminiKey})
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    applyImage(type, idx, data.dataUrl);
  } catch(e) {
    if(imgDiv) imgDiv.innerHTML = '<div class="drop-zone" data-drop-type="'+type+'" data-drop-idx="'+idx+'"><span style="font-size:18px">&#9888;</span><span>Error - upload manually</span></div>';
    if(dot) dot.className = 's-dot';
    if(stxt) stxt.textContent = 'Error: '+e.message.substring(0,60);
    toast('Error: '+e.message, true);
  }
}

// ── CLEAR CONTENT ─────────────────────────────────────────
function clearContent(type) {
  if (type==='images') {
    S.imagePosts = []; localStorage.removeItem('mj_imagePosts');
    document.getElementById('images-container').innerHTML = '<div class="empty"><span class="empty-icon">&#127911;</span><h3>No Image Posts Yet</h3><p>Click Generate.</p></div>';
  } else if (type==='banners') {
    S.banners = []; localStorage.removeItem('mj_banners');
    document.getElementById('banners-container').innerHTML = '<div class="empty"><span class="empty-icon">&#127775;</span><h3>No Banners Yet</h3><p>Click Generate.</p></div>';
  } else if (type==='shorts') {
    S.shortVideos = []; localStorage.removeItem('mj_shortVideos');
    document.getElementById('shorts-container').innerHTML = '<div class="empty"><span class="empty-icon">&#127910;</span><h3>No Short Scripts Yet</h3><p>Click Generate.</p></div>';
  } else {
    S.longVideos = []; localStorage.removeItem('mj_longVideos');
    document.getElementById('longs-container').innerHTML = '<div class="empty"><span class="empty-icon">&#127909;</span><h3>No Long Scripts Yet</h3><p>Click Generate.</p></div>';
  }
  updateStats();
}

// ── SCHEDULE VIEW ─────────────────────────────────────────
function renderSchedule() {
  const all = [
    ...S.imagePosts.map((p,i) => ({...p, dType:'Image', tKey:'img', cap:p.caption})),
    ...S.banners.map((b,i) => ({...b, dType:'Banner', tKey:'banner', cap:b.caption})),
    ...S.shortVideos.map((v,i) => ({...v, dType:'Short', tKey:'short', cap:v.captionAndHashtags})),
    ...S.longVideos.map((v,i) => ({...v, dType:'Long', tKey:'long', cap:v.captionAndHashtags}))
  ];
  if (!all.length) return;
  const start = parseTime(document.getElementById('start-time').value);
  const intv = parseInt(document.getElementById('interval').value) || 45;
  const rows = all.map((item, i) => {
    const t = fmtTime(addMins(start, i*intv));
    const pill = item.scheduled ? '<span class="pill pill-s">Scheduled</span>' : item.imgUrl ? '<span class="pill pill-r">Ready</span>' : '<span class="pill pill-p">Pending</span>';
    const tLabel = item.dType==='Image' ? '<span class="card-type type-image">IMG</span>'
      : item.dType==='Banner' ? '<span class="card-type type-banner">BNR</span>'
      : item.dType==='Short' ? '<span class="card-type type-short">SHORT</span>'
      : '<span class="card-type type-long">LONG</span>';
    return '<div class="sched-row"><span class="s-num">'+(i+1)+'</span>'+tLabel+'<span style="font-size:11px">'+esc((item.cap||'').substring(0,45))+'...</span><span style="font-size:11px;color:var(--muted)">'+t+'</span>'+pill+'</div>';
  }).join('');
  document.getElementById('sched-container').innerHTML = '<div class="sched-table"><div class="sched-head"><span>#</span><span>Type</span><span>Caption</span><span>Time</span><span>Status</span></div>'+rows+'</div>';
}


// ── MOBILE MENU ───────────────────────────────────────────
document.getElementById('mobile-menu-btn').addEventListener('click', () => {
  const sidebar = document.querySelector('.sidebar');
  const btn = document.getElementById('mobile-menu-btn');
  sidebar.classList.toggle('open');
  btn.classList.toggle('on');
});
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

// ── LOAD SAVED POSTS ON INIT ──────────────────────────────
loadPosts();
if (S.imagePosts.length) { renderImagePosts(); updateStats(); renderSchedule(); }
if (S.banners.length) { renderBanners(); updateStats(); renderSchedule(); }
if (S.shortVideos.length) renderVideos('short');
if (S.longVideos.length) renderVideos('long');
updateStats();
</script>

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
</body>
</html>
'''
