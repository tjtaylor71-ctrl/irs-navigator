# IRS Navigator — Setup & Deployment Guide

Taxpayer self-help tool built for Taylor Tax and Financial Consulting.  
Covers: financial intake → IRS analysis → auto-filled Forms 433-F, 433-A, 433-B, 433-A OIC, and Form 656.

---

## Quick Start (Local / Your Computer)

### 1. Install Python requirements

```bash
pip install flask pypdf
```

### 2. Set up the folder structure

```
irs-navigator/
├── server.py                   ← Flask server (this package)
├── fill_irs_forms.py           ← PDF fill engine
├── README.md
├── static/
│   └── irs-intake-wizard.jsx   ← React wizard
└── pdfs/
    ├── f433f.pdf               ← Download from IRS.gov
    ├── f433a__1_.pdf
    ├── f433b.pdf
    ├── f433aoi__1_.pdf
    └── f656.pdf
```

### 3. Get the IRS PDF source files

Download the current fillable PDFs directly from IRS.gov and place them in the `pdfs/` folder:

| File | IRS Form | URL |
|------|----------|-----|
| `f433f.pdf` | Form 433-F | https://www.irs.gov/pub/irs-pdf/f433f.pdf |
| `f433a__1_.pdf` | Form 433-A | https://www.irs.gov/pub/irs-pdf/f433a.pdf |
| `f433b.pdf` | Form 433-B | https://www.irs.gov/pub/irs-pdf/f433b.pdf |
| `f433aoi__1_.pdf` | Form 433-A OIC | https://www.irs.gov/pub/irs-pdf/f433aoi.pdf |
| `f656.pdf` | Form 656 | https://www.irs.gov/pub/irs-pdf/f656.pdf |

> **Note:** When the IRS updates these forms, download the new versions and replace the files.  
> The field-mapping code may need minor updates for major form revisions (rare).

### 4. Run the server

```bash
python server.py
```

You'll see a startup checklist confirming all files are present, then:

```
  ➜ Open http://localhost:5000 in your browser
```

---

## How It Works

```
Browser (React wizard)
    │
    │  User fills out 9-step intake form
    │
    ▼
/api/generate-form  (POST)
    │
    │  Flask receives intake JSON + form type
    │
    ▼
fill_irs_forms.py
    │
    │  Maps intake data → IRS PDF field names
    │  Fills the PDF using pypdf
    │
    ▼
Filled PDF streamed back to browser → auto-downloads
```

---

## Deploying to the Web

To make this available to clients online, you have several options:

### Option A: Simple VPS (Recommended for solo/small practice)

1. Rent a server from DigitalOcean, Linode, or Vultr (~$6/month)
2. Install Python + Nginx on the server
3. Use `gunicorn` as the production server:

```bash
pip install gunicorn
gunicorn -w 2 -b 0.0.0.0:5000 server:app
```

4. Point a domain name at the server IP
5. Add SSL via Let's Encrypt (free):

```bash
certbot --nginx -d yourdomain.com
```

### Option B: Railway or Render (Zero-server-management)

Both platforms deploy Flask apps from a GitHub repo with no server management.

1. Push this project to a GitHub repository
2. Connect Railway (railway.app) or Render (render.com) to the repo
3. They auto-detect Flask and deploy it
4. Add the IRS PDFs as file attachments or environment-referenced storage

### Option C: Keep it local

Run it on your own machine during client consultations. Clients sit with you, fill out the wizard, and download their forms on the spot.

---

## Important Notes

### PDF Copyright
The IRS PDFs are government documents in the public domain. You can distribute and fill them freely.

### Data Privacy
- This tool does **not** store any taxpayer data — every session is stateless
- Intake data exists only in the browser until the Download button is clicked
- The server receives the JSON, fills the PDF, and immediately discards it
- For HIPAA/data retention compliance, consider adding a server-side logging notice

### Form Updates
The IRS updates these forms periodically (usually annually). When they do:
1. Download the new PDFs from IRS.gov
2. Check if field names changed: `python3 -c "from fill_irs_forms import *; ..."` — see dev notes
3. Update the field mappings in `fill_irs_forms.py` if needed

### Professional Disclaimer
The wizard footer reads:
> "This tool is designed for self-help and informational purposes. Consulting a qualified tax professional such as an Enrolled Agent, CPA, or tax attorney may help you get the best possible outcome."

---

## File Reference

| File | Purpose |
|------|---------|
| `server.py` | Flask web server — routes, PDF generation endpoint |
| `fill_irs_forms.py` | PDF field mapping engine — all 5 forms |
| `static/irs-intake-wizard.jsx` | React 9-step intake wizard with RCP calculator |
| `pdfs/` | IRS source PDFs (you supply these) |

---

## Support

Tyrone J Taylor 
(270) 305-4438
