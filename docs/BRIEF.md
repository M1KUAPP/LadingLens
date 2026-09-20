# Hackathon Brief

Onboarding notes for the Averis x Monash Hackathon 2026, for teammates who
missed the virtual opening ceremony. Everything below comes from the official
material in `sources/`; where the ceremony and the documents disagree, the
documents are right.

Contents:

1.  [At a Glance](#at-a-glance)
1.  [Key Dates](#key-dates)
1.  [The Challenge](#the-challenge)
1.  [The Dataset](#the-dataset)
1.  [Rules That Matter](#rules-that-matter)
1.  [Judging](#judging)
1.  [What to Submit](#what-to-submit)
1.  [Q&A Highlights](#qa-highlights)
1.  [Who's Who](#whos-who)
1.  [Sources](#sources)

## At a Glance

| Item          | Detail                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------- |
| Event         | Averis x Monash Hackathon 2026 — shipping document verification                             |
| Organisers    | Monash University Malaysia student clubs (MUMTEC, GDG on Campus); industry partner Averis   |
| Format        | Virtual build period and workshops; in-person final pitch day at Monash University Malaysia |
| Prize pool    | RM 9,000 — 1st RM 5,000, 2nd RM 3,000, 3rd RM 1,000                                         |
| Team size     | 2–5 members                                                                                 |
| Key deadline  | Preliminary submission: 22 September 2026, 12:00 PM MYT, via Google Form                    |
| Where to talk | [Discord](https://discord.gg/cbFDNWwj5) — the event's main channel                          |
| Our data      | `data/sdoc-hackathon-bundle/` — the participant dataset, already unzipped in our repo       |

## Key Dates

| Date and time (MYT)   | What happens                                                   | Mode      |
| --------------------- | -------------------------------------------------------------- | --------- |
| 18 Sep, 6:00 PM       | Opening ceremony; submission window opens                      | Virtual   |
| 20 Sep, 12:00–1:00 PM | Workshop 1 — Shariq Nauman and Darren Melvern                  | Virtual   |
| 21 Sep, 7:00–8:00 PM  | Workshop 2 — hosted by Averis                                  | Virtual   |
| 22 Sep, 12:00 PM      | Preliminary submission deadline (Google Form)                  | Online    |
| 23 Sep, 12:00 PM      | Finalist shortlisting                                          | —         |
| 24 Sep                | Top 10 finalists announced; mentors assigned                   | —         |
| 26 Sep                | Final pitch day: 10-min pitch + 5-min Q&A, then award ceremony | In person |

## The Challenge

### What Averis Does Today

Averis's shipping operations team gets every kind of message in one inbox —
up to 2,000 emails a day. For document-checking requests, staff compare a
Shipping Instruction (SI), the reference for the intended shipment details,
against a draft Bill of Lading (BL), catching errors before the draft is
finalised.

Why it hurts:

- Finding the right emails takes time; an overlooked document request never
  gets checked.
- Manually comparing names, ports, quantities, and weights across two
  documents is repetitive and easy to get wrong.
- The two documents label the same field differently (`Port of Loading` vs
  `Load Port`), so a text match does not work.

### What the System Must Do

1.  **Classify** each email into one of five categories.
1.  **Extract**: for document-comparison emails, read the SI and BL
    attachments and pull out the shipment fields.
1.  **Compare** the values with the SI as reference; report the fields that
    differ side by side (e.g. SI: 3 / BL: 4), or "No mismatch detected."
1.  **Escalate**: when it cannot decide — unreadable, missing, or wrong
    document — flag the case for human review rather than guessing.

### The Five Email Categories

Only `BL_COMPARISON` emails continue to the checking step; the rest just
need the right label.

| Code            | Meaning                                       |
| --------------- | --------------------------------------------- |
| `BL_COMPARISON` | Request to check a draft BL against an SI     |
| `SI_REQUEST`    | Request to prepare a new shipping instruction |
| `INVOICE_QUERY` | Question about an invoice                     |
| `GENERAL`       | Other operational message or update           |
| `SPAM`          | Spam                                          |

### The Seven Compared Fields

The SI and BL use different labels for the same field; the extractor must
align by meaning. Full synonym list in
[docker-server.md](sources/google-drive/docker-server.md).

| Field key           | What it is                | Example label variants                                         |
| ------------------- | ------------------------- | -------------------------------------------------------------- |
| `shipper`           | Party sending the goods   | `Shipper`, `Shipper/Exporter`, `SHIPPER`                       |
| `consignee`         | Party goods go to         | `Consignee`, `Consignee (Non-Negotiable)`, `To the Order of`   |
| `notify_party`      | Party to notify           | `Notify Party`, `Notify`, `NOTIFY PARTY`                       |
| `port_of_loading`   | Where the shipment starts | `Port of Loading (POL)`, `Load Port`, `POL`                    |
| `port_of_discharge` | Where the shipment ends   | `Port of Discharge (POD)`, `Discharge Port`, `POD`             |
| `container_count`   | Containers on the BL      | `No. of Containers`, `Total Containers`, `Container Count`     |
| `gross_weight_kg`   | Gross weight in kg        | `Gross Weight (KG)`, `Gross Wt (kgs)`, `Gross Weight毛重(KGS)` |

## The Dataset

### What Is in the Bundle

The participant bundle lives in our repo at `data/sdoc-hackathon-bundle/`
(same content as `sdoc-hackathon-bundle.zip` on the organisers' Drive).

| Item                     | Detail                                                          |
| ------------------------ | --------------------------------------------------------------- |
| `inbox/`                 | 520 JSON email records, `email_001`–`email_520`                 |
| `attachments/`           | 250 files: 192 `.txt`, 28 `.pdf`, 22 `.xlsx`, 8 `.docx`         |
| `sample_submission.json` | Output template: all 520 ids with placeholder values            |
| `loader.py`              | Stdlib-only `Inbox` helper (local folder or HTTP server)        |
| `README.md`              | Participant guide: task, quick start, submission shape, scoring |

- Attachment names are `email_<NNN>_<SIDE>.<ext>`; `<SIDE>` is `SI` (the
  reference document) or `BL` (the draft being checked).
- 126 of the 520 emails carry attachments; 124 have both an SI and a BL,
  and `email_507` and `email_509` have an SI only.
- Email bodies are all English. Chinese labels appear alongside English in
  attachments: all 8 `.docx` BLs and 51 `.txt` files (e.g.
  `Consignee (收货人)`).
- There is no answer key anywhere in the bundle.

### Loading the Data

`loader.py` gives the same API over the extracted folder or the organisers'
Docker server (port 8080; not kept in our repo):

```python
from loader import Inbox

inbox = Inbox("data/sdoc-hackathon-bundle")   # or "http://localhost:8080"
for email in inbox:
    text = inbox.read_text(email["attachments"][0])
```

### The Submission Shape

One JSON object keyed by `email_id`, with an entry for every email. Each
entry has exactly five keys:

```json
{
  "email_004": {
    "category": "BL_COMPARISON",
    "status": "MISMATCH",
    "review_reason": null,
    "has_defect": true,
    "defect_fields": ["consignee"]
  }
}
```

`status` is `OK`, `MISMATCH`, or `NEEDS_REVIEW`. `review_reason` is one of
`wrong_doc_type`, `missing_attachment`, `unreadable`, `missing_value`.

### The Self-Evaluation Scorer

The organisers' Docker server scores a submission against a private
reference set: `POST /submit`, or `inbox.submit(submission)` via the loader.
It returns a scoreboard without revealing the answers. The kit is not in our
repo; see [docker-server.md](sources/google-drive/docker-server.md).

- Formula: `final = 50% end-to-end + 30% classification macro-F1 + 20%
defect-F1`.
- End-to-end means a defect email only counts if it was routed to
  `BL_COMPARISON` _and_ flagged with the exact defect fields.
- `NEEDS_REVIEW` handling is reported as a separate reliability axis.
- This scoreboard is a development aid, not the judging score; submit as
  often as needed while building.

## Rules That Matter

| Rule             | What it means for us                                                                                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI is mandatory  | AI must be a key component of the submitted solution                                                                                                                  |
| Cloud is scored  | Must meaningfully use cloud infrastructure (build, deploy, or core); weak use can significantly reduce the score. Free tiers and Docker/Docker Compose are acceptable |
| Prelim bar       | Low-code minimum; a semi-working prototype is strongly encouraged; no-code is rejected                                                                                |
| Finals bar       | A working prototype that extends and improves the prelim entry                                                                                                        |
| Timing           | All work must be done during the official hackathon duration                                                                                                          |
| Originality      | Original work only; referencing existing solutions is fine, plagiarism is not                                                                                         |
| Video length     | Max 5 minutes, unlisted or public; 1 mark deducted per 30 seconds over                                                                                                |
| Live demo        | The prototype link must stay publicly accessible and functional through judging                                                                                       |
| Final attendance | Every team member must be physically present to pitch on 26 Sep                                                                                                       |

Full text in
[rules-and-regulations.md](sources/google-docs/rules-and-regulations.md).

## Judging

Both rounds score out of 100 across seven criteria; only the criteria
change.

| Points | Preliminary criterion              | Finals criterion                    |
| ------ | ---------------------------------- | ----------------------------------- |
| 25     | Working Core Prototype             | End-to-End Functionality            |
| 15     | System Design & Architecture       | Architecture & Scalability          |
| 15     | Technology Integration             | Technology Integration              |
| 15     | Technical Feasibility & Validation | Engineering Quality & Robustness    |
| 10     | Problem Statement Understanding    | Solution Effectiveness & User Value |
| 10     | Innovation & Solution Approach     | User Experience & Differentiation   |
| 10     | Practical Value & Potential        | Impact & Future Potential           |

- The 25-point item is the biggest single chunk in both rounds — a working
  build counts for more than anything else on the sheet.
- The finals rubric shifts from "does it run" to "does it hold up":
  end-to-end functionality, engineering quality, and user experience.
- Technology Integration is 15 points both rounds and is where the AI and
  cloud requirements show up in scoring.

Source: [judging-criteria.md](sources/google-docs/judging-criteria.md).

## What to Submit

All components are mandatory and go through the
[Google Form](https://forms.gle/nnam5eXrf5cjXdf3), open 18–22 Sep, 12:00 PM
MYT. The form accepts updates right up to the deadline.

| Component                  | Requirement                                                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Project description        | Name, purpose, and the problem addressed                                                                                      |
| Demo video                 | Max 5 min; YouTube unlisted/public or Drive "anyone with the link"; covers team intro, problem, tech stack, live demo, impact |
| GitHub repository          | Source code with a clear README including setup instructions                                                                  |
| Live prototype / demo link | Publicly accessible and functional during the judging period                                                                  |
| Slide deck / documentation | Technical architecture, implementation details, challenges, future roadmap; no page limit                                     |

## Q&A Highlights

Answers given by Sergio (Averis) during the ceremony, with the documents'
corrections folded in. Full Q&A in
[opening-ceremony.md](sources/youtube/opening-ceremony.md).

| Question                                       | Answer                                                                                                                |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Limits on AI use?                              | None — for brainstorming, building, and inside the solution; it just has to solve the problem                         |
| Budget for cloud services?                     | Don't think about budget; any free solution works, including Docker/Docker Compose                                    |
| API key for the Docker server?                 | None needed; participant endpoints have no authentication                                                             |
| Are HS codes involved?                         | They appear in the data but are not scored and are not one of the 7 compared fields                                   |
| Non-English emails?                            | All 520 email bodies are English; Chinese labels appear only inside attachments                                       |
| Can the dataset go in our public GitHub repo?  | Yes — the data is synthetic, not real production data                                                                 |
| Train our own ML or use external APIs?         | No expectation either way; whichever you pick, showcase it in the prototype or slides                                 |
| How important is UI/UX?                        | Any style is fine if it classifies and compares clearly and asks the user when unsure; be ready to justify the choice |
| How do judges run the demo when data is local? | Connect with Docker Compose or embed the data directly — whichever is easier                                          |
| Ground truth for testing?                      | Not given to participants; `POST /submit` scores against a private reference set                                      |

## Who's Who

- **Emcees**: Yan Bin and Hugh.
- **Ms Chin** — Averis, head of HR (full title unconfirmed in the
  documents); delivered the opening keynote.
- **Sergio** — Averis software engineer, likely Sergio Utama; presented the
  problem statement and answered the technical Q&A.
- **Workshop 1 hosts** — Shariq Nauman and Darren Melvern. **Workshop 2** —
  hosted by Averis (speakers unnamed).
- **Organising directors** — Ang Ling and Ming Dong Teh; general inbox
  mum-sit-averis-hackathon@monash.edu.

## Sources

| File                                                                     | What it covers                                                       |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| [home.md](sources/website/home.md)                                       | Event overview, timeline, prizes, FAQ, contacts                      |
| [timeline.md](sources/website/timeline.md)                               | Official event dates                                                 |
| [participant-handbook.md](sources/google-docs/participant-handbook.md)   | Key dates, workshop times and hosts, prizes and awards               |
| [rules-and-regulations.md](sources/google-docs/rules-and-regulations.md) | Eligibility, rules, submission components, Google Form               |
| [judging-criteria.md](sources/google-docs/judging-criteria.md)           | Preliminary and final round rubrics                                  |
| [problem-statement.md](sources/google-drive/problem-statement.md)        | The challenge, required workflow, advanced stage, self-evaluation    |
| [dataset-bundle.md](sources/google-drive/dataset-bundle.md)              | Bundle contents, loader API, submission schema, attachment inventory |
| [docker-server.md](sources/google-drive/docker-server.md)                | HTTP server endpoints, scoring formula, field-label synonyms         |
| [drive-folder.md](sources/google-drive/drive-folder.md)                  | The organisers' Drive folder and its files                           |
| [opening-ceremony.md](sources/youtube/opening-ceremony.md)               | Ceremony transcript, Q&A, and discrepancy notes                      |
