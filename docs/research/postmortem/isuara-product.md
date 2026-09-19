# iSuara Product

iSuara is real and well documented. Public sources place it at KitaHack 2026,
around April; a teammate who attended MUBA demo day in September reports the
same project there, extended. The most likely reading is that the team reused
and built on their KitaHack entry, and that the public repository reflects the
April state rather than what was demonstrated at MUBA.

Rows below are marked by **source type**, because the two disagree and the
disagreement is informative rather than a problem to resolve away.

## What Was Verified

| Claim                                                                                                | Status    | Source                                                                                                   |
| ---------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------- |
| Project is called iSuara                                                                             | confirmed | https://github.com/HongZhangLim/iSuara                                                                   |
| Placed second at the MUBA Blockchain Hackathon 2026 (around 5-6 Sep 2026)                            | firsthand | teammate present at MUBA demo day; absent from public sources                                            |
| Mobile app targeting low-specification phones                                                        | confirmed | https://www.linkedin.com/posts/hongzhanglim_kitahack2026-litert-edgeai-activity-7448975123866476544-CF3G |
| Serves deaf and mute users; hand signs to readable text                                              | confirmed | https://github.com/HongZhangLim/iSuara                                                                   |
| Bidirectional pipeline: sign to voice/text and back to sign                                          | firsthand | teammate present at MUBA demo day; repo shows one direction                                              |
| Used Three.js, possibly for a signing avatar                                                         | firsthand | teammate present at MUBA demo day; absent from the public repo                                           |
| Team brought a full monitor to the physical demo                                                     | firsthand | teammate present at MUBA demo day                                                                        |
| Verified placement: 1st Runner-Up at KitaHack 2026 (~April 2026, 600+ teams / 400+ submissions)      | confirmed | https://github.com/HongZhangLim                                                                          |
| Team name "sudo rm -rf /"; four Universiti Malaya students                                           | confirmed | https://github.com/HongZhangLim/iSuara                                                                   |
| Documented stack is Kotlin, MediaPipe, LiteRT BiLSTM, Gemini, Android TTS (no JavaScript 3D library) | confirmed | https://github.com/HongZhangLim/iSuara                                                                   |
| Public artifacts exist: GitHub repo, downloadable APK, YouTube demo video                            | confirmed | https://youtu.be/XzWBIrOVtfw                                                                             |
| MUBA Blockchain Hackathon 2026 ran Aug 26 - Sep 6 2026, physical finale at APU                       | confirmed | https://muba-hackathon.devfolio.co/overview                                                              |

Reconciling the two sources. The public repository documents a
one-directional Kotlin and MediaPipe pipeline and a KitaHack 2026 placement
around April. A teammate who attended MUBA demo day in September saw the same
project with a signing avatar, a reverse direction and a monitor the team
brought themselves. MUBA's Devfolio publishes zero projects, so the absence of
a MUBA record there is not evidence against the account.

The reading that fits both: the team carried their KitaHack entry into MUBA
and extended it in between, and the public repository was never updated to
match. That is ordinary hackathon behaviour, and it makes the case stronger
rather than weaker — see the note below on what they chose to add.

## The Product

iSuara is a native Android app that translates Bahasa Isyarat Malaysia
(BIM) into spoken Malay in real time. A deaf user signs to the phone's
camera; the app tracks skeletal keypoints with MediaPipe, classifies one
of 98 BIM signs with an on-device BiLSTM, restructures the glosses into
grammatical Malay via the Gemini API, then displays the sentence and
speaks it with Android text-to-speech.
(https://github.com/HongZhangLim/iSuara)

It is engineered for cheap hardware: the visual pipeline runs fully
offline on the edge, claims 45+ FPS on an eight-year-old phone, and only
the sub-1KB text restructuring step touches the cloud. An installable APK
is linked from the repository.
(https://www.linkedin.com/posts/hongzhanglim_kitahack2026-litert-edgeai-activity-7448975123866476544-CF3G)

The stated problem is interpreter scarcity: the repository cites 44,000
deaf Malaysians versus 60 certified interpreters at up to RM150/hour with
multi-day waits. The team is four Universiti Malaya students competing as
"sudo rm -rf /".
(https://github.com/HongZhangLim/iSuara)

## Why It Would Land With Judges

The following is inference from the verified facts above, not sourced
reporting.

The beneficiary is unusually easy to picture. "A deaf person alone at a
clinic" is a scene any judge can render in their head, and the team's own
numbers (44,000 deaf Malaysians, 60 interpreters, RM150/hour, 3-day wait)
give the scene scale and stakes. A judge does not need domain knowledge to
feel the problem.

The demo is self-evident rather than narrated. A person signs at a camera
and the phone speaks a Malay sentence aloud; the judge sees and hears it
work and believes it instantly, with no explanation of the BiLSTM or
landmark pipeline required. The "8-year-old smartphone" claim doubles as
a demo hook — it can be shown, not just asserted.

Bringing their own display removes the two most common demo failure
modes — a huddle squinting at a small screen, and venue hardware that
will not cooperate. It signals rehearsal and lets every judge see the
output at once, which compounds the self-evident quality above.

**What they added between the two events is the most instructive fact
here.** The hard machine learning — the on-device BiLSTM, the MediaPipe
pipeline, 45 FPS on old hardware — already existed in April. What
appeared by September was a signing avatar and a monitor. Both are demo
surface, not product capability.

Given a second hackathon and an existing working system, this team spent
the increment on making the work _perceptible_ rather than on making it
more capable. That is the same choice OpenVerdict made with its replay
control and its courtroom ring, and the opposite of the choice Cekgu
made with its queue worker and receipt polling.

Accessibility products perform well in social-impact tracks because they
score on every rubric axis at once: the beneficiary is sympathetic and
specific, the impact story needs no business model, the live demo is
visceral, and the technical constraint (offline, low-spec) is legible as
engineering rigor rather than feature-cutting. iSuara additionally framed
itself in SDG language, which is the scoring vocabulary of that event.

## The Transferable Recipe

1. **Anchor the product to one countable, picturable beneficiary.** "Deaf
   Malaysians vs 60 interpreters" works because it is a person plus a ratio.
   For a document-verification tool, the equivalent is a named role — the
   customs clerk, the claims adjuster — plus the volume or cost they face.

2. **Make the live demo self-evident.** Sign in, speech out: the output is
   perceivable without narration. The analogue is a real document photo in,
   a visible verdict out — no judge should need the architecture explained
   to believe the product works.

3. **Engineer for the constraint the beneficiary actually lives under.**
   iSuara's credibility came from running offline on an 8-year-old phone,
   not from accuracy alone. Documents get verified in warehouses, ports, and
   field offices — bad connectivity and cheap devices are the real spec.

4. **Show a working artifact, not slideware.** A public repo, an
   installable APK, and a demo video let judges check claims themselves.
   Ship something installable or clickable in the first minute of the pitch.

5. **Attach checkable numbers to the pipeline.** 94.93% accuracy, 22ms
   inference, 45 FPS — each is a claim a judge can weigh. "Flags 9 of 10
   altered fields in under 2 seconds" beats "fast and accurate."

6. **Frame impact in the event's own scoring language.** iSuara mapped
   itself to named SDG targets because that is what the judges scored.
   Read the rubric, find its vocabulary, and describe the product in it.

7. **Draw the honest architecture line.** iSuara stated plainly what runs
   on-device and what hits the cloud, which reads as rigor. Saying "OCR
   locally, cross-check via API" preempts the privacy/offline question a
   judge would otherwise ask.
