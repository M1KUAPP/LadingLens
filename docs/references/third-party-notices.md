# Third-party notices

LadingLens depends on third-party Python and JavaScript packages, two open
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
1.  [Fonts and icons](#fonts-and-icons)
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
| ---------------------- | ---------------- | --------------------------------------------------- |
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

Seven of the thirteen report a machine-readable `License-Expression`
([PEP 639][pep-639]): `asyncpg`, `alembic`, `fastapi`, `google-genai`,
`pydantic-settings`, `typesafe-sdk`, and `uvicorn`. The other six report a
classic `License` field instead — `google-cloud-storage`, `httpx`,
`openpyxl`, and `python-docx` also carry a matching `License :: OSI
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
anyone who runs a modified version of an AGPL program as a network
service must let users interacting with it remotely obtain that modified
version's corresponding source. This repository's full source is public
on GitHub, and the web app's footer links out to it
(`apps/web/src/layout/SiteFooter.tsx`).

[agpl-3-0]: https://www.gnu.org/licenses/agpl-3.0.html
[artifex-licensing]: https://artifex.com/licensing

## Web dependencies

Direct runtime dependencies declared in `dependencies` of
`apps/web/package.json`:

| Package                             | Constraint | Licence                     |
| ----------------------------------- | ---------- | --------------------------- |
| [react]                             | `^19.2.8`  | MIT                         |
| [react-dom]                         | `^19.2.8`  | MIT                         |
| [react-router-dom]                  | `^7.18.4`  | MIT                         |
| [cytoscape]                         | `^3.34.3`  | MIT                         |
| [@hugeicons/react]                  | `^1.1.10`  | MIT                         |
| [@hugeicons/core-free-icons]        | `^4.3.4`   | MIT                         |
| [@fontsource-variable/archivo]      | `^5.3.0`   | [OFL-1.1](#fonts-and-icons) |
| [@fontsource-variable/martian-mono] | `^5.3.0`   | [OFL-1.1](#fonts-and-icons) |

[react]: https://www.npmjs.com/package/react
[react-dom]: https://www.npmjs.com/package/react-dom
[react-router-dom]: https://www.npmjs.com/package/react-router-dom
[cytoscape]: https://www.npmjs.com/package/cytoscape
[@hugeicons/react]: https://www.npmjs.com/package/@hugeicons/react
[@hugeicons/core-free-icons]: https://www.npmjs.com/package/@hugeicons/core-free-icons
[@fontsource-variable/archivo]: https://www.npmjs.com/package/@fontsource-variable/archivo
[@fontsource-variable/martian-mono]: https://www.npmjs.com/package/@fontsource-variable/martian-mono

Every web dependency reports its licence as a single string directly on
its own `package.json` (`"license": "MIT"` or `"license": "OFL-1.1"`); none
carries a `licenses` array or any other ambiguity.

## Fonts and icons

The web app ships two variable fonts and one icon set as npm packages; it
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
- **Icons** come from Hugeicons' free Stroke Rounded style, via the
  [`@hugeicons/core-free-icons`][@hugeicons/core-free-icons] icon-data
  package and the [`@hugeicons/react`][@hugeicons/react] component that
  renders it (`apps/web/src/components/ui/Icons.tsx`). Both packages are
  MIT-licensed; `@hugeicons/core-free-icons` bundles its own `LICENSE.md`
  confirming the same. Hugeicons also sells non-free icon styles that this
  app does not use.

`apps/web/public` additionally holds the product's own brand marks
(`brand/`) and a generated ambient background clip
([`media/`](/apps/web/public/media/README.md)). Both are LadingLens's own
first-party assets, not third-party licensed material, so they are out of
scope for this page.

[ofl-1-1]: https://scripts.sil.org/OFL

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
