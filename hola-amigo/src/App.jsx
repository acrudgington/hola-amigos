import { useState, useEffect, useMemo, useRef } from "react";

// ============================================================
// DATA MODEL — parent accounts with multiple child profiles
// ============================================================
// Storage schema:
//   hola_parents        → [{ email, name, pass, created, children: [childId...] }]
//   hola_children       → { [childId]: { id, parentEmail, name, avatar, created } }
//   hola_progress_<id>  → { stars, lastLesson, streak, lastActive, timeSpent, badges, songsDone, lessonsDone, correctAnswers }
//   hola_session        → { parentEmail, activeChildId }

const db = {
  // === PARENTS ===
  getParents() { try { return JSON.parse(localStorage.getItem("hola_parents") || "[]"); } catch { return []; } },
  saveParents(p) { localStorage.setItem("hola_parents", JSON.stringify(p)); },
  findParent(email) { return db.getParents().find(p => p.email === email); },
  createParent(name, email, pass) {
    const parents = db.getParents();
    if (parents.find(p => p.email === email)) return null;
    const parent = { email, name, pass, created: Date.now(), children: [] };
    parents.push(parent);
    db.saveParents(parents);
    return parent;
  },

  // === CHILDREN ===
  getChildren() { try { return JSON.parse(localStorage.getItem("hola_children") || "{}"); } catch { return {}; } },
  saveChildren(c) { localStorage.setItem("hola_children", JSON.stringify(c)); },
  getChildrenOf(parentEmail) {
    const all = db.getChildren();
    const parent = db.findParent(parentEmail);
    if (!parent) return [];
    return (parent.children || []).map(id => all[id]).filter(Boolean);
  },
  createChild(parentEmail, name, avatar) {
    const parents = db.getParents();
    const pIdx = parents.findIndex(p => p.email === parentEmail);
    if (pIdx < 0) return null;
    const id = `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const child = { id, parentEmail, name: name.trim(), avatar: avatar || "🦊", created: Date.now() };
    const children = db.getChildren();
    children[id] = child;
    db.saveChildren(children);
    parents[pIdx].children = [...(parents[pIdx].children || []), id];
    db.saveParents(parents);
    db.saveProgress(id, { stars: {}, lastLesson: 1, streak: 0, lastActive: null, timeSpent: 0, badges: [], songsDone: {}, lessonsDone: 0, correctAnswers: 0 });
    return child;
  },
  deleteChild(childId) {
    const children = db.getChildren();
    const child = children[childId];
    if (!child) return;
    delete children[childId];
    db.saveChildren(children);
    const parents = db.getParents();
    const pIdx = parents.findIndex(p => p.email === child.parentEmail);
    if (pIdx >= 0) {
      parents[pIdx].children = (parents[pIdx].children || []).filter(id => id !== childId);
      db.saveParents(parents);
    }
    localStorage.removeItem(`hola_progress_${childId}`);
  },

  // === SESSION ===
  getSession() { try { return JSON.parse(localStorage.getItem("hola_session")); } catch { return null; } },
  setSession(s) { localStorage.setItem("hola_session", JSON.stringify(s)); },
  clearSession() { localStorage.removeItem("hola_session"); },

  // === PROGRESS ===
  getProgress(childId) {
    try {
      const p = JSON.parse(localStorage.getItem(`hola_progress_${childId}`));
      return { stars: {}, lastLesson: 1, streak: 0, lastActive: null, timeSpent: 0, badges: [], songsDone: {}, lessonsDone: 0, correctAnswers: 0, ...(p || {}) };
    } catch { return { stars: {}, lastLesson: 1, streak: 0, lastActive: null, timeSpent: 0, badges: [], songsDone: {}, lessonsDone: 0, correctAnswers: 0 }; }
  },
  saveProgress(childId, p) { localStorage.setItem(`hola_progress_${childId}`, JSON.stringify(p)); },

  // Track a daily visit to update streak
  touchStreak(childId) {
    const p = db.getProgress(childId);
    const today = new Date().toDateString();
    const last = p.lastActive ? new Date(p.lastActive).toDateString() : null;
    if (last === today) return p; // already active today
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (last === yesterday) p.streak = (p.streak || 0) + 1;
    else p.streak = 1; // reset or first time
    p.lastActive = Date.now();
    db.saveProgress(childId, p);
    return p;
  },
};

// ============================================================
// COURSE DATA — 32 LESSONS, 4 WORLDS
// ============================================================
const WORLDS = [
  { id: 1, name: "Starter Island", emoji: "🏝️", color: "#FF8C42", desc: "First words & vocab", range: [1, 8] },
  { id: 2, name: "Word Town", emoji: "🏘️", color: "#6BCB77", desc: "More vocab + A1 Challenge!", range: [9, 16] },
  { id: 3, name: "Sentence City", emoji: "🏙️", color: "#4D96FF", desc: "Sentences & grammar!", range: [17, 24] },
  { id: 4, name: "Story Land", emoji: "📖", color: "#B983FF", desc: "Past, future + A2 Final!", range: [25, 32] },
];

const L = (id, title, sub, emoji, color, bg, words, fact, phrase, sentences, gaps, story) =>
  ({ id, title, subtitle: sub, emoji, color, bg, words, funFact: fact, phrase, sentences: sentences || [], gaps: gaps || [], story: story || null });

const LESSONS = [
  L(1,"¡Hola!","Hello & Goodbye","👋","#FF8C42","#FFF3E8",[{es:"Hola",en:"Hello",say:"OH-la",emoji:"👋"},{es:"Adiós",en:"Goodbye",say:"ah-DYOS",emoji:"👋"},{es:"Buenos días",en:"Good morning",say:"BWAY-nos DEE-as",emoji:"☀️"},{es:"Buenas tardes",en:"Good afternoon",say:"BWAY-nas TAR-des",emoji:"🌤️"},{es:"Buenas noches",en:"Good night",say:"BWAY-nas NOH-ches",emoji:"🌙"},{es:"¿Qué tal?",en:"How are you?",say:"keh TAL",emoji:"😊"},{es:"Bien",en:"Good",say:"byen",emoji:"👍"},{es:"Gracias",en:"Thank you",say:"GRAH-thyass",emoji:"🙏"}],"In Spain, people say ¡Buenas! as a friendly shortcut for hello!",{es:"¡Hola! ¿Qué tal?",en:"Hello! How are you?"}),
  L(2,"Me llamo…","My name is…","📛","#B983FF","#F3EAFF",[{es:"Me llamo…",en:"My name is…",say:"meh YAH-mo",emoji:"🙋"},{es:"¿Cómo te llamas?",en:"What's your name?",say:"KOH-mo teh YAH-mas",emoji:"❓"},{es:"Mucho gusto",en:"Nice to meet you",say:"MOO-cho GOOS-to",emoji:"🤝"},{es:"Amigo",en:"Friend (boy)",say:"ah-MEE-go",emoji:"👦"},{es:"Amiga",en:"Friend (girl)",say:"ah-MEE-ga",emoji:"👧"},{es:"Sí",en:"Yes",say:"see",emoji:"✅"},{es:"No",en:"No",say:"no",emoji:"❌"},{es:"Por favor",en:"Please",say:"por fa-BOR",emoji:"🙏"}],"Boys say 'Encantado' and girls say 'Encantada'!",{es:"¡Hola! Me llamo Sol.",en:"Hello! My name is Sol."}),
  L(3,"Los números","Numbers 1–10","🔢","#FF6B6B","#FFE8E8",[{es:"Uno",en:"One",say:"OO-no",emoji:"1️⃣"},{es:"Dos",en:"Two",say:"dos",emoji:"2️⃣"},{es:"Tres",en:"Three",say:"tres",emoji:"3️⃣"},{es:"Cuatro",en:"Four",say:"KWA-tro",emoji:"4️⃣"},{es:"Cinco",en:"Five",say:"SEEN-ko",emoji:"5️⃣"},{es:"Seis",en:"Six",say:"says",emoji:"6️⃣"},{es:"Siete",en:"Seven",say:"SYEH-teh",emoji:"7️⃣"},{es:"Ocho",en:"Eight",say:"OH-cho",emoji:"8️⃣"},{es:"Nueve",en:"Nine",say:"NWEH-beh",emoji:"9️⃣"},{es:"Diez",en:"Ten",say:"dyeth",emoji:"🔟"}],"All numbers from 1 to 15 have their own special word!",{es:"Uno, dos, tres… ¡vamos!",en:"One, two, three… let's go!"}),
  L(4,"Los colores","Colours","🎨","#6BCB77","#E8F8EA",[{es:"Rojo",en:"Red",say:"ROH-ho",emoji:"🔴"},{es:"Azul",en:"Blue",say:"ah-THOOL",emoji:"🔵"},{es:"Amarillo",en:"Yellow",say:"ah-ma-REE-yo",emoji:"🟡"},{es:"Verde",en:"Green",say:"BEHR-deh",emoji:"🟢"},{es:"Naranja",en:"Orange",say:"na-RAHN-ha",emoji:"🟠"},{es:"Morado",en:"Purple",say:"mo-RAH-do",emoji:"🟣"},{es:"Negro",en:"Black",say:"NEH-gro",emoji:"⚫"},{es:"Blanco",en:"White",say:"BLAHN-ko",emoji:"⚪"}],"'Naranja' means both the fruit AND the colour! 🍊",{es:"Mi color favorito es el azul.",en:"My favourite colour is blue."}),
  L(5,"Los animales","Animals","🐶","#FF8C42","#FFF3E8",[{es:"El perro",en:"Dog",say:"el PEH-rro",emoji:"🐕"},{es:"El gato",en:"Cat",say:"el GAH-to",emoji:"🐈"},{es:"El pájaro",en:"Bird",say:"el PAH-ha-ro",emoji:"🐦"},{es:"El pez",en:"Fish",say:"el peth",emoji:"🐟"},{es:"El conejo",en:"Rabbit",say:"el ko-NEH-ho",emoji:"🐇"},{es:"El caballo",en:"Horse",say:"el ka-BAH-yo",emoji:"🐴"},{es:"La vaca",en:"Cow",say:"la BAH-ka",emoji:"🐮"},{es:"El cerdo",en:"Pig",say:"el THEHR-do",emoji:"🐷"}],"In Spain, dogs say 'guau guau'!",{es:"Me gusta el perro.",en:"I like the dog."}),
  L(6,"Mi familia","My family","👨‍👩‍👧‍👦","#FF9EC7","#FFE8F2",[{es:"Mamá",en:"Mum",say:"mah-MAH",emoji:"👩"},{es:"Papá",en:"Dad",say:"pah-PAH",emoji:"👨"},{es:"Hermano",en:"Brother",say:"er-MAH-no",emoji:"👦"},{es:"Hermana",en:"Sister",say:"er-MAH-na",emoji:"👧"},{es:"Abuelo",en:"Grandpa",say:"ah-BWAY-lo",emoji:"👴"},{es:"Abuela",en:"Grandma",say:"ah-BWAY-la",emoji:"👵"},{es:"Bebé",en:"Baby",say:"beh-BEH",emoji:"👶"},{es:"Mascota",en:"Pet",say:"mas-KOH-ta",emoji:"🐶"}],"Sunday lunch in Spain can have 20 people!",{es:"Mi mamá se llama Ana.",en:"My mum's name is Ana."}),
  L(7,"Mi cuerpo","My body","🤸","#4D96FF","#E4F0FF",[{es:"La cabeza",en:"Head",say:"la ka-BEH-tha",emoji:"😀"},{es:"Los ojos",en:"Eyes",say:"los OH-hos",emoji:"👁️"},{es:"La nariz",en:"Nose",say:"la na-REETH",emoji:"👃"},{es:"La boca",en:"Mouth",say:"la BOH-ka",emoji:"👄"},{es:"Las orejas",en:"Ears",say:"las oh-REH-has",emoji:"👂"},{es:"Las manos",en:"Hands",say:"las MAH-nos",emoji:"🖐️"},{es:"Los pies",en:"Feet",say:"los PYEHS",emoji:"🦶"},{es:"El pelo",en:"Hair",say:"el PEH-lo",emoji:"💇"}],"Spanish kids sing 'Cabeza, hombros, rodillas, pies'!",{es:"¡Toca la cabeza!",en:"Touch your head!"}),
  L(8,"¿Cómo estás?","Feelings","😊","#FFD93D","#FFFBE5",[{es:"Feliz",en:"Happy",say:"feh-LEETH",emoji:"😊"},{es:"Triste",en:"Sad",say:"TREES-teh",emoji:"😢"},{es:"Enfadado",en:"Angry",say:"en-fa-DAH-do",emoji:"😠"},{es:"Cansado",en:"Tired",say:"kan-SAH-do",emoji:"😴"},{es:"Asustado",en:"Scared",say:"ah-soos-TAH-do",emoji:"😱"},{es:"Emocionado",en:"Excited",say:"eh-mo-thyo-NAH-do",emoji:"😆"},{es:"Enfermo",en:"Sick",say:"en-FEHR-mo",emoji:"🤒"},{es:"Con hambre",en:"Hungry",say:"kon AHM-breh",emoji:"😋"}],"Boys say 'contento', girls say 'contenta'!",{es:"Estoy feliz.",en:"I am happy."}),
  L(9,"La comida","Food","🍕","#FF6B6B","#FFE8E8",[{es:"El pan",en:"Bread",say:"el PAHN",emoji:"🍞"},{es:"El queso",en:"Cheese",say:"el KEH-so",emoji:"🧀"},{es:"La leche",en:"Milk",say:"la LEH-cheh",emoji:"🥛"},{es:"El agua",en:"Water",say:"el AH-gwa",emoji:"💧"},{es:"La pizza",en:"Pizza",say:"la PEET-sa",emoji:"🍕"},{es:"El pollo",en:"Chicken",say:"el POH-yo",emoji:"🍗"},{es:"Los huevos",en:"Eggs",say:"los WEH-bos",emoji:"🥚"},{es:"El chocolate",en:"Chocolate",say:"el cho-ko-LAH-teh",emoji:"🍫"}],"Lunch in Spain isn't until 2pm!",{es:"Me gusta la pizza.",en:"I like pizza."}),
  L(10,"Las frutas","Fruit","🍎","#6BCB77","#E8F8EA",[{es:"La manzana",en:"Apple",say:"la man-THAH-na",emoji:"🍎"},{es:"El plátano",en:"Banana",say:"el PLAH-ta-no",emoji:"🍌"},{es:"La naranja",en:"Orange",say:"la na-RAHN-ha",emoji:"🍊"},{es:"La fresa",en:"Strawberry",say:"la FREH-sa",emoji:"🍓"},{es:"Las uvas",en:"Grapes",say:"las OO-bas",emoji:"🍇"},{es:"La sandía",en:"Watermelon",say:"la san-DEE-a",emoji:"🍉"},{es:"El limón",en:"Lemon",say:"el lee-MON",emoji:"🍋"},{es:"La pera",en:"Pear",say:"la PEH-ra",emoji:"🍐"}],"Spain grows loads of oranges near Valencia! 🍊",{es:"Mi fruta favorita es la fresa.",en:"My favourite fruit is the strawberry."}),
  L(11,"La playa","At the beach","🏖️","#4D96FF","#E4F0FF",[{es:"La playa",en:"Beach",say:"la PLAH-ya",emoji:"🏖️"},{es:"El mar",en:"Sea",say:"el MAR",emoji:"🌊"},{es:"El sol",en:"Sun",say:"el SOL",emoji:"☀️"},{es:"La arena",en:"Sand",say:"la ah-REH-na",emoji:"⏳"},{es:"Nadar",en:"To swim",say:"na-DAR",emoji:"🏊"},{es:"El barco",en:"Boat",say:"el BAR-ko",emoji:"⛵"},{es:"La concha",en:"Shell",say:"la KON-cha",emoji:"🐚"},{es:"El helado",en:"Ice cream",say:"el eh-LAH-do",emoji:"🍦"}],"Spain has over 5,000 km of beaches!",{es:"¡Vamos a la playa!",en:"Let's go to the beach!"}),
  L(12,"El colegio","At school","🏫","#FF8C42","#FFF3E8",[{es:"El colegio",en:"School",say:"el ko-LEH-hyo",emoji:"🏫"},{es:"El libro",en:"Book",say:"el LEE-bro",emoji:"📚"},{es:"El lápiz",en:"Pencil",say:"el LAH-peeth",emoji:"✏️"},{es:"La mochila",en:"Backpack",say:"la mo-CHEE-la",emoji:"🎒"},{es:"La profe",en:"Teacher (f)",say:"la PROH-feh",emoji:"👩‍🏫"},{es:"El profe",en:"Teacher (m)",say:"el PROH-feh",emoji:"👨‍🏫"},{es:"La clase",en:"Class",say:"la KLAH-seh",emoji:"🏫"},{es:"El recreo",en:"Break time",say:"el reh-KREH-o",emoji:"⚽"}],"Spanish kids call school 'el cole' for short!",{es:"Me gusta el colegio.",en:"I like school."}),
  L(13,"La ropa","Clothes","👕","#B983FF","#F3EAFF",[{es:"La camiseta",en:"T-shirt",say:"la ka-mee-SEH-ta",emoji:"👕"},{es:"Los pantalones",en:"Trousers",say:"los pan-ta-LOH-nes",emoji:"👖"},{es:"Las zapatillas",en:"Trainers",say:"las tha-pa-TEE-yas",emoji:"👟"},{es:"El vestido",en:"Dress",say:"el bes-TEE-do",emoji:"👗"},{es:"El abrigo",en:"Coat",say:"el ah-BREE-go",emoji:"🧥"},{es:"Los calcetines",en:"Socks",say:"los kal-theh-TEE-nes",emoji:"🧦"},{es:"El sombrero",en:"Hat",say:"el som-BREH-ro",emoji:"🎩"},{es:"Los guantes",en:"Gloves",say:"los GWAN-tes",emoji:"🧤"}],"'Sombrero' means 'shade-maker'! 🎩",{es:"Llevo una camiseta roja.",en:"I'm wearing a red T-shirt."}),
  L(14,"Mi casa","My house","🏠","#6BCB77","#E8F8EA",[{es:"La casa",en:"House",say:"la KAH-sa",emoji:"🏠"},{es:"El dormitorio",en:"Bedroom",say:"el dor-mee-TOH-ryo",emoji:"🛏️"},{es:"La cocina",en:"Kitchen",say:"la ko-THEE-na",emoji:"🍳"},{es:"El salón",en:"Living room",say:"el sa-LON",emoji:"🛋️"},{es:"El baño",en:"Bathroom",say:"el BAH-nyo",emoji:"🛁"},{es:"El jardín",en:"Garden",say:"el har-DEEN",emoji:"🌳"},{es:"La puerta",en:"Door",say:"la PWEHR-ta",emoji:"🚪"},{es:"La ventana",en:"Window",say:"la ben-TAH-na",emoji:"🪟"}],"Spanish houses have a 'terraza' for dinner under the stars!",{es:"Mi casa es grande.",en:"My house is big."}),
  L(15,"El tiempo","Days & Weather","📅","#FF9EC7","#FFE8F2",[{es:"Lunes",en:"Monday",say:"LOO-nes",emoji:"📅"},{es:"Martes",en:"Tuesday",say:"MAR-tes",emoji:"📅"},{es:"Miércoles",en:"Wednesday",say:"MYEHR-ko-les",emoji:"📅"},{es:"Sábado",en:"Saturday",say:"SAH-ba-do",emoji:"🎉"},{es:"Domingo",en:"Sunday",say:"do-MEEN-go",emoji:"🎉"},{es:"Hace sol",en:"It's sunny",say:"AH-theh SOL",emoji:"☀️"},{es:"Llueve",en:"It's raining",say:"YWEH-beh",emoji:"🌧️"},{es:"Hace frío",en:"It's cold",say:"AH-theh FREE-o",emoji:"🥶"}],"The Costa Blanca has 300+ sunny days! ☀️",{es:"Hoy es lunes y hace sol.",en:"Today is Monday and it's sunny."}),
  L(16,"A1 Final Challenge!","Test everything!","🏆","#FF6B6B","#FFE8E8",[{es:"Hola",en:"Hello",say:"OH-la",emoji:"👋"},{es:"Cinco",en:"Five",say:"SEEN-ko",emoji:"5️⃣"},{es:"Azul",en:"Blue",say:"ah-THOOL",emoji:"🔵"},{es:"El gato",en:"Cat",say:"el GAH-to",emoji:"🐈"},{es:"Hermana",en:"Sister",say:"er-MAH-na",emoji:"👧"},{es:"Triste",en:"Sad",say:"TREES-teh",emoji:"😢"},{es:"El pan",en:"Bread",say:"el PAHN",emoji:"🍞"},{es:"La manzana",en:"Apple",say:"la man-THAH-na",emoji:"🍎"},{es:"Nadar",en:"To swim",say:"na-DAR",emoji:"🏊"},{es:"Hace sol",en:"It's sunny",say:"AH-theh SOL",emoji:"☀️"}],"You've finished A1! 150+ words! Next: sentences and stories! 🎉🏆",{es:"¡Soy un campeón de español!",en:"I'm a Spanish champion!"},null,[{q:"How do you say 'Hello'?",opts:["Hola","Adiós","Gracias"],ans:0},{q:"'Azul' means:",opts:["Blue","Red","Green"],ans:0},{q:"'El gato' is:",opts:["Cat","Dog","Bird"],ans:0},{q:"'Triste' means:",opts:["Sad","Happy","Tired"],ans:0},{q:"'La manzana' is:",opts:["Apple","Orange","Banana"],ans:0},{q:"'Hace sol' means:",opts:["It's sunny","It's raining","It's cold"],ans:0}]),
  // WORLD 3
  L(17,"Yo soy…","I am…","🙋","#4D96FF","#E4F0FF",[{es:"Yo soy",en:"I am",say:"yo SOY",emoji:"🙋"},{es:"Tú eres",en:"You are",say:"too EH-res",emoji:"👉"},{es:"Él es",en:"He is",say:"el es",emoji:"👦"},{es:"Ella es",en:"She is",say:"EH-ya es",emoji:"👧"},{es:"Grande",en:"Big",say:"GRAHN-deh",emoji:"🐘"},{es:"Pequeño",en:"Small",say:"peh-KEH-nyo",emoji:"🐜"},{es:"Alto",en:"Tall",say:"AHL-to",emoji:"🦒"},{es:"Simpático",en:"Nice",say:"seem-PAH-tee-ko",emoji:"😊"}],"Drop 'yo' — 'soy' already means 'I am'!",{es:"Yo soy alto y simpático.",en:"I am tall and friendly."},[{correct:["Yo","soy","alto"],shuffle:["alto","Yo","soy"],en:"I am tall."},{correct:["Ella","es","simpática"],shuffle:["es","simpática","Ella"],en:"She is friendly."}]),
  L(18,"Yo tengo…","I have…","🎁","#FF8C42","#FFF3E8",[{es:"Yo tengo",en:"I have",say:"yo TEN-go",emoji:"🎁"},{es:"Tú tienes",en:"You have",say:"too TYEH-nes",emoji:"👉"},{es:"Un",en:"A (boy word)",say:"oon",emoji:"🔵"},{es:"Una",en:"A (girl word)",say:"OO-na",emoji:"🔴"},{es:"Años",en:"Years old",say:"AH-nyos",emoji:"🎂"},{es:"Perro",en:"Dog",say:"PEH-rro",emoji:"🐕"},{es:"Gatos",en:"Cats",say:"GAH-tos",emoji:"🐱"},{es:"Hermanos",en:"Siblings",say:"er-MAH-nos",emoji:"👧👦"}],"You 'have' years: 'Tengo diez años'!",{es:"Tengo un perro y dos gatos.",en:"I have a dog and two cats."},[{correct:["Tengo","un","perro"],shuffle:["un","Tengo","perro"],en:"I have a dog."},{correct:["Tengo","diez","años"],shuffle:["años","Tengo","diez"],en:"I am ten years old."}]),
  L(19,"Me gusta","I like…","❤️","#FF6B6B","#FFE8E8",[{es:"Me gusta",en:"I like (one thing)",say:"meh GOOS-ta",emoji:"❤️"},{es:"Me gustan",en:"I like (many)",say:"meh GOOS-tan",emoji:"❤️"},{es:"No me gusta",en:"I don't like",say:"no meh GOOS-ta",emoji:"👎"},{es:"Me encanta",en:"I love",say:"meh en-KAHN-ta",emoji:"😍"},{es:"Mucho",en:"A lot",say:"MOO-cho",emoji:"💯"},{es:"También",en:"Also",say:"tam-BYEN",emoji:"➕"},{es:"Pero",en:"But",say:"PEH-ro",emoji:"🔄"},{es:"Y",en:"And",say:"ee",emoji:"➕"}],"'Me gusta' means 'it pleases me' — backwards!",{es:"Me gusta la pizza pero no me gusta el pescado.",en:"I like pizza but not fish."},[{correct:["Me","gusta","el","chocolate"],shuffle:["chocolate","Me","el","gusta"],en:"I like chocolate."},{correct:["No","me","gustan","las","verduras"],shuffle:["verduras","No","las","me","gustan"],en:"I don't like vegetables."}]),
  L(20,"Quiero y puedo","I want / I can","💪","#6BCB77","#E8F8EA",[{es:"Quiero",en:"I want",say:"KYEH-ro",emoji:"🙏"},{es:"Puedo",en:"I can",say:"PWEH-do",emoji:"💪"},{es:"Necesito",en:"I need",say:"neh-theh-SEE-to",emoji:"❗"},{es:"Ir",en:"To go",say:"eer",emoji:"🚶"},{es:"Comprar",en:"To buy",say:"kom-PRAR",emoji:"🛒"},{es:"Jugar",en:"To play",say:"hoo-GAR",emoji:"⚽"},{es:"Comer",en:"To eat",say:"ko-MEHR",emoji:"🍽️"},{es:"Estudiar",en:"To study",say:"es-too-DYAR",emoji:"📖"}],"'Quiero' + any action word works!",{es:"Quiero jugar al fútbol.",en:"I want to play football."},[{correct:["Quiero","ir","a","la","playa"],shuffle:["la","Quiero","playa","a","ir"],en:"I want to go to the beach."},{correct:["Puedo","nadar","muy","bien"],shuffle:["bien","Puedo","muy","nadar"],en:"I can swim very well."}]),
  L(21,"¿Qué hora es?","Telling the time","🕐","#B983FF","#F3EAFF",[{es:"¿Qué hora es?",en:"What time is it?",say:"keh OH-ra es",emoji:"🕐"},{es:"Es la una",en:"It's 1 o'clock",say:"es la OO-na",emoji:"🕐"},{es:"Son las dos",en:"It's 2 o'clock",say:"son las DOS",emoji:"🕑"},{es:"Y media",en:"Half past",say:"ee MEH-dya",emoji:"🕧"},{es:"Y cuarto",en:"Quarter past",say:"ee KWAR-to",emoji:"🕐"},{es:"De la mañana",en:"In the morning",say:"deh la ma-NYAH-na",emoji:"🌅"},{es:"De la tarde",en:"In the afternoon",say:"deh la TAR-deh",emoji:"🌤️"},{es:"De la noche",en:"At night",say:"deh la NOH-cheh",emoji:"🌙"}],"Spain uses the 24-hour clock a lot!",{es:"Son las tres de la tarde.",en:"It's 3pm."},[{correct:["Son","las","dos","y","media"],shuffle:["media","Son","y","las","dos"],en:"It's half past two."}]),
  L(22,"Mi día","My daily routine","🌅","#FF9EC7","#FFE8F2",[{es:"Me despierto",en:"I wake up",say:"meh des-PYEHR-to",emoji:"⏰"},{es:"Me ducho",en:"I shower",say:"meh DOO-cho",emoji:"🚿"},{es:"Desayuno",en:"I have breakfast",say:"deh-sa-YOO-no",emoji:"🥐"},{es:"Voy al cole",en:"I go to school",say:"boy al KOH-leh",emoji:"🏫"},{es:"Como",en:"I eat lunch",say:"KOH-mo",emoji:"🍽️"},{es:"Juego",en:"I play",say:"HWEH-go",emoji:"⚽"},{es:"Ceno",en:"I have dinner",say:"THEH-no",emoji:"🍲"},{es:"Me acuesto",en:"I go to bed",say:"meh ah-KWES-to",emoji:"🛏️"}],"Spanish kids often don't sleep until 10pm!",{es:"Me despierto a las siete.",en:"I wake up at seven."},[{correct:["Me","despierto","a","las","siete"],shuffle:["siete","Me","a","despierto","las"],en:"I wake up at 7."},{correct:["Voy","al","cole","a","las","nueve"],shuffle:["nueve","las","Voy","a","cole","al"],en:"I go to school at 9."}]),
  L(23,"Es grande","Describing things","📏","#FFD93D","#FFFBE5",[{es:"Grande",en:"Big",say:"GRAHN-deh",emoji:"🐘"},{es:"Pequeño",en:"Small",say:"peh-KEH-nyo",emoji:"🐜"},{es:"Bonito",en:"Pretty",say:"bo-NEE-to",emoji:"🌸"},{es:"Feo",en:"Ugly",say:"FEH-o",emoji:"👹"},{es:"Nuevo",en:"New",say:"NWEH-bo",emoji:"✨"},{es:"Viejo",en:"Old",say:"BYEH-ho",emoji:"🏚️"},{es:"Rápido",en:"Fast",say:"RAH-pee-do",emoji:"🏎️"},{es:"Lento",en:"Slow",say:"LEN-to",emoji:"🐌"}],"Adjectives change: 'bonito' for boy, 'bonita' for girl!",{es:"El perro es grande y rápido.",en:"The dog is big and fast."},[{correct:["La","casa","es","bonita"],shuffle:["es","bonita","La","casa"],en:"The house is pretty."},{correct:["El","gato","es","pequeño"],shuffle:["pequeño","El","es","gato"],en:"The cat is small."}]),
  L(24,"Sentence Champion!","Grammar challenge!","🧩","#B983FF","#F3EAFF",[{es:"Yo soy",en:"I am",say:"yo SOY",emoji:"🙋"},{es:"Tengo",en:"I have",say:"TEN-go",emoji:"🎁"},{es:"Me gusta",en:"I like",say:"meh GOOS-ta",emoji:"❤️"},{es:"Quiero",en:"I want",say:"KYEH-ro",emoji:"🙏"},{es:"Puedo",en:"I can",say:"PWEH-do",emoji:"💪"},{es:"Grande",en:"Big",say:"GRAHN-deh",emoji:"🐘"},{es:"Bonito",en:"Pretty",say:"bo-NEE-to",emoji:"🌸"},{es:"Son las dos",en:"It's 2 o'clock",say:"son las DOS",emoji:"🕑"}],"You've finished Sentence City! 🚀",{es:"Soy inteligente y me gusta España.",en:"I'm clever and I like Spain."},[{correct:["Me","gusta","mucho","el","chocolate"],shuffle:["chocolate","mucho","Me","el","gusta"],en:"I really like chocolate."},{correct:["Tengo","una","hermana","pequeña"],shuffle:["pequeña","hermana","Tengo","una"],en:"I have a little sister."},{correct:["Quiero","ir","a","la","playa"],shuffle:["playa","la","Quiero","a","ir"],en:"I want to go to the beach."}],[{q:"'Tengo un perro' means:",opts:["I have a dog","I am a dog","I like dogs"],ans:0},{q:"'La casa es bonita' means:",opts:["The house is pretty","The house is big","The house is old"],ans:0},{q:"'Puedo nadar' means:",opts:["I can swim","I want to swim","I like swimming"],ans:0}]),
  // WORLD 4
  L(25,"Ayer…","Yesterday (past)","⏪","#4D96FF","#E4F0FF",[{es:"Ayer",en:"Yesterday",say:"ah-YEHR",emoji:"⏪"},{es:"Fui",en:"I went",say:"fwee",emoji:"🚶"},{es:"Comí",en:"I ate",say:"ko-MEE",emoji:"🍽️"},{es:"Jugué",en:"I played",say:"hoo-GEH",emoji:"⚽"},{es:"Vi",en:"I saw",say:"bee",emoji:"👀"},{es:"Compré",en:"I bought",say:"kom-PREH",emoji:"🛒"},{es:"Hablé",en:"I spoke",say:"ah-BLEH",emoji:"🗣️"},{es:"Nadé",en:"I swam",say:"na-DEH",emoji:"🏊"}],"Past tense words often end in -É or -Í!",{es:"Ayer fui a la playa.",en:"Yesterday I went to the beach."},[{correct:["Ayer","comí","pizza"],shuffle:["pizza","comí","Ayer"],en:"Yesterday I ate pizza."},{correct:["Ayer","jugué","al","fútbol"],shuffle:["al","jugué","fútbol","Ayer"],en:"Yesterday I played football."}],[{q:"Ayer ___ al parque.",opts:["fui","voy","ir"],ans:0},{q:"Ayer ___ una pizza.",opts:["como","comí","comer"],ans:1}]),
  L(26,"Mañana…","Tomorrow (future)","⏩","#6BCB77","#E8F8EA",[{es:"Mañana",en:"Tomorrow",say:"ma-NYAH-na",emoji:"⏩"},{es:"Voy a",en:"I'm going to",say:"boy ah",emoji:"🚀"},{es:"Voy a ir",en:"I'm going to go",say:"boy ah EER",emoji:"🚶"},{es:"Voy a comer",en:"I'm going to eat",say:"boy ah ko-MEHR",emoji:"🍽️"},{es:"Voy a jugar",en:"I'm going to play",say:"boy ah hoo-GAR",emoji:"⚽"},{es:"Voy a nadar",en:"I'm going to swim",say:"boy ah na-DAR",emoji:"🏊"},{es:"Esta tarde",en:"This afternoon",say:"ES-ta TAR-deh",emoji:"🌤️"},{es:"El fin de semana",en:"The weekend",say:"el feen deh seh-MAH-na",emoji:"🎉"}],"Say 'Voy a' + any action word for the future!",{es:"Mañana voy a ir a la playa.",en:"Tomorrow I'm going to the beach."},[{correct:["Voy","a","jugar","al","fútbol"],shuffle:["al","jugar","Voy","fútbol","a"],en:"I'm going to play football."},{correct:["Mañana","voy","a","nadar"],shuffle:["nadar","Mañana","a","voy"],en:"Tomorrow I'm going to swim."}],[{q:"'Voy a comer' means:",opts:["I'm going to eat","I ate","I'm eating"],ans:0}]),
  L(27,"En el restaurante","At the restaurant","🍽️","#FF8C42","#FFF3E8",[{es:"La carta",en:"The menu",say:"la KAR-ta",emoji:"📋"},{es:"Quiero",en:"I'd like",say:"KYEH-ro",emoji:"🙏"},{es:"La cuenta",en:"The bill",say:"la KWEN-ta",emoji:"💰"},{es:"La carne",en:"Meat",say:"la KAR-neh",emoji:"🥩"},{es:"El pescado",en:"Fish",say:"el pes-KAH-do",emoji:"🐟"},{es:"La sopa",en:"Soup",say:"la SOH-pa",emoji:"🍲"},{es:"De postre",en:"For dessert",say:"deh POS-treh",emoji:"🍰"},{es:"¿Me trae…?",en:"Can you bring me…?",say:"meh TRAH-eh",emoji:"🙋"}],"'Menú del día' = 3 courses for under €12!",{es:"Quiero la sopa, por favor.",en:"I'd like the soup, please."},[{correct:["Quiero","el","pollo","por","favor"],shuffle:["favor","pollo","Quiero","por","el"],en:"I'd like chicken please."},{correct:["La","cuenta","por","favor"],shuffle:["cuenta","favor","La","por"],en:"The bill please."}]),
  L(28,"De compras","Shopping","🛍️","#B983FF","#F3EAFF",[{es:"¿Cuánto cuesta?",en:"How much?",say:"KWAN-to KWES-ta",emoji:"💰"},{es:"Barato",en:"Cheap",say:"ba-RAH-to",emoji:"👍"},{es:"Caro",en:"Expensive",say:"KAH-ro",emoji:"💎"},{es:"La tienda",en:"Shop",say:"la TYEN-da",emoji:"🏪"},{es:"Comprar",en:"To buy",say:"kom-PRAR",emoji:"🛒"},{es:"El dinero",en:"Money",say:"el dee-NEH-ro",emoji:"💰"},{es:"La talla",en:"Size",say:"la TAH-ya",emoji:"📏"},{es:"Me lo llevo",en:"I'll take it",say:"meh lo YEH-bo",emoji:"🛍️"}],"Most shops close from 2pm to 5pm for lunch!",{es:"¿Cuánto cuesta la camiseta?",en:"How much does the T-shirt cost?"},[{correct:["¿Cuánto","cuesta","el","libro?"],shuffle:["libro?","cuesta","¿Cuánto","el"],en:"How much does the book cost?"}]),
  L(29,"¿Dónde está?","Directions","🗺️","#FF6B6B","#FFE8E8",[{es:"¿Dónde está?",en:"Where is it?",say:"DON-deh es-TAH",emoji:"❓"},{es:"A la derecha",en:"On the right",say:"a la deh-REH-cha",emoji:"👉"},{es:"A la izquierda",en:"On the left",say:"a la eeth-KYEHR-da",emoji:"👈"},{es:"Todo recto",en:"Straight on",say:"TOH-do RREK-to",emoji:"⬆️"},{es:"Cerca",en:"Near",say:"THEHR-ka",emoji:"📍"},{es:"Lejos",en:"Far",say:"LEH-hos",emoji:"🔭"},{es:"Aquí",en:"Here",say:"ah-KEE",emoji:"📌"},{es:"Allí",en:"There",say:"ah-YEE",emoji:"👉"}],"Spaniards love using roundabouts for directions!",{es:"¿Dónde está la playa?",en:"Where is the beach?"},[{correct:["La","playa","está","cerca"],shuffle:["cerca","La","está","playa"],en:"The beach is near."}]),
  L(30,"Me duele…","Health","🏥","#6BCB77","#E8F8EA",[{es:"Me duele",en:"It hurts",say:"meh DWEH-leh",emoji:"🤕"},{es:"La cabeza",en:"Head",say:"la ka-BEH-tha",emoji:"🤯"},{es:"El estómago",en:"Stomach",say:"el es-TOH-ma-go",emoji:"🤢"},{es:"La garganta",en:"Throat",say:"la gar-GAN-ta",emoji:"😷"},{es:"Estoy enfermo",en:"I'm sick",say:"es-TOY en-FEHR-mo",emoji:"🤒"},{es:"La farmacia",en:"Pharmacy",say:"la far-MAH-thya",emoji:"💊"},{es:"El médico",en:"Doctor",say:"el MEH-dee-ko",emoji:"👨‍⚕️"},{es:"Necesito",en:"I need",say:"neh-theh-SEE-to",emoji:"❗"}],"Pharmacists in Spain help with many small problems!",{es:"Me duele la cabeza.",en:"My head hurts."},[{correct:["Me","duele","el","estómago"],shuffle:["estómago","Me","el","duele"],en:"My stomach hurts."}]),
  L(31,"Un cuento","Story time","📖","#FF9EC7","#FFE8F2",[{es:"Había una vez",en:"Once upon a time",say:"ah-BEE-a OO-na beth",emoji:"📖"},{es:"El niño",en:"The boy",say:"el NEE-nyo",emoji:"👦"},{es:"La niña",en:"The girl",say:"la NEE-nya",emoji:"👧"},{es:"Fue",en:"He/she went",say:"fweh",emoji:"🚶"},{es:"Encontró",en:"Found",say:"en-kon-TRO",emoji:"🔍"},{es:"Dijo",en:"Said",say:"DEE-ho",emoji:"💬"},{es:"Muy contento",en:"Very happy",say:"mooy kon-TEN-to",emoji:"😊"},{es:"Fin",en:"The end",say:"feen",emoji:"🔚"}],"Spanish stories begin with 'Había una vez'!",{es:"Había una vez un niño muy valiente.",en:"Once upon a time a very brave boy."},[{correct:["El","niño","fue","a","la","playa"],shuffle:["playa","fue","El","la","a","niño"],en:"The boy went to the beach."}],null,{title:"The Boy and the Shell",paras:["Había una vez un niño. Se llamaba Pablo. Pablo fue a la playa con su familia.","En la playa, Pablo encontró una concha muy bonita. Era grande y rosa.","Pablo dijo: '¡Mira, mamá!' Su mamá dijo: '¡Qué bonita!' Pablo estaba muy contento. Fin."],qs:[{q:"Where did Pablo go?",opts:["The beach","School","The shop"],ans:0},{q:"What did he find?",opts:["A shell","A fish","A book"],ans:0},{q:"How did Pablo feel?",opts:["Very happy","Sad","Scared"],ans:0}]}),
  L(32,"¡Super Campeón!","A2 Final Challenge","🏆","#FFD93D","#FFFBE5",[{es:"Me gusta",en:"I like",say:"meh GOOS-ta",emoji:"❤️"},{es:"Quiero",en:"I want",say:"KYEH-ro",emoji:"🙏"},{es:"Ayer fui",en:"Yesterday I went",say:"ah-YEHR fwee",emoji:"⏪"},{es:"Voy a ir",en:"I'm going to go",say:"boy ah EER",emoji:"⏩"},{es:"Me duele",en:"It hurts",say:"meh DWEH-leh",emoji:"🤕"},{es:"¿Cuánto cuesta?",en:"How much?",say:"KWAN-to KWES-ta",emoji:"💰"},{es:"Tengo",en:"I have",say:"TEN-go",emoji:"🎁"},{es:"¡Soy un campeón!",en:"I'm a champion!",say:"soy oon kam-peh-ON",emoji:"🏆"}],"You finished EVERYTHING! 300+ words, sentences, past, future, stories! 🎉🏆",{es:"¡Soy un super campeón del español!",en:"I'm a super Spanish champion!"},[{correct:["Ayer","fui","a","la","playa"],shuffle:["playa","fui","Ayer","la","a"],en:"Yesterday I went to the beach."},{correct:["Me","gusta","mucho","el","chocolate"],shuffle:["chocolate","mucho","Me","el","gusta"],en:"I really like chocolate."}],[{q:"'Ayer comí pizza' means:",opts:["Yesterday I ate pizza","Tomorrow I'll eat pizza","I eat pizza"],ans:0},{q:"'Voy a nadar' means:",opts:["I'm going to swim","I swam","I like swimming"],ans:0},{q:"'Me duele la cabeza' means:",opts:["My head hurts","I have a head","I like my head"],ans:0}]),
];

// ============================================================
// STORIES — one per lesson, using each lesson's vocabulary
// ============================================================
const STORIES = {
  1:{title:"Sol's Morning",paras:["Sol is a little sun who lives in Spain. Every morning, Sol wakes up and says: '¡Buenos días!' to the sky.","Sol sees a cloud and says '¡Hola! ¿Qué tal?' The cloud says 'Bien, gracias.' They are friends!","At the end of the day, Sol says '¡Buenas noches!' and '¡Adiós!' to the moon. Then Sol goes to sleep."],qs:[{q:"What does Sol say in the morning?",opts:["¡Buenos días!","¡Buenas noches!","¡Adiós!"],ans:0},{q:"Who does Sol talk to?",opts:["A cloud","A fish","A cat"],ans:0},{q:"What does Sol say at night?",opts:["¡Buenas noches!","¡Buenos días!","¡Hola!"],ans:0}]},
  2:{title:"Two New Friends",paras:["A boy called Marco goes to the park. He sees a girl and says '¡Hola! Me llamo Marco. ¿Cómo te llamas?'","The girl says 'Me llamo Lucía. Mucho gusto.' Marco says 'Encantado.' They are now amigos!","Marco says '¡Adiós, amiga!' Lucía says '¡Adiós, amigo!' They are very happy. Sí, sí, sí!"],qs:[{q:"What is the boy's name?",opts:["Marco","Pablo","Sol"],ans:0},{q:"What does 'mucho gusto' mean?",opts:["Nice to meet you","Goodbye","Thank you"],ans:0},{q:"Are Marco and Lucía friends?",opts:["Yes","No","Maybe"],ans:0}]},
  3:{title:"The Counting Race",paras:["Five ducks walk to the pond. Uno, dos, tres, cuatro, cinco. They love to swim!","Three more ducks come. Seis, siete, ocho. Now there are ocho ducks in total!","Then two more arrive. Nueve, diez! '¡Diez!' shout all the ducks. It's a duck party!"],qs:[{q:"How many ducks were there at first?",opts:["Cinco (five)","Tres (three)","Diez (ten)"],ans:0},{q:"How many arrived next?",opts:["Tres (three)","Dos (two)","Cinco (five)"],ans:0},{q:"How many ducks in total at the end?",opts:["Diez (ten)","Ocho (eight)","Seis (six)"],ans:0}]},
  4:{title:"The Magic Paintbrush",paras:["Marta has a magic paintbrush. She paints the sky azul and the sun amarillo.","She paints the grass verde and the flowers rojo and naranja. '¡Qué bonito!' she says.","Then she paints a rainbow — rojo, naranja, amarillo, verde, azul, morado! It is the most beautiful painting."],qs:[{q:"What colour is the sky?",opts:["Azul (blue)","Rojo (red)","Negro (black)"],ans:0},{q:"What colour are the flowers?",opts:["Rojo and naranja","Azul and verde","Negro and blanco"],ans:0},{q:"What does Marta paint last?",opts:["A rainbow","A house","A cat"],ans:0}]},
  5:{title:"The Farm Visit",paras:["Lucas visits a farm. He sees un perro, un gato, and un caballo. '¡Hola, animales!' he says.","A vaca says 'Muuu!' and a cerdo says 'Oink!' Lucas laughs. He sees un pájaro in the sky.","His favourite animal is el conejo. It is small and white. '¡Me gusta el conejo!' says Lucas."],qs:[{q:"Where does Lucas go?",opts:["A farm","The beach","School"],ans:0},{q:"Which animal says 'Muuu'?",opts:["La vaca (cow)","El perro (dog)","El gato (cat)"],ans:0},{q:"What is Lucas's favourite animal?",opts:["El conejo (rabbit)","El caballo (horse)","El cerdo (pig)"],ans:0}]},
  6:{title:"Grandma's Birthday",paras:["Today is abuela's birthday! Mamá makes a big cake. Papá buys flowers. The whole familia is coming!","Hermano and hermana make a card that says '¡Feliz cumpleaños, abuela!'","Even the bebé claps and laughs! The mascota, a little perro, eats some cake too! It is a happy día for the familia."],qs:[{q:"Whose birthday is it?",opts:["Abuela's (grandma)","Mamá's (mum)","Hermano's (brother)"],ans:0},{q:"Who makes the cake?",opts:["Mamá","Papá","Hermana"],ans:0},{q:"What does the mascota eat?",opts:["Cake","Flowers","The card"],ans:0}]},
  7:{title:"The Silly Robot",paras:["There is a robot in the park. Children shout body parts and the robot touches them! '¡Cabeza!' — the robot touches its head.","'¡Nariz!' — it touches its nose. '¡Pies!' — it wiggles its feet. Everyone laughs!","Then someone shouts '¡Orejas!' but the robot touches its boca instead! '¡No, no! ¡Orejas!' The robot is very silly but very fun."],qs:[{q:"Where is the robot?",opts:["In the park","At school","At home"],ans:0},{q:"What does the robot touch when they say 'nariz'?",opts:["Its nose","Its ears","Its feet"],ans:0},{q:"What mistake does the robot make?",opts:["It touches its mouth instead of ears","It falls over","It runs away"],ans:0}]},
  8:{title:"The Feelings Day",paras:["Monday: Luna is feliz because it's sunny. Tuesday: she is triste because her friend is sick.","Wednesday: Luna is enfadada because her hermano eats her chocolate! Thursday: she is cansada after a long school day.","Friday: Luna is emocionada because tomorrow is Saturday! No school! She is very, very feliz."],qs:[{q:"How does Luna feel on Monday?",opts:["Feliz (happy)","Triste (sad)","Enfadada (angry)"],ans:0},{q:"Why is she enfadada on Wednesday?",opts:["Her brother ate her chocolate","It's raining","She lost her toy"],ans:0},{q:"Why is she emocionada on Friday?",opts:["Tomorrow is Saturday","She got a present","Her friend visited"],ans:0}]},
  9:{title:"The Picnic",paras:["Sofía makes a picnic. She takes pan, queso, and agua. '¡Vamos al parque!' she says.","Her amigo Carlos brings pollo and chocolate. '¡Me gusta mucho el chocolate!' says Carlos.","They eat everything! Pan with queso, pollo, and chocolate for dessert. They drink leche and agua. '¡Qué rico!' (How tasty!)"],qs:[{q:"What does Sofía bring?",opts:["Pan, queso, agua","Pizza, pollo","Chocolate, leche"],ans:0},{q:"Who brings the chocolate?",opts:["Carlos","Sofía","Mamá"],ans:0},{q:"What does '¡Qué rico!' mean?",opts:["How tasty!","How big!","How funny!"],ans:0}]},
  10:{title:"The Fruit Market",paras:["Every Saturday, Pedro goes to the fruit market with his abuela. They buy manzanas, plátanos, and naranjas.","Pedro sees fresas! '¡Me gustan las fresas!' he says. Abuela buys a big box.","At home, they make a fruit salad with manzana, plátano, fresa, and pera. Pedro's favourite fruit is la sandía, but it's too big for the salad!"],qs:[{q:"Who does Pedro go to the market with?",opts:["His abuela (grandma)","His mamá (mum)","His amigo (friend)"],ans:0},{q:"Which fruit does Pedro love?",opts:["Fresas (strawberries)","Limones (lemons)","Uvas (grapes)"],ans:0},{q:"What is Pedro's favourite fruit?",opts:["La sandía (watermelon)","La pera (pear)","La naranja (orange)"],ans:0}]},
  11:{title:"A Day at the Beach",paras:["It's a hot day! María goes to la playa with her familia. The sol is very bright. She can see the mar — it's azul!","María builds a big castillo de arena. She finds three conchas on the sand — one is rosa, one is blanca, and one is naranja.","Then she goes to nadar in the mar. After swimming, she eats un helado. '¡Me encanta la playa!' she says."],qs:[{q:"What does María build?",opts:["A sand castle","A boat","A house"],ans:0},{q:"How many shells does she find?",opts:["Three","Five","One"],ans:0},{q:"What does she eat after swimming?",opts:["Ice cream","Pizza","Bread"],ans:0}]},
  12:{title:"The New School",paras:["Today is Tomás's first day at his new colegio. He puts his libro and lápiz in his mochila.","The profe says '¡Buenos días, clase!' Tomás sits down. He meets a new amigo called Diego.","At el recreo, they play football. '¡Me gusta este colegio!' says Tomás. He is feliz."],qs:[{q:"What does Tomás put in his mochila?",opts:["A libro and lápiz","Food and water","Toys"],ans:0},{q:"Who is Tomás's new friend?",opts:["Diego","Carlos","Pablo"],ans:0},{q:"What do they do at el recreo?",opts:["Play football","Read books","Sleep"],ans:0}]},
  13:{title:"The Fashion Show",paras:["Clara and her hermana play 'fashion show' at home. Clara wears a camiseta roja and pantalones azules.","Her hermana wears a vestido morado and a sombrero grande. '¡Qué bonito!' says mamá.","Then the perro runs in wearing calcetines on his ears! Everyone laughs. '¡El perro es el mejor modelo!' (The dog is the best model!)"],qs:[{q:"What colour is Clara's camiseta?",opts:["Roja (red)","Azul (blue)","Verde (green)"],ans:0},{q:"What does the hermana wear?",opts:["A vestido and sombrero","Pantalones and zapatillas","An abrigo and guantes"],ans:0},{q:"Who is the best 'model'?",opts:["The dog","Clara","Hermana"],ans:0}]},
  14:{title:"The New House",paras:["The García family moves to a new casa in Spain. It has four rooms: a big salón, a cocina, a baño, and two dormitorios.","The children love the jardín — it has a big tree and flowers. '¡Mira, una puerta azul!' (Look, a blue door!) says Pablo.","From the ventana, they can see the mountains. '¡Esta casa es muy bonita!' says mamá. Everyone is feliz."],qs:[{q:"How many dormitorios does the house have?",opts:["Two","Three","One"],ans:0},{q:"What colour is the door?",opts:["Azul (blue)","Roja (red)","Blanca (white)"],ans:0},{q:"What can they see from the ventana?",opts:["Mountains","The sea","A park"],ans:0}]},
  15:{title:"The Weather Week",paras:["On lunes, it's sunny — hace sol! On martes, it's cloudy. On miércoles, llueve all day. The children stay inside.","On sábado, hace sol again! The children go to the park. But hace frío — they need their abrigos.","On domingo, the whole family goes to the beach. '¡Qué buen tiempo!' (What nice weather!) says papá."],qs:[{q:"What's the weather on lunes?",opts:["Sunny (hace sol)","Rainy (llueve)","Cold (hace frío)"],ans:0},{q:"What day does it rain?",opts:["Miércoles (Wednesday)","Sábado (Saturday)","Domingo (Sunday)"],ans:0},{q:"Where do they go on domingo?",opts:["The beach","The park","School"],ans:0}]},
  16:{title:"The Spanish Champion",paras:["You have learned so many words! You know greetings — ¡Hola! ¡Adiós! You know colours — rojo, azul, verde.","You know animals — el perro, el gato. You know your family — mamá, papá, hermano, hermana.","You know feelings — feliz, triste. You know food — pan, queso, pizza. ¡Eres un campeón de A1!"],qs:[{q:"What does '¡Hola!' mean?",opts:["Hello!","Goodbye!","Thank you!"],ans:0},{q:"What is 'el perro'?",opts:["Dog","Cat","Bird"],ans:0},{q:"What does 'feliz' mean?",opts:["Happy","Sad","Angry"],ans:0}]},
  17:{title:"Who Am I?",paras:["'Yo soy grande,' says the elefante. 'Yo soy pequeño,' says the ratón (mouse). 'Yo soy alto,' says the jirafa (giraffe).","'¿Y tú? ¿Quién eres?' asks the elefante to a child. The child thinks...","'Yo soy simpático y un poco pequeño... ¡pero soy muy valiente!' Everyone laughs. Tú eres fantástico!"],qs:[{q:"Who says 'Yo soy grande'?",opts:["The elephant","The mouse","The giraffe"],ans:0},{q:"Who is 'alto' (tall)?",opts:["The giraffe","The elephant","The mouse"],ans:0},{q:"What does the child say about themselves?",opts:["Simpático and valiente","Grande and alto","Pequeño and triste"],ans:0}]},
  18:{title:"The Birthday Party",paras:["Marta has a birthday party. 'Tengo ocho años!' she says. She has un perro and dos gatos at home.","Her amigo Luis says 'Tengo un regalo para ti!' It is a libro about animales. Marta has many regalos.","'Tengo un hermano and una hermana,' says Marta. 'We are a big familia!' Everyone eats tarta and is feliz."],qs:[{q:"How old is Marta?",opts:["Ocho (eight)","Seis (six)","Diez (ten)"],ans:0},{q:"How many cats does Marta have?",opts:["Dos (two)","Uno (one)","Tres (three)"],ans:0},{q:"What present does Luis give?",opts:["A book about animals","A ball","Chocolate"],ans:0}]},
  19:{title:"The Picky Eater",paras:["Jaime is picky. 'No me gusta la sopa. No me gustan las verduras. No me gusta el pescado,' he says every day.","But then mamá makes chocolate cake. '¡Me encanta el chocolate!' says Jaime. 'Y me gusta la tarta también!'","Mamá laughs. 'OK, but you need to eat vegetables too.' Jaime thinks. '...Me gusta la pizza con verduras.' Mamá is happy!"],qs:[{q:"What does Jaime NOT like?",opts:["Soup, vegetables, fish","Pizza, chocolate, cake","Bread, cheese, milk"],ans:0},{q:"What does Jaime love?",opts:["Chocolate","Fish","Soup"],ans:0},{q:"What compromise does Jaime make?",opts:["Pizza with vegetables","Soup with chocolate","Fish with cake"],ans:0}]},
  20:{title:"The Adventure Plan",paras:["'Quiero ir a la playa,' says Ana. 'Puedo nadar muy bien!' Her hermano says 'Quiero jugar al fútbol.'","Mamá says 'Necesito comprar comida primero.' They go to the tienda. Ana wants to buy helado.","After the tienda, they go to the playa. Ana can swim, hermano can play, and they all eat helado. ¡Perfecto!"],qs:[{q:"Where does Ana want to go?",opts:["The beach","School","The park"],ans:0},{q:"What does mamá need to do first?",opts:["Buy food","Cook dinner","Clean the house"],ans:0},{q:"What does Ana want to buy?",opts:["Ice cream","A book","Trainers"],ans:0}]},
  21:{title:"The Clock Tower",paras:["In the middle of the town there is a big clock tower. At es la una it rings ONCE. BONG! At son las dos it rings TWICE. BONG BONG!","School starts at son las nueve de la mañana. Lunch is at son las dos y media. Home time is at son las cuatro.","At night, son las diez de la noche, the clock rings TEN times! All the children are in bed. ¡Buenas noches!"],qs:[{q:"How many times does the clock ring at 'es la una'?",opts:["Once","Twice","Three times"],ans:0},{q:"What time is lunch?",opts:["Son las dos y media (2:30)","Son las tres (3:00)","Es la una (1:00)"],ans:0},{q:"What time do children go to bed?",opts:["Son las diez de la noche (10pm)","Son las ocho (8pm)","Son las seis (6pm)"],ans:0}]},
  22:{title:"Carlos's Day",paras:["Carlos se despierta at seven. He se ducha and then desayuna cereal with leche. At half past eight, he va al cole.","At two o'clock, Carlos comes home and como pasta. In the afternoon, he juega football with his amigos.","At nine, Carlos cena with his familia. At ten, me acuesto. '¡Buenas noches!' Carlos has had a great day!"],qs:[{q:"What time does Carlos wake up?",opts:["Seven","Six","Eight"],ans:0},{q:"What does he have for breakfast?",opts:["Cereal with milk","Toast","Pizza"],ans:0},{q:"What does Carlos do in the afternoon?",opts:["Plays football","Studies","Sleeps"],ans:0}]},
  23:{title:"The Opposite Animals",paras:["In the zoo, the elefante is grande and the ratón is pequeño. The caballo is rápido but the tortuga (tortoise) is lento.","The flamingo is bonito and rosa. The spider is feo but interesante! The bebé panda is nuevo — he was born today!","'This zoo is fantástico!' say the children. Some animals are viejos, some are new, some are fast, some are slow — but they are all wonderful!"],qs:[{q:"Which animal is grande?",opts:["The elephant","The mouse","The flamingo"],ans:0},{q:"Which animal is lento (slow)?",opts:["The tortoise","The horse","The panda"],ans:0},{q:"What colour is the flamingo?",opts:["Rosa (pink)","Azul (blue)","Verde (green)"],ans:0}]},
  24:{title:"The Sentence Champion",paras:["You can now build sentences! 'Yo soy alto.' 'Tengo un perro.' 'Me gusta el chocolate.' 'Quiero ir a la playa.'","You know how to describe things: 'La casa es bonita.' 'El gato es pequeño.' 'Mi perro es rápido.'","You can tell the time and describe your day. ¡Eres un campeón de Sentence City! 🏆"],qs:[{q:"'Yo soy alto' means:",opts:["I am tall","I have a dog","I like chocolate"],ans:0},{q:"'La casa es bonita' means:",opts:["The house is pretty","The cat is small","I want to go"],ans:0},{q:"What level have you completed?",opts:["Sentence City","Starter Island","Story Land"],ans:0}]},
  25:{title:"Yesterday's Adventure",paras:["Ayer, Pablo fui al parque con su perro. They walked, ran, and played all morning.","Después, Pablo comí un bocadillo and drank water. He saw a pájaro — it was azul and very bonito.","He jugó fútbol with his friends and then compró a helado. 'Ayer was the best day!' said Pablo."],qs:[{q:"Where did Pablo go yesterday?",opts:["The park","The beach","School"],ans:0},{q:"What did Pablo eat?",opts:["A bocadillo (sandwich)","Pizza","Pasta"],ans:0},{q:"What did Pablo buy?",opts:["Ice cream","A book","A ball"],ans:0}]},
  26:{title:"Big Plans",paras:["'Mañana voy a ir a la playa,' says Sofía. 'Voy a nadar in the sea and build a castillo de arena!'","Her hermano says 'Voy a jugar al fútbol on the sand.' Mamá says 'Voy a comer paella!'","'This weekend is going to be amazing,' says Sofía. '¡Vamos a la playa!'"],qs:[{q:"When are they going to the beach?",opts:["Tomorrow","Yesterday","Today"],ans:0},{q:"What is Sofía going to build?",opts:["A sand castle","A boat","A house"],ans:0},{q:"What is mamá going to eat?",opts:["Paella","Pizza","Pasta"],ans:0}]},
  27:{title:"Dinner at the Restaurant",paras:["The García family goes to a restaurant. The waiter brings la carta. 'Quiero la sopa,' says mamá. 'Quiero el pollo,' says papá.","The children order pescado and patatas fritas. 'De postre, quiero helado, por favor,' says Lucía.","After the meal, papá says 'La cuenta, por favor.' The food was delicious. '¡Qué rico!' says everyone."],qs:[{q:"What does mamá order?",opts:["Soup","Chicken","Fish"],ans:0},{q:"What does Lucía want for dessert?",opts:["Ice cream","Cake","Fruit"],ans:0},{q:"What does papá ask for at the end?",opts:["The bill (la cuenta)","More food","The menu"],ans:0}]},
  28:{title:"Shopping Day",paras:["Ana goes to la tienda with mamá. She sees a camiseta azul. '¿Cuánto cuesta?' asks mamá. 'Quince euros,' says the shop lady.","'That's quite barato!' says mamá. But then Ana sees a vestido. It costs 80 euros! 'That's very caro,' says mamá.","In the end, Ana buys the camiseta. 'Me lo llevo!' she says. She uses her birthday dinero to pay. She is very feliz!"],qs:[{q:"How much is the camiseta?",opts:["Quince (15) euros","Ochenta (80) euros","Cinco (5) euros"],ans:0},{q:"Why don't they buy the dress?",opts:["It's too expensive (caro)","It's ugly","It's too small"],ans:0},{q:"How does Ana pay?",opts:["With birthday money","With a card","Mamá pays"],ans:0}]},
  29:{title:"The Lost Dog",paras:["Pedro's perro Coco is lost! '¿Dónde está Coco?' Pedro asks a lady. 'I don't know,' she says. Pedro is triste.","Pedro asks a man: '¿Dónde está el parque?' The man says 'Todo recto and then a la derecha.' The park is cerca!","Pedro runs to the park. And there is Coco! He's playing with other perros! '¡Aquí estás!' says Pedro. He is very feliz."],qs:[{q:"What is lost?",opts:["Pedro's dog","Pedro's ball","Pedro's book"],ans:0},{q:"Where is the park?",opts:["Straight on then right","On the left","Very far away"],ans:0},{q:"Where does Pedro find Coco?",opts:["In the park","At school","At home"],ans:0}]},
  30:{title:"The School Nurse",paras:["Marta feels terrible at school. 'Me duele la cabeza,' she tells la profe. The profe sends her to the nurse.","The nurse asks: '¿Te duele el estómago?' Marta says 'No, me duele la garganta también.' She is enfermo.","The nurse says 'Necesitas ir a la farmacia con tu mamá.' Mamá comes and takes her to el médico. After some medicine, Marta feels much better!"],qs:[{q:"What hurts first?",opts:["La cabeza (head)","El estómago (stomach)","Los pies (feet)"],ans:0},{q:"What else hurts?",opts:["La garganta (throat)","Las manos (hands)","Los ojos (eyes)"],ans:0},{q:"Where does mamá take Marta?",opts:["To the doctor","To the beach","To school"],ans:0}]},
  32:{title:"The Super Champion",paras:["You started with just 'Hola!' Now you can say SO much more! You can talk about the past: 'Ayer fui a la playa.'","You can talk about the future: 'Mañana voy a jugar.' You can order food, go shopping, give directions, and tell stories!","You know over 300 Spanish words. You are a SUPER CAMPEÓN! ¡Felicidades! (Congratulations!) 🏆🌟"],qs:[{q:"'Ayer fui a la playa' talks about:",opts:["The past (yesterday)","The future (tomorrow)","Right now"],ans:0},{q:"'Mañana voy a jugar' talks about:",opts:["The future (tomorrow)","The past (yesterday)","Right now"],ans:0},{q:"How many words have you learned?",opts:["Over 300","Over 50","Over 10"],ans:0}]},
};

// Patch stories onto lessons (lesson 31 already has one)
LESSONS.forEach(l => { if (STORIES[l.id] && !l.story) l.story = STORIES[l.id]; });

// ============================================================
// SONGS — classic Spanish kids' songs with karaoke lyrics
// ============================================================
const SONGS = [
  // WORLD 1 — Classic farm & animal songs
  {
    id: "pollitos", title: "Los pollitos dicen", subtitle: "The little chicks say", emoji: "🐥",
    color: "#FFD93D", bg: "#FFFBE5", youtubeId: "nf5tvAWmvIo", channel: "LiaChaCha",
    about: "A classic song about baby chicks calling for their mother when hungry or cold.",
    lines: [
      { es: "Los pollitos dicen:", en: "The little chicks say:" },
      { es: "pío, pío, pío,", en: "peep, peep, peep," },
      { es: "cuando tienen hambre,", en: "when they are hungry," },
      { es: "cuando tienen frío.", en: "when they are cold." },
      { es: "La gallina busca", en: "The hen looks for" },
      { es: "el maíz y el trigo,", en: "the corn and the wheat," },
      { es: "les da la comida", en: "she gives them food" },
      { es: "y les presta abrigo.", en: "and keeps them warm." },
    ]
  },
  {
    id: "vaca_lola", title: "La vaca Lola", subtitle: "Lola the cow", emoji: "🐮",
    color: "#FF8C42", bg: "#FFF3E8", youtubeId: "y-q9emjHJ2w", channel: "Toy Cantando",
    about: "The most famous cow in Spanish kids' songs! Everyone knows Lola.",
    lines: [
      { es: "La vaca Lola,", en: "Lola the cow," },
      { es: "la vaca Lola,", en: "Lola the cow," },
      { es: "tiene cabeza", en: "has a head" },
      { es: "y tiene cola,", en: "and has a tail," },
      { es: "la vaca Lola.", en: "Lola the cow." },
      { es: "¡Muu! ¡Muu!", en: "Moo! Moo!" },
    ]
  },
  {
    id: "cinco_patitos", title: "Los cinco patitos", subtitle: "Five little ducklings", emoji: "🦆",
    color: "#FFD93D", bg: "#FFFBE5", youtubeId: "lLjBH-yZRL8", channel: "El Reino Infantil",
    about: "Five little ducks go out to play — a favourite counting song!",
    lines: [
      { es: "Los cinco patitos", en: "The five little ducklings" },
      { es: "se fueron a nadar,", en: "went out to swim," },
      { es: "el más pequeñito", en: "the littlest one" },
      { es: "se quiso quedar.", en: "wanted to stay." },
      { es: "Mamá pata enojada", en: "Mother duck got angry" },
      { es: "le quiso regañar,", en: "wanted to scold him," },
      { es: "y el pobre patito", en: "and the poor duckling" },
      { es: "se puso a llorar.", en: "started to cry." },
    ]
  },
  {
    id: "arana", title: "La araña pequeñita", subtitle: "The tiny spider", emoji: "🕷️",
    color: "#4D96FF", bg: "#E4F0FF", youtubeId: "zJZhsXhvFy0", channel: "Super Simple Español",
    about: "The Spanish version of 'Itsy Bitsy Spider' — perfect for little hands doing actions!",
    lines: [
      { es: "La araña pequeñita", en: "The itsy bitsy spider" },
      { es: "subió, subió, subió.", en: "went up, up, up." },
      { es: "Vino la lluvia", en: "The rain came" },
      { es: "y se la llevó.", en: "and washed her away." },
      { es: "Salió el sol", en: "The sun came out" },
      { es: "y todo lo secó,", en: "and dried up everything," },
      { es: "y la araña pequeñita", en: "and the itsy bitsy spider" },
      { es: "subió, subió, subió.", en: "went up, up, up." },
    ]
  },
  {
    id: "elefante", title: "Un elefante", subtitle: "One elephant", emoji: "🐘",
    color: "#B983FF", bg: "#F3EAFF", youtubeId: "9FPzKKcVVEA", channel: "Canticos",
    about: "A counting song about elephants balancing on a spider's web!",
    lines: [
      { es: "Un elefante se balanceaba", en: "One elephant was balancing" },
      { es: "sobre la tela de una araña,", en: "on a spider's web," },
      { es: "como veía que resistía,", en: "and since it held up well," },
      { es: "fue a llamar a otro elefante.", en: "he called another elephant." },
      { es: "Dos elefantes se balanceaban...", en: "Two elephants were balancing..." },
      { es: "Tres elefantes se balanceaban...", en: "Three elephants were balancing..." },
      { es: "Cuatro elefantes se balanceaban...", en: "Four elephants were balancing..." },
    ]
  },
  {
    id: "saltaba", title: "Saltaba la rana", subtitle: "The frog was jumping", emoji: "🐸",
    color: "#6BCB77", bg: "#E8F8EA", youtubeId: "AM7dxcvVXFY", channel: "El Reino Infantil",
    about: "A cheerful song about a frog and a fly — great for animal words and actions!",
    lines: [
      { es: "Saltaba la rana", en: "The frog was jumping" },
      { es: "debajo del agua,", en: "under the water," },
      { es: "saltaba la rana", en: "the frog was jumping" },
      { es: "sobre una lechuga.", en: "on a lettuce." },
      { es: "Una mosca pasa,", en: "A fly goes by," },
      { es: "¡zas! se la traga,", en: "zap! she swallows it," },
      { es: "saltaba la rana", en: "the frog was jumping" },
      { es: "muy contenta hoy.", en: "very happy today." },
    ]
  },
  // WORLD 2 — Colour, greeting, action songs
  {
    id: "veo_veo", title: "Veo Veo", subtitle: "I spy (I see, I see)", emoji: "👀",
    color: "#FF6B6B", bg: "#FFE8E8", youtubeId: "klGK7ehiDPg", channel: "El Reino Infantil",
    about: "The famous Spanish 'I Spy' game turned into a song! A must-know classic from Spain.",
    lines: [
      { es: "Veo veo", en: "I see, I see" },
      { es: "¿Qué ves?", en: "What do you see?" },
      { es: "Una cosita", en: "A little thing" },
      { es: "¿Y qué cosita es?", en: "And what little thing is it?" },
      { es: "Empieza con la A", en: "It starts with the letter A" },
      { es: "¿Qué será? ¿Qué será?", en: "What could it be? What could it be?" },
      { es: "¡Es un amigo!", en: "It's a friend!" },
      { es: "Veo veo, ¿qué ves?", en: "I see, what do you see?" },
    ]
  },
  {
    id: "hola", title: "¡Hola!", subtitle: "Hello song", emoji: "👋",
    color: "#FF8C42", bg: "#FFF3E8", youtubeId: "4deUxsQOGps", channel: "Super Simple Español",
    about: "A friendly song to greet everyone in your life — perfect for learning hellos!",
    lines: [
      { es: "¡Hola, hola!", en: "Hello, hello!" },
      { es: "¿Cómo estás?", en: "How are you?" },
      { es: "¡Hola, hola!", en: "Hello, hello!" },
      { es: "Vengan a saludar.", en: "Come and say hi." },
      { es: "¡Hola, papá!", en: "Hello, Dad!" },
      { es: "¡Hola, mamá!", en: "Hello, Mum!" },
      { es: "¡Hola, amigos!", en: "Hello, friends!" },
      { es: "¡Hola a todos!", en: "Hello everyone!" },
    ]
  },
  {
    id: "de_colores", title: "De colores", subtitle: "Of colours", emoji: "🌈",
    color: "#6BCB77", bg: "#E8F8EA", youtubeId: "hEtWoWxWvE4", channel: "El Reino Infantil",
    about: "A beautiful folk song about all the colours of nature — a Spanish treasure.",
    lines: [
      { es: "De colores,", en: "Of colours," },
      { es: "de colores se visten los campos", en: "the fields dress in colours" },
      { es: "en la primavera.", en: "in the spring." },
      { es: "De colores,", en: "Of colours," },
      { es: "de colores son los pajaritos", en: "the little birds are coloured" },
      { es: "que vienen de afuera.", en: "who come from afar." },
      { es: "De colores,", en: "Of colours," },
      { es: "de colores es el arco iris", en: "the rainbow is coloured" },
      { es: "que vemos lucir.", en: "that we see shining." },
    ]
  },
  {
    id: "cabeza", title: "Cabeza, hombros, rodillas, pies", subtitle: "Head, shoulders, knees, toes", emoji: "👶",
    color: "#4D96FF", bg: "#E4F0FF", youtubeId: "e3M4IlJNkvA", channel: "Super Simple Español",
    about: "Point to each body part as you sing! The best way to learn body vocabulary.",
    lines: [
      { es: "Cabeza, hombros,", en: "Head, shoulders," },
      { es: "rodillas, pies,", en: "knees, toes," },
      { es: "rodillas, pies.", en: "knees, toes." },
      { es: "Cabeza, hombros,", en: "Head, shoulders," },
      { es: "rodillas, pies,", en: "knees, toes," },
      { es: "rodillas, pies.", en: "knees, toes." },
      { es: "Ojos, orejas,", en: "Eyes, ears," },
      { es: "boca y nariz,", en: "mouth and nose," },
      { es: "cabeza, hombros,", en: "head, shoulders," },
      { es: "rodillas, pies.", en: "knees, toes." },
    ]
  },
  // WORLD 3 — Bedtime & everyday song classics
  {
    id: "estrellita", title: "Estrellita dónde estás", subtitle: "Twinkle Twinkle Little Star", emoji: "⭐",
    color: "#FFD93D", bg: "#FFFBE5", youtubeId: "n6TzQ8NlbcE", channel: "Super Simple Español",
    about: "The Spanish version of Twinkle Twinkle — a perfect bedtime song.",
    lines: [
      { es: "Estrellita, ¿dónde estás?", en: "Little star, where are you?" },
      { es: "Me pregunto qué serás.", en: "I wonder what you are." },
      { es: "En el cielo y en el mar,", en: "In the sky and in the sea," },
      { es: "un diamante de verdad.", en: "a real diamond." },
      { es: "Estrellita, ¿dónde estás?", en: "Little star, where are you?" },
      { es: "Me pregunto qué serás.", en: "I wonder what you are." },
    ]
  },
  {
    id: "pin_pon", title: "Pin Pon", subtitle: "Pin Pon the doll", emoji: "🧸",
    color: "#FF9EC7", bg: "#FFE8F2", youtubeId: "3QJ_fXL-BjQ", channel: "El Reino Infantil",
    about: "Pin Pon is a little cardboard doll who washes his face — a timeless classic!",
    lines: [
      { es: "Pin Pon es un muñeco,", en: "Pin Pon is a doll," },
      { es: "muy guapo y de cartón.", en: "very handsome, made of cardboard." },
      { es: "Se lava la carita", en: "He washes his little face" },
      { es: "con agua y con jabón.", en: "with water and soap." },
      { es: "Se desenreda el pelo", en: "He combs his hair" },
      { es: "con peine de marfil,", en: "with an ivory comb," },
      { es: "y aunque se da tirones", en: "and even when it pulls" },
      { es: "no llora ni hace así.", en: "he doesn't cry or fuss." },
    ]
  },
  {
    id: "arroz", title: "Arroz con leche", subtitle: "Rice pudding", emoji: "🍚",
    color: "#FF8C42", bg: "#FFF3E8", youtubeId: "kXYRCcmR_Zg", channel: "El Reino Infantil",
    about: "A sweet traditional song about a boy looking for a wife — sung at every playground!",
    lines: [
      { es: "Arroz con leche,", en: "Rice pudding," },
      { es: "me quiero casar", en: "I want to marry" },
      { es: "con una señorita", en: "a young lady" },
      { es: "de San Nicolás.", en: "from San Nicolás." },
      { es: "Que sepa coser,", en: "Who knows how to sew," },
      { es: "que sepa bordar,", en: "who knows how to embroider," },
      { es: "que sepa abrir la puerta", en: "who knows how to open the door" },
      { es: "para ir a jugar.", en: "to go out and play." },
    ]
  },
  {
    id: "barquito", title: "El barquito chiquitito", subtitle: "The tiny little boat", emoji: "⛵",
    color: "#4D96FF", bg: "#E4F0FF", youtubeId: "aRXTrvnoufQ", channel: "El Reino Infantil",
    about: "A tiny boat sets sail and has an adventure — a sweet, silly song everyone loves.",
    lines: [
      { es: "Había una vez", en: "Once upon a time" },
      { es: "un barquito chiquitito,", en: "a tiny little boat," },
      { es: "que no podía,", en: "that couldn't," },
      { es: "que no podía navegar.", en: "that couldn't sail." },
      { es: "Pasaron una,", en: "One," },
      { es: "dos, tres,", en: "two, three," },
      { es: "cuatro, cinco, seis semanas,", en: "four, five, six weeks went by," },
      { es: "y aquel barquito,", en: "and that little boat," },
      { es: "y aquel barquito navegó.", en: "and that little boat did sail." },
    ]
  },
  {
    id: "boton", title: "Debajo de un botón", subtitle: "Under a button", emoji: "🔘",
    color: "#B983FF", bg: "#F3EAFF", youtubeId: "27rQGpEtn0Y", channel: "El Reino Infantil",
    about: "A silly rhyming song about a tiny mouse hiding under a button — kids love the rhymes!",
    lines: [
      { es: "Debajo de un botón, ton, ton,", en: "Under a button, ton, ton," },
      { es: "que encontró Martín, tín, tín,", en: "that Martin found, tin, tin," },
      { es: "había un ratón, ton, ton,", en: "there was a mouse, ton, ton," },
      { es: "¡ay qué chiquitín, tín, tín!", en: "oh so tiny, tin, tin!" },
      { es: "¡Ay qué chiquitín, tín, tín,", en: "Oh so tiny, tin, tin," },
      { es: "era aquel ratón, ton, ton,", en: "was that little mouse, ton, ton," },
      { es: "que encontró Martín, tín, tín,", en: "that Martin found, tin, tin," },
      { es: "debajo de un botón, ton, ton!", en: "under a button, ton, ton!" },
    ]
  },
  // WORLD 4 — Animals, nature, celebration songs
  {
    id: "burro", title: "A mi burro", subtitle: "My little donkey", emoji: "🫏",
    color: "#FF6B6B", bg: "#FFE8E8", youtubeId: "eRECrp0KBKY", channel: "Canciones Infantiles",
    about: "Counting song about a poorly donkey who visits the doctor — great for body vocabulary!",
    lines: [
      { es: "A mi burro, a mi burro", en: "My donkey, my donkey" },
      { es: "le duele la cabeza,", en: "has a sore head," },
      { es: "el médico le ha puesto", en: "the doctor gave him" },
      { es: "una corbata negra.", en: "a black tie." },
      { es: "A mi burro, a mi burro", en: "My donkey, my donkey" },
      { es: "le duele la garganta,", en: "has a sore throat," },
      { es: "el médico le ha puesto", en: "the doctor gave him" },
      { es: "una bufanda blanca.", en: "a white scarf." },
    ]
  },
  {
    id: "muneca", title: "Tengo una muñeca", subtitle: "I have a doll", emoji: "👗",
    color: "#FF9EC7", bg: "#FFE8F2", youtubeId: "jTXpqW9v4GM", channel: "El Reino Infantil",
    about: "A classic song about a little girl's beloved doll — great for colours and numbers.",
    lines: [
      { es: "Tengo una muñeca", en: "I have a doll" },
      { es: "vestida de azul,", en: "dressed in blue," },
      { es: "con su camisita", en: "with her little shirt" },
      { es: "y su canesú.", en: "and her top." },
      { es: "La saqué a paseo,", en: "I took her for a walk," },
      { es: "se me constipó,", en: "she got a cold," },
      { es: "la tengo en la cama", en: "I have her in bed" },
      { es: "con mucho dolor.", en: "with lots of pain." },
      { es: "Dos y dos son cuatro,", en: "Two and two is four," },
      { es: "cuatro y dos son seis,", en: "four and two is six," },
      { es: "seis y dos son ocho,", en: "six and two is eight," },
      { es: "y ocho dieciséis.", en: "and eight, sixteen." },
    ]
  },
  {
    id: "aserrin", title: "Aserrín, aserrán", subtitle: "Sawing song", emoji: "🪵",
    color: "#FF8C42", bg: "#FFF3E8", youtubeId: "jMGTM3HQgDI", channel: "El Reino Infantil",
    about: "A rhythmic lap-bouncing song that Spanish parents sing to their babies.",
    lines: [
      { es: "Aserrín, aserrán,", en: "Saw-saw, saw-saw," },
      { es: "los maderos de San Juan,", en: "the timbers of San Juan," },
      { es: "piden pan,", en: "they ask for bread," },
      { es: "no les dan,", en: "they don't get it," },
      { es: "piden queso,", en: "they ask for cheese," },
      { es: "les dan hueso,", en: "they get a bone," },
      { es: "y les cortan el pescuezo.", en: "and they cut their necks." },
      { es: "¡Zacatraz, zacatraz!", en: "Snip-snap, snip-snap!" },
    ]
  },
  {
    id: "sol", title: "Sol, solecito", subtitle: "Sun, little sun", emoji: "☀️",
    color: "#FFD93D", bg: "#FFFBE5", youtubeId: "9MnZk7JnpA0", channel: "El Reino Infantil",
    about: "A sweet song asking the sun to come out and warm everyone up.",
    lines: [
      { es: "Sol, solecito,", en: "Sun, little sun," },
      { es: "caliéntame un poquito,", en: "warm me up a little," },
      { es: "por hoy, por mañana,", en: "for today, for tomorrow," },
      { es: "por toda la semana.", en: "for the whole week." },
      { es: "Luna, lunera,", en: "Moon, mooney," },
      { es: "cascabelera,", en: "jingly one," },
      { es: "cinco pollitos", en: "five little chicks" },
      { es: "y una ternera.", en: "and a calf." },
    ]
  },
  {
    id: "cumple", title: "Cumpleaños feliz", subtitle: "Happy Birthday", emoji: "🎂",
    color: "#FF9EC7", bg: "#FFE8F2", youtubeId: "WZ22HRqVw1Q", channel: "El Reino Infantil",
    about: "The Spanish happy birthday song — sing it at every birthday party in Spain!",
    lines: [
      { es: "Cumpleaños feliz,", en: "Happy birthday to you," },
      { es: "cumpleaños feliz,", en: "happy birthday to you," },
      { es: "te deseamos todos,", en: "we all wish you," },
      { es: "cumpleaños feliz!", en: "happy birthday!" },
      { es: "Que los cumplas feliz,", en: "May you have a happy birthday," },
      { es: "que los cumplas feliz,", en: "may you have a happy birthday," },
      { es: "que los cumplas, querido/a,", en: "may you have them, dear one," },
      { es: "que los cumplas feliz!", en: "may you have a happy one!" },
    ]
  },
];

// ============================================================
// BADGES — unlockable achievements
// ============================================================
const BADGES = [
  { id: "first_star", name: "First Star", desc: "Earned your first star!", emoji: "⭐", check: p => Object.values(p.stars || {}).reduce((a,b) => a+b, 0) >= 1 },
  { id: "ten_stars", name: "Star Collector", desc: "10 stars earned", emoji: "🌟", check: p => Object.values(p.stars || {}).reduce((a,b) => a+b, 0) >= 10 },
  { id: "fifty_stars", name: "Star Master", desc: "50 stars earned", emoji: "✨", check: p => Object.values(p.stars || {}).reduce((a,b) => a+b, 0) >= 50 },
  { id: "hundred_stars", name: "Star Champion", desc: "100 stars earned", emoji: "💫", check: p => Object.values(p.stars || {}).reduce((a,b) => a+b, 0) >= 100 },
  { id: "first_lesson", name: "First Steps", desc: "Completed your first lesson", emoji: "👣", check: p => Object.keys(p.stars || {}).length >= 1 },
  { id: "five_lessons", name: "Getting Started", desc: "Completed 5 lessons", emoji: "🎒", check: p => Object.keys(p.stars || {}).length >= 5 },
  { id: "a1_champion", name: "A1 Champion", desc: "Finished World 1 & 2", emoji: "🏆", check: p => (p.stars || {})[16] >= 1 },
  { id: "sentence_champ", name: "Sentence Champion", desc: "Conquered grammar!", emoji: "🧩", check: p => (p.stars || {})[24] >= 1 },
  { id: "a2_legend", name: "A2 Super Legend", desc: "Completed the whole course!", emoji: "👑", check: p => (p.stars || {})[32] >= 1 },
  { id: "perfect_world", name: "World Conqueror", desc: "All stars in one world", emoji: "🌍", check: p => {
    for (let w = 1; w <= 4; w++) {
      const r = [[1,8],[9,16],[17,24],[25,32]][w-1];
      let all = true;
      for (let i = r[0]; i <= r[1]; i++) if ((p.stars||{})[i] < 3) { all = false; break; }
      if (all) return true;
    }
    return false;
  }},
  { id: "streak_3", name: "On Fire!", desc: "3-day streak", emoji: "🔥", check: p => (p.streak || 0) >= 3 },
  { id: "streak_7", name: "Week Warrior", desc: "7-day streak", emoji: "🔥", check: p => (p.streak || 0) >= 7 },
  { id: "streak_30", name: "Month Master", desc: "30-day streak!", emoji: "🔥", check: p => (p.streak || 0) >= 30 },
  { id: "first_song", name: "Little Singer", desc: "Sang your first song", emoji: "🎵", check: p => Object.keys(p.songsDone || {}).length >= 1 },
  { id: "all_songs", name: "Song Star", desc: "Sang all the songs!", emoji: "🎤", check: p => Object.keys(p.songsDone || {}).length >= SONGS.length },
  { id: "speaker", name: "Speaking Star", desc: "Used the mic 10 times", emoji: "🗣️", check: p => (p.micUses || 0) >= 10 },
  { id: "story_lover", name: "Story Lover", desc: "Read 5 stories", emoji: "📖", check: p => (p.storiesRead || 0) >= 5 },
  { id: "quiz_master", name: "Quiz Master", desc: "100 correct answers", emoji: "🧠", check: p => (p.correctAnswers || 0) >= 100 },
  { id: "halfway", name: "Halfway There!", desc: "Finished 16 lessons", emoji: "🎯", check: p => Object.keys(p.stars || {}).length >= 16 },
  { id: "perfectionist", name: "Perfectionist", desc: "3 stars in 10 lessons", emoji: "💯", check: p => Object.values(p.stars || {}).filter(s => s === 3).length >= 10 },
];

// Check and award new badges; returns array of newly unlocked badge ids
function checkBadges(progress) {
  const owned = new Set(progress.badges || []);
  const newOnes = [];
  BADGES.forEach(b => { if (!owned.has(b.id) && b.check(progress)) { owned.add(b.id); newOnes.push(b.id); } });
  return { allBadges: [...owned], newBadges: newOnes };
}

// ============================================================
// SPEECH (text-to-speech + speech recognition)
// ============================================================
const speech = {
  voices: [],
  _loaded: false,
  _load() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    speech.voices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith("es"));
    if (speech.voices.length) speech._loaded = true;
  },
  speak(text, rate = 0.85) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (!speech._loaded) speech._load();
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "es-ES";
    utter.rate = rate;
    utter.pitch = 1.05;
    // Prefer Spain Spanish if available
    const spain = speech.voices.find(v => v.lang === "es-ES") || speech.voices[0];
    if (spain) utter.voice = spain;
    window.speechSynthesis.speak(utter);
  },
  supported() {
    return typeof window !== "undefined" && !!window.speechSynthesis;
  },
  // Recognition support
  recogSupported() {
    return typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  },
  listen({ onResult, onError, onEnd }) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { onError?.("Speech recognition not supported in this browser. Try Chrome, Edge, or Safari."); return null; }
    const r = new SR();
    r.lang = "es-ES";
    r.continuous = false;
    r.interimResults = false;
    r.maxAlternatives = 3;
    r.onresult = (e) => {
      const results = [];
      for (let i = 0; i < e.results[0].length; i++) results.push(e.results[0][i].transcript);
      onResult?.(results);
    };
    r.onerror = (e) => onError?.(e.error || "Recognition error");
    r.onend = () => onEnd?.();
    try { r.start(); } catch (err) { onError?.(err.message); }
    return r;
  },
};

// Fuzzy match — how close are two strings? (0-1, 1 = identical)
function similarity(a, b) {
  a = a.toLowerCase().trim().replace(/[¿?¡!.,;:]/g, "");
  b = b.toLowerCase().trim().replace(/[¿?¡!.,;:]/g, "");
  // Normalise Spanish accents for leniency
  const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  a = norm(a); b = norm(b);
  if (a === b) return 1;
  if (!a || !b) return 0;
  // Levenshtein
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  }
  return 1 - dp[m][n] / Math.max(m, n);
}

// Small reusable 🔊 speak button
function SpeakBtn({ text, size = 14, color = "#4D96FF" }) {
  if (!speech.supported()) return null;
  const [spoken, setSpoken] = useState(false);
  const click = (e) => {
    e.stopPropagation();
    speech.speak(text);
    setSpoken(true);
    setTimeout(() => setSpoken(false), 800);
  };
  return <button onClick={click} title="Listen" style={{
    background: spoken ? "#E8F8EA" : "#fff", border: `2px solid ${spoken ? "#6BCB77" : color}`, borderRadius: "50%",
    width: size + 18, height: size + 18, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontSize: size, padding: 0, color: spoken ? "#6BCB77" : color, transition: "all .15s", transform: spoken ? "scale(1.15)" : "scale(1)",
  }}>🔊</button>;
}

// Load voices asynchronously (Chrome loads them lazily)
if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => speech._load();
  speech._load();
}

// ============================================================
// SHARED UTILITIES
// ============================================================
const FN = "'Nunito', sans-serif";
const sh = a => [...a].sort(() => Math.random() - 0.5);

function Confetti({ active }) {
  if (!active) return null;
  return <>{Array.from({ length: 35 }, (_, i) => {
    const c = ["#FF6B6B","#FFD93D","#6BCB77","#4D96FF","#B983FF","#FF9EC7","#FF8C42"][i % 7];
    return <div key={i} style={{ position:"fixed", top:-20, left:`${Math.random()*100}%`, width:7+Math.random()*7, height:10+Math.random()*8, background:c, borderRadius:2, zIndex:9999, pointerEvents:"none", animation:`cFall ${1.5+Math.random()}s ${Math.random()*.5}s ease-in forwards` }} />;
  })}</>;
}

function Bgs({ e = ["⭐","🌟","✨"] }) {
  return <div style={{ position:"fixed", inset:0, overflow:"hidden", pointerEvents:"none", zIndex:0 }}>
    {e.map((x, i) => <div key={i} style={{ position:"absolute", left:`${10+(i*18)%80}%`, top:`${5+(i*23)%85}%`, fontSize:20+(i%3)*8, opacity:0.1, animation:`fBob ${4+i%3}s ease-in-out infinite alternate`, animationDelay:`${i*0.7}s` }}>{x}</div>)}
  </div>;
}

const Btn = ({ children, onClick, bg="#fff", color="#1E3A5F", border="#e0e0e0", full, style: s, ...p }) =>
  <button onClick={onClick} style={{ background:bg, border:`3px solid ${border}`, borderRadius:50, padding:"12px 24px", color, fontWeight:700, fontSize:15, cursor:"pointer", fontFamily:FN, transition:"transform .15s", width:full?"100%":"auto", ...s }}
    onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
    onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"} {...p}>{children}</button>;

const Input = ({ label, ...p }) =>
  <div style={{ marginBottom: 14 }}>
    <label style={{ display:"block", fontSize:13, fontWeight:700, color:"#666", fontFamily:FN, marginBottom:4 }}>{label}</label>
    <input {...p} style={{ width:"100%", padding:"12px 16px", borderRadius:14, border:"3px solid #e0e0e0", fontSize:16, fontFamily:FN, color:"#1E3A5F", ...(p.style||{}) }} />
  </div>;

// ============================================================
// GAME: FLASHCARDS
// ============================================================
function FlashCard({ word, index }) {
  const [f, setF] = useState(false);
  return <div style={{ perspective:600, animation:"cPop .4s ease-out backwards", animationDelay:`${index*.05}s`, position:"relative" }}>
    <div onClick={() => setF(!f)} style={{ cursor:"pointer", width:"100%", minHeight:125, position:"relative", transformStyle:"preserve-3d", transition:"transform .5s cubic-bezier(.4,0,.2,1)", transform:f?"rotateY(180deg)":"rotateY(0)" }}>
      <div style={{ position:"absolute", inset:0, backfaceVisibility:"hidden", background:"#fff", borderRadius:20, padding:"14px 10px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 16px rgba(0,0,0,.07)", border:"3px solid #f0f0f0" }}>
        <div style={{ fontSize:34, marginBottom:3 }}>{word.emoji}</div>
        <div style={{ fontSize:16, fontWeight:800, color:"#1E3A5F", fontFamily:FN, textAlign:"center" }}>{word.es}</div>
        <div style={{ fontSize:9, color:"#bbb", marginTop:2 }}>tap to flip</div>
      </div>
      <div style={{ position:"absolute", inset:0, backfaceVisibility:"hidden", transform:"rotateY(180deg)", background:"linear-gradient(135deg,#667eea,#764ba2)", borderRadius:20, padding:"14px 10px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"#fff" }}>
        <div style={{ fontSize:15, fontWeight:800, fontFamily:FN, textAlign:"center" }}>{word.en}</div>
        <div style={{ fontSize:12, marginTop:5, opacity:.85, fontFamily:FN }}>🗣️ {word.say}</div>
      </div>
    </div>
    <div style={{ position:"absolute", top:6, right:6, zIndex:2 }}><SpeakBtn text={word.es} size={12} /></div>
  </div>;
}

// ============================================================
// GAME: MATCHING
// ============================================================
function MatchGame({ words, onDone }) {
  const pool = useMemo(() => words.slice(0, 6), [words]);
  const [sel, setSel] = useState(null);
  const [matched, setMatched] = useState([]);
  const [wrong, setWrong] = useState(false);
  const [sEn] = useState(() => sh(pool));
  useEffect(() => { setMatched([]); setSel(null); setWrong(false); }, [words]);
  const click = (side, i, w) => {
    if (matched.includes(w.es) || wrong) return;
    if (!sel || sel.side === side) { setSel({ side, i, w }); return; }
    const es = side === "es" ? w : sel.w, en = side === "en" ? w : sel.w;
    if (es.es === en.es) { const m = [...matched, es.es]; setMatched(m); setSel(null); if (m.length === pool.length) setTimeout(onDone, 500); }
    else { setWrong(true); setTimeout(() => { setWrong(false); setSel(null); }, 500); }
  };
  const isSel = (s, i) => sel && sel.side === s && sel.i === i;
  return <div>
    <p style={{ textAlign:"center", fontSize:13, color:"#666", margin:"0 0 12px", fontFamily:FN }}>Tap Spanish → then English! 🎯</p>
    <div style={{ display:"flex", gap:8 }}>
      {["es", "en"].map(side => <div key={side} style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}>
        {(side === "es" ? pool : sEn).map((w, i) => <button key={w[side === "es" ? "es" : "en"] + i} disabled={matched.includes(w.es)} onClick={() => click(side, i, w)}
          style={{ padding:"10px 6px", borderRadius:12, border:"3px solid", fontFamily:FN, fontSize:side === "es" ? 14 : 13, fontWeight:700, cursor:"pointer", color:"#1E3A5F", transition:"all .2s",
            borderColor: matched.includes(w.es) ? "#6BCB77" : isSel(side, i) ? (side === "es" ? "#4D96FF" : "#FF8C42") : "#e8e8e8",
            background: matched.includes(w.es) ? "#E8F8EA" : isSel(side, i) ? (side === "es" ? "#E4F0FF" : "#FFF3E8") : "#fff",
            opacity: matched.includes(w.es) ? 0.5 : 1 }}>
          {side === "es" ? `${w.emoji} ${w.es}` : w.en}</button>)}
      </div>)}
    </div>
  </div>;
}

// ============================================================
// GAME: QUIZ
// ============================================================
function Quiz({ words, gaps, onDone }) {
  const items = useMemo(() => {
    const q = words.slice(0, 8).map(w => ({ q: `What does "${w.es}" ${w.emoji} mean?`, opts: sh([w, ...words.filter(x => x.es !== w.es)].slice(0, 4)).map(x => x.en), ans: w.en }));
    if (gaps) gaps.forEach(g => q.push({ q: g.q, opts: g.opts, ans: g.opts[g.ans] }));
    return sh(q).slice(0, 8);
  }, [words, gaps]);
  const [idx, setIdx] = useState(0); const [score, setScore] = useState(0); const [fb, setFb] = useState(null);
  useEffect(() => { setIdx(0); setScore(0); setFb(null); }, [words]);
  if (idx >= items.length) return null;
  const it = items[idx];
  const pick = o => { if (fb) return; const ok = o === it.ans; if (ok) setScore(s => s + 1); setFb(ok ? "✅" : "❌");
    setTimeout(() => { setFb(null); if (idx + 1 < items.length) setIdx(idx + 1); else onDone(score + (ok ? 1 : 0), items.length); }, 900); };
  return <div style={{ textAlign: "center" }}>
    <div style={{ fontSize: 11, color: "#999", fontFamily: FN, marginBottom: 8 }}>Q {idx + 1}/{items.length}</div>
    <div style={{ fontSize: 16, fontWeight: 800, color: "#1E3A5F", fontFamily: FN, marginBottom: 14, lineHeight: 1.4 }}>{it.q}</div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxWidth: 340, margin: "0 auto" }}>
      {it.opts.map(o => <button key={o} onClick={() => pick(o)} style={{ padding: "11px 8px", borderRadius: 14, border: "3px solid", fontFamily: FN, fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#1E3A5F",
        borderColor: fb && o === it.ans ? "#6BCB77" : "#e8e8e8", background: fb && o === it.ans ? "#E8F8EA" : "#fff" }}>{o}</button>)}
    </div>
    {fb && <div style={{ fontSize: 22, marginTop: 10, animation: "bIn .3s" }}>{fb === "✅" ? "⭐ Correct!" : "Not quite!"}</div>}
  </div>;
}

// ============================================================
// GAME: SENTENCE BUILDER
// ============================================================
function SentenceBuilder({ sentences, onDone }) {
  const [idx, setIdx] = useState(0); const [placed, setPlaced] = useState([]); const [avail, setAvail] = useState([]); const [fb, setFb] = useState(null); const [score, setScore] = useState(0);
  useEffect(() => { setIdx(0); setScore(0); setFb(null); if (sentences.length) setAvail(sh(sentences[0].shuffle)); }, [sentences]);
  if (!sentences.length) return <div style={{ textAlign: "center", padding: 20, fontFamily: FN, color: "#999" }}>No sentences yet!</div>;
  if (idx >= sentences.length) return null;
  const s = sentences[idx];
  const tap = w => { if (fb) return; setPlaced([...placed, w]); setAvail(avail.filter((_, i) => i !== avail.indexOf(w))); };
  const undo = () => { if (fb || !placed.length) return; const last = placed[placed.length - 1]; setPlaced(placed.slice(0, -1)); setAvail([...avail, last]); };
  const check = () => { const ok = placed.join(" ") === s.correct.join(" "); setFb(ok); if (ok) setScore(sc => sc + 1);
    setTimeout(() => { setFb(null); const ni = idx + 1; if (ni < sentences.length) { setIdx(ni); setPlaced([]); setAvail(sh(sentences[ni].shuffle)); } else onDone(score + (ok ? 1 : 0), sentences.length); }, 1200); };
  return <div style={{ textAlign: "center" }}>
    <div style={{ fontSize: 11, color: "#999", fontFamily: FN, marginBottom: 4 }}>Sentence {idx + 1}/{sentences.length}</div>
    <div style={{ fontSize: 13, color: "#888", fontFamily: FN, marginBottom: 10 }}>🇬🇧 {s.en}</div>
    <div style={{ minHeight: 48, background: fb === true ? "#d4edda" : fb === false ? "#f8d7da" : "#f8f8f8", borderRadius: 14, padding: "10px 8px", marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center", alignItems: "center", border: `2px dashed ${fb === true ? "#6BCB77" : fb === false ? "#FF6B6B" : "#ddd"}` }}>
      {placed.length ? placed.map((w, i) => <span key={i} style={{ background: fb === true ? "#6BCB77" : fb === false ? "#FF6B6B" : "#4D96FF", color: "#fff", padding: "5px 10px", borderRadius: 10, fontSize: 14, fontWeight: 700, fontFamily: FN }}>{w}</span>)
        : <span style={{ color: "#ccc", fontSize: 13, fontFamily: FN }}>Tap words in order…</span>}
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 12 }}>
      {avail.map((w, i) => <button key={w + i} onClick={() => tap(w)} style={{ background: "#fff", border: "2px solid #ddd", borderRadius: 10, padding: "7px 12px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FN, color: "#1E3A5F" }}>{w}</button>)}
    </div>
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      <Btn onClick={undo} border="#ddd" color="#888" style={{ fontSize: 12, padding: "8px 16px" }}>↩ Undo</Btn>
      {placed.length === s.correct.length && !fb && <Btn onClick={check} bg="linear-gradient(135deg,#6BCB77,#4D96FF)" color="#fff" border="transparent" style={{ fontSize: 12, padding: "8px 16px" }}>Check ✓</Btn>}
    </div>
    {fb === true && <div style={{ marginTop: 8, fontSize: 20, animation: "bIn .3s" }}>⭐ Perfect!</div>}
    {fb === false && <div style={{ marginTop: 8, fontSize: 13, color: "#FF6B6B", fontFamily: FN }}>Answer: <b>{s.correct.join(" ")}</b></div>}
  </div>;
}

// ============================================================
// GAME: STORY READER
// ============================================================
function StoryReader({ story, onDone }) {
  const [step, setStep] = useState(0); const [qIdx, setQIdx] = useState(0); const [score, setScore] = useState(0); const [fb, setFb] = useState(null);
  useEffect(() => { setStep(0); setQIdx(0); setScore(0); setFb(null); }, [story]);
  if (!story) return <div style={{ textAlign: "center", padding: 20, fontFamily: FN, color: "#999" }}>No story yet!</div>;
  if (step < story.paras.length) return <div style={{ textAlign: "center" }}>
    <div style={{ fontSize: 26, marginBottom: 6 }}>📖</div>
    <h3 style={{ fontSize: 20, fontWeight: 900, fontFamily: FN, color: "#1E3A5F", marginBottom: 12 }}>{story.title}</h3>
    <div style={{ background: "#fff", borderRadius: 18, padding: 18, boxShadow: "0 3px 12px rgba(0,0,0,.05)", fontSize: 16, lineHeight: 1.7, fontFamily: FN, color: "#333", fontStyle: "italic", marginBottom: 14 }}>{story.paras[step]}</div>
    <Btn onClick={() => setStep(step + 1)} bg="linear-gradient(135deg,#4D96FF,#667eea)" color="#fff" border="transparent">{step < story.paras.length - 1 ? "Next page →" : "Questions →"}</Btn>
  </div>;
  const q = story.qs[qIdx];
  if (qIdx >= story.qs.length) return null;
  const pick = i => { if (fb !== null) return; const ok = i === q.ans; if (ok) setScore(s => s + 1); setFb(ok);
    setTimeout(() => { setFb(null); if (qIdx + 1 < story.qs.length) setQIdx(qIdx + 1); else onDone(score + (ok ? 1 : 0), story.qs.length); }, 900); };
  return <div style={{ textAlign: "center" }}>
    <div style={{ fontSize: 13, color: "#999", fontFamily: FN, marginBottom: 8 }}>Q {qIdx + 1}/{story.qs.length}</div>
    <div style={{ fontSize: 16, fontWeight: 800, color: "#1E3A5F", fontFamily: FN, marginBottom: 12 }}>{q.q}</div>
    <div style={{ display: "flex", flexDirection: "column", gap: 7, maxWidth: 300, margin: "0 auto" }}>
      {q.opts.map((o, i) => <button key={o} onClick={() => pick(i)} style={{ padding: "11px", borderRadius: 12, border: "3px solid", fontFamily: FN, fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#1E3A5F",
        borderColor: fb !== null && i === q.ans ? "#6BCB77" : "#e8e8e8", background: fb !== null && i === q.ans ? "#E8F8EA" : "#fff" }}>{o}</button>)}
    </div>
    {fb === true && <div style={{ fontSize: 20, marginTop: 8, animation: "bIn .3s" }}>⭐</div>}
    {fb === false && <div style={{ fontSize: 14, marginTop: 8, color: "#FF6B6B", fontFamily: FN }}>Not quite!</div>}
  </div>;
}

// ============================================================
// GAME: SAY IT! (speak-back)
// ============================================================
function SayItGame({ words, onDone }) {
  const pool = useMemo(() => words.slice(0, 6), [words]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState(null);
  const [result, setResult] = useState(null); // "pass" | "close" | "fail" | "error" | null
  const [errMsg, setErrMsg] = useState(null);
  const recogRef = useRef(null);

  useEffect(() => { setIdx(0); setScore(0); setHeard(null); setResult(null); setErrMsg(null); }, [words]);

  if (!speech.recogSupported()) {
    return <div style={{ textAlign: "center", padding: 20, fontFamily: FN }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>🎤</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#1E3A5F", marginBottom: 8 }}>Microphone not supported</div>
      <div style={{ fontSize: 13, color: "#888", lineHeight: 1.5 }}>Speech recognition works best in Chrome, Edge, or Safari. Try using one of those browsers to play the "Say It!" game!</div>
    </div>;
  }

  if (idx >= pool.length) return null;
  const word = pool[idx];

  const listen = () => {
    if (listening) return;
    setHeard(null); setResult(null); setErrMsg(null);
    // Speak the word first so kids hear it
    speech.speak(word.es);
    setTimeout(() => {
      setListening(true);
      recogRef.current = speech.listen({
        onResult: (results) => {
          const best = results.reduce((best, r) => {
            const sim = similarity(r, word.es);
            return sim > best.sim ? { text: r, sim } : best;
          }, { text: "", sim: 0 });
          setHeard(best.text);
          let res;
          if (best.sim >= 0.75) res = "pass";
          else if (best.sim >= 0.55) res = "close";
          else res = "fail";
          setResult(res);
          if (res === "pass" || res === "close") setScore(s => s + 1);
        },
        onError: (err) => {
          setListening(false);
          if (err === "not-allowed" || err === "permission-denied") setErrMsg("Microphone permission needed. Please allow it and try again.");
          else if (err === "no-speech") setErrMsg("I didn't hear anything. Try speaking a bit louder!");
          else setErrMsg("Oops, try again!");
        },
        onEnd: () => setListening(false),
      });
    }, 1200);
  };

  const next = () => {
    setHeard(null); setResult(null); setErrMsg(null);
    if (idx + 1 < pool.length) setIdx(idx + 1);
    else onDone(score, pool.length);
  };

  return <div style={{ textAlign: "center" }}>
    <div style={{ fontSize: 12, color: "#999", fontFamily: FN, marginBottom: 8 }}>Word {idx + 1} / {pool.length}</div>
    <div style={{ fontSize: 50, marginBottom: 4, animation: "bIn .4s" }}>{word.emoji}</div>
    <div style={{ fontSize: 28, fontWeight: 900, color: "#1E3A5F", fontFamily: FN, marginBottom: 4 }}>{word.es}</div>
    <div style={{ fontSize: 13, color: "#888", fontFamily: FN, marginBottom: 4 }}>🗣️ {word.say}</div>
    <div style={{ fontSize: 13, color: "#aaa", fontFamily: FN, marginBottom: 18, fontStyle: "italic" }}>({word.en})</div>

    {/* Listen button */}
    <div style={{ marginBottom: 12 }}>
      <button onClick={() => speech.speak(word.es)} style={{ background: "#fff", border: "2px solid #4D96FF", borderRadius: 50, padding: "8px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FN, color: "#4D96FF" }}>🔊 Listen first</button>
    </div>

    {/* Big microphone button */}
    {result === null && !listening && <button onClick={listen} style={{
      background: "linear-gradient(135deg, #FF6B6B, #FF8C42)", border: "none", borderRadius: "50%",
      width: 100, height: 100, fontSize: 44, cursor: "pointer", color: "#fff", boxShadow: "0 6px 20px rgba(255,107,107,.35)",
      marginBottom: 14, animation: "bIn .4s",
    }}>🎤</button>}

    {listening && <div style={{ marginBottom: 14 }}>
      <div style={{ width: 100, height: 100, borderRadius: "50%", background: "linear-gradient(135deg, #FF6B6B, #FF8C42)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 44, color: "#fff", animation: "pulse 1s infinite" }}>🎤</div>
      <div style={{ fontSize: 14, color: "#FF6B6B", fontFamily: FN, marginTop: 10, fontWeight: 700 }}>Listening… Say "{word.es}"!</div>
    </div>}

    {result === null && !listening && <div style={{ fontSize: 13, color: "#888", fontFamily: FN, fontWeight: 700 }}>Tap the mic and say the word!</div>}

    {/* Result */}
    {result === "pass" && <div style={{ marginTop: 8, animation: "bIn .4s" }}>
      <div style={{ fontSize: 72 }}>👍</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: "#6BCB77", fontFamily: FN }}>¡Perfecto!</div>
      <div style={{ fontSize: 13, color: "#888", fontFamily: FN, marginTop: 4 }}>I heard: "{heard}"</div>
    </div>}
    {result === "close" && <div style={{ marginTop: 8, animation: "bIn .4s" }}>
      <div style={{ fontSize: 72 }}>😊</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: "#FFD93D", fontFamily: FN }}>Close enough!</div>
      <div style={{ fontSize: 13, color: "#888", fontFamily: FN, marginTop: 4 }}>I heard: "{heard}"</div>
    </div>}
    {result === "fail" && <div style={{ marginTop: 8, animation: "bIn .4s" }}>
      <div style={{ fontSize: 72 }}>👎</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: "#FF6B6B", fontFamily: FN }}>Try again!</div>
      {heard && <div style={{ fontSize: 13, color: "#888", fontFamily: FN, marginTop: 4 }}>I heard: "{heard}"</div>}
    </div>}

    {errMsg && <div style={{ fontSize: 13, color: "#FF6B6B", fontFamily: FN, marginTop: 10 }}>{errMsg}</div>}

    {/* Action buttons */}
    {result !== null && <div style={{ marginTop: 14, display: "flex", gap: 8, justifyContent: "center" }}>
      {result === "fail" && <Btn onClick={listen} bg="#fff" border="#FF6B6B" color="#FF6B6B">🎤 Try again</Btn>}
      <Btn onClick={next} bg="linear-gradient(135deg,#6BCB77,#4D96FF)" color="#fff" border="transparent">
        {idx + 1 < pool.length ? "Next word →" : "Finish! 🏆"}
      </Btn>
    </div>}

    <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); box-shadow: 0 6px 20px rgba(255,107,107,.35); } 50% { transform: scale(1.08); box-shadow: 0 6px 30px rgba(255,107,107,.6); } }`}</style>
  </div>;
}

// ============================================================
// RESULT SCREEN
// ============================================================
function Result({ score, total, onRetry, onBack, onEarnStar }) {
  const pct = score / total;
  useEffect(() => { if (pct >= 0.6 && onEarnStar) onEarnStar(); }, []);
  return <div style={{ textAlign: "center", padding: "20px 0" }}>
    <div style={{ fontSize: 56, marginBottom: 6, animation: "bIn .5s" }}>{pct >= 0.8 ? "🏆" : pct >= 0.6 ? "⭐" : "💪"}</div>
    <div style={{ fontSize: 22, fontWeight: 900, color: "#1E3A5F", fontFamily: FN }}>{score}/{total}</div>
    <div style={{ fontSize: 14, color: "#888", margin: "6px 0 18px", fontFamily: FN }}>{pct >= 0.8 ? "Amazing! Superstar!" : pct >= 0.6 ? "Great job!" : "Keep practising!"}</div>
    <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
      <Btn onClick={onRetry} bg="linear-gradient(135deg,#4D96FF,#667eea)" color="#fff" border="transparent">Try Again</Btn>
      <Btn onClick={onBack}>Back</Btn>
    </div>
  </div>;
}

// ============================================================
// ============================================================
// SONG PLAYER — karaoke-style with highlighted current line
// ============================================================
function SongPlayer({ song, onDone, onBack }) {
  const [showEn, setShowEn] = useState(true);
  const [completed, setCompleted] = useState(false);

  const markDone = () => {
    if (completed) return;
    setCompleted(true);
    onDone?.();
  };

  return <div style={{ minHeight: "100vh", background: song.bg }}>
    <Bgs e={[song.emoji, "🎵", "🎶", "✨"]} />
    <div style={{ position: "relative", zIndex: 1, maxWidth: 560, margin: "0 auto", padding: "14px 14px 40px" }}>
      <Btn onClick={onBack} style={{ marginBottom: 12, fontSize: 12 }}>← Songs</Btn>
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 56, animation: "bIn .5s" }}>{song.emoji}</div>
        <h2 style={{ fontSize: 26, fontWeight: 900, fontFamily: FN, color: "#1E3A5F" }}>{song.title}</h2>
        <p style={{ fontSize: 13, color: "#888", fontFamily: FN }}>{song.subtitle}</p>
        {song.channel && <p style={{ fontSize: 11, color: "#aaa", fontFamily: FN, marginTop: 2 }}>Video by {song.channel}</p>}
      </div>
      <div style={{ background: "#fff", borderRadius: 18, padding: "14px 16px", marginBottom: 14, fontSize: 13, color: "#555", fontFamily: FN, fontStyle: "italic", border: `2px solid ${song.color}30`, textAlign: "center" }}>💡 {song.about}</div>

      {/* YouTube embed — responsive 16:9 */}
      <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden", borderRadius: 18, marginBottom: 14, boxShadow: "0 6px 24px rgba(0,0,0,.12)", background: "#000" }}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${song.youtubeId}?rel=0&modestbranding=1`}
          title={song.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
        />
      </div>

      {/* Toggle + mark as sung */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <Btn onClick={() => setShowEn(!showEn)} style={{ fontSize: 12 }}>{showEn ? "Hide English" : "Show English"}</Btn>
        {!completed ? <Btn onClick={markDone} bg={song.color} color="#fff" border="transparent" style={{ fontSize: 13, padding: "10px 20px" }}>⭐ I sang along!</Btn>
          : <div style={{ padding: "10px 20px", background: "#E8F8EA", color: "#6BCB77", borderRadius: 50, fontSize: 13, fontWeight: 900, fontFamily: FN }}>✓ Great singing!</div>}
      </div>

      {/* Lyrics */}
      <div style={{ background: "#fff", borderRadius: 20, padding: "20px 16px", boxShadow: "0 3px 12px rgba(0,0,0,.05)" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#aaa", fontFamily: FN, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10, textAlign: "center" }}>🎤 Sing Along!</div>
        {song.lines.map((line, i) => <div key={i} style={{
          marginBottom: 14, padding: "6px 12px", borderRadius: 12,
          borderLeft: `3px solid ${song.color}`,
          background: `${song.color}08`,
        }}>
          <div style={{ fontSize: 16, fontWeight: 800, fontFamily: FN, color: "#1E3A5F", lineHeight: 1.4 }}>{line.es}</div>
          {showEn && <div style={{ fontSize: 12, color: "#888", fontFamily: FN, fontStyle: "italic", marginTop: 2 }}>{line.en}</div>}
        </div>)}
      </div>
      <div style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: "#888", fontFamily: FN }}>💡 Watch the video, read along, and sing!</div>
    </div>
  </div>;
}

// ============================================================
// BADGE CABINET
// ============================================================
function BadgeCabinet({ progress, onBack }) {
  const owned = new Set(progress.badges || []);
  const unlocked = BADGES.filter(b => owned.has(b.id));
  const locked = BADGES.filter(b => !owned.has(b.id));
  return <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#FFF8E1,#F3EAFF)", padding: "16px 16px 40px" }}>
    <Bgs e={["🏆","⭐","🎖️"]} />
    <div style={{ position: "relative", zIndex: 1, maxWidth: 500, margin: "0 auto" }}>
      <Btn onClick={onBack} style={{ marginBottom: 14, fontSize: 13 }}>← Back</Btn>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 48 }}>🏆</div>
        <h2 style={{ fontSize: 26, fontWeight: 900, fontFamily: FN, color: "#1E3A5F" }}>Trophy Cabinet</h2>
        <p style={{ fontSize: 13, color: "#888", fontFamily: FN }}>{unlocked.length} of {BADGES.length} badges unlocked</p>
      </div>
      {unlocked.length > 0 && <><h3 style={{ fontSize: 16, fontWeight: 800, color: "#FF8C42", fontFamily: FN, marginBottom: 10 }}>🎉 Unlocked</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {unlocked.map(b => <div key={b.id} style={{ background: "linear-gradient(135deg,#FFF8E1,#FFE8E8)", borderRadius: 18, padding: "14px 10px", textAlign: "center", border: "2px solid #FFD93D", boxShadow: "0 3px 12px rgba(255,217,61,.3)", animation: "cPop .3s ease-out backwards" }}>
          <div style={{ fontSize: 40 }}>{b.emoji}</div>
          <div style={{ fontSize: 13, fontWeight: 900, color: "#1E3A5F", fontFamily: FN, marginTop: 4 }}>{b.name}</div>
          <div style={{ fontSize: 11, color: "#888", fontFamily: FN, marginTop: 2 }}>{b.desc}</div>
        </div>)}
      </div></>}
      {locked.length > 0 && <><h3 style={{ fontSize: 16, fontWeight: 800, color: "#999", fontFamily: FN, marginBottom: 10 }}>🔒 Still to earn</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {locked.map(b => <div key={b.id} style={{ background: "#fff", borderRadius: 18, padding: "14px 10px", textAlign: "center", border: "2px dashed #e0e0e0", opacity: 0.6 }}>
          <div style={{ fontSize: 40, filter: "grayscale(1)" }}>{b.emoji}</div>
          <div style={{ fontSize: 13, fontWeight: 900, color: "#888", fontFamily: FN, marginTop: 4 }}>{b.name}</div>
          <div style={{ fontSize: 11, color: "#aaa", fontFamily: FN, marginTop: 2 }}>{b.desc}</div>
        </div>)}
      </div></>}
    </div>
  </div>;
}

// ============================================================
// BADGE UNLOCK TOAST
// ============================================================
function BadgeToast({ badge, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, []);
  if (!badge) return null;
  const b = BADGES.find(x => x.id === badge);
  if (!b) return null;
  return <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#FFD93D,#FF8C42)", color: "#fff", padding: "14px 20px", borderRadius: 50, boxShadow: "0 8px 24px rgba(255,140,66,.4)", zIndex: 10000, display: "flex", alignItems: "center", gap: 10, fontFamily: FN, animation: "bIn .5s", maxWidth: "90%" }}>
    <div style={{ fontSize: 28 }}>{b.emoji}</div>
    <div>
      <div style={{ fontSize: 11, opacity: .9, fontWeight: 700 }}>NEW BADGE!</div>
      <div style={{ fontSize: 15, fontWeight: 900 }}>{b.name}</div>
    </div>
  </div>;
}

// ============================================================
// AUTH SCREEN
// ============================================================
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  const handleSignup = () => {
    setError("");
    if (!name.trim() || !email.trim() || !pass.trim()) return setError("Please fill in all fields!");
    if (pass.length < 4) return setError("Password must be at least 4 characters!");
    const parent = db.createParent(name.trim(), email.toLowerCase().trim(), pass);
    if (!parent) return setError("An account with this email already exists!");
    db.setSession({ parentEmail: parent.email, activeChildId: null });
    onLogin(parent);
  };

  const handleLogin = () => {
    setError("");
    if (!email.trim() || !pass.trim()) return setError("Please fill in all fields!");
    const parent = db.findParent(email.toLowerCase().trim());
    if (!parent) return setError("No account found with this email.");
    if (parent.pass !== pass) return setError("Wrong password! Try again.");
    db.setSession({ parentEmail: parent.email, activeChildId: null });
    onLogin(parent);
  };

  return <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#FFF8E1 0%,#FFE0EC 50%,#E4F0FF 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <Bgs e={["☀️","🌈","⭐","🦋","🌻"]} />
    <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 400 }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 48, animation: "bIn .6s" }}>☀️</div>
        <h1 style={{ fontSize: 36, fontWeight: 900, fontFamily: FN, background: "linear-gradient(135deg,#FF8C42,#FF6B6B,#B983FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>¡Hola, Amigo!</h1>
        <p style={{ fontSize: 14, color: "#666", fontFamily: FN }}>Your family's Spanish adventure</p>
      </div>
      <div style={{ background: "#fff", borderRadius: 24, padding: "28px 24px", boxShadow: "0 8px 32px rgba(0,0,0,.08)" }}>
        <div style={{ fontSize: 12, color: "#888", fontFamily: FN, textAlign: "center", marginBottom: 14 }}>👨‍👩‍👧‍👦 Parent account — you'll add your children next</div>
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f5f5f5", borderRadius: 12, padding: 4 }}>
          {["login", "signup"].map(m => <button key={m} onClick={() => { setMode(m); setError(""); }} style={{ flex: 1, padding: 10, borderRadius: 10, border: "none", fontFamily: FN, fontWeight: 700, fontSize: 14, cursor: "pointer", background: mode === m ? "#fff" : "transparent", color: mode === m ? "#1E3A5F" : "#999", boxShadow: mode === m ? "0 2px 8px rgba(0,0,0,.08)" : "none", transition: "all .2s" }}>{m === "login" ? "Log In" : "Sign Up"}</button>)}
        </div>
        {mode === "signup" && <Input label="Parent's Name" placeholder="e.g. Ant" value={name} onChange={e => setName(e.target.value)} />}
        <Input label="Email" placeholder="your@email.com" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <Input label="Password" placeholder="••••••" type="password" value={pass} onChange={e => setPass(e.target.value)} />
        {error && <div style={{ color: "#FF6B6B", fontSize: 13, fontFamily: FN, marginBottom: 12, textAlign: "center" }}>{error}</div>}
        <Btn full onClick={mode === "login" ? handleLogin : handleSignup} bg="linear-gradient(135deg,#FF8C42,#FF6B6B)" color="#fff" border="transparent" style={{ marginTop: 4 }}>
          {mode === "login" ? "Log In 🚀" : "Create Account 🌟"}
        </Btn>
      </div>
      <p style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#999", fontFamily: FN }}>
        {mode === "login" ? "Don't have an account? " : "Already have an account? "}
        <span onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }} style={{ color: "#4D96FF", cursor: "pointer", fontWeight: 700 }}>{mode === "login" ? "Sign up!" : "Log in!"}</span>
      </p>
    </div>
  </div>;
}

// ============================================================
// CHILD PICKER / DASHBOARD (parent home)
// ============================================================
const AVATARS = ["🦊","🐼","🦄","🐯","🐶","🐱","🐰","🐸","🦁","🐻","🐨","🐵","🦉","🐢","🐙","🦋"];

function AddChildModal({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🦊");
  const [error, setError] = useState("");
  const submit = () => {
    if (!name.trim()) return setError("Please enter a name!");
    onAdd(name.trim(), avatar);
  };
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, padding: 22, maxWidth: 380, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,.2)", animation: "bIn .3s" }}>
      <h3 style={{ fontSize: 20, fontWeight: 900, fontFamily: FN, color: "#1E3A5F", marginBottom: 14, textAlign: "center" }}>Add a child 🌟</h3>
      <Input label="Child's name" placeholder="e.g. Sol" value={name} onChange={e => setName(e.target.value)} />
      <div style={{ fontSize: 13, fontWeight: 700, color: "#666", fontFamily: FN, marginBottom: 6 }}>Choose an avatar</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4, marginBottom: 14 }}>
        {AVATARS.map(a => <button key={a} onClick={() => setAvatar(a)} style={{ fontSize: 22, padding: 6, background: avatar === a ? "#FFF3E8" : "#fff", border: `2px solid ${avatar === a ? "#FF8C42" : "#e8e8e8"}`, borderRadius: 10, cursor: "pointer" }}>{a}</button>)}
      </div>
      {error && <div style={{ color: "#FF6B6B", fontSize: 13, fontFamily: FN, marginBottom: 10, textAlign: "center" }}>{error}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={onClose} full>Cancel</Btn>
        <Btn onClick={submit} bg="linear-gradient(135deg,#FF8C42,#FF6B6B)" color="#fff" border="transparent" full>Add ✓</Btn>
      </div>
    </div>
  </div>;
}

function ChildPicker({ parent, onPickChild, onViewDashboard, onLogout, refresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const children = db.getChildrenOf(parent.email);
  const handleAdd = (name, avatar) => {
    db.createChild(parent.email, name, avatar);
    setShowAdd(false);
    refresh();
  };
  return <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#FFF8E1 0%,#FFE0EC 50%,#E4F0FF 100%)" }}>
    <Bgs e={["☀️","🌈","⭐","🦋","🌻","🎈"]} />
    <div style={{ position: "relative", zIndex: 1, maxWidth: 500, margin: "0 auto", padding: "16px 16px 50px" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 44, animation: "bIn .5s" }}>☀️</div>
        <h1 style={{ fontSize: 32, fontWeight: 900, fontFamily: FN, background: "linear-gradient(135deg,#FF8C42,#FF6B6B,#B983FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>¡Hola, Amigo!</h1>
        <p style={{ fontSize: 13, color: "#666", fontFamily: FN }}>Welcome, {parent.name}! Who's learning today?</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {children.map(c => {
          const p = db.getProgress(c.id);
          const totalStars = Object.values(p.stars || {}).reduce((a,b) => a+b, 0);
          return <button key={c.id} onClick={() => onPickChild(c)} style={{ background: "#fff", border: "none", borderRadius: 20, padding: "20px 12px", cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,.06)", animation: "cPop .3s ease-out backwards" }}>
            <div style={{ fontSize: 56 }}>{c.avatar}</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#1E3A5F", fontFamily: FN, marginTop: 4 }}>{c.name}</div>
            <div style={{ fontSize: 12, color: "#888", fontFamily: FN, marginTop: 2 }}>⭐ {totalStars} · {Object.keys(p.stars || {}).length} lessons</div>
            {p.streak > 0 && <div style={{ fontSize: 11, color: "#FF6B6B", fontFamily: FN, marginTop: 2, fontWeight: 700 }}>🔥 {p.streak} day streak</div>}
          </button>;
        })}
        <button onClick={() => setShowAdd(true)} style={{ background: "rgba(255,255,255,.5)", border: "3px dashed #FF8C42", borderRadius: 20, padding: "20px 12px", cursor: "pointer", color: "#FF8C42", fontFamily: FN, fontWeight: 700 }}>
          <div style={{ fontSize: 48 }}>+</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Add child</div>
        </button>
      </div>
      {children.length > 0 && <Btn onClick={onViewDashboard} full bg="#fff" border="#4D96FF" color="#4D96FF" style={{ marginBottom: 10 }}>📊 View Parent Dashboard</Btn>}
      <Btn onClick={onLogout} full bg="#fff" border="#e0e0e0" color="#999">Log Out</Btn>
    </div>
    {showAdd && <AddChildModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
  </div>;
}

// ============================================================
// PARENT DASHBOARD — stats across all children
// ============================================================
function ParentDashboard({ parent, onBack }) {
  const [delChild, setDelChild] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const children = db.getChildrenOf(parent.email);

  const doDelete = () => {
    db.deleteChild(delChild.id);
    setDelChild(null);
    setRefresh(r => r + 1);
  };

  return <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#FFF8E1,#E4F0FF)", padding: "16px 16px 40px" }}>
    <Bgs e={["📊","⭐","📈"]} />
    <div style={{ position: "relative", zIndex: 1, maxWidth: 520, margin: "0 auto" }}>
      <Btn onClick={onBack} style={{ marginBottom: 16, fontSize: 13 }}>← Back</Btn>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 40 }}>📊</div>
        <h2 style={{ fontSize: 26, fontWeight: 900, fontFamily: FN, color: "#1E3A5F" }}>Parent Dashboard</h2>
        <p style={{ fontSize: 13, color: "#888", fontFamily: FN }}>{children.length} {children.length === 1 ? "child" : "children"} · {parent.name}</p>
      </div>
      {children.length === 0 && <div style={{ background: "#fff", borderRadius: 20, padding: 30, textAlign: "center", boxShadow: "0 3px 12px rgba(0,0,0,.05)" }}><div style={{ fontSize: 40, marginBottom: 10 }}>👶</div><p style={{ fontFamily: FN, color: "#888" }}>No children yet! Add one to start tracking progress.</p></div>}
      {children.map(c => {
        const p = db.getProgress(c.id);
        const totalStars = Object.values(p.stars || {}).reduce((a,b) => a+b, 0);
        const completedLessons = Object.keys(p.stars || {}).length;
        const perfectLessons = Object.values(p.stars || {}).filter(s => s === 3).length;
        const badgeCount = (p.badges || []).length;
        const songsCount = Object.keys(p.songsDone || {}).length;
        const lastActive = p.lastActive ? new Date(p.lastActive) : null;
        const daysAgo = lastActive ? Math.floor((Date.now() - lastActive.getTime()) / 86400000) : null;
        const activeLabel = lastActive ? (daysAgo === 0 ? "Active today" : daysAgo === 1 ? "Yesterday" : `${daysAgo} days ago`) : "Not started yet";
        // Per-world progress
        const worldProgress = [1,2,3,4].map(w => {
          const r = [[1,8],[9,16],[17,24],[25,32]][w-1];
          let stars = 0;
          for (let i = r[0]; i <= r[1]; i++) stars += (p.stars || {})[i] || 0;
          return { world: w, stars, max: (r[1]-r[0]+1)*3 };
        });
        return <div key={c.id} style={{ background: "#fff", borderRadius: 20, padding: 18, marginBottom: 14, boxShadow: "0 3px 12px rgba(0,0,0,.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 42 }}>{c.avatar}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 900, fontFamily: FN, color: "#1E3A5F" }}>{c.name}</div>
              <div style={{ fontSize: 12, color: "#888", fontFamily: FN }}>{activeLabel} · 🔥 {p.streak || 0} day streak</div>
            </div>
            <button onClick={() => setDelChild(c)} title="Remove child" style={{ background: "transparent", border: "none", color: "#FF6B6B", cursor: "pointer", fontSize: 18, padding: 4 }}>🗑️</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
            <div style={{ textAlign: "center", background: "#FFF8E1", borderRadius: 12, padding: "10px 4px" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#FF8C42", fontFamily: FN }}>{totalStars}</div>
              <div style={{ fontSize: 9, color: "#999", fontFamily: FN }}>⭐ Stars</div>
            </div>
            <div style={{ textAlign: "center", background: "#E8F8EA", borderRadius: 12, padding: "10px 4px" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#6BCB77", fontFamily: FN }}>{completedLessons}/32</div>
              <div style={{ fontSize: 9, color: "#999", fontFamily: FN }}>Lessons</div>
            </div>
            <div style={{ textAlign: "center", background: "#F3EAFF", borderRadius: 12, padding: "10px 4px" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#B983FF", fontFamily: FN }}>{badgeCount}</div>
              <div style={{ fontSize: 9, color: "#999", fontFamily: FN }}>Badges</div>
            </div>
            <div style={{ textAlign: "center", background: "#FFE8F2", borderRadius: 12, padding: "10px 4px" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#FF9EC7", fontFamily: FN }}>{songsCount}/{SONGS.length}</div>
              <div style={{ fontSize: 9, color: "#999", fontFamily: FN }}>Songs</div>
            </div>
          </div>
          <div style={{ marginBottom: 4 }}>
            {worldProgress.map(wp => <div key={wp.world} style={{ marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#666", fontFamily: FN, marginBottom: 2 }}>
                <span>{WORLDS[wp.world-1].emoji} {WORLDS[wp.world-1].name}</span>
                <span>{wp.stars}/{wp.max} ⭐</span>
              </div>
              <div style={{ background: "#f0f0f0", borderRadius: 50, height: 6, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(wp.stars/wp.max)*100}%`, background: WORLDS[wp.world-1].color, transition: "width .5s" }} />
              </div>
            </div>)}
          </div>
          {perfectLessons > 0 && <div style={{ fontSize: 11, color: "#6BCB77", fontFamily: FN, textAlign: "center", marginTop: 6, fontWeight: 700 }}>⭐⭐⭐ Perfect on {perfectLessons} {perfectLessons === 1 ? "lesson" : "lessons"}!</div>}
        </div>;
      })}
      {delChild && <div onClick={() => setDelChild(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, padding: 22, maxWidth: 360, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
          <h3 style={{ fontSize: 18, fontWeight: 900, fontFamily: FN, color: "#1E3A5F", marginBottom: 8 }}>Remove {delChild.name}?</h3>
          <p style={{ fontSize: 13, color: "#888", fontFamily: FN, marginBottom: 14 }}>This will delete all their progress. This cannot be undone.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => setDelChild(null)} full>Cancel</Btn>
            <Btn onClick={doDelete} bg="#FF6B6B" color="#fff" border="transparent" full>Remove</Btn>
          </div>
        </div>
      </div>}
    </div>
  </div>;
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [parent, setParent] = useState(null);
  const [child, setChild] = useState(null);
  const [progress, setProgress] = useState(null);
  const [screen, setScreen] = useState("childPicker"); // childPicker | dashboard | home | lesson | profile | songs | song | badges | flash | match | quiz | build | sayit | story
  const [lIdx, setLIdx] = useState(0);
  const [songIdx, setSongIdx] = useState(0);
  const [conf, setConf] = useState(false);
  const [result, setResult] = useState(null);
  const [ready, setReady] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [newBadge, setNewBadge] = useState(null);

  // Restore session on mount
  useEffect(() => {
    const sess = db.getSession();
    if (sess?.parentEmail) {
      const p = db.findParent(sess.parentEmail);
      if (p) {
        setParent(p);
        if (sess.activeChildId) {
          const children = db.getChildren();
          const c = children[sess.activeChildId];
          if (c) {
            setChild(c);
            const prog = db.touchStreak(c.id);
            setProgress(prog);
            setScreen("home");
          }
        }
      }
    }
    setReady(true);
  }, []);

  const loginParent = (p) => { setParent(p); setScreen("childPicker"); };

  const logoutParent = () => {
    db.clearSession();
    setParent(null); setChild(null); setProgress(null);
    setScreen("childPicker");
  };

  const pickChild = (c) => {
    setChild(c);
    const prog = db.touchStreak(c.id);
    setProgress(prog);
    db.setSession({ parentEmail: parent.email, activeChildId: c.id });
    setScreen("home");
  };

  const backToChildPicker = () => {
    setChild(null); setProgress(null);
    db.setSession({ parentEmail: parent.email, activeChildId: null });
    setScreen("childPicker");
  };

  const save = (newProg) => {
    setProgress(newProg);
    if (child) db.saveProgress(child.id, newProg);
    // Check badges
    const { allBadges, newBadges } = checkBadges(newProg);
    if (newBadges.length > 0) {
      const updated = { ...newProg, badges: allBadges };
      setProgress(updated);
      if (child) db.saveProgress(child.id, updated);
      // Show toast for first new badge (queue not implemented for simplicity)
      setNewBadge(newBadges[0]);
    }
  };

  const stars = progress?.stars || {};
  const totalStars = Object.values(stars).reduce((a, b) => a + b, 0);
  const lesson = LESSONS[lIdx];
  const song = SONGS[songIdx];

  const earn = (id) => {
    if (!progress) return;
    const p = stars[id] || 0;
    if (p < 3) {
      const ns = { ...stars, [id]: p + 1 };
      const np = { ...progress, stars: ns, lastLesson: Math.max(progress.lastLesson || 1, id) };
      save(np);
      setConf(true);
      setTimeout(() => setConf(false), 2500);
    }
  };

  const incrementStat = (key, amount = 1) => {
    if (!progress) return;
    save({ ...progress, [key]: (progress[key] || 0) + amount });
  };

  const markSongDone = (songId) => {
    if (!progress) return;
    const songsDone = { ...(progress.songsDone || {}), [songId]: Date.now() };
    save({ ...progress, songsDone });
    setConf(true);
    setTimeout(() => setConf(false), 2500);
  };

  const go = (s, i) => {
    if (i !== undefined) {
      if (s === "song") setSongIdx(i);
      else setLIdx(i);
    }
    setScreen(s);
    setResult(null);
  };

  // Loading
  if (!ready) return <div style={{ minHeight: "100vh", background: "#FFF8E1", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ textAlign: "center" }}><div style={{ fontSize: 48, animation: "bIn .8s" }}>☀️</div><p style={{ fontFamily: FN, color: "#999", marginTop: 12 }}>Loading…</p></div>
  </div>;

  // Auth gate
  if (!parent) return <AuthScreen onLogin={loginParent} />;

  // Child picker
  if (screen === "childPicker") return <>
    <ChildPicker key={refreshKey} parent={parent} onPickChild={pickChild} onViewDashboard={() => setScreen("dashboard")} onLogout={logoutParent} refresh={() => setRefreshKey(k => k + 1)} />
  </>;

  // Parent dashboard
  if (screen === "dashboard") return <ParentDashboard parent={parent} onBack={() => setScreen("childPicker")} />;

  // No active child → back to picker
  if (!child || !progress) { setScreen("childPicker"); return null; }

  // ============================================================
  // HOME SCREEN (child's learning hub)
  // ============================================================
  if (screen === "home") return <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#FFF8E1 0%,#FFE0EC 40%,#E4F0FF 80%,#F3EAFF 100%)" }}>
    <Bgs e={["☀️","🌈","⭐","🦋","🌻","🎈"]} />
    <Confetti active={conf} />
    {newBadge && <BadgeToast badge={newBadge} onClose={() => setNewBadge(null)} />}
    <div style={{ position: "relative", zIndex: 1, maxWidth: 540, margin: "0 auto", padding: "14px 14px 50px" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 36 }}>{child.avatar}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#1E3A5F", fontFamily: FN }}>¡Hola, {child.name}! 👋</div>
            {progress.streak > 0 && <div style={{ fontSize: 11, color: "#FF6B6B", fontFamily: FN, fontWeight: 700 }}>🔥 {progress.streak} day streak!</div>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => go("profile")} title="Profile" style={{ background: "#fff", border: "2px solid #e8e8e8", borderRadius: 12, padding: "6px 10px", fontSize: 13, fontFamily: FN, color: "#666", cursor: "pointer" }}>⚙️</button>
          <button onClick={backToChildPicker} title="Switch child" style={{ background: "#fff", border: "2px solid #e8e8e8", borderRadius: 12, padding: "6px 10px", fontSize: 13, fontFamily: FN, color: "#666", cursor: "pointer" }}>👥</button>
        </div>
      </div>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, fontFamily: FN, background: "linear-gradient(135deg,#FF8C42,#FF6B6B,#B983FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>¡Hola, Amigo!</h1>
      </div>
      {/* Stats bar */}
      <div style={{ background: "#fff", borderRadius: 18, padding: "10px 14px", marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-around", boxShadow: "0 3px 12px rgba(0,0,0,.05)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#FF8C42", fontFamily: FN }}>⭐ {totalStars}</div>
          <div style={{ fontSize: 9, color: "#999", fontFamily: FN, textTransform: "uppercase", fontWeight: 700 }}>Stars</div>
        </div>
        <div style={{ width: 1, height: 30, background: "#eee" }} />
        <button onClick={() => setScreen("badges")} style={{ textAlign: "center", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#B983FF", fontFamily: FN }}>🏆 {(progress.badges || []).length}</div>
          <div style={{ fontSize: 9, color: "#999", fontFamily: FN, textTransform: "uppercase", fontWeight: 700 }}>Badges</div>
        </button>
        <div style={{ width: 1, height: 30, background: "#eee" }} />
        <button onClick={() => setScreen("songs")} style={{ textAlign: "center", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#FF9EC7", fontFamily: FN }}>🎵 {Object.keys(progress.songsDone || {}).length}</div>
          <div style={{ fontSize: 9, color: "#999", fontFamily: FN, textTransform: "uppercase", fontWeight: 700 }}>Songs</div>
        </button>
      </div>

      {/* Songs & Badges quick buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button onClick={() => setScreen("songs")} style={{ flex: 1, background: "linear-gradient(135deg,#FF9EC7,#FFD93D)", border: "none", borderRadius: 16, padding: "12px", color: "#fff", fontWeight: 900, fontSize: 14, fontFamily: FN, cursor: "pointer", boxShadow: "0 3px 12px rgba(255,158,199,.3)" }}>🎵 Sing Along!</button>
        <button onClick={() => setScreen("badges")} style={{ flex: 1, background: "linear-gradient(135deg,#B983FF,#4D96FF)", border: "none", borderRadius: 16, padding: "12px", color: "#fff", fontWeight: 900, fontSize: 14, fontFamily: FN, cursor: "pointer", boxShadow: "0 3px 12px rgba(185,131,255,.3)" }}>🏆 Trophies</button>
      </div>

      {/* Worlds */}
      {WORLDS.map(w => {
        const ls = LESSONS.filter(l => l.id >= w.range[0] && l.id <= w.range[1]);
        const ws = ls.reduce((a, l) => a + (stars[l.id] || 0), 0);
        return <div key={w.id} style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 26 }}>{w.emoji}</span>
            <div><div style={{ fontSize: 16, fontWeight: 900, color: w.color, fontFamily: FN }}>{w.name}</div><div style={{ fontSize: 11, color: "#999", fontFamily: FN }}>{w.desc} · {ws}/{ls.length * 3} ⭐</div></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {ls.map((l, i) => { const s = stars[l.id] || 0; const ch = [16, 24, 32].includes(l.id);
              return <button key={l.id} onClick={() => go("lesson", LESSONS.indexOf(l))}
                style={{ background: ch ? "linear-gradient(135deg,#FFF8E1,#FFE8E8)" : "#fff", border: ch ? "2px solid #FFD93D" : "none", borderRadius: 16, padding: "12px 8px", cursor: "pointer", textAlign: "center", boxShadow: "0 3px 10px rgba(0,0,0,.05)", borderLeft: ch ? "none" : `4px solid ${l.color}`, transition: "transform .15s", animation: "cPop .3s ease-out backwards", animationDelay: `${i * 0.04}s` }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                <div style={{ fontSize: 26, marginBottom: 2 }}>{l.emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#1E3A5F", fontFamily: FN }}>{l.id}. {l.subtitle}</div>
                <div style={{ marginTop: 3, fontSize: 11 }}>{[0, 1, 2].map(j => <span key={j} style={{ opacity: j < s ? 1 : 0.2 }}>⭐</span>)}</div>
              </button>; })}
          </div>
        </div>;
      })}
    </div>
  </div>;

  // ============================================================
  // PROFILE SCREEN (child's profile)
  // ============================================================
  if (screen === "profile") return <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#FFF8E1,#E4F0FF)", padding: 16 }}>
    <Bgs e={["⭐","🌟"]} />
    <div style={{ position: "relative", zIndex: 1, maxWidth: 440, margin: "0 auto", paddingTop: 16 }}>
      <Btn onClick={() => go("home")} style={{ marginBottom: 16, fontSize: 13 }}>← Back</Btn>
      <div style={{ background: "#fff", borderRadius: 24, padding: "28px 24px", boxShadow: "0 6px 24px rgba(0,0,0,.06)", textAlign: "center" }}>
        <div style={{ fontSize: 72, marginBottom: 8 }}>{child.avatar}</div>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: "#1E3A5F", fontFamily: FN }}>{child.name}</h2>
        <p style={{ fontSize: 12, color: "#888", fontFamily: FN }}>Parent: {parent.name}</p>
        <div style={{ margin: "16px 0", display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 24, fontWeight: 900, color: "#FF8C42", fontFamily: FN }}>{totalStars}</div><div style={{ fontSize: 10, color: "#999", fontFamily: FN }}>Stars ⭐</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 24, fontWeight: 900, color: "#6BCB77", fontFamily: FN }}>{Object.keys(stars).length}</div><div style={{ fontSize: 10, color: "#999", fontFamily: FN }}>Lessons</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 24, fontWeight: 900, color: "#B983FF", fontFamily: FN }}>{(progress.badges || []).length}</div><div style={{ fontSize: 10, color: "#999", fontFamily: FN }}>Badges</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 24, fontWeight: 900, color: "#FF6B6B", fontFamily: FN }}>🔥 {progress.streak || 0}</div><div style={{ fontSize: 10, color: "#999", fontFamily: FN }}>Streak</div></div>
        </div>
        <div style={{ background: "#f0f0f0", borderRadius: 50, height: 14, margin: "12px 0", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 50, background: "linear-gradient(90deg,#6BCB77,#4D96FF)", width: `${(Object.keys(stars).length / LESSONS.length * 100)}%`, transition: "width .5s" }} />
        </div>
        <p style={{ fontSize: 12, color: "#999", fontFamily: FN, marginBottom: 16 }}>{Math.round(Object.keys(stars).length / LESSONS.length * 100)}% complete</p>
        <Btn onClick={() => setScreen("badges")} full bg="#fff" border="#B983FF" color="#B983FF" style={{ marginBottom: 8 }}>🏆 Trophy Cabinet</Btn>
        <Btn onClick={backToChildPicker} full bg="#fff" border="#4D96FF" color="#4D96FF" style={{ marginBottom: 8 }}>👥 Switch child</Btn>
      </div>
    </div>
  </div>;

  // ============================================================
  // SONGS LIST
  // ============================================================
  if (screen === "songs") return <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#FFFBE5,#FFE8F2)", padding: "16px 16px 40px" }}>
    <Bgs e={["🎵","🎶","🎤","✨"]} />
    <Confetti active={conf} />
    {newBadge && <BadgeToast badge={newBadge} onClose={() => setNewBadge(null)} />}
    <div style={{ position: "relative", zIndex: 1, maxWidth: 520, margin: "0 auto" }}>
      <Btn onClick={() => go("home")} style={{ marginBottom: 14, fontSize: 13 }}>← Home</Btn>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 48, animation: "bIn .5s" }}>🎵</div>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: "#1E3A5F", fontFamily: FN }}>Sing Along!</h2>
        <p style={{ fontSize: 13, color: "#888", fontFamily: FN }}>Classic Spanish kids' songs</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {SONGS.map((s, i) => {
          const done = !!(progress.songsDone || {})[s.id];
          return <button key={s.id} onClick={() => go("song", i)} style={{ display: "flex", alignItems: "center", gap: 14, background: "#fff", border: "none", borderRadius: 18, padding: "14px 16px", cursor: "pointer", boxShadow: "0 3px 12px rgba(0,0,0,.05)", textAlign: "left", borderLeft: `5px solid ${s.color}`, transition: "transform .15s", animation: "cPop .3s ease-out backwards", animationDelay: `${i * 0.05}s` }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
            <div style={{ fontSize: 38 }}>{s.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#1E3A5F", fontFamily: FN }}>{s.title}</div>
              <div style={{ fontSize: 12, color: "#888", fontFamily: FN }}>{s.subtitle}</div>
            </div>
            {done && <div style={{ fontSize: 20 }} title="Sung!">⭐</div>}
          </button>;
        })}
      </div>
    </div>
  </div>;

  // ============================================================
  // SONG PLAYER
  // ============================================================
  if (screen === "song") return <><SongPlayer song={song} onDone={() => markSongDone(song.id)} onBack={() => setScreen("songs")} /><Confetti active={conf} />{newBadge && <BadgeToast badge={newBadge} onClose={() => setNewBadge(null)} />}</>;

  // ============================================================
  // BADGES
  // ============================================================
  if (screen === "badges") return <BadgeCabinet progress={progress} onBack={() => go("home")} />;

  // ============================================================
  // LESSON HUB
  // ============================================================
  if (screen === "lesson") {
    const s = stars[lesson.id] || 0;
    const w = WORLDS.find(w => lesson.id >= w.range[0] && lesson.id <= w.range[1]);
    const hasS = lesson.sentences?.length > 0;
    const hasSt = !!lesson.story;
    const acts = [
      { label: "📚 Flashcards", desc: "Flip to learn", scr: "flash", clr: "#4D96FF" },
      { label: "🎯 Matching", desc: "Match Spanish → English", scr: "match", clr: "#6BCB77" },
      { label: "🧠 Quiz", desc: "Test yourself", scr: "quiz", clr: "#FF8C42" },
      { label: "🎤 Say It!", desc: "Say the words aloud!", scr: "sayit", clr: "#FF6B6B" },
    ];
    if (hasS) acts.push({ label: "🔨 Sentences", desc: "Build sentences!", scr: "build", clr: "#B983FF" });
    if (hasSt) acts.push({ label: "📖 Story", desc: "Read a story!", scr: "story", clr: "#FF9EC7" });
    return <div style={{ minHeight: "100vh", background: lesson.bg }}>
      <Bgs e={[lesson.emoji, "⭐", "🌟"]} /><Confetti active={conf} />
      {newBadge && <BadgeToast badge={newBadge} onClose={() => setNewBadge(null)} />}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 500, margin: "0 auto", padding: "14px 14px 36px" }}>
        <Btn onClick={() => go("home")} style={{ marginBottom: 12, fontSize: 12 }}>← {w?.name || "Home"}</Btn>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 48, animation: "bIn .5s" }}>{lesson.emoji}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: lesson.color, fontFamily: FN, textTransform: "uppercase", letterSpacing: 2 }}>Lesson {lesson.id}</div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: "#1E3A5F", fontFamily: FN }}>{lesson.title}</h2>
          <p style={{ fontSize: 14, color: "#888", fontFamily: FN }}>{lesson.subtitle}</p>
          <div style={{ marginTop: 4, fontSize: 16, letterSpacing: 3 }}>{[0, 1, 2].map(j => <span key={j} style={{ opacity: j < s ? 1 : 0.2 }}>⭐</span>)}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 20, padding: "18px 16px", marginBottom: 14, textAlign: "center", boxShadow: "0 3px 12px rgba(0,0,0,.04)", borderLeft: `5px solid ${lesson.color}`, position: "relative" }}>
          <div style={{ position: "absolute", top: 10, right: 10 }}><SpeakBtn text={lesson.phrase.es} size={12} color={lesson.color} /></div>
          <div style={{ fontSize: 9, textTransform: "uppercase", color: "#aaa", fontWeight: 700, letterSpacing: 2, marginBottom: 5, fontFamily: FN }}>Today's Phrase</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: lesson.color, fontFamily: FN }}>{lesson.phrase.es}</div>
          <div style={{ fontSize: 13, color: "#666", marginTop: 3, fontFamily: FN }}>{lesson.phrase.en}</div>
        </div>
        <div style={{ background: "linear-gradient(135deg,#FFF8E1,#FFFBE7)", borderRadius: 16, padding: "12px 14px", marginBottom: 14, border: "2px solid #FFD93D" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#FF8C42", fontFamily: FN }}>💡 Did you know?</div>
          <div style={{ fontSize: 12, color: "#555", fontFamily: FN, lineHeight: 1.5, marginTop: 2 }}>{lesson.funFact}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {acts.map(a => <button key={a.scr} onClick={() => go(a.scr)}
            style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "none", borderRadius: 16, padding: "12px 14px", cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,.04)", textAlign: "left", borderLeft: `4px solid ${a.clr}`, transition: "transform .15s" }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
            <div><div style={{ fontSize: 14, fontWeight: 800, color: "#1E3A5F", fontFamily: FN }}>{a.label}</div><div style={{ fontSize: 11, color: "#999", fontFamily: FN }}>{a.desc}</div></div>
            <div style={{ marginLeft: "auto", fontSize: 18, color: "#ccc" }}>→</div>
          </button>)}
        </div>
      </div>
    </div>;
  }

  // ============================================================
  // ACTIVITY WRAPPER
  // ============================================================
  const AW = ({ title, em, children }) => <div style={{ minHeight: "100vh", background: lesson.bg }}>
    <Bgs e={[em || lesson.emoji, "⭐"]} /><Confetti active={conf} />
    {newBadge && <BadgeToast badge={newBadge} onClose={() => setNewBadge(null)} />}
    <div style={{ position: "relative", zIndex: 1, maxWidth: 500, margin: "0 auto", padding: "14px 14px 36px" }}>
      <Btn onClick={() => go("lesson")} style={{ marginBottom: 12, fontSize: 12 }}>← Back</Btn>
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: "#1E3A5F", fontFamily: FN }}>{title}</h2>
        <div style={{ fontSize: 12, color: "#888", fontFamily: FN }}>Lesson {lesson.id}: {lesson.subtitle}</div>
      </div>
      {children}
    </div>
  </div>;

  const card = (ch) => <div style={{ background: "#fff", borderRadius: 20, padding: 16, boxShadow: "0 3px 12px rgba(0,0,0,.04)" }}>{ch}</div>;

  if (screen === "flash") return <AW title="📚 Flashcards" em="📚">
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{lesson.words.map((w, i) => <FlashCard key={w.es} word={w} index={i} />)}</div>
    <div style={{ textAlign: "center", marginTop: 18 }}><Btn onClick={() => { earn(lesson.id); go("lesson"); }} bg="linear-gradient(135deg,#FFD93D,#FF8C42)" color="#fff" border="transparent">⭐ I've learnt these!</Btn></div>
  </AW>;

  if (screen === "match") return <AW title="🎯 Matching" em="🎯">{card(result ? <Result score={result.s} total={result.t} onRetry={() => { setResult(null); go("match"); }} onBack={() => go("lesson")} onEarnStar={() => earn(lesson.id)} /> : <MatchGame words={lesson.words} onDone={() => { incrementStat("correctAnswers", 6); setResult({ s: 6, t: 6 }); }} />)}</AW>;

  if (screen === "quiz") return <AW title="🧠 Quiz" em="🧠">{card(result ? <Result score={result.s} total={result.t} onRetry={() => { setResult(null); go("quiz"); }} onBack={() => go("lesson")} onEarnStar={() => earn(lesson.id)} /> : <Quiz words={lesson.words} gaps={lesson.gaps} onDone={(s, t) => { incrementStat("correctAnswers", s); setResult({ s, t }); }} />)}</AW>;

  if (screen === "build") return <AW title="🔨 Sentences" em="🔨">{card(result ? <Result score={result.s} total={result.t} onRetry={() => { setResult(null); go("build"); }} onBack={() => go("lesson")} onEarnStar={() => earn(lesson.id)} /> : <SentenceBuilder sentences={lesson.sentences} onDone={(s, t) => { incrementStat("correctAnswers", s); setResult({ s, t }); }} />)}</AW>;

  if (screen === "sayit") return <AW title="🎤 Say It!" em="🎤">{card(result ? <Result score={result.s} total={result.t} onRetry={() => { setResult(null); go("sayit"); }} onBack={() => go("lesson")} onEarnStar={() => earn(lesson.id)} /> : <SayItGame words={lesson.words} onDone={(s, t) => { incrementStat("micUses", t); incrementStat("correctAnswers", s); setResult({ s, t }); }} />)}</AW>;

  if (screen === "story") return <AW title="📖 Story" em="📖">{card(result ? <Result score={result.s} total={result.t} onRetry={() => { setResult(null); go("story"); }} onBack={() => go("lesson")} onEarnStar={() => earn(lesson.id)} /> : <StoryReader story={lesson.story} onDone={(s, t) => { incrementStat("storiesRead", 1); incrementStat("correctAnswers", s); setResult({ s, t }); }} />)}</AW>;

  return null;
}
