# Content review

The course content (100 lessons, 692 words) has been reviewed for accurate,
natural **Castilian Spanish** and correct facts, in two passes:

1. **A full read-through of every lesson** (190 changes): grammar, Spain-specific
   vocabulary, natural phrasing, ¡ ¿ marks, story logic, pictures and level labels.
2. **A check against native Spanish sources** (9 more changes): fun facts against
   Spanish government sites (Ministerio de Educación, MITECO, Banco de España),
   UNESCO and Spanish media; spellings and meanings against the **RAE** (Real
   Academia Española); Spain-vs-Latin-America vocabulary against comparison sources.
3. **A spelling check of every Spanish word** against the RLA-ES Spanish dictionary
   (no misspellings or missing accents; 8 changes, e.g. «supercampeón» per the RAE).
4. **A grammar check of every Spanish line** (1,393 lines) with LanguageTool
   (8 changes). Re-run any time with `npm run content:grammar`; the remaining
   flags in `grammar-check.tsv` are known false alarms.

Not possible automatically: the RAE's own websites block automated access, and
the Instituto Cervantes curriculum site was down for maintenance during the check.

- **[changes-2026-11.md](changes-2026-11.md)** — every change, with before, after,
  why and (for the second pass) the source.
- **[teacher-review.csv](teacher-review.csv)** — every line of Spanish in the
  course, one row each (regenerate with `npm run content:review-sheet`). Handy if
  you ever want a teacher or a native-speaking parent to look over it.

## How to describe the course honestly

- ✅ "Castilian Spanish from Spain, checked against the Real Academia Española."
- ✅ "Covers Pre-A1 to A1, with a first taste of A2 grammar."
- ❌ Don't say "teacher-approved" or "takes children to A2" unless that becomes true.

## Changing content later

Edit `content/lessons/*.json`, then run `npm run content:check` and
`npm run audio:generate` to record any changed lines.
