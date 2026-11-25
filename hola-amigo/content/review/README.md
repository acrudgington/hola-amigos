# Content review

The course content (100 lessons, 692 words) has had a first-pass review for
accurate, natural **Castilian Spanish** and correct facts.

- **[changes-2026-11.md](changes-2026-11.md)** — every change made in the
  November 2026 review (190 changes), with before, after and why.
- **[teacher-review.csv](teacher-review.csv)** — every line of Spanish in the
  course, one row each, with columns for a teacher to mark **OK? (Y/N)** and add
  corrections. Open it in Excel, Numbers or Google Sheets.

## Sign-off (to do before marketing the course as teacher-approved)

A qualified Spanish teacher (ideally a native Castilian speaker, used to teaching
children aged about 5–11) should go through `teacher-review.csv` and check:

- [ ] Spanish is correct, natural and **Castilian** (vosotros; Spain vocabulary such
      as *zumo, ordenador, coche, móvil, los deberes*; accents and ¿ ¡).
- [ ] English translations are accurate and in British English.
- [ ] Pronunciation guides suit English-speaking children (Castilian *th* for c/z).
- [ ] Fun facts are true and appropriate.
- [ ] Topics, names and stories are suitable for young children.
- [ ] The level is described honestly (the course covers Pre-A1 to A1, with
      tasters of A2 grammar; it does not take children to A2).

Reviewer name: ______________________  Qualification: ______________________

Date: ____________  Signature: ______________________

When corrections come back, apply them in `content/lessons/*.json`, run
`npm run content:check`, then `npm run audio:generate` to record any changed lines.
