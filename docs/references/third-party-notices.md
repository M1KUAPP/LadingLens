# Third-party notices

LadingLens depends on third-party Python and JavaScript packages, four open
fonts, and one icon set, and its evaluation uses a hackathon-supplied
dataset. This page states each licence exactly as read from the
dependency's own package metadata or licence file — never from memory —
so judges and reviewers can check attribution and licence compliance
directly.

Contents:

1.  [Sources and verification](#sources-and-verification)
1.  [API dependencies](#api-dependencies)
1.  [PyMuPDF licensing](#pymupdf-licensing)
1.  [Web dependencies](#web-dependencies)
1.  [mp4box licence text](#mp4box-licence-text)
1.  [Fonts and icons](#fonts-and-icons)
1.  [Ported UI patterns](#ported-ui-patterns)
1.  [Synthetic dataset](#synthetic-dataset)
1.  [Repository licence](#repository-licence)

## Sources and verification

Every licence below came from the dependency's own installed metadata or
its bundled licence file, read directly rather than recalled. Python
licences were read with `importlib.metadata` against the environment that
`uv sync` installs, for example:

```shell
$ uv run python -c \
  "import importlib.metadata as m; d = m.metadata('pymupdf'); \
   print(d.get('License'), d.get_all('Classifier'))"
```

JavaScript licences were read from each installed package's own
`package.json` `license` field under `node_modules/`.

The API list below is the direct runtime dependencies declared in
[`apps/api/pyproject.toml`](/apps/api/pyproject.toml), resolved in
`apps/api/uv.lock`. The web list is the direct runtime dependencies
declared in [`apps/web/package.json`](/apps/web/package.json). Both
exclude dev and test tools (`pytest`, `ruff`, `vitest`, `playwright`, and
similar), which never ship in the product.

## API dependencies

Direct runtime dependencies declared in `[project.dependencies]` of
`apps/api/pyproject.toml`:

| Package                | Constraint       | Licence                                            |
| ---------------------- | ---------------- | -------------------------------------------------- |
| [asyncpg]              | `>=0.30`         | Apache-2.0                                         |
| [alembic]              | `>=1.13`         | MIT                                                |
| [fastapi]              | `>=0.115`        | MIT                                                |
| [google-cloud-storage] | `>=2.18`         | Apache-2.0                                         |
| [google-genai]         | `>=2.24.0`       | Apache-2.0                                         |
| [httpx]                | `>=0.28`         | BSD-3-Clause                                       |
| [pydantic-settings]    | `>=2.4`          | MIT                                                |
| [sqlalchemy]           | `[asyncio]>=2.0` | MIT                                                |
| [typesafe-sdk]         | `==0.7.0`        | MIT                                                |
| [uvicorn]              | `>=0.30`         | BSD-3-Clause                                       |
| [pymupdf]              | `>=1.26`         | [Dual: AGPL-3.0 or commercial](#pymupdf-licensing) |
| [openpyxl]             | `>=3.1`          | MIT                                                |
| [python-docx]          | `>=1.1`          | MIT                                                |
| [python-multipart]     | `>=0.0.32`       | Apache-2.0                                         |

[asyncpg]: https://pypi.org/project/asyncpg/
[alembic]: https://pypi.org/project/alembic/
[fastapi]: https://pypi.org/project/fastapi/
[google-cloud-storage]: https://pypi.org/project/google-cloud-storage/
[google-genai]: https://pypi.org/project/google-genai/
[httpx]: https://pypi.org/project/httpx/
[pydantic-settings]: https://pypi.org/project/pydantic-settings/
[sqlalchemy]: https://pypi.org/project/SQLAlchemy/
[typesafe-sdk]: https://pypi.org/project/typesafe-sdk/
[uvicorn]: https://pypi.org/project/uvicorn/
[pymupdf]: https://pypi.org/project/PyMuPDF/
[openpyxl]: https://pypi.org/project/openpyxl/
[python-docx]: https://pypi.org/project/python-docx/
[python-multipart]: https://pypi.org/project/python-multipart/

Eight of the fourteen report a machine-readable `License-Expression`
([PEP 639][pep-639]): `asyncpg`, `alembic`, `fastapi`, `google-genai`,
`pydantic-settings`, `python-multipart`, `typesafe-sdk`, and `uvicorn`. The
other six report a classic `License` field instead — `google-cloud-storage`,
`httpx`, `openpyxl`, and `python-docx` also carry a matching `License :: OSI
Approved` classifier; `sqlalchemy` and `pymupdf` do not.

[pep-639]: https://peps.python.org/pep-0639/

## PyMuPDF licensing

`pymupdf`'s installed metadata states its licence as:

> Dual Licensed - GNU AFFERO GPL 3.0 or Artifex Commercial License

The same line is repeated verbatim in the `COPYING` file Artifex bundles
inside the wheel's `.dist-info` directory. The package's own README, also
bundled in its metadata, confirms the two paths:

- **Open source** — [GNU AGPL v3][agpl-3-0]. Free for open-source projects.
- **Commercial** — a separate commercial licence, available from
  [Artifex][artifex-licensing], for proprietary applications that cannot
  accept the AGPL's terms.

**Network-use note.** AGPL-3.0 section 13 extends copyleft to network use:
anyone who offers a modified AGPL program as a network service must make
that version's corresponding source available to the users who interact
with it. The service is already public: the deploy workflow allows
unauthenticated access (`.github/workflows/deploy.yml`), and the live URL
is in [the cloud page](/docs/cloud.md). This repository is public at
https://github.com/Averis-T010NG/LadingLens. The landing navigation and footer
link to that source, and the workspace shell exposes the same `Source code`
link on `/judge` and every operator page. Users of the public network service
can therefore reach the project source and its dependency declarations
directly from the interface.

[agpl-3-0]: https://www.gnu.org/licenses/agpl-3.0.html
[artifex-licensing]: https://artifex.com/licensing

## Web dependencies

Direct runtime dependencies declared in `dependencies` of
`apps/web/package.json`:

| Package                             | Constraint | Licence                              |
| ----------------------------------- | ---------- | ------------------------------------ |
| [react]                             | `^19.2.8`  | MIT                                  |
| [react-dom]                         | `^19.2.8`  | MIT                                  |
| [react-router-dom]                  | `^7.18.4`  | MIT                                  |
| [@hugeicons/react]                  | `^1.1.10`  | MIT                                  |
| [@hugeicons/core-free-icons]        | `^4.3.4`   | MIT                                  |
| [@fontsource-variable/archivo]      | `^5.3.0`   | [OFL-1.1](#fonts-and-icons)          |
| [@fontsource-variable/martian-mono] | `^5.3.0`   | [OFL-1.1](#fonts-and-icons)          |
| [@fontsource-variable/geist]        | `^5.3.0`   | [OFL-1.1](#fonts-and-icons)          |
| [@fontsource-variable/geist-mono]   | `^5.3.0`   | [OFL-1.1](#fonts-and-icons)          |
| [mp4box]                            | `^2.4.1`   | [BSD-3-Clause](#mp4box-licence-text) |

[react]: https://www.npmjs.com/package/react
[react-dom]: https://www.npmjs.com/package/react-dom
[react-router-dom]: https://www.npmjs.com/package/react-router-dom
[@hugeicons/react]: https://www.npmjs.com/package/@hugeicons/react
[@hugeicons/core-free-icons]: https://www.npmjs.com/package/@hugeicons/core-free-icons
[@fontsource-variable/archivo]: https://www.npmjs.com/package/@fontsource-variable/archivo
[@fontsource-variable/martian-mono]: https://www.npmjs.com/package/@fontsource-variable/martian-mono
[@fontsource-variable/geist]: https://www.npmjs.com/package/@fontsource-variable/geist
[@fontsource-variable/geist-mono]: https://www.npmjs.com/package/@fontsource-variable/geist-mono
[mp4box]: https://github.com/gpac/mp4box.js

Every web dependency reports its licence as a single string directly on
its own `package.json` (`"license": "MIT"`, `"license": "OFL-1.1"`, or
mp4box's `"license": "BSD-3-Clause"`); none carries a `licenses` array or
any other ambiguity.

## mp4box licence text

`mp4box`'s own `LICENSE` file states BSD-3-Clause with a redistribution
clause, so this page reproduces it verbatim from
`apps/web/node_modules/mp4box/LICENSE`:

```text
Copyright (c) 2012. Telecom ParisTech/TSI/MM/GPAC Cyril Concolato
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of the copyright holder nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

## Fonts and icons

The web app ships four variable fonts and one icon set as npm packages; it
loads nothing from Google Fonts or any other font CDN —
`apps/web/index.html` has no `<link>` to one, and no stylesheet imports
one.

- **Archivo Variable** and **Martian Mono Variable** come from the
  [`@fontsource-variable/archivo`][@fontsource-variable/archivo] and
  [`@fontsource-variable/martian-mono`][@fontsource-variable/martian-mono]
  packages. `apps/web/src/styles/tokens.css` declares both with
  `@font-face`, pointing at the `.woff2` files the packages bundle, so the
  fonts are self-hosted rather than fetched from a CDN at runtime. Both
  packages, and the font files themselves, are licensed under the
  [SIL Open Font License, version 1.1][ofl-1-1] — each package's own
  bundled `LICENSE` file names the respective type foundry as the
  copyright holder (The Archivo Project Authors; The Martian Mono Project
  Authors).
- **Geist Variable** and **Geist Mono Variable** set the post-auth
  workspace. They come from the
  [`@fontsource-variable/geist`][@fontsource-variable/geist] and
  [`@fontsource-variable/geist-mono`][@fontsource-variable/geist-mono]
  packages, declared with `@font-face` in
  `apps/web/src/styles/workspace/tokens.css` and self-hosted the same way.
  Both are licensed under the [SIL Open Font License, version 1.1][ofl-1-1];
  each package's bundled `LICENSE` names The Geist Project Authors as the
  copyright holder.
- **Icons** come from Hugeicons' free Stroke Rounded style, via the
  [`@hugeicons/core-free-icons`][@hugeicons/core-free-icons] icon-data
  package and the [`@hugeicons/react`][@hugeicons/react] component that
  renders it (`apps/web/src/components/ui/Icons.tsx`). Both packages are
  MIT-licensed; `@hugeicons/core-free-icons` bundles its own `LICENSE.md`
  confirming the same. Hugeicons also sells non-free icon styles that this
  app does not use.

`apps/web/public` holds only the product's own brand marks (`brand/`) —
LadingLens's own first-party assets, not third-party licensed material, so
they are out of scope for this page. The generated ambient clip this
section used to describe is gone: the landing's scroll-scrubbed film now
streams from a MotionSites CloudFront distribution
(`d8j0ntlcm91z4.cloudfront.net`), the same URL the MotionSites "Vectrus
Energy" prompt instructs builders to use. MotionSites publishes no licence
or terms for the film and marks its own pages "All rights reserved." This
page does not assert a licence for it; the gap is an accepted risk,
recorded in the
[landing and auth redesign spec's Risks section][landing-auth-risks].

[ofl-1-1]: https://scripts.sil.org/OFL
[landing-auth-risks]: /docs/superpowers/specs/2026-09-21-landing-auth-redesign-design.md#risks

## Ported UI patterns

Two UI patterns in the web app are ported from the shadcn/studio admincn
template that the
[landing and auth redesign spec][landing-auth-sources] names as a source:
the sign-in's animated silk canvas
(`apps/web/src/components/SilkCanvas.tsx`, after admincn's
`components/ui/silk.tsx`) and the sign-in panel's notched-card outline
path (`apps/web/src/pages/AuthPage.tsx`, from admincn's
`assets/svg/auth-panel-shape.tsx`). Both are re-implemented in this
repository's own React, canvas and SVG code, not copied files.

The post-auth workspace's shell follows admincn's layout (the sidebar's
widths and collapse, the floating header card), as recorded in
[admincn and Geist](/docs/research/design/admincn-and-geist.md). It is
written in this repository's own CSS and React; no admincn file is copied.

admincn's own `package.json` declares `"license": "MIT"`, but the admincn
checkout used for this port ships no `LICENSE` file, so there is no
copyright line to reproduce here — this notice states that gap rather
than inventing one.

[landing-auth-sources]: /docs/superpowers/specs/2026-09-21-landing-auth-redesign-design.md#sources

## Synthetic dataset

[`data/sdoc-hackathon-bundle`](/data/sdoc-hackathon-bundle/README.md) is
the participant dataset for the Averis x Monash Hackathon 2026, supplied
by the organisers — Monash University Malaysia's MUMTEC and GDG on Campus
clubs, with industry partner Averis — as `sdoc-hackathon-bundle.zip` on
their "Problem Statement and Datasets" Google Drive folder. Its own
`README.md` documents the task (classify emails, then compare shipping
instructions against draft bills of lading) and a scoring flow run by the
organisers; it states no licence and no usage terms of its own.

During the opening-ceremony Q&A, Averis's Sergio confirmed the dataset's
status directly, transcribed in
[`docs/BRIEF.md`](/docs/BRIEF.md#qa-highlights):

> **Q:** Can the dataset go in our public GitHub repo?\
> **A:** Yes — the data is synthetic, not real production data

This page states only what is verifiable: the dataset is organiser-
supplied and confirmed synthetic. It does not assert a licence for the
dataset, because the organisers did not publish one.

## Repository licence

LadingLens's own code is MIT-licensed; see [`/LICENSE`](/LICENSE). That
licence covers only the code Averis contributors wrote in this
repository. Every dependency listed above is installed from its own
public registry (PyPI or npm) under the licence its own maintainer
published, and nothing in this repository modifies, relicenses, or
redistributes that source — each keeps the licence stated above,
`pymupdf`'s AGPL-3.0-or-commercial choice included.
