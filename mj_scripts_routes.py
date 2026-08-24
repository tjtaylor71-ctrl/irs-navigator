import os, json, requests
from flask import Blueprint, request, jsonify, Response

mj_scripts_bp = Blueprint('mj_scripts', __name__, url_prefix='/mj-scripts')

ANTHROPIC_KEY = os.environ.get('ANTHROPIC_API_KEY', '')


@mj_scripts_bp.route('/', methods=['GET'])
def studio():
    return Response(PAGE_HTML, mimetype='text/html; charset=utf-8')


@mj_scripts_bp.route('/api/generate', methods=['POST'])
def generate():
    data = request.get_json(force=True, silent=True) or {}
    topic = (data.get('topic') or '').strip()
    duration = data.get('duration', 'short')  # 'short' = 30s, 'long' = 60s

    if not topic:
        return jsonify({'ok': False, 'error': 'Please enter a topic.'}), 400
    if not ANTHROPIC_KEY:
        return jsonify({'ok': False, 'error': 'ANTHROPIC_API_KEY not configured on server.'}), 500

    if duration == 'long':
        image_count = 10
        word_count = "150-170 words"
        duration_label = "60-second"
    else:
        image_count = 5
        word_count = "75-90 words"
        duration_label = "30-second"

    system_prompt = (
        'You are the creative director for a Michael Jackson tribute page producing short-form video content. '
        'You write narration scripts for ElevenLabs voiceover and sequential image prompts for AI image generation (OpenArt/Seedance/Kling). '
        'CONTENT RULES: '
        '1. Only reference documented facts from named interviews, publications, album credits, or verified sources. '
        '2. Never invent dialogue, quotes, or private moments. '
        '3. Never frame anything as mystery, lost, vault, or unreleased unless independently verifiable. '
        'IMAGE PROMPT RULES: '
        'All images are 9:16 vertical format. Each image is a distinct scene forming a visual story. '
        'Describe subject, setting, lighting, and camera framing as separate elements. '
        'Never mix camera movement and subject movement in one sentence. Never use the word "fast". '
        'Include era-accurate MJ physical descriptors in every image prompt. '
        'MJ HAIR BY ERA: Jackson 5/early 70s = large Afro; Off The Wall 1979 = medium Afro; '
        'Thriller era 1982-84 = shoulder-length loosely curled black hair; '
        'Bad era 1987-89 = shoulder-length black curly hair with curls framing face; '
        'Dangerous and HIStory 1991-97 = long black curly hair past shoulders; '
        'Invincible and This Is It 2001-09 = medium-length black curly hair. '
        'NEVER short cropped hair. Always state the real Michael Jackson. '
        'Respond ONLY with valid JSON. No markdown. No code fences. No preamble.'
    )

    user_prompt = f"""Generate one Michael Jackson {duration_label} video production package about this topic:

TOPIC: {topic}

Package must contain:

1. VOICEOVER SCRIPT ({word_count} — reads naturally in {duration_label} at ElevenLabs pace)
- Written purely for spoken audio — no emojis, no hashtags, no social media language
- Short punchy lines with line breaks showing natural breath pauses
- First line is a powerful hook designed to stop the scroll
- Only documented verifiable facts — no invented details
- Ends with: Follow for more stories like this

2. {image_count} IMAGE PROMPTS (each animates to approximately 6 seconds in Seedance or Kling)
- 9:16 vertical format for all images
- Sequential scenes that tell the visual story of the voiceover
- Vary framing across all images: close-up, medium shot, wide shot, detail shot, portrait
- Each prompt format: [subject and appearance] + [setting] + [lighting] + [camera framing]
- Rotate scene types: do not use recording studio for more than 2 images
- Include era-accurate MJ hair and appearance in every prompt

3. SOURCE (name the actual documented source for this story)

JSON format:
{{"voiceoverScript":"...","images":[{{"num":1,"prompt":"..."}},...total {image_count} entries...],"source":"..."}}"""

    try:
        resp = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers={
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_KEY,
                'anthropic-version': '2023-06-01',
            },
            json={
                'model': 'claude-sonnet-4-6',
                'max_tokens': 8000,
                'system': system_prompt,
                'messages': [{'role': 'user', 'content': user_prompt}],
            },
            timeout=120,
        )
        result = resp.json()
        if 'error' in result:
            return jsonify({'ok': False, 'error': result['error'].get('message', 'API error')}), 500
        if 'content' not in result:
            return jsonify({'ok': False, 'error': 'Unexpected API response.'}), 500

        raw = result['content'][0]['text'].strip()
        raw = raw.replace('```json', '').replace('```', '').strip()
        data_out = json.loads(raw)
        data_out['ok'] = True
        return jsonify(data_out)
    except json.JSONDecodeError as e:
        return jsonify({'ok': False, 'error': f'Could not parse response: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


PAGE_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MJ Script Generator</title>
<style>
  :root{--gold:#C9A84C;--gold-light:#E8C97A;--black:#0D0D0D;--dark:#181818;--dark2:#222;--text:#F0EAD6;--muted:#7A7060;}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--black);color:var(--text);min-height:100vh;padding:20px;}
  .wrap{max-width:640px;margin:0 auto;}
  h1{font-size:22px;color:var(--gold);margin-bottom:6px;}
  .sub{font-size:13px;color:var(--muted);margin-bottom:24px;}
  .box{background:var(--dark);border:1px solid #333;border-radius:12px;padding:20px;margin-bottom:16px;}
  label{display:block;font-size:12px;font-weight:600;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em;}
  input[type=text]{width:100%;background:var(--dark2);border:1px solid #333;border-radius:8px;padding:12px;color:var(--text);font-size:15px;margin-bottom:16px;}
  input[type=text]:focus{outline:none;border-color:var(--gold);}
  .radio-row{display:flex;gap:10px;margin-bottom:20px;}
  .radio-opt{flex:1;background:var(--dark2);border:1px solid #333;border-radius:8px;padding:12px;text-align:center;cursor:pointer;font-size:14px;transition:.15s;}
  .radio-opt.active{border-color:var(--gold);background:rgba(201,168,76,.1);color:var(--gold);}
  button{width:100%;background:linear-gradient(135deg,#9A7A35,var(--gold-light));color:#000;border:none;border-radius:8px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;}
  button:disabled{opacity:.5;cursor:not-allowed;}
  .result{display:none;}
  .result.show{display:block;}
  .section-title{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--gold);margin:20px 0 8px;}
  .script-text{white-space:pre-wrap;font-size:14px;line-height:1.7;background:var(--dark2);border-radius:8px;padding:14px;}
  .img-prompt{background:var(--dark2);border-radius:8px;padding:12px;margin-bottom:8px;font-size:13px;line-height:1.5;}
  .img-num{color:var(--gold);font-weight:700;font-size:11px;margin-bottom:4px;}
  .source{font-size:12px;color:var(--muted);background:rgba(201,168,76,.06);border-left:2px solid var(--gold);padding:8px 12px;border-radius:0 6px 6px 0;margin-top:16px;}
  .copy-btn{background:var(--dark2);border:1px solid #333;color:var(--muted);padding:8px 16px;border-radius:6px;font-size:12px;cursor:pointer;margin-top:16px;width:auto;}
  .error{color:#D48A8A;font-size:13px;padding:12px;background:rgba(170,61,61,.1);border-radius:8px;margin-top:12px;}
  .loading{text-align:center;color:var(--muted);font-size:13px;padding:20px;}
</style>
</head>
<body>
<div class="wrap">
  <h1>MJ Script Generator</h1>
  <div class="sub">Enter a topic — get a narration script + image prompts.</div>

  <div class="box">
    <label>Topic</label>
    <input type="text" id="topic" placeholder="e.g. The making of Billie Jean...">

    <label>Length</label>
    <div class="radio-row">
      <div class="radio-opt active" data-dur="short">30 sec (5 images)</div>
      <div class="radio-opt" data-dur="long">60 sec (10 images)</div>
    </div>

    <button id="gen-btn">Generate Script</button>
    <div id="error-box"></div>
    <div id="loading-box"></div>
  </div>

  <div class="box result" id="result-box">
    <div class="section-title">Voiceover Script</div>
    <div class="script-text" id="script-out"></div>

    <div class="section-title">Image Prompts</div>
    <div id="images-out"></div>

    <div class="source" id="source-out" style="display:none;"></div>

    <button class="copy-btn" id="copy-btn">Copy Everything</button>
  </div>
</div>

<script>
var duration = 'short';
document.querySelectorAll('.radio-opt').forEach(function(el) {
  el.addEventListener('click', function() {
    document.querySelectorAll('.radio-opt').forEach(function(e) { e.classList.remove('active'); });
    el.classList.add('active');
    duration = el.getAttribute('data-dur');
  });
});

var lastResult = null;

document.getElementById('gen-btn').addEventListener('click', function() {
  var topic = document.getElementById('topic').value.trim();
  var errBox = document.getElementById('error-box');
  var loadBox = document.getElementById('loading-box');
  var btn = document.getElementById('gen-btn');
  errBox.innerHTML = '';
  if (!topic) {
    errBox.innerHTML = '<div class="error">Please enter a topic.</div>';
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Generating...';
  loadBox.innerHTML = '<div class="loading">Writing script and image prompts (10-30 seconds)...</div>';
  document.getElementById('result-box').classList.remove('show');

  fetch('/mj-scripts/api/generate', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({topic: topic, duration: duration})
  }).then(function(r) { return r.json(); }).then(function(data) {
    loadBox.innerHTML = '';
    btn.disabled = false;
    btn.textContent = 'Generate Script';
    if (!data.ok) {
      errBox.innerHTML = '<div class="error">Error: ' + esc(data.error) + '</div>';
      return;
    }
    lastResult = data;
    document.getElementById('script-out').textContent = data.voiceoverScript || '';
    var imgHtml = '';
    (data.images || []).forEach(function(img) {
      imgHtml += '<div class="img-prompt"><div class="img-num">IMAGE ' + img.num + '</div>' + esc(img.prompt) + '</div>';
    });
    document.getElementById('images-out').innerHTML = imgHtml;
    var srcBox = document.getElementById('source-out');
    if (data.source) {
      srcBox.style.display = 'block';
      srcBox.textContent = 'Source: ' + data.source;
    } else {
      srcBox.style.display = 'none';
    }
    document.getElementById('result-box').classList.add('show');
  }).catch(function(e) {
    loadBox.innerHTML = '';
    btn.disabled = false;
    btn.textContent = 'Generate Script';
    errBox.innerHTML = '<div class="error">Error: ' + esc(e.message) + '</div>';
  });
});

document.getElementById('copy-btn').addEventListener('click', function() {
  if (!lastResult) return;
  var text = 'VOICEOVER SCRIPT:\\n' + (lastResult.voiceoverScript || '') + '\\n\\nIMAGE PROMPTS:\\n';
  (lastResult.images || []).forEach(function(img) {
    text += '\\nImage ' + img.num + ': ' + img.prompt;
  });
  if (lastResult.source) text += '\\n\\nSource: ' + lastResult.source;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function() {
      var btn = document.getElementById('copy-btn');
      var orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(function() { btn.textContent = orig; }, 1500);
    });
  }
});

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
</script>
</body>
</html>"""
