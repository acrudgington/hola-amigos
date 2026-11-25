# Content review

The course content (200 lessons, 1,412 words and phrases) has been reviewed for accurate,
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
- ✅ "Covers Pre-A1 to A2: lessons 1–100 reach A1, lessons 101–200 cover the A2 curriculum."
- ✅ "Follows the Instituto Cervantes A2 inventory: past, present and future, and everyday situations."
- ❌ Don't say "teacher-approved", "certified A2" or "guarantees A2". A2 also needs real
  conversation practice, and reaching it depends on how much a child actually plays.

## Lessons 101–200 (A2, added November 2026)

Written to the same standard and checked the same way:

- **Spelling:** every Spanish word in lessons, stories, chants and goals against the
  RLA-ES Spanish dictionary. Flags were only proper names, deliberate wrong quiz
  options, and valid words missing from that dictionary (diminutives like «osito»,
  «-ísimo» forms, «pescadería», informal «peli», «finde»).
- **Grammar:** LanguageTool on every new Spanish line (`FROM_LESSON=101 npm run
  content:grammar`, results in `grammar-check-from-*.tsv`). Real issues were fixed
  (missing commas, an awkward chant line); the rest are known false alarms.
- **Spain, not Latin America:** a scan for Latin-American-only words (computadora,
  celular, carro, vos…). The only hits are fun facts that explain the difference
  (zumo/jugo, vosotros/ustedes, echar de menos/extrañar).
- **Facts** checked against official and reputable sources: the DNI from age 14 (Ley
  Orgánica 4/2015 and Real Decreto 255/2025), TVE's first broadcast (28 October 1956),
  the AVE Madrid–Seville time (from 2 h 30 min, spain.info), the Mediterranean diet on
  UNESCO's Intangible Cultural Heritage list (2010), recycling bin colours (Ecoembes),
  Chupa Chups (1958) and its Dalí logo, the siesta (about 60% of adults in Spain never
  take one), and the Picos de Europa name (presented as a popular story, not fact).
- **Voices:** `npm run content:voice-split` shows how every mixed English/Spanish
  line is split between the English and Castilian voices.

## Conversations (added November 2026)

200 role-play conversations (one per lesson, about 2,400 Spanish lines counting
questions, answers, replies and tap options), checked like the lessons:
spelling against the RLA-ES dictionary (flags were only sound effects like «mmm»
and valid words such as «puzle», «golazo», «finde»), grammar with LanguageTool
(`ONLY_TALK=1 npm run content:grammar`; 3 punctuation fixes) and a scan for
Latin-American-only vocabulary (none).

## Changing content later

Edit `content/lessons/*.json`, then run `npm run content:check` and
`npm run audio:generate` to record any changed lines.
