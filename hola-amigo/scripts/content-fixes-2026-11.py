#!/usr/bin/env python3
# One-off content review fixes (November 2026), kept for the record.
# Every change asserts the original text is there, so it can't silently misfire.
# Run once from hola-amigo/:  python3 scripts/content-fixes-2026-11.py
import glob
import json
import random

files = {}
lessons = {}
for f in sorted(glob.glob("content/lessons/world-*.json")):
    d = json.load(open(f, encoding="utf8"))
    files[f] = d
    for l in (d["lessons"] if isinstance(d, dict) else d):
        lessons[l["id"]] = l

log = []


def walk(obj, fn):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(v, str):
                obj[k] = fn(v)
            else:
                walk(v, fn)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            if isinstance(v, str):
                obj[i] = fn(v)
            else:
                walk(v, fn)


def rep(lid, old, new, why=""):
    """Replace text anywhere in one lesson (must occur)."""
    hits = [0]

    def fn(s):
        if old in s:
            hits[0] += s.count(old)
            return s.replace(old, new)
        return s

    walk(lessons[lid], fn)
    assert hits[0], f"L{lid}: not found: {old!r}"
    log.append((lid, old, new, why))


def word(lid, key, why="", **changes):
    for w in lessons[lid]["words"]:
        if w["es"] == key:
            before = dict(w)
            w.update(changes)
            log.append((lid, f"word {before['es']} = {before['en']} [{before['say']}] {before['emoji']}",
                        f"word {w['es']} = {w['en']} [{w['say']}] {w['emoji']}", why))
            return
    raise AssertionError(f"L{lid}: no word {key!r}")


def emoji(lid, es, e, why="each word needs its own picture"):
    word(lid, es, why, emoji=e)


def sentence(lid, old_first_tokens, tokens, en, why=""):
    for s in lessons[lid]["sentences"]:
        if s["correct"][: len(old_first_tokens)] == old_first_tokens:
            old = " ".join(s["correct"])
            s["correct"] = tokens
            sh = tokens[:]
            rnd = random.Random(" ".join(tokens))
            while sh == tokens:
                rnd.shuffle(sh)
            s["shuffle"] = sh
            s["en"] = en
            log.append((lid, f"sentence: {old}", f"sentence: {' '.join(tokens)} = {en}", why))
            return
    raise AssertionError(f"L{lid}: no sentence starting {old_first_tokens}")


def fact(lid, new, why):
    log.append((lid, f"fun fact: {lessons[lid]['funFact']}", f"fun fact: {new}", why))
    lessons[lid]["funFact"] = new


# ---------------- World 1: Starter Island ----------------
emoji(1, "Adiós", "🤚")
rep(7, "¡Toca la cabeza!", "¡Tócate la cabeza!", "'touch YOUR head' needs the reflexive tócate")
word(8, "Con hambre", "'con hambre' isn't how Spanish says hungry: 'tengo hambre'", es="Tengo hambre", en="I'm hungry", say="TEN-go AHM-breh")

# ---------------- World 2: Word Town ----------------
rep(10, "Which fruit does Pedro love?", "Which fruit does Pedro see at the market?", "two questions contradicted each other (love vs favourite)")
emoji(12, "La clase", "🧑‍🤝‍🧑")
rep(14, "It has four rooms:", "It has five rooms:", "the story lists five rooms")
rep(14, "Spanish houses have a 'terraza' for dinner under the stars!", "Many Spanish homes have a 'terraza' — perfect for dinner under the stars!", "not every house has one")
# Days of the week: Thursday and Friday were missing.
l15 = lessons[15]
days = {"Lunes": ("🌙", None), "Martes": ("🔴", None), "Miércoles": ("☄️", None), "Sábado": ("🎉", None), "Domingo": ("🥘", None)}
for es, (e, _) in days.items():
    emoji(15, es, e, "days had the same 📅 picture; each day now has its planet/meaning")
idx = next(i for i, w in enumerate(l15["words"]) if w["es"] == "Miércoles") + 1
l15["words"][idx:idx] = [
    {"es": "Jueves", "en": "Thursday", "say": "HWEH-bes", "emoji": "🪐"},
    {"es": "Viernes", "en": "Friday", "say": "BYEHR-nes", "emoji": "✨"},
]
log.append((15, "(no Thursday or Friday)", "added Jueves = Thursday 🪐, Viernes = Friday ✨", "the week was missing two days"))
fact(15, "Spanish weekdays are named after the sky: lunes (la Luna), martes (Marte), miércoles (Mercurio), jueves (Júpiter), viernes (Venus)!", "new fact that goes with the planet pictures")
rep(15, "On lunes, it's sunny — hace sol! On martes, it's cloudy. On miércoles, llueve all day. The children stay inside.",
    "On lunes, it's sunny — hace sol! On martes, it's cloudy. On miércoles, llueve all day. The children stay inside. On jueves and viernes, they go to school.",
    "story now uses the new days")
# Lesson 16: was labelled 'A1 Final Challenge'
lessons[16]["title"] = "Word Town Challenge!"
log.append((16, "title: A1 Final Challenge!", "title: Word Town Challenge!", "after 16 lessons children aren't at A1 yet"))
fact(16, "You've finished Starter Island and Word Town — over 120 words! Next: sentences and stories! 🎉🏆", "was 'You've finished A1! 150+ words' (it's 124 words, and not A1 yet)")
rep(16, "¡Eres un campeón de A1!", "¡Eres un campeón de español!", "no A1 claim")

# ---------------- World 3: Sentence City ----------------
rep(17, "Tú eres fantástico!", "¡Tú eres fantástico!", "missing ¡")
rep(18, "'Tengo ocho años!'", "'¡Tengo ocho años!'", "missing ¡")
rep(18, "'Tengo un regalo para ti!'", "'¡Tengo un regalo para ti!'", "missing ¡")
rep(18, "'Tengo un hermano and una hermana,'", "'Tengo un hermano y una hermana,'", "English 'and' inside a Spanish sentence")
emoji(18, "Hermanos", "👫", "two emoji in one picture")
emoji(19, "Me gustan", "💕")
emoji(19, "Y", "🔗")
rep(20, "'Puedo nadar muy bien!'", "'¡Puedo nadar muy bien!'", "missing ¡")
emoji(21, "¿Qué hora es?", "⌚")
emoji(21, "Y cuarto", "🕒")
rep(21, "At es la una it rings ONCE. BONG! At son las dos it rings TWICE. BONG BONG!",
    "When es la una (one o'clock), it rings ONCE. BONG! When son las dos, it rings TWICE. BONG BONG!", "'At es la una' isn't Spanish or English")
rep(21, "School starts at son las nueve de la mañana. Lunch is at son las dos y media. Home time is at son las cuatro.",
    "School starts a las nueve de la mañana. Lunch is a las dos y media. Home time is a las cuatro.", "'at [time]' is 'a las…', not 'son las…'")
rep(21, "At night, son las diez de la noche, the clock rings TEN times!", "At night, when son las diez de la noche, the clock rings TEN times!", "reads naturally")
# Lesson 22: story mixed 'I' and 'he' forms; now Carlos tells it himself
st = lessons[22]["story"]
old = list(st["paras"])
st["paras"] = [
    "Carlos tells us about his day. 'Me despierto a las siete. Me ducho y desayuno cereales con leche. A las ocho y media, voy al cole.'",
    "'A las dos, como pasta en casa. Por la tarde, juego al fútbol con mis amigos.'",
    "'A las nueve, ceno con mi familia. A las diez, me acuesto. ¡Buenas noches!' Carlos has had a great day!",
]
log.append((22, " / ".join(old), " / ".join(st["paras"]), "story mixed 'I' and 'he' verb forms (e.g. 'Carlos… como pasta'); now Carlos tells it in the 'I' forms the lesson teaches"))

# ---------------- World 4: Story Land ----------------
fact(25, "To say what YOU did yesterday, many verbs end in -é (hablé, jugué) or -í (comí, vi). Fui (I went) is a special one!", "the old fact ('words often end in -É or -Í') was confusing")
st = lessons[25]["story"]
old = list(st["paras"])
st["paras"] = [
    "Pablo tells his friend: 'Ayer fui al parque con mi perro. We walked, ran, and played all morning.'",
    "'Después, comí un bocadillo and drank water. Vi un pájaro — it was azul and very bonito.'",
    "'Then jugué al fútbol with my friends and compré un helado. ¡Fue el mejor día!'",
]
log.append((25, " / ".join(old), " / ".join(st["paras"]), "story said 'Pablo fui / comí' (those mean 'I went / I ate'); now Pablo tells it in the 'I' forms the lesson teaches"))
rep(26, "Mamá says 'Voy a comer paella!'", "Mamá says '¡Voy a comer paella!'", "missing ¡")
fact(27, "Many Spanish restaurants offer a 'menú del día' at lunchtime — a starter, a main course and a dessert for one set price!", "prices change; the old '€12' would date quickly")
fact(28, "Many small shops in Spain close for a long lunch break, often from about 2pm to 5pm!", "big shops and supermarkets don't close")
emoji(28, "El dinero", "💶")
rep(28, "'Me lo llevo!'", "'¡Me lo llevo!'", "missing ¡")
fact(29, "In Spain, 'straight on' is 'todo recto' — you'll hear it every time you ask the way!", "old fact about roundabouts wasn't really true")
emoji(29, "Allí", "🚩")
rep(29, "'Todo recto and then a la derecha.'", "'Todo recto y luego a la derecha.'", "English 'and then' inside a Spanish sentence")
rep(30, "Marta says 'No, me duele la garganta también.' She is enfermo.", "Marta says 'No, pero me duele la garganta.' She is enferma.", "'no… también' didn't make sense; Marta is enferma (girl)")
rep(31, "Once upon a time a very brave boy.", "Once upon a time there was a very brave boy.", "incomplete English")
word(31, "Fue", "clearer English", en="He/she went")
word(31, "Encontró", "clearer English", en="He/she found")
word(31, "Dijo", "clearer English", en="He/she said")
lessons[32]["subtitle"] = "Story Land Challenge"
log.append((32, "subtitle: A2 Final Challenge", "subtitle: Story Land Challenge", "lesson 32 is nowhere near A2"))
fact(32, "You've finished Story Land! Over 200 words, plus the past, the future and stories! 🎉🏆", "was 'You finished EVERYTHING! 300+ words' at lesson 32 of 100 (it's 231 words)")
rep(32, "You know over 300 Spanish words.", "You know over 200 Spanish words.", "correct count")
for q in lessons[32]["story"]["qs"]:
    if q["opts"][0] == "Over 300":
        q["opts"][0] = "Over 200"
        log.append((32, "answer: Over 300", "answer: Over 200", "correct count"))
rep(32, "You started with just 'Hola!'", "You started with just '¡Hola!'", "missing ¡")

# ---------------- World 5: Plaza del Pueblo ----------------
rep(33, "Vamos al parque en la plaza.", "Quedamos en la plaza.", "'the park in the square' was odd; 'quedamos en…' is how Spanish friends arrange to meet")
rep(33, "Let's go to the park in the square.", "Let's meet in the square.", "matches the new phrase")
emoji(35, "El supermercado", "🏪")
emoji(35, "La caja", "🧾")
rep(36, "She also adds una zanahoria small and una cebolla.", "She also adds a small zanahoria and una cebolla.", "Spanish nouns with English adjectives after them read oddly")
rep(36, "De postre, Luna eats una piña sweet and un melocotón juicy.", "De postre, Luna eats a sweet piña and a juicy melocotón.", "same")
rep(37, "Sol plays al fútbol. Luna plays al baloncesto.", "Sol juega al fútbol. Luna juega al tenis.", "'plays al…' mixed; Luna then wins at tennis, so she plays tennis")
rep(37, "'Voy a ganar!'", "'¡Voy a ganar!'", "missing ¡")
rep(37, "'Lo importante es divertirse!'", "'¡Lo importante es divertirse!'", "missing ¡")
fact(38, "Flamenco, the famous music and dance from Andalucía, is so special that UNESCO protects it as world heritage!", "not all Spanish kids dance flamenco")
rep(38, "In her tiempo libre, Luna le gusta dibujar y pintar.", "In her tiempo libre, a Luna le gusta dibujar y pintar.", "'a Luna le gusta' needs the 'a'")
rep(38, "They cook chocolate cake and ver la tele juntos.", "They cook a chocolate cake and watch la tele together.", "mixed verb forms")
rep(39, "Un gallo says 'kikirikí!'", "Un gallo says '¡Kikirikí!'", "missing ¡")
fact(40, "You learned over 50 new words in this world! ¡Eres un maestro de las palabras! 🌟", "it's 55 words, not 60+")
rep(40, "They have learned 60+ new words!", "They have learned over 50 new words!", "correct count")
rep(40, "'Y tú también!'", "'¡Y tú también!'", "missing ¡")

# ---------------- World 6: Puente de Expresiones ----------------
rep(41, "They reír together and become más amigos than ever.", "They laugh together — ¡cómo se ríen! — and are better friends than ever.", "'they reír… más amigos' wasn't grammatical")
fact(42, "In Spain, children get presents from los Reyes Magos (the Three Kings) on 6 January — and many get some from Papá Noel too!", "many Spanish families also do Santa")
rep(42, "¡Felicidades en tu cumpleaños!", "¡Feliz cumpleaños!", "'felicidades en tu cumpleaños' isn't natural; Spanish says '¡Feliz cumpleaños!' or '¡Felicidades!'")
rep(42, "Happy birthday to you!", "Happy birthday!", "matches")
rep(42, "'Felicidades, Luna!'", "'¡Felicidades, Luna!'", "missing ¡")
rep(43, "'Quiero ser astronauta!'", "'¡Quiero ser astronauta!'", "missing ¡")
emoji(44, "La pintura", "🎨")
emoji(45, "La tableta", "📲")
rep(45, "Sol gets un nuevo móvil!", "Sol gets un móvil nuevo!", "'un móvil nuevo' is the usual order")
fact(46, "Spanish pharmacies have a green cross sign, and the pharmacist can give advice for small problems like colds!", "old fact implied any medicine is available without a prescription")
emoji(47, "Avergonzado", "🫣")
rep(47, "'Tranquila! You'll be amazing.'", "'¡Tranquila! You'll be amazing.'", "missing ¡")
fact(48, "'Creo que' and 'pienso que' both mean 'I think' — you'll hear them all the time in Spain!", "old fact was a stereotype")
rep(48, "Sol creo que el chocolate es lo mejor.", "Sol says: 'Creo que el chocolate es lo mejor.'", "'Sol creo' is the wrong person (creo = I think)")
fact(49, "Spanish compares with 'más… que': 'más alto que yo' means 'taller than me'!", "clearer")
emoji(49, "La mejor", "🏅")
rep(49, "En el final, they decide", "Al final, they decide", "Spanish says 'al final'")
rep(50, "'Eres mejor amigo que nunca!' Sol tells Luna. 'Y tú eres más simpático que el sol!' Luna laughs.",
    "'¡Eres la mejor amiga del mundo!' Sol tells Luna. '¡Y tú eres más simpático que nadie!' Luna laughs.", "'eres mejor amigo que nunca' isn't grammatical")
rep(50, "Nicer than the sun", "Nicer than anyone", "matches the corrected story")

# ---------------- World 7: Storyteller's Castle ----------------
rep(51, "De repente, hubo un ruido fuerte!", "¡De repente, hubo un ruido fuerte!", "missing ¡")
rep(51, "Era Luna!", "¡Era Luna!", "missing ¡")
rep(51, "'Estaba descubriendo cosas nuevas!'", "'¡Estaba descubriendo cosas nuevas!'", "missing ¡")
fact(52, "In Spain, most children start 'el cole' at age 3, in Infantil. Primary school (Primaria) starts at 6!", "old fact said school starts at 6 and younger children go to 'guardería' — almost all start at 3")
rep(52, "'Yo también!'", "'¡Yo también!'", "missing ¡")
rep(52, "¡Cómo crece el tiempo!", "¡Cómo pasa el tiempo!", "'how time flies' is '¡cómo pasa el tiempo!'")
fact(53, "'Siempre' (always) and 'nunca' (never) are opposites — and 'a veces' (sometimes) is right in the middle!", "old fact was about pronunciation only")
sentence(53, ["A", "veces"], ["A", "veces", "jugaba", "al", "fútbol"], "Sometimes I used to play football.", "Spain says 'jugar al fútbol'")
rep(53, "se levantaba a las cinco", "se levantaba a las siete", "five o'clock was odd for a child")
for q in lessons[53]["story"]["qs"]:
    if q["opts"] == ["At five", "At seven", "At ten"]:
        q["opts"] = ["At seven", "At five", "At ten"]
        log.append((53, "answer: At five", "answer: At seven", "matches the story"))
rep(53, "leía cuentos with mamá", "leía cuentos con mamá", "English 'with' inside Spanish")
st = lessons[54]["story"]
old = list(st["paras"])
st["paras"] = [
    "Sol explains: 'Quiero mucho a Luna porque es divertida. Aunque es más pequeña que yo, ¡es muy fuerte!'",
    "'Sois muy diferentes,' says Estrella. 'Sin embargo, sois los mejores amigos.' 'Por eso nos divertimos tanto,' replies Luna.",
    "Además, they share everything. Por ejemplo, sus libros, sus sueños y su tiempo. Por fin, Estrella understands!",
]
log.append((54, " / ".join(old), " / ".join(st["paras"]), "'por eso' didn't follow logically, and Sol (a boy) and Luna were called 'amigas'"))
for q in st["qs"]:
    if q["opts"][0] == "They are not sisters":
        q["opts"] = ["They are very different", "They are sisters", "They are old"]
        log.append((54, "answer: They are not sisters", "answer: They are very different", "matches the story"))
fact(55, "Spain has thousands of castles — more than almost any other country in Europe!", "exact numbers vary by source")
rep(55, "un castillo enorme with una piscina de chocolate!", "¡un castillo enorme with una piscina de chocolate!", "missing ¡")
fact(56, "Spain has deserts, beaches, snowy mountains and even ancient laurel forests in the Canary Islands!", "Spain doesn't have rainforests")
rep(57, "'Las galletas son lo mejor!' says Sol. 'Tienes razón!'", "'¡Las galletas son lo mejor!' says Sol. '¡Tienes razón!'", "missing ¡")
rep(57, "La fruta es mejor!'", "¡La fruta es mejor!'", "missing ¡")
fact(58, "In Spanish you can give an instruction with just the verb — '¡Mezcla!' means 'Mix!'", "missing ¡")
rep(58, "'Después mezcla queso y jamón.", "'Después pon queso y jamón.", "you put cheese and ham in a sandwich, you don't mix them")
rep(58, "'¡Qué rico! Eres el mejor profesor de cocina!'", "'¡Qué rico! ¡Eres el mejor profesor de cocina!'", "missing ¡")
emoji(59, "Cuidado", "🚧")
rep(59, "¿Puedes ayudarme con la tarea?", "¿Puedes ayudarme con los deberes?", "in Spain, homework is 'los deberes'")
rep(59, "Can you help me with the homework?", "Can you help me with my homework?", "natural English")
rep(59, "'Tienes que practicar y disfrutar. Es mejor divertirse!'", "'Tienes que practicar y disfrutar. ¡Es mejor divertirse!'", "missing ¡")
emoji(60, "Deberías", "🧭")
sentence(60, ["Cuando", "era", "pequeño"], ["Cuando", "era", "pequeño", "era", "feliz"], "When I was little I was happy.", "'I was happy' as a general state uses 'era feliz'")
rep(60, "'Ahora podemos contar historias del pasado y del futuro!'", "'¡Ahora podemos contar historias del pasado y del futuro!'", "missing ¡")
rep(60, "'¡Y tú el mío!'", "'¡Y tú, mi mejor amigo!'", "'¡Y tú el mío!' doesn't match 'mi mejor amiga'")

# ---------------- World 8: Vida Diaria ----------------
emoji(61, "La goma", "🧽", "the eraser picture was a gravestone")
fact(62, "In Spain, 'el baño' can mean the bath OR the bathroom — and a small toilet room is 'el aseo'!", "old fact wasn't really about Spanish")
rep(62, "'Necesito un baño!'", "'¡Necesito un baño!'", "missing ¡")
emoji(64, "Las sábanas", "🧺")
emoji(64, "La manta", "🧶")
emoji(65, "La aspiradora", "🌀", "the vacuum cleaner picture was a screwdriver")
rep(65, "'Limpiar es trabajo, pero juntos es divertido!'", "'Limpiar es trabajo, pero ¡juntos es divertido!'", "missing ¡")
fact(67, "Spain's €1 and €2 coins show King Felipe VI, and the 10, 20 and 50 cent coins show Cervantes, who wrote Don Quijote!", "only some coins show the King")
emoji(67, "El dinero", "💰")
emoji(67, "Las monedas", "👛")
rep(67, "Luna says 'Bien hecho!'", "Luna says '¡Bien hecho!'", "missing ¡")
emoji(68, "Hacer la cama", "🛌")
rep(68, "'Somos los mejores!'", "'¡Somos los mejores!'", "missing ¡")

# ---------------- World 9: Cosas que Hago ----------------
fact(69, "Spanish has TWO verbs for 'to take' — 'tomar' and 'coger'. In Spain, you'll hear 'coger' all the time!", "clearer")
emoji(69, "Cerrar", "🔒")
rep(69, "Luna abre un libro mágico. ¡Encontró una llave!", "Luna abre un libro mágico. ¡Encuentra una llave!", "tenses didn't match (abre / encontró)")
rep(69, "Together they empezan an adventure. 'Vamos a abrir la puerta secreta!'", "Together they empiezan an adventure. '¡Vamos a abrir la puerta secreta!'", "'empezar' → 'empiezan'; missing ¡")
emoji(70, "El columpio", "🎠")
emoji(71, "Doblar", "📃")
emoji(71, "Las manualidades", "🖍️")
rep(71, "Then pintan it muchos colores.", "Luego la pintan de muchos colores.", "mixed grammar")
rep(71, "'Doblé este pájaro!' Luna shows un origami pájaro. Sol is muy impressed.", "'¡Mira, he doblado este pájaro!' Luna shows un pájaro de origami. Sol is muy impresionado.", "Spain uses 'he doblado' for something just done; 'impressed' is 'impresionado'")
fact(72, "The 'peonza' (spinning top) is a traditional toy that children in Spain have played with for centuries!", "'most famous toy' was an overclaim")
word(72, "El puzzle", "in Spain it's said with the Castilian 'th' sound", say="POOTH-leh")
fact(73, "In Spain, kids play 'el escondite inglés' — it's like 'Grandmother's Footsteps' or 'Red Light, Green Light'!", "it isn't a hiding game")
sentence(73, ["Juego", "piedra"], ["Juego", "a", "piedra", "papel", "o", "tijera"], "I play rock, paper, scissors.", "'jugar a…' needs the 'a'")
rep(75, "'Mi favorita!' grita Luna.", "'¡Mi favorita!' grita Luna.", "missing ¡")
rep(76, "'Jugar es lo mejor!'", "'¡Jugar es lo mejor!'", "missing ¡")

# ---------------- World 10: El Mundo Alrededor ----------------
rep(77, "'Es mi favorito!' Luna says. '¡Qué lindo!'", "'¡Es mi favorito!' Luna says. '¡Qué mono!'", "'lindo' is Latin American; in Spain, 'cute' is 'mono' (yes, like monkey!)")
fact(78, "In Spanish, a fish swimming in the sea is 'un pez' — but fish on your plate is 'pescado'!", "a more useful fact")
rep(78, "They see peces colourful and una tortuga lenta.", "They see colourful peces and una tortuga lenta.", "word order")
rep(78, "'Hola amigos!'", "'¡Hola, amigos!'", "missing ¡ and comma")
fact(79, "In Spain, some people say a 'mariquita' landing on you brings good luck!", "softer: it's a saying, not a rule")
word(79, "La mariquita", "the app uses British English", en="Ladybird")
for s in lessons[79]["sentences"]:
    if "ladybug" in s["en"]:
        s["en"] = s["en"].replace("ladybug", "ladybird")
        log.append((79, "I see a red ladybug.", s["en"], "British English"))
rep(79, "'Las hormigas son muy fuertes!'", "'¡Las hormigas son muy fuertes!'", "missing ¡")
emoji(80, "El invierno", "⛄")
fact(81, "The 'encina' (holm oak) is one of Spain's most typical trees — some are hundreds of years old!", "Spain has no official national tree")
rep(81, "'¡Yo crecí esta planta!'", "'¡Mira cuánto ha crecido mi planta!'", "'crecer' can't take an object ('I grew this plant' is 'he cultivado')")
fact(82, "'Arcoíris' means 'Iris's arch' — Iris was the Greek goddess of the rainbow!", "the old 'Spanish folklore' fact couldn't be checked")
emoji(82, "El cielo", "🌤️")
emoji(82, "El trueno", "🔊")
rep(82, "'Mira, Luna!'", "'¡Mira, Luna!'", "missing ¡")
rep(83, "qué pequeña!", "¡qué pequeña!", "missing ¡")
rep(83, "la Luna — perfecta!", "la Luna — ¡perfecta!", "missing ¡")

# ---------------- World 11: Cómo Soy ----------------
fact(85, "'Moreno' means dark-haired — but in summer it also means suntanned!", "old fact was a generalisation")
rep(85, "'¡Te ves diferente!'", "'¡Estás diferente!'", "in Spain: 'estás diferente'")
rep(85, "'Igual de bonita!'", "'¡Igual de guapa!'", "in Spain: 'guapa'; missing ¡")
fact(86, "In Spain, 'majo' or 'maja' is a very Spanish way to say someone is nice!", "a more useful fact")
emoji(87, "Prefiero", "⚖️")
emoji(87, "Lo peor", "👎")
rep(87, "'Lo mejor es probar de todo!'", "'¡Lo mejor es probar de todo!'", "missing ¡")
emoji(88, "La sobrina", "🍼")
fact(90, "In many Spanish schools, children start learning English in Infantil, from age 3 or 4!", "'they grow up bilingual' was an overclaim")
fact(91, "Spanish children often have a piñata at birthday parties — full of 'chuches' (sweets)!", "'chuches' is the Spanish word kids use")

# ---------------- World 12: Repaso Total ----------------
fact(93, "In Spain, 21 is one word, 'veintiuno' — but from 31 it's three: 'treinta y uno'!", "more complete")
emoji(93, "Encantado", "🙋‍♂️")
emoji(93, "Encantada", "🙋‍♀️")
rep(93, "'Encantado!'", "'¡Encantado!'", "missing ¡")
rep(93, "Treinta primos!", "¡Treinta primos!", "missing ¡")
rep(94, "'Mi favorita es la estrella oscura,' says Luna.", "'Mi favorito es el cuadrado azul claro,' says Luna.", "there was no dark star in the story")
rep(94, "The dark star", "The light blue square", "matches the story")
rep(95, "Then chocolate — 'Dulce!'", "Then chocolate — '¡Dulce!'", "missing ¡")
rep(95, "Luna tries un chile picante", "Luna tries una guindilla picante", "in Spain a chilli pepper is 'una guindilla'")
rep(95, "Then helado frío — 'Delicioso!'", "Then helado frío — '¡Delicioso!'", "missing ¡")
rep(96, "They cenan juntos every night at las ocho.", "They cenan juntos every night a las nueve.", "matches the fact (dinner at 9)")
rep(96, "Every night at eight", "Every night at nine", "matches the story")
fact(97, "'Siesta' is a Spanish word the whole world knows — a short nap after lunch, especially on hot summer days!", "old fact implied everyone naps")
emoji(97, "Hoy", "📍")
rep(97, "'Pero cada día es una aventura nueva!'", "'¡Pero cada día es una aventura nueva!'", "missing ¡")
rep(99, "'¡Está perfecta!'", "'¡Me queda perfecto!'", "'vestido' is masculine; 'me queda…' is how clothes fit")
fact(100, "¡FELICIDADES! You've completed all 100 lessons and nearly 700 words! You ARE a Spanish superstar! 🎉🌟🏆", "removed the unsupported '100 hours' claim")
rep(100, "We can speak Spanish like real Spaniards!", "We can talk about so many things in Spanish!", "overclaim")
rep(100, "Eres un MEGA CAMPEÓN!", "¡Eres un MEGA CAMPEÓN!", "missing ¡")

# ---------------- save ----------------
for f, d in files.items():
    with open(f, "w", encoding="utf8") as fh:
        json.dump(d, fh, ensure_ascii=False, indent=2)
        fh.write("\n")

with open("content/review/changes-2026-11.md", "w", encoding="utf8") as fh:
    fh.write("# Content review — changes made (November 2026)\n\n")
    fh.write("First-pass review of all 100 lessons. Each change is listed with the reason.\n")
    fh.write("A qualified Spanish teacher should still sign off the whole course (see teacher-review.csv).\n\n")
    fh.write(f"**{len(log)} changes.**\n\n| Lesson | Before | After | Why |\n|---|---|---|---|\n")
    esc = lambda s: str(s).replace("|", "\\|").replace("\n", " ")
    for lid, a, b, why in log:
        fh.write(f"| {lid} | {esc(a)} | {esc(b)} | {esc(why)} |\n")
print(len(log), "changes")
