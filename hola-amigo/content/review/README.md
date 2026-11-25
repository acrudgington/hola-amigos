# Content review

The course content (100 lessons, 692 words) has been reviewed for accurate,
natural **Castilian Spanish** and correct facts, in two passes:

1. **A full read-through of every lesson** (190 changes): grammar, Spain-specific
   vocabulary, natural phrasing, ¡ ¿ marks, story logic, pictures and level labels.
2. **A check against native Spanish sources** (9 more changes): spellings and
   meanings against the **RAE** (Real Academia Española: DLE and Diccionario
   panhispánico de dudas), and fun facts against Spanish government sites
   (Ministerio de Educación, MITECO, Banco de España), UNESCO and Spanish media.

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
