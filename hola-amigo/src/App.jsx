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
  { id: 5, name: "Plaza del Pueblo", emoji: "⛲", color: "#FF9EC7", desc: "Town life & vocabulary!", range: [33, 40] },
  { id: 6, name: "Puente de Expresiones", emoji: "🌉", color: "#FFD93D", desc: "Express yourself!", range: [41, 50] },
  { id: 7, name: "Storyteller's Castle", emoji: "🏰", color: "#FF6B6B", desc: "Tell stories & give advice!", range: [51, 60] },
  { id: 8, name: "Vida Diaria", emoji: "🏠", color: "#FF8C42", desc: "Daily home life!", range: [61, 68] },
  { id: 9, name: "Cosas que Hago", emoji: "🎮", color: "#4D96FF", desc: "Actions, toys & games!", range: [69, 76] },
  { id: 10, name: "El Mundo Alrededor", emoji: "🌍", color: "#6BCB77", desc: "Animals, nature & space!", range: [77, 84] },
  { id: 11, name: "Cómo Soy", emoji: "👤", color: "#B983FF", desc: "Who I am — me, family, school!", range: [85, 92] },
  { id: 12, name: "Repaso Total", emoji: "🌟", color: "#FFD93D", desc: "Big review of everything!", range: [93, 100] },
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

  // ====================== WORLD 5: PLAZA DEL PUEBLO (Lessons 33-40) ======================
  L(33,"En la ciudad","Around town","🏙️","#4D96FF","#E4F0FF",[{es:"La ciudad",en:"The city",say:"la thyoo-DAHD",emoji:"🏙️"},{es:"La calle",en:"The street",say:"la KAH-yeh",emoji:"🛣️"},{es:"La plaza",en:"The square",say:"la PLAH-tha",emoji:"⛲"},{es:"El parque",en:"The park",say:"el PAR-keh",emoji:"🌳"},{es:"El banco",en:"The bank",say:"el BAHN-ko",emoji:"🏦"},{es:"La iglesia",en:"The church",say:"la ee-GLEH-syah",emoji:"⛪"},{es:"El museo",en:"The museum",say:"el moo-SEH-o",emoji:"🏛️"},{es:"El cine",en:"The cinema",say:"el THEE-neh",emoji:"🎬"}],"Most Spanish towns have a 'plaza mayor' — the main square where everyone meets!",{es:"Vamos al parque en la plaza.",en:"Let's go to the park in the square."},[{correct:["Vamos","al","parque"],shuffle:["parque","Vamos","al"],en:"Let's go to the park."},{correct:["El","cine","está","cerca"],shuffle:["cerca","cine","El","está"],en:"The cinema is nearby."}]),
  L(34,"Los transportes","Transport","🚌","#6BCB77","#E8F8EA",[{es:"El coche",en:"Car",say:"el KOH-cheh",emoji:"🚗"},{es:"El autobús",en:"Bus",say:"el ow-toh-BOOS",emoji:"🚌"},{es:"El tren",en:"Train",say:"el TREN",emoji:"🚆"},{es:"El avión",en:"Plane",say:"el ah-BYON",emoji:"✈️"},{es:"La bicicleta",en:"Bicycle",say:"la bee-thee-KLEH-tah",emoji:"🚲"},{es:"La moto",en:"Motorbike",say:"la MOH-toh",emoji:"🏍️"},{es:"El barco",en:"Boat",say:"el BAR-ko",emoji:"🚢"},{es:"A pie",en:"On foot",say:"ah PYEH",emoji:"🚶"}],"Spanish high-speed trains (AVE) zoom along at 300 km/h!",{es:"Voy al cole en bicicleta.",en:"I go to school by bike."},[{correct:["Voy","en","autobús"],shuffle:["autobús","en","Voy"],en:"I go by bus."},{correct:["El","tren","es","rápido"],shuffle:["rápido","es","tren","El"],en:"The train is fast."}]),
  L(35,"En el supermercado","At the supermarket","🛒","#FF8C42","#FFF3E8",[{es:"El supermercado",en:"Supermarket",say:"el soo-per-mer-KAH-do",emoji:"🛒"},{es:"El carrito",en:"Trolley",say:"el ka-RREE-toh",emoji:"🛒"},{es:"La lista",en:"The list",say:"la LEES-tah",emoji:"📝"},{es:"El paquete",en:"Packet",say:"el pa-KEH-teh",emoji:"📦"},{es:"La botella",en:"Bottle",say:"la bo-TEH-yah",emoji:"🍾"},{es:"La lata",en:"Tin/can",say:"la LAH-tah",emoji:"🥫"},{es:"La caja",en:"Box / checkout",say:"la KAH-hah",emoji:"📦"},{es:"La bolsa",en:"Bag",say:"la BOL-sah",emoji:"🛍️"}],"In Spain you usually have to pay 5-15 cents for a plastic bag — bring your own!",{es:"Tengo una lista para el supermercado.",en:"I have a list for the supermarket."},[{correct:["Tengo","una","lista"],shuffle:["lista","una","Tengo"],en:"I have a list."},{correct:["Compro","una","botella","de","agua"],shuffle:["agua","botella","Compro","de","una"],en:"I buy a bottle of water."}]),
  L(36,"Frutas y verduras","Fruits & vegetables","🥦","#6BCB77","#E8F8EA",[{es:"La zanahoria",en:"Carrot",say:"la tha-na-OH-ryah",emoji:"🥕"},{es:"El tomate",en:"Tomato",say:"el toh-MAH-teh",emoji:"🍅"},{es:"La patata",en:"Potato",say:"la pa-TAH-tah",emoji:"🥔"},{es:"La cebolla",en:"Onion",say:"la theh-BOH-yah",emoji:"🧅"},{es:"La lechuga",en:"Lettuce",say:"la leh-CHOO-gah",emoji:"🥬"},{es:"El pepino",en:"Cucumber",say:"el peh-PEE-no",emoji:"🥒"},{es:"El melocotón",en:"Peach",say:"el meh-lo-ko-TON",emoji:"🍑"},{es:"La piña",en:"Pineapple",say:"la PEE-nyah",emoji:"🍍"}],"In Latin America 'patata' is called 'papa' — same potato, different word!",{es:"Me gusta la ensalada con tomate.",en:"I like salad with tomato."},[{correct:["Me","gusta","el","tomate"],shuffle:["tomate","Me","el","gusta"],en:"I like tomato."},{correct:["Quiero","una","zanahoria"],shuffle:["zanahoria","una","Quiero"],en:"I want a carrot."}]),
  L(37,"Los deportes","Sports","⚽","#FF6B6B","#FFE8E8",[{es:"El fútbol",en:"Football",say:"el FOOT-bol",emoji:"⚽"},{es:"El baloncesto",en:"Basketball",say:"el ba-lon-THES-toh",emoji:"🏀"},{es:"El tenis",en:"Tennis",say:"el TEH-nees",emoji:"🎾"},{es:"La natación",en:"Swimming",say:"la na-tah-THYON",emoji:"🏊"},{es:"Correr",en:"To run",say:"ko-RREHR",emoji:"🏃"},{es:"Saltar",en:"To jump",say:"sal-TAR",emoji:"🤸"},{es:"Ganar",en:"To win",say:"gah-NAR",emoji:"🏆"},{es:"Perder",en:"To lose",say:"pehr-DEHR",emoji:"😢"}],"Spain's national football team is called 'La Roja' — The Red One!",{es:"Me encanta jugar al fútbol.",en:"I love to play football."},[{correct:["Juego","al","fútbol"],shuffle:["fútbol","al","Juego"],en:"I play football."},{correct:["Me","gusta","correr"],shuffle:["correr","Me","gusta"],en:"I like to run."}]),
  L(38,"Mi tiempo libre","My free time","🎨","#B983FF","#F3EAFF",[{es:"El tiempo libre",en:"Free time",say:"el TYEM-poh LEE-breh",emoji:"⏰"},{es:"Leer",en:"To read",say:"leh-EHR",emoji:"📚"},{es:"Dibujar",en:"To draw",say:"dee-boo-HAR",emoji:"✏️"},{es:"Pintar",en:"To paint",say:"peen-TAR",emoji:"🎨"},{es:"Bailar",en:"To dance",say:"by-LAR",emoji:"💃"},{es:"Cantar",en:"To sing",say:"kahn-TAR",emoji:"🎤"},{es:"Cocinar",en:"To cook",say:"ko-thee-NAR",emoji:"👨‍🍳"},{es:"Ver la tele",en:"To watch TV",say:"behr la TEH-leh",emoji:"📺"}],"Spanish kids love to dance flamenco — it has been around for over 200 years!",{es:"En mi tiempo libre, me gusta dibujar.",en:"In my free time, I like to draw."},[{correct:["Me","gusta","leer"],shuffle:["leer","Me","gusta"],en:"I like to read."},{correct:["Bailo","y","canto","mucho"],shuffle:["mucho","Bailo","canto","y"],en:"I dance and sing a lot."}]),
  L(39,"En la granja","On the farm","🐔","#FFD93D","#FFFBE5",[{es:"La granja",en:"Farm",say:"la GRAHN-hah",emoji:"🚜"},{es:"La gallina",en:"Hen",say:"la gah-YEE-nah",emoji:"🐔"},{es:"El gallo",en:"Rooster",say:"el GAH-yo",emoji:"🐓"},{es:"La oveja",en:"Sheep",say:"la oh-BEH-hah",emoji:"🐑"},{es:"La cabra",en:"Goat",say:"la KAH-brah",emoji:"🐐"},{es:"El pato",en:"Duck",say:"el PAH-toh",emoji:"🦆"},{es:"El bosque",en:"Forest",say:"el BOS-keh",emoji:"🌲"},{es:"El árbol",en:"Tree",say:"el AR-bol",emoji:"🌳"}],"Spanish roosters say 'kikirikí' — not 'cock-a-doodle-doo'!",{es:"En la granja hay muchas gallinas.",en:"On the farm there are many hens."},[{correct:["Hay","una","oveja"],shuffle:["oveja","una","Hay"],en:"There is a sheep."},{correct:["El","pato","nada","en","el","agua"],shuffle:["agua","nada","pato","el","El","en"],en:"The duck swims in the water."}]),
  L(40,"¡Maestro de las palabras!","Vocabulary Master Challenge","🏆","#FFD93D","#FFFBE5",[{es:"La ciudad",en:"City",say:"la thyoo-DAHD",emoji:"🏙️"},{es:"El autobús",en:"Bus",say:"el ow-toh-BOOS",emoji:"🚌"},{es:"El supermercado",en:"Supermarket",say:"el soo-per-mer-KAH-do",emoji:"🛒"},{es:"La zanahoria",en:"Carrot",say:"la tha-na-OH-ryah",emoji:"🥕"},{es:"El fútbol",en:"Football",say:"el FOOT-bol",emoji:"⚽"},{es:"Bailar",en:"To dance",say:"by-LAR",emoji:"💃"},{es:"La gallina",en:"Hen",say:"la gah-YEE-nah",emoji:"🐔"},{es:"El bosque",en:"Forest",say:"el BOS-keh",emoji:"🌲"}],"You learned 60+ new words! ¡Eres un maestro de las palabras! 🌟",{es:"¡Sé muchas palabras nuevas!",en:"I know lots of new words!"},[{correct:["Voy","al","supermercado","en","autobús"],shuffle:["autobús","Voy","supermercado","en","al"],en:"I go to the supermarket by bus."},{correct:["Me","gusta","jugar","al","fútbol"],shuffle:["fútbol","Me","jugar","al","gusta"],en:"I like to play football."}],[{q:"'El bosque' means:",opts:["The forest","The bus","The street"],ans:0},{q:"'Cocinar' means:",opts:["To cook","To dance","To run"],ans:0},{q:"'La piña' is:",opts:["Pineapple","Peach","Onion"],ans:0},{q:"'En bicicleta' means:",opts:["By bike","On foot","By car"],ans:0}]),

  // ====================== WORLD 6: PUENTE DE EXPRESIONES (Lessons 41-50) ======================
  L(41,"Mis amigos","My friends","🤝","#FF8C42","#FFF3E8",[{es:"Mejor amigo",en:"Best friend (m)",say:"meh-HOR ah-MEE-go",emoji:"👬"},{es:"Mejor amiga",en:"Best friend (f)",say:"meh-HOR ah-MEE-gah",emoji:"👭"},{es:"Conocer",en:"To meet/know",say:"ko-no-THEHR",emoji:"🤝"},{es:"Compartir",en:"To share",say:"kom-par-TEER",emoji:"🤲"},{es:"Ayudar",en:"To help",say:"ah-yoo-DAR",emoji:"🦸"},{es:"Reír",en:"To laugh",say:"reh-EER",emoji:"😂"},{es:"Llorar",en:"To cry",say:"yo-RAR",emoji:"😢"},{es:"Abrazar",en:"To hug",say:"ah-brah-THAR",emoji:"🤗"}],"In Spain, friends greet each other with two cheek kisses — left, then right!",{es:"Mi mejor amigo me ayuda mucho.",en:"My best friend helps me a lot."},[{correct:["Mi","amigo","es","muy","simpático"],shuffle:["simpático","amigo","muy","Mi","es"],en:"My friend is very nice."},{correct:["Comparto","mis","juguetes"],shuffle:["juguetes","Comparto","mis"],en:"I share my toys."}]),
  L(42,"Las celebraciones","Celebrations","🎉","#FF9EC7","#FFE8F2",[{es:"La fiesta",en:"The party",say:"la FYES-tah",emoji:"🎉"},{es:"Los regalos",en:"Presents",say:"los reh-GAH-los",emoji:"🎁"},{es:"La tarta",en:"Cake",say:"la TAR-tah",emoji:"🎂"},{es:"Las velas",en:"Candles",say:"las BEH-las",emoji:"🕯️"},{es:"Los globos",en:"Balloons",say:"los GLO-bos",emoji:"🎈"},{es:"Navidad",en:"Christmas",say:"na-bee-DAHD",emoji:"🎄"},{es:"Reyes Magos",en:"The Three Kings",say:"REH-yes MAH-gos",emoji:"👑"},{es:"Felicidades",en:"Congratulations",say:"feh-lee-thee-DAH-des",emoji:"🎊"}],"In Spain, kids get presents from the Three Kings on January 6th, not Santa!",{es:"¡Felicidades en tu cumpleaños!",en:"Happy birthday to you!"},[{correct:["Hay","muchos","globos","en","la","fiesta"],shuffle:["fiesta","muchos","globos","Hay","la","en"],en:"There are lots of balloons at the party."},{correct:["Me","encantan","los","regalos"],shuffle:["regalos","los","Me","encantan"],en:"I love the presents."}]),
  L(43,"Las profesiones","Jobs","👨‍⚕️","#4D96FF","#E4F0FF",[{es:"El médico",en:"Doctor (m)",say:"el MEH-dee-ko",emoji:"👨‍⚕️"},{es:"La médica",en:"Doctor (f)",say:"la MEH-dee-kah",emoji:"👩‍⚕️"},{es:"El profesor",en:"Teacher (m)",say:"el pro-feh-SOR",emoji:"👨‍🏫"},{es:"La profesora",en:"Teacher (f)",say:"la pro-feh-SOH-rah",emoji:"👩‍🏫"},{es:"El bombero",en:"Firefighter",say:"el bom-BEH-ro",emoji:"👨‍🚒"},{es:"El policía",en:"Police officer",say:"el po-lee-THEE-ah",emoji:"👮"},{es:"El cocinero",en:"Cook (m)",say:"el ko-thee-NEH-ro",emoji:"👨‍🍳"},{es:"El astronauta",en:"Astronaut",say:"el ahs-tro-NOW-tah",emoji:"👨‍🚀"}],"Many Spanish words for jobs change between -o (boy) and -a (girl)!",{es:"Quiero ser médica de mayor.",en:"I want to be a doctor when I grow up."},[{correct:["Mi","papá","es","cocinero"],shuffle:["cocinero","papá","Mi","es"],en:"My dad is a cook."},{correct:["Quiero","ser","astronauta"],shuffle:["astronauta","ser","Quiero"],en:"I want to be an astronaut."}]),
  L(44,"Música y arte","Music & art","🎵","#B983FF","#F3EAFF",[{es:"La música",en:"Music",say:"la MOO-see-kah",emoji:"🎵"},{es:"La canción",en:"Song",say:"la kahn-THYON",emoji:"🎶"},{es:"La guitarra",en:"Guitar",say:"la gee-TAH-rrah",emoji:"🎸"},{es:"El piano",en:"Piano",say:"el PYAH-no",emoji:"🎹"},{es:"La pintura",en:"Painting",say:"la peen-TOO-rah",emoji:"🖼️"},{es:"El cuadro",en:"Picture/painting",say:"el KWAH-dro",emoji:"🖼️"},{es:"El concierto",en:"Concert",say:"el kon-THYEHR-toh",emoji:"🎤"},{es:"Tocar",en:"To play (instrument)",say:"toh-KAR",emoji:"🎼"}],"Spain's most famous painters are Picasso, Goya, Velázquez, and Dalí!",{es:"Toco la guitarra y canto.",en:"I play the guitar and sing."},[{correct:["Toco","el","piano"],shuffle:["piano","Toco","el"],en:"I play the piano."},{correct:["Me","gusta","esta","canción"],shuffle:["canción","esta","Me","gusta"],en:"I like this song."}]),
  L(45,"La tecnología","Technology","📱","#4D96FF","#E4F0FF",[{es:"El móvil",en:"Mobile phone",say:"el MOH-beel",emoji:"📱"},{es:"El ordenador",en:"Computer",say:"el or-deh-na-DOR",emoji:"💻"},{es:"La tableta",en:"Tablet",say:"la tah-BLEH-tah",emoji:"📱"},{es:"La pantalla",en:"Screen",say:"la pan-TAH-yah",emoji:"🖥️"},{es:"El videojuego",en:"Video game",say:"el bee-deh-o-HWEH-go",emoji:"🎮"},{es:"Internet",en:"Internet",say:"een-tehr-NET",emoji:"🌐"},{es:"La foto",en:"Photo",say:"la FOH-toh",emoji:"📸"},{es:"El robot",en:"Robot",say:"el roh-BOT",emoji:"🤖"}],"In Spain, 'computer' is 'ordenador'. In Latin America, it's 'computadora'!",{es:"Tengo un móvil nuevo.",en:"I have a new mobile phone."},[{correct:["Mi","ordenador","es","rápido"],shuffle:["rápido","ordenador","Mi","es"],en:"My computer is fast."},{correct:["Hago","una","foto"],shuffle:["foto","una","Hago"],en:"I take a photo."}]),
  L(46,"Estoy enfermo","I'm sick","🤒","#FF6B6B","#FFE8E8",[{es:"La fiebre",en:"Fever",say:"la FYEH-breh",emoji:"🤒"},{es:"La tos",en:"Cough",say:"la TOS",emoji:"😷"},{es:"El resfriado",en:"Cold",say:"el res-FRYAH-do",emoji:"🤧"},{es:"El dolor",en:"Pain",say:"el doh-LOR",emoji:"😖"},{es:"La medicina",en:"Medicine",say:"la meh-dee-THEE-nah",emoji:"💊"},{es:"La tirita",en:"Plaster (band-aid)",say:"la tee-REE-tah",emoji:"🩹"},{es:"Descansar",en:"To rest",say:"des-kahn-SAR",emoji:"😴"},{es:"Mejorarse",en:"To get better",say:"meh-ho-RAR-seh",emoji:"💪"}],"In Spain, you can ask for medicine over the counter at any 'farmacia' — green cross sign!",{es:"Tengo fiebre y tos.",en:"I have a fever and a cough."},[{correct:["Necesito","una","tirita"],shuffle:["tirita","una","Necesito"],en:"I need a plaster."},{correct:["Tengo","que","descansar"],shuffle:["descansar","que","Tengo"],en:"I have to rest."}]),
  L(47,"Sentimientos","Deeper feelings","💭","#FF9EC7","#FFE8F2",[{es:"Nervioso",en:"Nervous",say:"nehr-BYOH-so",emoji:"😰"},{es:"Tímido",en:"Shy",say:"TEE-mee-do",emoji:"😳"},{es:"Sorprendido",en:"Surprised",say:"sor-pren-DEE-do",emoji:"😲"},{es:"Aburrido",en:"Bored",say:"ah-boo-RREE-do",emoji:"😑"},{es:"Tranquilo",en:"Calm",say:"trahn-KEE-loh",emoji:"😌"},{es:"Confundido",en:"Confused",say:"kon-foon-DEE-do",emoji:"😕"},{es:"Orgulloso",en:"Proud",say:"or-goo-YO-so",emoji:"😊"},{es:"Avergonzado",en:"Embarrassed",say:"ah-behr-gon-THAH-do",emoji:"😳"}],"In Spanish, 'estoy aburrido' means I'm bored, but 'soy aburrido' means I'm boring!",{es:"Estoy un poco nervioso pero contento.",en:"I'm a bit nervous but happy."},[{correct:["Estoy","muy","tranquilo","hoy"],shuffle:["hoy","Estoy","muy","tranquilo"],en:"I'm very calm today."},{correct:["Mamá","está","orgullosa"],shuffle:["orgullosa","Mamá","está"],en:"Mum is proud."}]),
  L(48,"Mi opinión","Giving opinions","💬","#FFD93D","#FFFBE5",[{es:"Creo que…",en:"I think…",say:"KREH-o keh",emoji:"💭"},{es:"Pienso que…",en:"I think that…",say:"PYEN-soh keh",emoji:"🤔"},{es:"En mi opinión",en:"In my opinion",say:"en mee oh-pee-NYON",emoji:"💬"},{es:"Estoy de acuerdo",en:"I agree",say:"es-TOY deh ah-KWEHR-do",emoji:"👍"},{es:"No estoy de acuerdo",en:"I disagree",say:"no es-TOY deh ah-KWEHR-do",emoji:"👎"},{es:"Quizás",en:"Maybe",say:"kee-THAS",emoji:"🤷"},{es:"Por supuesto",en:"Of course",say:"por soo-PWES-toh",emoji:"✅"},{es:"Depende",en:"It depends",say:"deh-PEN-deh",emoji:"⚖️"}],"Spaniards are known for being very direct with opinions — they don't sugar-coat!",{es:"Creo que el chocolate es delicioso.",en:"I think chocolate is delicious."},[{correct:["Creo","que","tienes","razón"],shuffle:["razón","tienes","Creo","que"],en:"I think you're right."},{correct:["En","mi","opinión","es","bonito"],shuffle:["bonito","mi","En","opinión","es"],en:"In my opinion it's pretty."}]),
  L(49,"Comparaciones","Comparisons","⚖️","#6BCB77","#E8F8EA",[{es:"Más que",en:"More than",say:"mahs keh",emoji:"➕"},{es:"Menos que",en:"Less than",say:"MEH-nos keh",emoji:"➖"},{es:"Tan… como",en:"As… as",say:"tahn KOH-mo",emoji:"🟰"},{es:"El mejor",en:"The best (m)",say:"el meh-HOR",emoji:"🥇"},{es:"La mejor",en:"The best (f)",say:"la meh-HOR",emoji:"🥇"},{es:"El peor",en:"The worst (m)",say:"el peh-OR",emoji:"🥉"},{es:"Más alto",en:"Taller",say:"mahs AHL-toh",emoji:"📏"},{es:"Más rápido",en:"Faster",say:"mahs RAH-pee-do",emoji:"💨"}],"Spanish uses 'que' for comparisons — like saying 'taller QUE me' for 'taller than me'!",{es:"Mi hermano es más alto que yo.",en:"My brother is taller than me."},[{correct:["Soy","más","rápido","que","tú"],shuffle:["tú","más","Soy","que","rápido"],en:"I'm faster than you."},{correct:["El","perro","es","el","mejor"],shuffle:["mejor","perro","el","El","es"],en:"The dog is the best."}]),
  L(50,"¡Campeón de comparaciones!","Comparison Champion","🏆","#FFD93D","#FFFBE5",[{es:"Mejor amigo",en:"Best friend",say:"meh-HOR ah-MEE-go",emoji:"👬"},{es:"La fiesta",en:"Party",say:"la FYES-tah",emoji:"🎉"},{es:"Quiero ser",en:"I want to be",say:"KYEH-ro sehr",emoji:"🌟"},{es:"Toco la guitarra",en:"I play the guitar",say:"TOH-ko la gee-TAH-rrah",emoji:"🎸"},{es:"Tengo fiebre",en:"I have a fever",say:"TEN-go FYEH-breh",emoji:"🤒"},{es:"Estoy nervioso",en:"I'm nervous",say:"es-TOY nehr-BYOH-so",emoji:"😰"},{es:"Creo que",en:"I think",say:"KREH-o keh",emoji:"💭"},{es:"Más alto que",en:"Taller than",say:"mahs AHL-toh keh",emoji:"📏"}],"You can now talk about jobs, opinions, feelings, and compare things! ¡Increíble! 🌟",{es:"Creo que soy más rápido que mi hermano.",en:"I think I'm faster than my brother."},[{correct:["Mi","amigo","es","mejor","que","yo"],shuffle:["mejor","amigo","Mi","yo","que","es"],en:"My friend is better than me."},{correct:["Quiero","ser","cocinero"],shuffle:["cocinero","ser","Quiero"],en:"I want to be a cook."}],[{q:"'Más alto que' means:",opts:["Taller than","As tall as","Less tall than"],ans:0},{q:"'Estoy de acuerdo' means:",opts:["I agree","I think","I'm tired"],ans:0},{q:"'Tengo fiebre' means:",opts:["I have a fever","I have a cough","I have a cold"],ans:0},{q:"'El mejor' means:",opts:["The best","The worst","The biggest"],ans:0}]),

  // ====================== WORLD 7: STORYTELLER'S CASTLE (Lessons 51-60) ======================
  L(51,"Estaba haciendo","I was doing (imperfect)","📚","#B983FF","#F3EAFF",[{es:"Estaba",en:"I was",say:"es-TAH-bah",emoji:"⏳"},{es:"Estaba comiendo",en:"I was eating",say:"es-TAH-bah ko-MYEN-do",emoji:"🍽️"},{es:"Estaba jugando",en:"I was playing",say:"es-TAH-bah hoo-GAHN-do",emoji:"⚽"},{es:"Estaba leyendo",en:"I was reading",say:"es-TAH-bah leh-YEN-do",emoji:"📖"},{es:"Estaba durmiendo",en:"I was sleeping",say:"es-TAH-bah door-MYEN-do",emoji:"😴"},{es:"De repente",en:"Suddenly",say:"deh reh-PEN-teh",emoji:"⚡"},{es:"Mientras",en:"While",say:"MYEN-tras",emoji:"⏰"},{es:"Antes",en:"Before",say:"AHN-tes",emoji:"⏪"}],"The imperfect tense in Spanish describes ongoing actions in the past — like 'I was doing'!",{es:"Estaba comiendo cuando llegó papá.",en:"I was eating when dad arrived."},[{correct:["Estaba","leyendo","un","libro"],shuffle:["libro","un","Estaba","leyendo"],en:"I was reading a book."},{correct:["Mientras","jugaba","sonó","el","teléfono"],shuffle:["teléfono","sonó","Mientras","jugaba","el"],en:"While I was playing the phone rang."}]),
  L(52,"Cuando era pequeño","When I was little","👶","#FF9EC7","#FFE8F2",[{es:"Cuando era pequeño",en:"When I was little (m)",say:"KWAN-do EH-rah peh-KEH-nyo",emoji:"👶"},{es:"Cuando era pequeña",en:"When I was little (f)",say:"KWAN-do EH-rah peh-KEH-nyah",emoji:"👧"},{es:"Era",en:"I was / it was",say:"EH-rah",emoji:"⏳"},{es:"Tenía",en:"I had",say:"teh-NEE-ah",emoji:"🎁"},{es:"Vivía",en:"I lived",say:"bee-BEE-ah",emoji:"🏠"},{es:"Iba",en:"I used to go",say:"EE-bah",emoji:"🚶"},{es:"Hacía",en:"I used to do/make",say:"ah-THEE-ah",emoji:"🛠️"},{es:"Recuerdo",en:"I remember",say:"reh-KWEHR-do",emoji:"💭"}],"In Spain, school doesn't start until kids are 6 — they go to 'guardería' (nursery) before that!",{es:"Cuando era pequeño, vivía en Inglaterra.",en:"When I was little, I lived in England."},[{correct:["Cuando","era","pequeño","tenía","un","perro"],shuffle:["perro","Cuando","tenía","pequeño","era","un"],en:"When I was little I had a dog."},{correct:["Iba","al","colegio","en","autobús"],shuffle:["autobús","Iba","colegio","al","en"],en:"I used to go to school by bus."}]),
  L(53,"Mi rutina antigua","My old routine","🌅","#FFD93D","#FFFBE5",[{es:"Siempre",en:"Always",say:"SYEM-preh",emoji:"♾️"},{es:"Nunca",en:"Never",say:"NOON-kah",emoji:"🚫"},{es:"A veces",en:"Sometimes",say:"ah BEH-thes",emoji:"🤷"},{es:"Todos los días",en:"Every day",say:"TOH-dos los DEE-as",emoji:"📅"},{es:"Cada semana",en:"Each week",say:"KAH-dah seh-MAH-nah",emoji:"📆"},{es:"Por la mañana",en:"In the morning",say:"por la ma-NYAH-nah",emoji:"🌅"},{es:"Por la noche",en:"At night",say:"por la NOH-cheh",emoji:"🌙"},{es:"Ya",en:"Already",say:"yah",emoji:"✅"}],"Spaniards say 'siempre' a lot — it sounds like 'syempre' and means 'always'!",{es:"Siempre comía pasta los domingos.",en:"I always used to eat pasta on Sundays."},[{correct:["Nunca","iba","al","cine"],shuffle:["cine","Nunca","al","iba"],en:"I never used to go to the cinema."},{correct:["A","veces","jugaba","fútbol"],shuffle:["fútbol","A","jugaba","veces"],en:"Sometimes I used to play football."}]),
  L(54,"Conectando ideas","Connecting ideas","🔗","#4D96FF","#E4F0FF",[{es:"Porque",en:"Because",say:"POR-keh",emoji:"💡"},{es:"Aunque",en:"Although",say:"OWN-keh",emoji:"🤔"},{es:"Sin embargo",en:"However",say:"seen em-BAR-go",emoji:"🔄"},{es:"Por eso",en:"That's why",say:"por EH-soh",emoji:"➡️"},{es:"Además",en:"Also/besides",say:"ah-deh-MAS",emoji:"➕"},{es:"Por ejemplo",en:"For example",say:"por eh-HEM-plo",emoji:"🔍"},{es:"Es decir",en:"That is to say",say:"es deh-THEER",emoji:"💬"},{es:"Por fin",en:"Finally",say:"por FEEN",emoji:"🏁"}],"In Spanish, 'porque' is one word for 'because', but '¿por qué?' (two words) is 'why?'!",{es:"Estoy contento porque hace sol.",en:"I'm happy because it's sunny."},[{correct:["No","como","carne","porque","soy","vegetariano"],shuffle:["vegetariano","carne","No","porque","soy","como"],en:"I don't eat meat because I'm vegetarian."},{correct:["Es","tarde","sin","embargo","no","tengo","sueño"],shuffle:["tengo","tarde","Es","embargo","no","sueño","sin"],en:"It's late however I'm not sleepy."}]),
  L(55,"Mi casa ideal","My dream house","🏰","#B983FF","#F3EAFF",[{es:"Ideal",en:"Ideal/dream",say:"ee-deh-AL",emoji:"✨"},{es:"Soñar",en:"To dream",say:"so-NYAR",emoji:"💭"},{es:"Imaginar",en:"To imagine",say:"ee-mah-hee-NAR",emoji:"🌈"},{es:"Tendría",en:"It would have",say:"ten-DREE-ah",emoji:"🎁"},{es:"Una piscina",en:"A swimming pool",say:"oo-nah pees-THEE-nah",emoji:"🏊"},{es:"Un castillo",en:"A castle",say:"oon kahs-TEE-yo",emoji:"🏰"},{es:"Un tobogán",en:"A slide",say:"oon to-bo-GAHN",emoji:"🛝"},{es:"Una habitación enorme",en:"A huge room",say:"oo-nah ah-bee-tah-THYON eh-NOR-meh",emoji:"🛏️"}],"Spain has lots of beautiful old castles — over 2,500 of them across the country!",{es:"Mi casa ideal tendría una piscina grande.",en:"My dream house would have a big swimming pool."},[{correct:["Mi","casa","ideal","sería","grande"],shuffle:["sería","casa","Mi","ideal","grande"],en:"My dream house would be big."},{correct:["Tendría","un","tobogán","y","una","piscina"],shuffle:["piscina","tobogán","una","Tendría","un","y"],en:"It would have a slide and a pool."}]),
  L(56,"Mi viaje soñado","My dream trip","🌍","#6BCB77","#E8F8EA",[{es:"El viaje",en:"The trip",say:"el BYAH-heh",emoji:"✈️"},{es:"Viajar",en:"To travel",say:"byah-HAR",emoji:"🌍"},{es:"Visitar",en:"To visit",say:"bee-see-TAR",emoji:"🗺️"},{es:"La playa",en:"Beach",say:"la PLAH-yah",emoji:"🏖️"},{es:"Las montañas",en:"Mountains",say:"las mon-TAH-nyas",emoji:"⛰️"},{es:"El desierto",en:"Desert",say:"el deh-SYEHR-toh",emoji:"🏜️"},{es:"La selva",en:"Jungle",say:"la SEHL-bah",emoji:"🌴"},{es:"La maleta",en:"Suitcase",say:"la mah-LEH-tah",emoji:"🧳"}],"Spain is in Europe, but it has rainforests, deserts, beaches and mountains all in one country!",{es:"Quiero viajar a las montañas.",en:"I want to travel to the mountains."},[{correct:["Voy","a","visitar","la","selva"],shuffle:["selva","visitar","Voy","la","a"],en:"I'm going to visit the jungle."},{correct:["Mi","maleta","es","muy","grande"],shuffle:["grande","maleta","Mi","muy","es"],en:"My suitcase is very big."}]),
  L(57,"Estoy de acuerdo","Agreeing & disagreeing","💬","#FF8C42","#FFF3E8",[{es:"Tienes razón",en:"You're right",say:"TYEH-nes rah-THON",emoji:"✅"},{es:"No tienes razón",en:"You're wrong",say:"no TYEH-nes rah-THON",emoji:"❌"},{es:"Yo también",en:"Me too",say:"yo tahm-BYEN",emoji:"👍"},{es:"Yo tampoco",en:"Me neither",say:"yo tahm-POH-ko",emoji:"👎"},{es:"Sí, claro",en:"Yes, of course",say:"see KLAH-ro",emoji:"✔️"},{es:"De ninguna manera",en:"No way",say:"deh neen-GOO-nah ma-NEH-rah",emoji:"🚫"},{es:"Más o menos",en:"More or less",say:"mahs oh MEH-nos",emoji:"🤷"},{es:"Exacto",en:"Exactly",say:"ek-SAK-toh",emoji:"💯"}],"Spanish kids say 'vale' all the time — it means 'OK' or 'I agree'!",{es:"Sí, claro, tienes razón.",en:"Yes, of course, you're right."},[{correct:["Yo","también","quiero","helado"],shuffle:["helado","quiero","Yo","también"],en:"I want ice cream too."},{correct:["No","tienes","razón","es","verde"],shuffle:["verde","razón","No","es","tienes"],en:"You're wrong, it's green."}]),
  L(58,"Dando instrucciones","Giving instructions","📋","#FFD93D","#FFFBE5",[{es:"Primero",en:"First",say:"pree-MEH-ro",emoji:"1️⃣"},{es:"Luego",en:"Then",say:"LWEH-go",emoji:"2️⃣"},{es:"Después",en:"Afterwards",say:"des-PWES",emoji:"3️⃣"},{es:"Por último",en:"Finally",say:"por OOL-tee-mo",emoji:"🏁"},{es:"Coge",en:"Take/grab (you)",say:"KOH-heh",emoji:"✋"},{es:"Pon",en:"Put (you)",say:"pon",emoji:"📥"},{es:"Mezcla",en:"Mix (you)",say:"METH-klah",emoji:"🥄"},{es:"Espera",en:"Wait (you)",say:"es-PEH-rah",emoji:"⏰"}],"In Spanish, you can give instructions just by using the verb without 'you' — like 'Mezcla!' for 'Mix!'",{es:"Primero coge un huevo, luego mezcla.",en:"First take an egg, then mix."},[{correct:["Primero","pon","el","agua"],shuffle:["agua","Primero","el","pon"],en:"First put the water."},{correct:["Luego","mezcla","todo","junto"],shuffle:["junto","todo","Luego","mezcla"],en:"Then mix everything together."}]),
  L(59,"Pidiendo consejos","Asking for advice","🤔","#FF6B6B","#FFE8E8",[{es:"¿Qué hago?",en:"What do I do?",say:"keh AH-go",emoji:"❓"},{es:"¿Puedes ayudarme?",en:"Can you help me?",say:"PWEH-des ah-yoo-DAR-meh",emoji:"🆘"},{es:"Deberías",en:"You should",say:"deh-beh-REE-as",emoji:"💡"},{es:"No deberías",en:"You shouldn't",say:"no deh-beh-REE-as",emoji:"⚠️"},{es:"Es mejor",en:"It's better",say:"es meh-HOR",emoji:"👍"},{es:"Tienes que",en:"You have to",say:"TYEH-nes keh",emoji:"❗"},{es:"Cuidado",en:"Be careful",say:"kwee-DAH-do",emoji:"⚠️"},{es:"Tranquilo",en:"Don't worry",say:"trahn-KEE-loh",emoji:"😌"}],"Spaniards often say 'tranqui' (short for 'tranquilo') to friends — it means 'chill out!'",{es:"¿Puedes ayudarme con la tarea?",en:"Can you help me with the homework?"},[{correct:["Deberías","descansar","más"],shuffle:["más","Deberías","descansar"],en:"You should rest more."},{correct:["Tienes","que","estudiar","mucho"],shuffle:["mucho","estudiar","Tienes","que"],en:"You have to study a lot."}]),
  L(60,"¡Maestro narrador!","Storyteller Champion","🏆","#FFD93D","#FFFBE5",[{es:"Estaba haciendo",en:"I was doing",say:"es-TAH-bah ah-THYEN-do",emoji:"⏳"},{es:"Cuando era pequeño",en:"When I was little",say:"KWAN-do EH-rah peh-KEH-nyo",emoji:"👶"},{es:"Porque",en:"Because",say:"POR-keh",emoji:"💡"},{es:"Mi casa ideal",en:"My dream house",say:"mee KAH-sah ee-deh-AL",emoji:"🏰"},{es:"Quiero viajar",en:"I want to travel",say:"KYEH-ro byah-HAR",emoji:"✈️"},{es:"Tienes razón",en:"You're right",say:"TYEH-nes rah-THON",emoji:"✅"},{es:"Primero, luego",en:"First, then",say:"pree-MEH-ro, LWEH-go",emoji:"📋"},{es:"Deberías",en:"You should",say:"deh-beh-REE-as",emoji:"💡"}],"You can now tell stories about the past, share opinions, give advice, and connect ideas! ¡Eres un maestro narrador! 🌟",{es:"Cuando era pequeño, soñaba con viajar a las montañas.",en:"When I was little, I dreamed of travelling to the mountains."},[{correct:["Cuando","era","pequeño","estaba","feliz"],shuffle:["feliz","Cuando","estaba","era","pequeño"],en:"When I was little I was happy."},{correct:["Primero","tienes","que","escuchar"],shuffle:["escuchar","tienes","Primero","que"],en:"First you have to listen."}],[{q:"'Estaba comiendo' means:",opts:["I was eating","I will eat","I eat"],ans:0},{q:"'Cuando era pequeño' means:",opts:["When I was little","When I'm bigger","When I was sick"],ans:0},{q:"'Tienes razón' means:",opts:["You're right","You're tired","You're nice"],ans:0},{q:"'Deberías descansar' means:",opts:["You should rest","You can rest","You don't rest"],ans:0}]),

  // ====================== WORLD 8: VIDA DIARIA (Lessons 61-68) ======================
  L(61,"En mi mochila","Things in my schoolbag","🎒","#FF8C42","#FFF3E8",[{es:"La mochila",en:"Backpack",say:"la mo-CHEE-lah",emoji:"🎒"},{es:"El cuaderno",en:"Notebook",say:"el kwah-DEHR-no",emoji:"📓"},{es:"El bolígrafo",en:"Pen",say:"el bo-LEE-grah-fo",emoji:"🖊️"},{es:"La goma",en:"Eraser",say:"la GOH-mah",emoji:"🪦"},{es:"El sacapuntas",en:"Pencil sharpener",say:"el sah-kah-POON-tas",emoji:"✏️"},{es:"La regla",en:"Ruler",say:"la REH-glah",emoji:"📏"},{es:"Las tijeras",en:"Scissors",say:"las tee-HEH-rahs",emoji:"✂️"},{es:"El pegamento",en:"Glue",say:"el peh-gah-MEN-toh",emoji:"🧴"}],"In Spain, kids use 'bolígrafo' but often shorten it to 'boli' — like 'pen' in English!",{es:"En mi mochila tengo cuadernos y bolis.",en:"In my backpack I have notebooks and pens."},[{correct:["Tengo","un","cuaderno","azul"],shuffle:["azul","cuaderno","Tengo","un"],en:"I have a blue notebook."},{correct:["Necesito","las","tijeras"],shuffle:["tijeras","las","Necesito"],en:"I need the scissors."}]),
  L(62,"La hora del baño","Bath time","🛁","#4D96FF","#E4F0FF",[{es:"El baño",en:"The bath/bathroom",say:"el BAH-nyo",emoji:"🛁"},{es:"El jabón",en:"Soap",say:"el hah-BON",emoji:"🧼"},{es:"El champú",en:"Shampoo",say:"el cham-POO",emoji:"🧴"},{es:"La toalla",en:"Towel",say:"la toh-AH-yah",emoji:"🏖️"},{es:"El cepillo de dientes",en:"Toothbrush",say:"el theh-PEE-yo deh DYEN-tes",emoji:"🪥"},{es:"La pasta de dientes",en:"Toothpaste",say:"la PAHS-tah deh DYEN-tes",emoji:"🦷"},{es:"Lavarse",en:"To wash oneself",say:"lah-BAR-seh",emoji:"🚿"},{es:"Limpio",en:"Clean",say:"LEEM-pyo",emoji:"✨"}],"Spanish kids brush their teeth at least twice a day — morning and night!",{es:"Me lavo con jabón y champú.",en:"I wash with soap and shampoo."},[{correct:["Tengo","una","toalla","grande"],shuffle:["grande","toalla","Tengo","una"],en:"I have a big towel."},{correct:["Me","lavo","los","dientes"],shuffle:["dientes","Me","los","lavo"],en:"I brush my teeth."}]),
  L(63,"En la cocina","In the kitchen","🍳","#FFD93D","#FFFBE5",[{es:"La nevera",en:"Fridge",say:"la neh-BEH-rah",emoji:"❄️"},{es:"El horno",en:"Oven",say:"el OR-no",emoji:"🔥"},{es:"El plato",en:"Plate",say:"el PLAH-toh",emoji:"🍽️"},{es:"El vaso",en:"Glass",say:"el BAH-so",emoji:"🥛"},{es:"El tenedor",en:"Fork",say:"el teh-neh-DOR",emoji:"🍴"},{es:"La cuchara",en:"Spoon",say:"la koo-CHAH-rah",emoji:"🥄"},{es:"El cuchillo",en:"Knife",say:"el koo-CHEE-yo",emoji:"🔪"},{es:"La servilleta",en:"Napkin",say:"la sehr-bee-YEH-tah",emoji:"🧻"}],"In Spain, lunch is the biggest meal — and families often eat together at 2pm!",{es:"Pongo los platos y los vasos.",en:"I put out the plates and the glasses."},[{correct:["Necesito","un","tenedor"],shuffle:["tenedor","un","Necesito"],en:"I need a fork."},{correct:["El","vaso","está","en","la","mesa"],shuffle:["mesa","la","El","vaso","en","está"],en:"The glass is on the table."}]),
  L(64,"Mi dormitorio","My bedroom","🛏️","#B983FF","#F3EAFF",[{es:"La cama",en:"Bed",say:"la KAH-mah",emoji:"🛏️"},{es:"La almohada",en:"Pillow",say:"la al-mo-AH-dah",emoji:"💤"},{es:"Las sábanas",en:"Sheets",say:"las SAH-bah-nas",emoji:"🛏️"},{es:"La manta",en:"Blanket",say:"la MAHN-tah",emoji:"🧺"},{es:"La lámpara",en:"Lamp",say:"la LAHM-pah-rah",emoji:"💡"},{es:"El armario",en:"Wardrobe",say:"el ar-MAH-ryo",emoji:"🚪"},{es:"El cajón",en:"Drawer",say:"el kah-HON",emoji:"📦"},{es:"El espejo",en:"Mirror",say:"el es-PEH-ho",emoji:"🪞"}],"Spanish kids often have their clothes in 'el armario' — a big wardrobe instead of dresser drawers!",{es:"Mi cama tiene dos almohadas.",en:"My bed has two pillows."},[{correct:["Mi","lámpara","es","amarilla"],shuffle:["amarilla","lámpara","Mi","es"],en:"My lamp is yellow."},{correct:["Hay","ropa","en","el","armario"],shuffle:["armario","ropa","Hay","en","el"],en:"There are clothes in the wardrobe."}]),
  L(65,"Limpiando la casa","Cleaning the house","🧹","#6BCB77","#E8F8EA",[{es:"Limpiar",en:"To clean",say:"leem-PYAR",emoji:"✨"},{es:"La escoba",en:"Broom",say:"la es-KOH-bah",emoji:"🧹"},{es:"La aspiradora",en:"Vacuum cleaner",say:"la ahs-pee-rah-DOH-rah",emoji:"🪛"},{es:"El polvo",en:"Dust",say:"el POL-bo",emoji:"💨"},{es:"La basura",en:"Rubbish",say:"la bah-SOO-rah",emoji:"🗑️"},{es:"Ordenar",en:"To tidy up",say:"or-deh-NAR",emoji:"📚"},{es:"Sucio",en:"Dirty",say:"SOO-thyo",emoji:"💩"},{es:"Lavar los platos",en:"Wash the dishes",say:"lah-BAR los PLAH-tos",emoji:"🍽️"}],"In Spain, Saturday morning is when many families clean the whole house together!",{es:"Tengo que limpiar mi habitación.",en:"I have to clean my room."},[{correct:["Lavamos","los","platos"],shuffle:["platos","los","Lavamos"],en:"We wash the dishes."},{correct:["La","casa","está","sucia"],shuffle:["sucia","casa","La","está"],en:"The house is dirty."}]),
  L(66,"Las tareas de casa","Chores","🧺","#FF6B6B","#FFE8E8",[{es:"Hacer la cama",en:"Make the bed",say:"ah-THEHR la KAH-mah",emoji:"🛏️"},{es:"Poner la mesa",en:"Set the table",say:"po-NEHR la MEH-sah",emoji:"🍽️"},{es:"Sacar la basura",en:"Take out the rubbish",say:"sah-KAR la bah-SOO-rah",emoji:"🗑️"},{es:"Regar las plantas",en:"Water the plants",say:"reh-GAR las PLAHN-tahs",emoji:"🌱"},{es:"Pasear al perro",en:"Walk the dog",say:"pah-seh-AR ahl PEH-rro",emoji:"🐕"},{es:"Doblar la ropa",en:"Fold clothes",say:"do-BLAR la ROH-pah",emoji:"👕"},{es:"Ayudar en casa",en:"Help at home",say:"ah-yoo-DAR en KAH-sah",emoji:"🤝"},{es:"Cada día",en:"Every day",say:"KAH-dah DEE-ah",emoji:"📅"}],"Spanish kids often get a small allowance ('la paga') for doing their chores!",{es:"Hago la cama cada día.",en:"I make the bed every day."},[{correct:["Tengo","que","poner","la","mesa"],shuffle:["mesa","la","Tengo","poner","que"],en:"I have to set the table."},{correct:["Mi","hermana","pasea","al","perro"],shuffle:["perro","al","Mi","hermana","pasea"],en:"My sister walks the dog."}]),
  L(67,"De compras","Going shopping","💰","#FFD93D","#FFFBE5",[{es:"El dinero",en:"Money",say:"el dee-NEH-ro",emoji:"💵"},{es:"El euro",en:"Euro",say:"el EH-oo-ro",emoji:"💶"},{es:"El céntimo",en:"Cent",say:"el THEN-tee-mo",emoji:"🪙"},{es:"Las monedas",en:"Coins",say:"las mo-NEH-dahs",emoji:"🪙"},{es:"El billete",en:"Banknote",say:"el bee-YEH-teh",emoji:"💵"},{es:"El cambio",en:"Change",say:"el KAHM-byo",emoji:"💱"},{es:"Pagar",en:"To pay",say:"pah-GAR",emoji:"💳"},{es:"Caro / Barato",en:"Expensive / cheap",say:"KAH-ro / bah-RAH-toh",emoji:"⚖️"}],"Spain uses the euro — and Spanish euro coins have King Felipe VI's face on them!",{es:"Tengo cinco euros para gastar.",en:"I have five euros to spend."},[{correct:["Pago","con","monedas"],shuffle:["monedas","con","Pago"],en:"I pay with coins."},{correct:["Esto","es","muy","barato"],shuffle:["barato","muy","Esto","es"],en:"This is very cheap."}]),
  L(68,"¡Campeón de casa!","Casa Champion","🏆","#FFD93D","#FFFBE5",[{es:"La mochila",en:"Backpack",say:"la mo-CHEE-lah",emoji:"🎒"},{es:"El jabón",en:"Soap",say:"el hah-BON",emoji:"🧼"},{es:"La nevera",en:"Fridge",say:"la neh-BEH-rah",emoji:"❄️"},{es:"La cama",en:"Bed",say:"la KAH-mah",emoji:"🛏️"},{es:"Limpiar",en:"To clean",say:"leem-PYAR",emoji:"✨"},{es:"Hacer la cama",en:"Make the bed",say:"ah-THEHR la KAH-mah",emoji:"🛏️"},{es:"El dinero",en:"Money",say:"el dee-NEH-ro",emoji:"💵"},{es:"Pagar",en:"To pay",say:"pah-GAR",emoji:"💳"}],"You can now talk about everything in your home in Spanish! 🏠✨",{es:"Limpio mi habitación y hago la cama.",en:"I clean my room and make the bed."},[{correct:["Hago","la","cama","cada","día"],shuffle:["día","cama","Hago","la","cada"],en:"I make the bed every day."},{correct:["Tengo","tres","euros","y","unas","monedas"],shuffle:["monedas","tres","Tengo","euros","unas","y"],en:"I have three euros and some coins."}],[{q:"'La nevera' means:",opts:["Fridge","Oven","Sink"],ans:0},{q:"'Hacer la cama' means:",opts:["Make the bed","Wash the bed","Lie in bed"],ans:0},{q:"'Caro' means:",opts:["Expensive","Cheap","Easy"],ans:0},{q:"'La almohada' is:",opts:["Pillow","Blanket","Sheet"],ans:0}]),

  // ====================== WORLD 9: COSAS QUE HAGO (Lessons 69-76) ======================
  L(69,"Verbos diarios","Everyday actions","🏃","#4D96FF","#E4F0FF",[{es:"Abrir",en:"To open",say:"ah-BREER",emoji:"🚪"},{es:"Cerrar",en:"To close",say:"theh-RRAR",emoji:"🚪"},{es:"Encontrar",en:"To find",say:"en-kon-TRAR",emoji:"🔍"},{es:"Perder",en:"To lose",say:"pehr-DEHR",emoji:"❌"},{es:"Dar",en:"To give",say:"DAR",emoji:"🤲"},{es:"Tomar",en:"To take",say:"toh-MAR",emoji:"✋"},{es:"Empezar",en:"To start",say:"em-peh-THAR",emoji:"▶️"},{es:"Terminar",en:"To finish",say:"tehr-mee-NAR",emoji:"🏁"}],"Spanish has TWO different verbs for 'to take' — 'tomar' and 'coger'!",{es:"Empiezo a las nueve y termino a las dos.",en:"I start at nine and finish at two."},[{correct:["Abro","la","puerta"],shuffle:["puerta","la","Abro"],en:"I open the door."},{correct:["Encontré","mi","libro"],shuffle:["libro","mi","Encontré"],en:"I found my book."}]),
  L(70,"En el patio","On the playground","🛝","#FF8C42","#FFF3E8",[{es:"El columpio",en:"Swing",say:"el ko-LOOM-pyo",emoji:"🛝"},{es:"El tobogán",en:"Slide",say:"el toh-bo-GAHN",emoji:"🛝"},{es:"Subir",en:"To climb up",say:"soo-BEER",emoji:"⬆️"},{es:"Bajar",en:"To go down",say:"bah-HAR",emoji:"⬇️"},{es:"Caerse",en:"To fall",say:"kah-EHR-seh",emoji:"💥"},{es:"Levantarse",en:"To get up",say:"leh-bahn-TAR-seh",emoji:"🆙"},{es:"Esconderse",en:"To hide",say:"es-kon-DEHR-seh",emoji:"🙈"},{es:"Buscar",en:"To search",say:"boos-KAR",emoji:"🔎"}],"In Spain, school 'recreo' (break) is super important — kids play in the patio for 30 mins!",{es:"Me subo al tobogán y bajo rápido.",en:"I climb up the slide and go down fast."},[{correct:["Subo","al","columpio"],shuffle:["columpio","al","Subo"],en:"I get on the swing."},{correct:["Mi","amigo","se","cayó"],shuffle:["cayó","Mi","amigo","se"],en:"My friend fell down."}]),
  L(71,"Construyendo cosas","Making things","🛠️","#FF9EC7","#FFE8F2",[{es:"Cortar",en:"To cut",say:"kor-TAR",emoji:"✂️"},{es:"Pegar",en:"To stick",say:"peh-GAR",emoji:"🩹"},{es:"Doblar",en:"To fold",say:"do-BLAR",emoji:"📄"},{es:"Construir",en:"To build",say:"kon-stroo-EER",emoji:"🔨"},{es:"Pintar",en:"To paint",say:"peen-TAR",emoji:"🎨"},{es:"Hacer",en:"To make/do",say:"ah-THEHR",emoji:"🛠️"},{es:"El papel",en:"Paper",say:"el pah-PEL",emoji:"📄"},{es:"Las manualidades",en:"Crafts",say:"las mah-nwah-lee-DAH-des",emoji:"🎨"}],"Spanish 'hacer' means 'to do' OR 'to make' — same word for both!",{es:"Hago manualidades con papel y tijeras.",en:"I make crafts with paper and scissors."},[{correct:["Corto","el","papel"],shuffle:["papel","el","Corto"],en:"I cut the paper."},{correct:["Construimos","una","casa","pequeña"],shuffle:["pequeña","casa","Construimos","una"],en:"We build a small house."}]),
  L(72,"Mis juguetes","My toys","🧸","#FFD93D","#FFFBE5",[{es:"La pelota",en:"Ball",say:"la peh-LOH-tah",emoji:"⚽"},{es:"La muñeca",en:"Doll",say:"la moo-NYEH-kah",emoji:"🪆"},{es:"El coche de juguete",en:"Toy car",say:"el KOH-cheh deh hoo-GEH-teh",emoji:"🚗"},{es:"Los bloques",en:"Blocks",say:"los BLOH-kes",emoji:"🧱"},{es:"El puzzle",en:"Puzzle",say:"el POOS-leh",emoji:"🧩"},{es:"La cometa",en:"Kite",say:"la ko-MEH-tah",emoji:"🪁"},{es:"El peluche",en:"Stuffed animal",say:"el peh-LOO-cheh",emoji:"🧸"},{es:"El patinete",en:"Scooter",say:"el pah-tee-NEH-teh",emoji:"🛴"}],"Spain's most famous toy is the 'peonza' — a spinning top played for centuries!",{es:"Mi juguete favorito es mi peluche.",en:"My favourite toy is my stuffed animal."},[{correct:["Juego","con","mis","bloques"],shuffle:["bloques","mis","Juego","con"],en:"I play with my blocks."},{correct:["Tengo","una","cometa","roja"],shuffle:["roja","cometa","Tengo","una"],en:"I have a red kite."}]),
  L(73,"Jugar con amigos","Playing with friends","🎮","#B983FF","#F3EAFF",[{es:"El escondite",en:"Hide and seek",say:"el es-kon-DEE-teh",emoji:"🙈"},{es:"Pillapilla",en:"Tag",say:"pee-yah-PEE-yah",emoji:"🏃"},{es:"Piedra, papel, tijera",en:"Rock paper scissors",say:"PYEH-drah pah-PEL tee-HEH-rah",emoji:"✊"},{es:"Las cartas",en:"Cards",say:"las KAR-tahs",emoji:"🃏"},{es:"El juego de mesa",en:"Board game",say:"el HWEH-go deh MEH-sah",emoji:"🎲"},{es:"Te toca",en:"Your turn",say:"teh TOH-kah",emoji:"👉"},{es:"Ganar",en:"To win",say:"gah-NAR",emoji:"🏆"},{es:"Empate",en:"Tie",say:"em-PAH-teh",emoji:"🤝"}],"In Spain, kids play 'el escondite inglés' — like 'Red Light, Green Light' but with hiding!",{es:"Jugamos al escondite en el parque.",en:"We play hide and seek in the park."},[{correct:["Te","toca","a","ti"],shuffle:["ti","Te","a","toca"],en:"It's your turn."},{correct:["Juego","piedra","papel","tijera"],shuffle:["tijera","papel","Juego","piedra"],en:"I play rock paper scissors."}]),
  L(74,"Mis libros favoritos","My favourite books","📚","#FF6B6B","#FFE8E8",[{es:"El libro",en:"Book",say:"el LEE-bro",emoji:"📕"},{es:"El cuento",en:"Story/tale",say:"el KWEN-toh",emoji:"📖"},{es:"El personaje",en:"Character",say:"el pehr-soh-NAH-heh",emoji:"🧙"},{es:"El héroe",en:"Hero",say:"el EH-ro-eh",emoji:"🦸"},{es:"La heroína",en:"Heroine",say:"la eh-ro-EE-nah",emoji:"🦸‍♀️"},{es:"El monstruo",en:"Monster",say:"el MONS-troo-o",emoji:"👹"},{es:"El dragón",en:"Dragon",say:"el drah-GON",emoji:"🐉"},{es:"La princesa",en:"Princess",say:"la preen-THEH-sah",emoji:"👸"}],"Spain's most famous book is 'Don Quijote' — about a knight who fights windmills!",{es:"Me encanta leer cuentos antes de dormir.",en:"I love reading stories before sleep."},[{correct:["El","héroe","es","valiente"],shuffle:["valiente","es","héroe","El"],en:"The hero is brave."},{correct:["Leo","un","libro","cada","semana"],shuffle:["semana","libro","Leo","un","cada"],en:"I read a book every week."}]),
  L(75,"Películas y series","Movies and TV","🎬","#4D96FF","#E4F0FF",[{es:"La película",en:"Movie",say:"la peh-LEE-koo-lah",emoji:"🎥"},{es:"La serie",en:"TV series",say:"la SEH-ryeh",emoji:"📺"},{es:"Los dibujos",en:"Cartoons",say:"los dee-BOO-hos",emoji:"🎨"},{es:"El cine",en:"Cinema",say:"el THEE-neh",emoji:"🎬"},{es:"Ver",en:"To watch",say:"BEHR",emoji:"👀"},{es:"Divertido",en:"Fun",say:"dee-behr-TEE-do",emoji:"😆"},{es:"Aburrido",en:"Boring",say:"ah-boo-RREE-do",emoji:"😑"},{es:"Mi favorita",en:"My favourite",say:"mee fah-bo-REE-tah",emoji:"⭐"}],"Spanish kids love watching 'dibujos animados' — animated cartoons!",{es:"Mi película favorita es muy divertida.",en:"My favourite movie is very fun."},[{correct:["Veo","una","serie","nueva"],shuffle:["nueva","Veo","serie","una"],en:"I watch a new series."},{correct:["Los","dibujos","son","divertidos"],shuffle:["divertidos","dibujos","Los","son"],en:"The cartoons are fun."}]),
  L(76,"¡Campeón del juego!","Juego Champion","🏆","#FFD93D","#FFFBE5",[{es:"Abrir",en:"To open",say:"ah-BREER",emoji:"🚪"},{es:"El columpio",en:"Swing",say:"el ko-LOOM-pyo",emoji:"🛝"},{es:"Cortar",en:"To cut",say:"kor-TAR",emoji:"✂️"},{es:"La pelota",en:"Ball",say:"la peh-LOH-tah",emoji:"⚽"},{es:"El escondite",en:"Hide and seek",say:"el es-kon-DEE-teh",emoji:"🙈"},{es:"El cuento",en:"Story",say:"el KWEN-toh",emoji:"📖"},{es:"La película",en:"Movie",say:"la peh-LEE-koo-lah",emoji:"🎥"},{es:"Divertido",en:"Fun",say:"dee-behr-TEE-do",emoji:"😆"}],"You can now talk about toys, games, books, and movies! ¡Qué divertido! 🎉",{es:"Mi juguete favorito es la pelota.",en:"My favourite toy is the ball."},[{correct:["Veo","mi","película","favorita"],shuffle:["favorita","Veo","mi","película"],en:"I watch my favourite movie."},{correct:["Jugamos","al","escondite","y","reímos"],shuffle:["reímos","escondite","Jugamos","y","al"],en:"We play hide and seek and laugh."}],[{q:"'El cuento' means:",opts:["Story","Book","Movie"],ans:0},{q:"'Pillapilla' is:",opts:["Tag","Hide and seek","Cards"],ans:0},{q:"'Aburrido' means:",opts:["Boring","Fun","Tired"],ans:0},{q:"'Subir' means:",opts:["To climb up","To go down","To run"],ans:0}]),

  // ====================== WORLD 10: EL MUNDO ALREDEDOR (Lessons 77-84) ======================
  L(77,"Animales del zoo","Zoo animals","🦁","#FF8C42","#FFF3E8",[{es:"El león",en:"Lion",say:"el leh-ON",emoji:"🦁"},{es:"El tigre",en:"Tiger",say:"el TEE-greh",emoji:"🐅"},{es:"La jirafa",en:"Giraffe",say:"la hee-RAH-fah",emoji:"🦒"},{es:"El elefante",en:"Elephant",say:"el eh-leh-FAHN-teh",emoji:"🐘"},{es:"El mono",en:"Monkey",say:"el MOH-no",emoji:"🐵"},{es:"La serpiente",en:"Snake",say:"la sehr-PYEN-teh",emoji:"🐍"},{es:"El panda",en:"Panda",say:"el PAHN-dah",emoji:"🐼"},{es:"El cocodrilo",en:"Crocodile",say:"el ko-ko-DREE-loh",emoji:"🐊"}],"Madrid Zoo is famous for its giant pandas — born there by special arrangement with China!",{es:"En el zoo hay leones, tigres y monos.",en:"At the zoo there are lions, tigers and monkeys."},[{correct:["El","león","es","grande","y","fuerte"],shuffle:["fuerte","grande","El","león","y","es"],en:"The lion is big and strong."},{correct:["Me","encantan","las","jirafas"],shuffle:["jirafas","las","Me","encantan"],en:"I love giraffes."}]),
  L(78,"Animales del mar","Sea animals","🐠","#4D96FF","#E4F0FF",[{es:"El pez",en:"Fish",say:"el peth",emoji:"🐠"},{es:"La ballena",en:"Whale",say:"la bah-YEH-nah",emoji:"🐋"},{es:"El tiburón",en:"Shark",say:"el tee-boo-RON",emoji:"🦈"},{es:"El pulpo",en:"Octopus",say:"el POOL-po",emoji:"🐙"},{es:"El cangrejo",en:"Crab",say:"el kahn-GREH-ho",emoji:"🦀"},{es:"El delfín",en:"Dolphin",say:"el del-FEEN",emoji:"🐬"},{es:"La tortuga",en:"Turtle",say:"la tor-TOO-gah",emoji:"🐢"},{es:"El caballito de mar",en:"Seahorse",say:"el kah-bah-YEE-toh deh mar",emoji:"🐴"}],"In Spain, 'pulpo a la gallega' (Galician octopus) is a famous dish — but kids prefer the sea ones!",{es:"En el mar hay peces y delfines.",en:"In the sea there are fish and dolphins."},[{correct:["El","tiburón","nada","rápido"],shuffle:["rápido","tiburón","El","nada"],en:"The shark swims fast."},{correct:["La","tortuga","es","muy","lenta"],shuffle:["lenta","tortuga","La","muy","es"],en:"The turtle is very slow."}]),
  L(79,"Insectos pequeños","Little insects","🦋","#6BCB77","#E8F8EA",[{es:"La mariposa",en:"Butterfly",say:"la mah-ree-POH-sah",emoji:"🦋"},{es:"La abeja",en:"Bee",say:"la ah-BEH-hah",emoji:"🐝"},{es:"La hormiga",en:"Ant",say:"la or-MEE-gah",emoji:"🐜"},{es:"La araña",en:"Spider",say:"la ah-RAH-nyah",emoji:"🕷️"},{es:"La mariquita",en:"Ladybug",say:"la mah-ree-KEE-tah",emoji:"🐞"},{es:"La mosca",en:"Fly",say:"la MOS-kah",emoji:"🪰"},{es:"El gusano",en:"Worm",say:"el goo-SAH-no",emoji:"🪱"},{es:"El caracol",en:"Snail",say:"el kah-rah-KOL",emoji:"🐌"}],"Spanish ladybugs ('mariquitas') are good luck if they land on you — make a wish!",{es:"Las mariposas son muy bonitas.",en:"Butterflies are very pretty."},[{correct:["Veo","una","mariquita","roja"],shuffle:["roja","una","Veo","mariquita"],en:"I see a red ladybug."},{correct:["La","hormiga","es","muy","pequeña"],shuffle:["pequeña","hormiga","La","muy","es"],en:"The ant is very small."}]),
  L(80,"Las estaciones","The seasons","🌸","#FF9EC7","#FFE8F2",[{es:"La primavera",en:"Spring",say:"la pree-mah-BEH-rah",emoji:"🌸"},{es:"El verano",en:"Summer",say:"el beh-RAH-no",emoji:"☀️"},{es:"El otoño",en:"Autumn",say:"el oh-TOH-nyo",emoji:"🍂"},{es:"El invierno",en:"Winter",say:"el een-BYEHR-no",emoji:"❄️"},{es:"Las flores",en:"Flowers",say:"las FLOH-res",emoji:"🌺"},{es:"Las hojas",en:"Leaves",say:"las OH-has",emoji:"🍁"},{es:"La nieve",en:"Snow",say:"la NYEH-beh",emoji:"❄️"},{es:"Hace calor",en:"It's hot",say:"AH-theh kah-LOR",emoji:"🥵"}],"In southern Spain, it almost never snows — but it does in the Sierra Nevada mountains!",{es:"En verano hace calor y nadamos.",en:"In summer it's hot and we swim."},[{correct:["En","invierno","hace","frío"],shuffle:["frío","En","hace","invierno"],en:"In winter it's cold."},{correct:["En","otoño","caen","las","hojas"],shuffle:["hojas","caen","En","otoño","las"],en:"In autumn the leaves fall."}]),
  L(81,"En el jardín","In the garden","🌷","#6BCB77","#E8F8EA",[{es:"La planta",en:"Plant",say:"la PLAHN-tah",emoji:"🪴"},{es:"La flor",en:"Flower",say:"la FLOR",emoji:"🌸"},{es:"El árbol",en:"Tree",say:"el AR-bol",emoji:"🌳"},{es:"La hoja",en:"Leaf",say:"la OH-hah",emoji:"🍃"},{es:"La rama",en:"Branch",say:"la RAH-mah",emoji:"🌿"},{es:"La raíz",en:"Root",say:"la rah-EETH",emoji:"🌱"},{es:"La semilla",en:"Seed",say:"la seh-MEE-yah",emoji:"🌰"},{es:"Crecer",en:"To grow",say:"kreh-THEHR",emoji:"📈"}],"Spain's national tree is the holm oak ('encina') — it grows for hundreds of years!",{es:"Las plantas necesitan agua y sol para crecer.",en:"Plants need water and sun to grow."},[{correct:["Planto","una","semilla"],shuffle:["semilla","una","Planto"],en:"I plant a seed."},{correct:["El","árbol","es","muy","alto"],shuffle:["alto","árbol","El","muy","es"],en:"The tree is very tall."}]),
  L(82,"El cielo","The sky","☁️","#4D96FF","#E4F0FF",[{es:"El cielo",en:"Sky",say:"el THYEH-loh",emoji:"☁️"},{es:"La nube",en:"Cloud",say:"la NOO-beh",emoji:"☁️"},{es:"El arcoíris",en:"Rainbow",say:"el ar-ko-EE-rees",emoji:"🌈"},{es:"El relámpago",en:"Lightning",say:"el reh-LAHM-pah-go",emoji:"⚡"},{es:"El trueno",en:"Thunder",say:"el TRWEH-no",emoji:"⛈️"},{es:"El viento",en:"Wind",say:"el BYEN-toh",emoji:"💨"},{es:"La tormenta",en:"Storm",say:"la tor-MEN-tah",emoji:"⛈️"},{es:"La luna",en:"Moon",say:"la LOO-nah",emoji:"🌙"}],"In Spanish folklore, a rainbow ('arcoíris') is a magical bridge from earth to heaven!",{es:"Después de la lluvia hay un arcoíris.",en:"After the rain there's a rainbow."},[{correct:["Las","nubes","son","blancas"],shuffle:["blancas","nubes","Las","son"],en:"The clouds are white."},{correct:["Hay","tormenta","y","relámpagos"],shuffle:["relámpagos","tormenta","Hay","y"],en:"There's a storm and lightning."}]),
  L(83,"El espacio","Space","🚀","#B983FF","#F3EAFF",[{es:"La Tierra",en:"Earth",say:"la TYEH-rrah",emoji:"🌍"},{es:"El sol",en:"Sun",say:"el SOL",emoji:"☀️"},{es:"La luna",en:"Moon",say:"la LOO-nah",emoji:"🌙"},{es:"Las estrellas",en:"Stars",say:"las es-TREH-yas",emoji:"⭐"},{es:"El planeta",en:"Planet",say:"el plah-NEH-tah",emoji:"🪐"},{es:"El cohete",en:"Rocket",say:"el ko-EH-teh",emoji:"🚀"},{es:"El astronauta",en:"Astronaut",say:"el ahs-tro-NOW-tah",emoji:"👨‍🚀"},{es:"El universo",en:"Universe",say:"el oo-nee-BEHR-so",emoji:"🌌"}],"Spain has a special space tracking station in Madrid that talks to NASA spacecraft!",{es:"La Tierra y la Luna están en el espacio.",en:"Earth and the Moon are in space."},[{correct:["Las","estrellas","brillan","de","noche"],shuffle:["noche","brillan","Las","estrellas","de"],en:"The stars shine at night."},{correct:["El","cohete","va","al","espacio"],shuffle:["espacio","al","El","cohete","va"],en:"The rocket goes to space."}]),
  L(84,"¡Campeón de la naturaleza!","Naturaleza Champion","🏆","#FFD93D","#FFFBE5",[{es:"El león",en:"Lion",say:"el leh-ON",emoji:"🦁"},{es:"El delfín",en:"Dolphin",say:"el del-FEEN",emoji:"🐬"},{es:"La mariposa",en:"Butterfly",say:"la mah-ree-POH-sah",emoji:"🦋"},{es:"La primavera",en:"Spring",say:"la pree-mah-BEH-rah",emoji:"🌸"},{es:"El árbol",en:"Tree",say:"el AR-bol",emoji:"🌳"},{es:"El arcoíris",en:"Rainbow",say:"el ar-ko-EE-rees",emoji:"🌈"},{es:"La Tierra",en:"Earth",say:"la TYEH-rrah",emoji:"🌍"},{es:"Las estrellas",en:"Stars",say:"las es-TREH-yas",emoji:"⭐"}],"You know SO much about nature, animals, weather and space now! 🌎",{es:"En primavera, las flores y mariposas son bonitas.",en:"In spring, the flowers and butterflies are pretty."},[{correct:["El","delfín","nada","en","el","mar"],shuffle:["mar","el","delfín","El","nada","en"],en:"The dolphin swims in the sea."},{correct:["En","invierno","cae","la","nieve"],shuffle:["nieve","cae","En","invierno","la"],en:"In winter the snow falls."}],[{q:"'El tiburón' is:",opts:["Shark","Whale","Octopus"],ans:0},{q:"'El otoño' means:",opts:["Autumn","Spring","Winter"],ans:0},{q:"'La semilla' means:",opts:["Seed","Leaf","Root"],ans:0},{q:"'El cohete' is a:",opts:["Rocket","Planet","Star"],ans:0}]),

  // ====================== WORLD 11: CÓMO SOY (Lessons 85-92) ======================
  L(85,"Cómo me veo","How I look","👀","#FF6B6B","#FFE8E8",[{es:"El pelo",en:"Hair",say:"el PEH-lo",emoji:"💇"},{es:"Los ojos",en:"Eyes",say:"los OH-hos",emoji:"👁️"},{es:"Rubio",en:"Blonde",say:"ROO-byo",emoji:"👱"},{es:"Moreno",en:"Dark-haired",say:"mo-REH-no",emoji:"👨"},{es:"Pelirrojo",en:"Red-haired",say:"peh-lee-RROH-ho",emoji:"👩‍🦰"},{es:"Las gafas",en:"Glasses",say:"las GAH-fas",emoji:"👓"},{es:"Las pecas",en:"Freckles",say:"las PEH-kahs",emoji:"😊"},{es:"Largo / Corto",en:"Long / Short",say:"LAR-go / KOR-toh",emoji:"📏"}],"In Spain, lots of people have brown hair and brown eyes — 'moreno' is super common!",{es:"Tengo el pelo rubio y los ojos azules.",en:"I have blonde hair and blue eyes."},[{correct:["Mi","amiga","tiene","gafas"],shuffle:["gafas","Mi","tiene","amiga"],en:"My friend wears glasses."},{correct:["Tengo","el","pelo","largo"],shuffle:["largo","Tengo","pelo","el"],en:"I have long hair."}]),
  L(86,"Mi personalidad","My personality","😊","#FFD93D","#FFFBE5",[{es:"Amable",en:"Kind",say:"ah-MAH-bleh",emoji:"😊"},{es:"Gracioso",en:"Funny",say:"grah-THYO-so",emoji:"😂"},{es:"Valiente",en:"Brave",say:"bah-LYEN-teh",emoji:"🦁"},{es:"Inteligente",en:"Clever",say:"een-teh-lee-HEN-teh",emoji:"🧠"},{es:"Generoso",en:"Generous",say:"heh-neh-ROH-so",emoji:"🎁"},{es:"Paciente",en:"Patient",say:"pah-THYEN-teh",emoji:"⏳"},{es:"Trabajador",en:"Hardworking",say:"trah-bah-hah-DOR",emoji:"💪"},{es:"Curioso",en:"Curious",say:"koo-RYOH-so",emoji:"🔍"}],"Spanish people often greet kids with 'qué simpático!' — meaning 'how nice/sweet!'",{es:"Soy amable y un poco gracioso.",en:"I'm kind and a bit funny."},[{correct:["Mi","hermana","es","muy","valiente"],shuffle:["valiente","Mi","hermana","muy","es"],en:"My sister is very brave."},{correct:["Eres","muy","generoso"],shuffle:["generoso","Eres","muy"],en:"You are very generous."}]),
  L(87,"Mis gustos","My likes","❤️","#FF9EC7","#FFE8F2",[{es:"Me gusta",en:"I like",say:"meh GOOS-tah",emoji:"❤️"},{es:"No me gusta",en:"I don't like",say:"no meh GOOS-tah",emoji:"💔"},{es:"Me encanta",en:"I love",say:"meh en-KAHN-tah",emoji:"😍"},{es:"Odio",en:"I hate",say:"OH-dyo",emoji:"😖"},{es:"Prefiero",en:"I prefer",say:"preh-FYEH-ro",emoji:"⭐"},{es:"Lo mejor",en:"The best thing",say:"lo meh-HOR",emoji:"🏆"},{es:"Lo peor",en:"The worst thing",say:"lo peh-OR",emoji:"💩"},{es:"Mi favorito",en:"My favourite",say:"mee fah-bo-REE-toh",emoji:"⭐"}],"In Spanish, 'me gusta' literally means 'it pleases me' — the food likes YOU, not the other way!",{es:"Me encanta el chocolate pero odio las verduras.",en:"I love chocolate but I hate vegetables."},[{correct:["Prefiero","el","helado"],shuffle:["helado","el","Prefiero"],en:"I prefer ice cream."},{correct:["Mi","color","favorito","es","el","verde"],shuffle:["verde","favorito","Mi","color","es","el"],en:"My favourite colour is green."}]),
  L(88,"Mi familia extendida","Extended family","👨‍👩‍👧‍👦","#4D96FF","#E4F0FF",[{es:"El tío",en:"Uncle",say:"el TEE-oh",emoji:"👨"},{es:"La tía",en:"Aunt",say:"la TEE-ah",emoji:"👩"},{es:"El primo",en:"Cousin (m)",say:"el PREE-mo",emoji:"👦"},{es:"La prima",en:"Cousin (f)",say:"la PREE-mah",emoji:"👧"},{es:"El sobrino",en:"Nephew",say:"el so-BREE-no",emoji:"👶"},{es:"La sobrina",en:"Niece",say:"la so-BREE-nah",emoji:"👶"},{es:"El padrino",en:"Godfather",say:"el pah-DREE-no",emoji:"👨‍👦"},{es:"La madrina",en:"Godmother",say:"la mah-DREE-nah",emoji:"👩‍👧"}],"In Spain, godparents ('padrinos') are very important — they're like a second set of parents!",{es:"Tengo dos tíos y cuatro primos.",en:"I have two uncles and four cousins."},[{correct:["Mi","tía","vive","en","Madrid"],shuffle:["Madrid","tía","Mi","en","vive"],en:"My aunt lives in Madrid."},{correct:["Mi","primo","es","mayor","que","yo"],shuffle:["yo","mayor","Mi","primo","que","es"],en:"My cousin is older than me."}]),
  L(89,"Mis vecinos","My neighbours","🏘️","#6BCB77","#E8F8EA",[{es:"El vecino",en:"Neighbour (m)",say:"el beh-THEE-no",emoji:"👨"},{es:"La vecina",en:"Neighbour (f)",say:"la beh-THEE-nah",emoji:"👩"},{es:"El barrio",en:"Neighbourhood",say:"el BAH-rryo",emoji:"🏘️"},{es:"El edificio",en:"Building",say:"el eh-dee-FEE-thyo",emoji:"🏢"},{es:"El piso",en:"Floor/flat",say:"el PEE-so",emoji:"🏠"},{es:"El ascensor",en:"Lift/elevator",say:"el ahs-then-SOR",emoji:"🛗"},{es:"Las escaleras",en:"Stairs",say:"las es-kah-LEH-rahs",emoji:"🪜"},{es:"El portero",en:"Concierge",say:"el por-TEH-ro",emoji:"👨‍💼"}],"Many Spanish flats have a 'portero' — a concierge who looks after the building!",{es:"Mis vecinos viven en el piso de arriba.",en:"My neighbours live on the floor above."},[{correct:["Subo","en","el","ascensor"],shuffle:["ascensor","el","Subo","en"],en:"I go up in the lift."},{correct:["Mi","barrio","es","muy","tranquilo"],shuffle:["tranquilo","barrio","Mi","muy","es"],en:"My neighbourhood is very quiet."}]),
  L(90,"Mi cole en detalle","School subjects","🏫","#FF8C42","#FFF3E8",[{es:"Las matemáticas",en:"Maths",say:"las mah-teh-MAH-tee-kahs",emoji:"➕"},{es:"El inglés",en:"English",say:"el een-GLES",emoji:"🇬🇧"},{es:"La educación física",en:"PE",say:"la eh-doo-kah-THYON FEE-see-kah",emoji:"🏃"},{es:"El arte",en:"Art",say:"el AR-teh",emoji:"🎨"},{es:"La ciencia",en:"Science",say:"la THYEN-thyah",emoji:"🔬"},{es:"La música",en:"Music",say:"la MOO-see-kah",emoji:"🎵"},{es:"La historia",en:"History",say:"la ees-TOH-ryah",emoji:"📜"},{es:"El examen",en:"Exam",say:"el ek-SAH-men",emoji:"📝"}],"In Spanish schools, kids start English from age 3 — they grow up bilingual!",{es:"Me gustan las matemáticas y la música.",en:"I like maths and music."},[{correct:["Hoy","tengo","examen","de","historia"],shuffle:["historia","de","Hoy","examen","tengo"],en:"Today I have a history exam."},{correct:["Me","encanta","la","educación","física"],shuffle:["física","Me","la","educación","encanta"],en:"I love PE."}]),
  L(91,"En la fiesta","At the party","🎉","#B983FF","#F3EAFF",[{es:"Los aperitivos",en:"Snacks",say:"los ah-peh-ree-TEE-bos",emoji:"🍿"},{es:"Las patatas fritas",en:"Crisps/chips",say:"las pah-TAH-tahs FREE-tahs",emoji:"🍟"},{es:"Los caramelos",en:"Sweets",say:"los kah-rah-MEH-los",emoji:"🍬"},{es:"La piñata",en:"Piñata",say:"la pee-NYAH-tah",emoji:"🎊"},{es:"Soplar las velas",en:"Blow the candles",say:"so-PLAR las BEH-las",emoji:"🎂"},{es:"Bailar",en:"To dance",say:"by-LAR",emoji:"💃"},{es:"Divertirse",en:"To have fun",say:"dee-behr-TEER-seh",emoji:"😆"},{es:"Disfrazarse",en:"To dress up",say:"dees-frah-THAR-seh",emoji:"🎭"}],"In Spain, kids smash a piñata in their birthday parties — full of sweets and toys!",{es:"En la fiesta soplé las velas y comí tarta.",en:"At the party I blew the candles and ate cake."},[{correct:["Me","disfracé","de","superhéroe"],shuffle:["superhéroe","Me","de","disfracé"],en:"I dressed up as a superhero."},{correct:["Hay","caramelos","en","la","piñata"],shuffle:["piñata","caramelos","Hay","la","en"],en:"There are sweets in the piñata."}]),
  L(92,"¡Campeón persona!","Persona Champion","🏆","#FFD93D","#FFFBE5",[{es:"El pelo",en:"Hair",say:"el PEH-lo",emoji:"💇"},{es:"Amable",en:"Kind",say:"ah-MAH-bleh",emoji:"😊"},{es:"Me encanta",en:"I love",say:"meh en-KAHN-tah",emoji:"😍"},{es:"El primo",en:"Cousin",say:"el PREE-mo",emoji:"👦"},{es:"El vecino",en:"Neighbour",say:"el beh-THEE-no",emoji:"👨"},{es:"Las matemáticas",en:"Maths",say:"las mah-teh-MAH-tee-kahs",emoji:"➕"},{es:"La piñata",en:"Piñata",say:"la pee-NYAH-tah",emoji:"🎊"},{es:"Divertirse",en:"To have fun",say:"dee-behr-TEER-seh",emoji:"😆"}],"You can now describe yourself, your family, your school, and your parties! ¡Eres único! 🌟",{es:"Soy amable, tengo el pelo rubio y me encanta el arte.",en:"I'm kind, I have blonde hair and I love art."},[{correct:["Mi","primo","es","muy","gracioso"],shuffle:["gracioso","Mi","primo","muy","es"],en:"My cousin is very funny."},{correct:["En","mi","cole","me","gusta","el","arte"],shuffle:["arte","mi","En","cole","me","el","gusta"],en:"At my school I like art."}],[{q:"'Rubio' means:",opts:["Blonde","Dark-haired","Red-haired"],ans:0},{q:"'La tía' means:",opts:["Aunt","Uncle","Cousin"],ans:0},{q:"'Gracioso' means:",opts:["Funny","Kind","Brave"],ans:0},{q:"'El ascensor' is:",opts:["Lift","Stairs","Building"],ans:0}]),

  // ====================== WORLD 12: REPASO TOTAL (Lessons 93-100) ======================
  L(93,"Repaso: Saludos y números","Greetings + numbers 1-50","🔢","#FF6B6B","#FFE8E8",[{es:"Veinte",en:"Twenty",say:"BEYN-teh",emoji:"2️⃣0️⃣"},{es:"Treinta",en:"Thirty",say:"TREYN-tah",emoji:"3️⃣0️⃣"},{es:"Cuarenta",en:"Forty",say:"kwah-REN-tah",emoji:"4️⃣0️⃣"},{es:"Cincuenta",en:"Fifty",say:"theen-KWEN-tah",emoji:"5️⃣0️⃣"},{es:"Encantado",en:"Pleased to meet you (m)",say:"en-kahn-TAH-do",emoji:"🤝"},{es:"Encantada",en:"Pleased to meet you (f)",say:"en-kahn-TAH-dah",emoji:"🤝"},{es:"Hasta luego",en:"See you later",say:"AHS-tah LWEH-go",emoji:"👋"},{es:"Hasta mañana",en:"See you tomorrow",say:"AHS-tah mah-NYAH-nah",emoji:"📅"}],"In Spain, you say 'veintiuno' (21), 'veintidós' (22) — one word, not two!",{es:"Hola, encantado. Tengo treinta amigos.",en:"Hello, pleased to meet you. I have thirty friends."},[{correct:["Tengo","veinte","años"],shuffle:["años","veinte","Tengo"],en:"I'm twenty years old."},{correct:["Hasta","luego","amigo"],shuffle:["amigo","luego","Hasta"],en:"See you later friend."}]),
  L(94,"Repaso: Colores y formas","Colours + shapes","⭐","#B983FF","#F3EAFF",[{es:"El círculo",en:"Circle",say:"el THEER-koo-lo",emoji:"⭕"},{es:"El cuadrado",en:"Square",say:"el kwah-DRAH-do",emoji:"⬜"},{es:"El triángulo",en:"Triangle",say:"el tree-AHN-goo-lo",emoji:"🔺"},{es:"El rectángulo",en:"Rectangle",say:"el rek-TAHN-goo-lo",emoji:"▭"},{es:"La estrella",en:"Star",say:"la es-TREH-yah",emoji:"⭐"},{es:"El corazón",en:"Heart",say:"el ko-rah-THON",emoji:"❤️"},{es:"Claro",en:"Light (colour)",say:"KLAH-ro",emoji:"💡"},{es:"Oscuro",en:"Dark (colour)",say:"os-KOO-ro",emoji:"⚫"}],"In Spanish, you say 'azul claro' for light blue and 'azul oscuro' for dark blue!",{es:"Veo una estrella amarilla y un corazón rojo.",en:"I see a yellow star and a red heart."},[{correct:["El","cuadrado","es","azul","oscuro"],shuffle:["oscuro","azul","El","cuadrado","es"],en:"The square is dark blue."},{correct:["Mi","corazón","favorito","es","rosa"],shuffle:["rosa","favorito","Mi","corazón","es"],en:"My favourite heart is pink."}]),
  L(95,"Repaso: Comida y sabores","Food + flavours","🍕","#FFD93D","#FFFBE5",[{es:"Dulce",en:"Sweet",say:"DOOL-theh",emoji:"🍭"},{es:"Salado",en:"Salty",say:"sah-LAH-do",emoji:"🧂"},{es:"Ácido",en:"Sour",say:"AH-thee-do",emoji:"🍋"},{es:"Amargo",en:"Bitter",say:"ah-MAR-go",emoji:"☕"},{es:"Picante",en:"Spicy",say:"pee-KAHN-teh",emoji:"🌶️"},{es:"Caliente",en:"Hot (temperature)",say:"kah-LYEN-teh",emoji:"🔥"},{es:"Frío",en:"Cold",say:"FREE-oh",emoji:"❄️"},{es:"Delicioso",en:"Delicious",say:"deh-lee-THYOH-so",emoji:"😋"}],"Spain is famous for 'tapas' — small plates of food shared between friends!",{es:"El chocolate es dulce y delicioso.",en:"Chocolate is sweet and delicious."},[{correct:["El","limón","es","muy","ácido"],shuffle:["ácido","limón","El","muy","es"],en:"The lemon is very sour."},{correct:["Me","encanta","la","pizza","caliente"],shuffle:["caliente","la","Me","pizza","encanta"],en:"I love hot pizza."}]),
  L(96,"Repaso: Familia y casa","Family + home expanded","🏠","#6BCB77","#E8F8EA",[{es:"Vivir",en:"To live",say:"bee-BEER",emoji:"🏠"},{es:"La habitación",en:"Room",say:"la ah-bee-tah-THYON",emoji:"🚪"},{es:"Compartir",en:"To share",say:"kom-par-TEER",emoji:"🤝"},{es:"Juntos",en:"Together",say:"HOON-tos",emoji:"👨‍👩‍👧‍👦"},{es:"Querer",en:"To love (people)",say:"keh-REHR",emoji:"❤️"},{es:"Cuidar",en:"To take care of",say:"kwee-DAR",emoji:"🤗"},{es:"Cenar juntos",en:"To dine together",say:"theh-NAR HOON-tos",emoji:"🍽️"},{es:"Mi familia",en:"My family",say:"mee fah-MEE-lyah",emoji:"👨‍👩‍👧"}],"Spanish families often eat lunch together at 2pm and dinner at 9pm — meals are sacred!",{es:"Quiero a mi familia y cenamos juntos.",en:"I love my family and we dine together."},[{correct:["Vivimos","en","una","casa","grande"],shuffle:["grande","casa","Vivimos","una","en"],en:"We live in a big house."},{correct:["Comparto","una","habitación","con","mi","hermana"],shuffle:["hermana","habitación","Comparto","con","mi","una"],en:"I share a room with my sister."}]),
  L(97,"Repaso: Tiempo y estaciones","Weather + seasons + time","⏰","#4D96FF","#E4F0FF",[{es:"Hoy",en:"Today",say:"OY",emoji:"📅"},{es:"Mañana",en:"Tomorrow",say:"mah-NYAH-nah",emoji:"➡️"},{es:"Ayer",en:"Yesterday",say:"ah-YEHR",emoji:"⬅️"},{es:"Hace buen tiempo",en:"The weather is nice",say:"AH-theh bwen TYEM-po",emoji:"☀️"},{es:"Hace mal tiempo",en:"The weather is bad",say:"AH-theh mal TYEM-po",emoji:"⛈️"},{es:"Esta semana",en:"This week",say:"ES-tah seh-MAH-nah",emoji:"📅"},{es:"El mes",en:"The month",say:"el MES",emoji:"🗓️"},{es:"El año",en:"The year",say:"el AH-nyo",emoji:"📆"}],"Spain has 'siesta' — a tradition where people take a nap after lunch in the hottest months!",{es:"Hoy hace buen tiempo y mañana también.",en:"Today the weather is nice and tomorrow too."},[{correct:["Mañana","es","mi","cumpleaños"],shuffle:["cumpleaños","mi","Mañana","es"],en:"Tomorrow is my birthday."},{correct:["Esta","semana","tengo","cole"],shuffle:["cole","semana","Esta","tengo"],en:"This week I have school."}]),
  L(98,"Repaso: En el restaurante","Restaurant scenario","🍽️","#FF8C42","#FFF3E8",[{es:"La mesa",en:"Table",say:"la MEH-sah",emoji:"🪑"},{es:"El camarero",en:"Waiter",say:"el kah-mah-REH-ro",emoji:"🧑‍💼"},{es:"La carta",en:"Menu",say:"la KAR-tah",emoji:"📋"},{es:"De primero",en:"As a starter",say:"deh pree-MEH-ro",emoji:"1️⃣"},{es:"De segundo",en:"As a main",say:"deh seh-GOON-do",emoji:"2️⃣"},{es:"De postre",en:"For dessert",say:"deh POS-treh",emoji:"🍰"},{es:"Para beber",en:"To drink",say:"PAH-rah beh-BEHR",emoji:"🥤"},{es:"La propina",en:"Tip",say:"la pro-PEE-nah",emoji:"💰"}],"In Spain, tipping ('propina') is not required — but a small amount is appreciated!",{es:"De primero quiero ensalada, por favor.",en:"As a starter I want salad, please."},[{correct:["¿Me","trae","la","carta?"],shuffle:["carta?","la","¿Me","trae"],en:"Can you bring me the menu?"},{correct:["De","postre","quiero","helado"],shuffle:["helado","quiero","De","postre"],en:"For dessert I want ice cream."}]),
  L(99,"Repaso: De compras","Shopping scenario","🛍️","#FF9EC7","#FFE8F2",[{es:"La tienda",en:"Shop",say:"la TYEN-dah",emoji:"🏪"},{es:"El probador",en:"Fitting room",say:"el pro-bah-DOR",emoji:"👗"},{es:"La talla",en:"Size",say:"la TAH-yah",emoji:"📏"},{es:"Mediano",en:"Medium",say:"meh-DYAH-no",emoji:"📐"},{es:"Pequeño",en:"Small",say:"peh-KEH-nyo",emoji:"👶"},{es:"Grande",en:"Big",say:"GRAHN-deh",emoji:"📦"},{es:"Me lo llevo",en:"I'll take it",say:"meh lo YEH-bo",emoji:"🛍️"},{es:"La rebaja",en:"Sale/discount",say:"la reh-BAH-hah",emoji:"💸"}],"In Spain, 'las rebajas' are the big January and July sales — everything is discounted!",{es:"Quiero la talla mediana, por favor.",en:"I want the medium size, please."},[{correct:["¿Puedo","probar","esto?"],shuffle:["esto?","probar","¿Puedo"],en:"Can I try this on?"},{correct:["Está","de","rebajas","y","es","barato"],shuffle:["barato","rebajas","Está","es","de","y"],en:"It's on sale and it's cheap."}]),
  L(100,"¡MEGA CAMPEÓN!","Final Mega Champion","🏆","#FFD93D","#FFFBE5",[{es:"¡Hola!",en:"Hello!",say:"OH-lah",emoji:"👋"},{es:"Mi familia",en:"My family",say:"mee fah-MEE-lyah",emoji:"👨‍👩‍👧"},{es:"Tengo",en:"I have",say:"TEN-go",emoji:"🎁"},{es:"Me encanta",en:"I love",say:"meh en-KAHN-tah",emoji:"😍"},{es:"En mi casa",en:"In my home",say:"en mee KAH-sah",emoji:"🏠"},{es:"Soy amable",en:"I am kind",say:"soy ah-MAH-bleh",emoji:"😊"},{es:"Mañana",en:"Tomorrow",say:"mah-NYAH-nah",emoji:"➡️"},{es:"¡Eres genial!",en:"You're amazing!",say:"EH-res heh-NYAL",emoji:"🌟"}],"¡FELICIDADES! You have completed all 100 lessons! 100 hours of learning, 800+ words! You ARE a Spanish superstar! 🎉🌟🏆",{es:"¡Soy un mega campeón del español!",en:"I am a mega Spanish champion!"},[{correct:["Hola","mi","familia","es","grande"],shuffle:["grande","mi","Hola","familia","es"],en:"Hello, my family is big."},{correct:["Me","encanta","mi","casa","y","mi","barrio"],shuffle:["barrio","mi","Me","encanta","y","mi","casa"],en:"I love my house and my neighbourhood."}],[{q:"'¡Hola!' means:",opts:["Hello!","Goodbye!","Thank you!"],ans:0},{q:"'Mi familia' means:",opts:["My family","My friends","My home"],ans:0},{q:"'Me encanta' means:",opts:["I love","I like","I hate"],ans:0},{q:"'Soy amable' means:",opts:["I am kind","I am happy","I am tired"],ans:0},{q:"'Mañana' means:",opts:["Tomorrow","Today","Yesterday"],ans:0},{q:"How many lessons have you done?",opts:["100","50","75"],ans:0}]),
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
  33:{title:"Sol's Town Tour",paras:["Sol the sun visits a Spanish ciudad. He sees una calle bonita and una plaza grande with a fountain.","First, Sol goes to el parque to relax under a tree. Then he visits el museo to learn about art!","'¡Qué bonita es la ciudad!' says Sol. He passes el banco and ends his day at el cine. Sol is muy contento!"],qs:[{q:"What does Sol see in the plaza?",opts:["A fountain","A castle","A train"],ans:0},{q:"Where does Sol go to relax?",opts:["The park","The bank","The cinema"],ans:0},{q:"What does Sol visit to learn about art?",opts:["The museum","The church","The park"],ans:0}]},
  34:{title:"Luna's Big Trip",paras:["Luna wants to viajar across Spain. First she takes el tren — it's muy rápido!","Then she rides un autobús to the next town. After that she goes a pie through a forest.","Finally, Luna takes un avión to the moon… ¡no, un barco al mar! She loves all the transportes!"],qs:[{q:"How does Luna start her trip?",opts:["By train","By bus","By boat"],ans:0},{q:"How does she go through the forest?",opts:["On foot","By bike","By plane"],ans:0},{q:"What does Luna take last?",opts:["A boat","A train","A motorbike"],ans:0}]},
  35:{title:"Shopping with Sol",paras:["Sol goes to el supermercado with his lista. He grabs un carrito.","First una botella de leche, then un paquete de pan, and una lata de tomates.","At la caja, Sol pays. He fills su bolsa and goes home. ¡Qué buen comprador!"],qs:[{q:"What does Sol bring to the supermarket?",opts:["A list","A bag","A friend"],ans:0},{q:"What does Sol buy first?",opts:["Milk","Bread","Tomatoes"],ans:0},{q:"Where does Sol pay?",opts:["At the checkout","At the door","Outside"],ans:0}]},
  36:{title:"Luna's Salad",paras:["Luna makes a salad. She takes una lechuga, dos tomates, and un pepino.","She also adds una zanahoria small and una cebolla. ¡Qué colorida!","De postre, Luna eats una piña sweet and un melocotón juicy. ¡Qué delicia!"],qs:[{q:"What does Luna take first?",opts:["Lettuce","Onion","Tomato"],ans:0},{q:"How many tomatoes does Luna add?",opts:["Two","One","Three"],ans:0},{q:"What does Luna eat for dessert?",opts:["Pineapple and peach","Carrot","Cucumber"],ans:0}]},
  37:{title:"Sports Day",paras:["Today is sports day! Sol plays al fútbol. Luna plays al baloncesto.","Sol corre very fast and salta high! 'Voy a ganar!' he shouts.","Luna gana al tenis. Sol pierde al fútbol but smiles. 'Lo importante es divertirse!'"],qs:[{q:"What sport does Sol play?",opts:["Football","Tennis","Basketball"],ans:0},{q:"Who wins at tennis?",opts:["Luna","Sol","Nobody"],ans:0},{q:"What does Sol say at the end?",opts:["The important thing is having fun","I lost","I'm sad"],ans:0}]},
  38:{title:"Free Time Friends",paras:["In her tiempo libre, Luna le gusta dibujar y pintar. She paints flores rojas and gatos blancos.","Sol prefers cantar y bailar. He's a fantastic dancer!","'¿Quieres cocinar conmigo?' Luna asks. They cook chocolate cake and ver la tele juntos. ¡Qué tarde tan bonita!"],qs:[{q:"What does Luna like to do?",opts:["Draw and paint","Sing and dance","Cook"],ans:0},{q:"What does Sol prefer?",opts:["Sing and dance","Read","Watch TV"],ans:0},{q:"What do they cook?",opts:["Chocolate cake","Pizza","Bread"],ans:0}]},
  39:{title:"At the Farm",paras:["Sol and Luna visit una granja. They see una gallina with five baby chicks!","Un gallo says 'kikirikí!' Una oveja and una cabra eat grass. Un pato swims in the pond.","Then they walk into el bosque and see a tall árbol with un pájaro singing. ¡La naturaleza es bonita!"],qs:[{q:"How many baby chicks does the hen have?",opts:["Five","Three","Ten"],ans:0},{q:"What does the rooster say?",opts:["Kikirikí","Cock-a-doodle-doo","Quack"],ans:0},{q:"Where do they walk to?",opts:["The forest","The beach","The town"],ans:0}]},
  40:{title:"The Word Master",paras:["Today, Sol and Luna are very orgullosos. They have learned 60+ new words!","'¡Eres una maestra de palabras!' Sol tells Luna. 'Y tú también!' Luna replies.","From cities to farms, transports to sports — they know muchas cosas. ¡Adelante to the next adventure!"],qs:[{q:"How does Sol describe Luna?",opts:["A word master","A teacher","A friend"],ans:0},{q:"What kinds of words have they learned?",opts:["All of these","Just animals","Just food"],ans:0},{q:"How do they feel?",opts:["Very proud","Very tired","Very sad"],ans:0}]},
  41:{title:"Best Friends",paras:["Sol's mejor amigo is a star called Estrella. They love compartir tiempo together.","One day Estrella was triste. Sol gave her un abrazo. 'Estoy aquí para ayudarte,' he said.","They reír together and become más amigos than ever. ¡La amistad es lo mejor!"],qs:[{q:"Who is Sol's best friend?",opts:["Estrella","Luna","A planet"],ans:0},{q:"What does Sol give Estrella?",opts:["A hug","A gift","Food"],ans:0},{q:"What does friendship feel like?",opts:["The best","Boring","Sad"],ans:0}]},
  42:{title:"Luna's Birthday",paras:["¡Es el cumpleaños de Luna! There's una fiesta with muchos globos and una tarta with velas.","Sol gives her muchos regalos: a book, a guitar, and a hug! 'Felicidades, Luna!'","They sing 'Cumpleaños feliz' and dance. The best fiesta in the universe!"],qs:[{q:"Whose birthday is it?",opts:["Luna's","Sol's","Estrella's"],ans:0},{q:"What presents does Sol give?",opts:["Book, guitar, hug","Toys, candy, chocolate","Flowers, ribbon, doll"],ans:0},{q:"What do they do at the party?",opts:["Sing and dance","Sleep","Eat only"],ans:0}]},
  43:{title:"What I Want to Be",paras:["Sol asks Luna: '¿Qué quieres ser de mayor?' Luna says 'Quiero ser astronauta!'","'Y yo quiero ser cocinero,' replies Sol. 'Like my abuelo!'","Both have big sueños. Maybe one day Sol will be el cocinero más famoso, and Luna will travel through space!"],qs:[{q:"What does Luna want to be?",opts:["An astronaut","A doctor","A teacher"],ans:0},{q:"What does Sol want to be?",opts:["A cook","A firefighter","A police officer"],ans:0},{q:"Who inspired Sol?",opts:["His grandfather","His teacher","His mother"],ans:0}]},
  44:{title:"The Music Show",paras:["Sol toca la guitarra. Luna toca el piano. They make beautiful música together!","They write una canción about the stars. Then they perform a concierto for all the planets.","'¡Bravo! ¡Otra! ¡Otra!' shout the planets. Sol and Luna are muy felices."],qs:[{q:"What instrument does Sol play?",opts:["Guitar","Piano","Drums"],ans:0},{q:"What does Luna play?",opts:["Piano","Guitar","Violin"],ans:0},{q:"Who do they perform for?",opts:["The planets","Their family","Other suns"],ans:0}]},
  45:{title:"The Robot Helper",paras:["Sol gets un nuevo móvil! He learns to take fotos and play videojuegos.","Luna prefers el ordenador. She uses Internet to talk with friends on otros planetas.","Then a friendly robot arrives! He plays música on his pantalla. ¡La tecnología es divertida!"],qs:[{q:"What does Sol get?",opts:["A new mobile","A computer","A tablet"],ans:0},{q:"What does Luna prefer?",opts:["The computer","The mobile","The robot"],ans:0},{q:"Who arrives?",opts:["A friendly robot","A friend","A teacher"],ans:0}]},
  46:{title:"Sol Gets Sick",paras:["One day Sol tiene fiebre y tos. He's resfriado.","Luna says 'Necesitas medicina y descansar.' She gives him una tirita too.","Sol descansa all day. The next morning, he feels mejor and shines brightly! ¡Gracias, Luna!"],qs:[{q:"What's wrong with Sol?",opts:["Has a fever and cough","Has a stomachache","Hurt his foot"],ans:0},{q:"What does Luna give him?",opts:["Medicine and a plaster","Food","A hug"],ans:0},{q:"How does Sol feel the next day?",opts:["Better","Worse","The same"],ans:0}]},
  47:{title:"The Big Day",paras:["Today is Luna's first concert. She is muy nerviosa. 'Estoy muy nerviosa,' she tells Sol.","Sol smiles: 'Tranquila! You'll be amazing.' Luna feels más tranquila.","After the concert, all the stars cheer. Luna is orgullosa and ¡un poco sorprendida! 'I did it!'"],qs:[{q:"How does Luna feel before the concert?",opts:["Nervous","Happy","Bored"],ans:0},{q:"How does Sol help?",opts:["Tells her to be calm","Plays music","Goes home"],ans:0},{q:"How does Luna feel after?",opts:["Proud and surprised","Sad","Tired"],ans:0}]},
  48:{title:"What's the Best?",paras:["Sol and Luna debate: '¿Cuál es el mejor postre?' Sol creo que el chocolate es lo mejor.","Luna piensa que la fruta es mejor. 'En mi opinión, la fruta es más sana.'","Estrella arrives: 'Estoy de acuerdo con los dos. Both are great!' They all laugh."],qs:[{q:"What does Sol think is best?",opts:["Chocolate","Fruit","Cake"],ans:0},{q:"Why does Luna prefer fruit?",opts:["Because it's healthier","Because it's tasty","Because it's sweet"],ans:0},{q:"What does Estrella say?",opts:["Both are great","Only chocolate","Only fruit"],ans:0}]},
  49:{title:"Who's the Tallest?",paras:["Sol, Luna, and Estrella compare. 'Yo soy más grande que tú,' Sol says to Estrella.","'Pero Luna es más rápida que Sol,' Estrella says. They check — it's true!","En el final, they decide: each one is el mejor at something. ¡Todos son únicos!"],qs:[{q:"Who is bigger than Estrella?",opts:["Sol","Luna","Nobody"],ans:0},{q:"Who is faster than Sol?",opts:["Luna","Estrella","Nobody"],ans:0},{q:"What do they decide?",opts:["Each one is the best at something","Sol is the best","Luna is the worst"],ans:0}]},
  50:{title:"The Comparison Champion",paras:["Sol, Luna, and Estrella have learned so much! They can now compare and give opinions.","'Eres mejor amigo que nunca!' Sol tells Luna. 'Y tú eres más simpático que el sol!' Luna laughs.","Together they are los mejores amigos del universo. ¡Felicidades, campeones!"],qs:[{q:"What can they now do?",opts:["Compare and give opinions","Travel to space","Sing songs"],ans:0},{q:"How does Luna describe Sol?",opts:["Nicer than the sun","Bigger than the moon","Faster than a star"],ans:0},{q:"What are they together?",opts:["The best friends in the universe","Just friends","Family"],ans:0}]},
  51:{title:"Yesterday's Surprise",paras:["Sol estaba leyendo un libro tranquilamente. De repente, hubo un ruido fuerte!","Era Luna! Estaba jugando con un nuevo juguete. Sol estaba sorprendido.","'¿Qué hacías?' asked Sol. 'Estaba descubriendo cosas nuevas!' Luna laughed."],qs:[{q:"What was Sol doing?",opts:["Reading a book","Playing","Sleeping"],ans:0},{q:"What was Luna doing?",opts:["Playing with a new toy","Reading","Singing"],ans:0},{q:"How did Sol feel?",opts:["Surprised","Sad","Tired"],ans:0}]},
  52:{title:"When I Was Little",paras:["Luna remembers: 'Cuando era pequeña, vivía en una nube. Tenía muchos amigos.'","'Yo también!' says Sol. 'Cuando era pequeño, era muy tímido. Pero ahora soy más valiente.'","Memories make them sonreír. ¡Cómo crece el tiempo!"],qs:[{q:"Where did Luna live when little?",opts:["On a cloud","In space","On Earth"],ans:0},{q:"How was Sol when little?",opts:["Shy","Brave","Sad"],ans:0},{q:"What do their memories make them do?",opts:["Smile","Cry","Sleep"],ans:0}]},
  53:{title:"My Old Routine",paras:["Cuando era pequeño, Sol siempre se levantaba a las cinco. Por la mañana, comía cereales.","A veces iba al colegio en bicicleta. Por la noche leía cuentos with mamá.","Nunca se aburría. Todos los días eran una aventura."],qs:[{q:"When did Sol get up when he was little?",opts:["At five","At seven","At ten"],ans:0},{q:"How did he sometimes go to school?",opts:["By bike","By bus","On foot"],ans:0},{q:"What did he do at night?",opts:["Read stories","Played","Slept"],ans:0}]},
  54:{title:"Why I Love Friends",paras:["Sol explains: 'Quiero a Luna porque es divertida.' But aunque ella es más pequeña, es muy fuerte!","'Sin embargo,' says Estrella, 'no son hermanas.' 'Por eso somos amigas — by choice!' replies Luna.","Además, they share everything. Por ejemplo, sus libros, sus sueños, y su tiempo."],qs:[{q:"Why does Sol love Luna?",opts:["She is fun","She is small","She is strong"],ans:0},{q:"What does Estrella point out?",opts:["They are not sisters","They are sisters","They are old"],ans:0},{q:"What do they share?",opts:["Everything","Just books","Just food"],ans:0}]},
  55:{title:"My Dream House",paras:["Sol imagina su casa ideal: un castillo enorme with una piscina de chocolate!","Tendría un tobogán from his bedroom to the kitchen. ¡Sería divertidísimo!","Luna's casa ideal would have a library with a million books and a comfy nube to sleep on. ¡Qué sueños!"],qs:[{q:"What would Sol's pool be made of?",opts:["Chocolate","Water","Juice"],ans:0},{q:"Where would the slide go?",opts:["From bedroom to kitchen","To the garden","Outside"],ans:0},{q:"What would Luna's library have?",opts:["A million books","A computer","A piano"],ans:0}]},
  56:{title:"Around the World",paras:["Sol sueña con viajar around the world. He wants to visitar la playa in Spain.","Then las montañas in Switzerland, el desierto in Egypt, and la selva in Brazil!","'Pero primero, necesito una maleta grande,' he laughs. ¡A viajar!"],qs:[{q:"Where does Sol want to go first?",opts:["The beach in Spain","The mountains","The desert"],ans:0},{q:"What does Sol want to visit in Brazil?",opts:["The jungle","The beach","The desert"],ans:0},{q:"What does he need first?",opts:["A big suitcase","A friend","Money"],ans:0}]},
  57:{title:"The Big Debate",paras:["'Las galletas son lo mejor!' says Sol. 'Tienes razón!' replies Luna. 'Yo también pienso así.'","But Estrella says 'Yo no estoy de acuerdo. La fruta es mejor!'","'Más o menos,' laughs Sol. 'Las dos son ricas. Sí, claro, yes, yes, both are great!'"],qs:[{q:"What does Sol love?",opts:["Cookies","Fruit","Cake"],ans:0},{q:"Who disagrees?",opts:["Estrella","Luna","Nobody"],ans:0},{q:"What does Sol decide?",opts:["Both are great","Cookies are best","Fruit is best"],ans:0}]},
  58:{title:"How to Make a Sandwich",paras:["Sol teaches Luna: 'Primero, coge dos rebanadas de pan. Luego pon mantequilla.'","'Después mezcla queso y jamón. Por último, junta las dos rebanadas. ¡Listo!'","Luna prueba and says '¡Qué rico! Eres el mejor profesor de cocina!'"],qs:[{q:"What do you take first?",opts:["Two slices of bread","Butter","Cheese"],ans:0},{q:"What goes on next?",opts:["Butter","Bread","Ham"],ans:0},{q:"How does Luna describe Sol?",opts:["The best cooking teacher","A bad cook","A friend"],ans:0}]},
  59:{title:"What Should I Do?",paras:["Sol is worried. '¿Qué hago, Luna? Tengo miedo del concierto.'","Luna gives advice: 'Tranquilo. Deberías respirar profundo. No deberías preocuparte tanto.'","'Tienes que practicar y disfrutar. Es mejor divertirse!' Sol smiles. ¡Buena consejera!"],qs:[{q:"What is Sol scared of?",opts:["The concert","The school","Travel"],ans:0},{q:"What should Sol do according to Luna?",opts:["Breathe deeply","Run away","Cry"],ans:0},{q:"What is Luna good at?",opts:["Giving advice","Cooking","Singing"],ans:0}]},
  60:{title:"The Master Storyteller",paras:["Sol and Luna sit under the stars. 'Cuando éramos pequeños,' says Sol, 'no sabíamos tantas palabras.'","'Ahora podemos contar historias del pasado y del futuro!' Luna replies. They are muy orgullosos.","Sol smiles: 'Eres mi mejor amiga, Luna.' '¡Y tú el mío!' replies Luna. ¡Qué aventura tan increíble!"],qs:[{q:"What do they reflect on?",opts:["When they were little","The future","Other planets"],ans:0},{q:"What can they do now?",opts:["Tell stories of past and future","Travel","Sing"],ans:0},{q:"How do they feel about each other?",opts:["Best friends","Enemies","Strangers"],ans:0}]},
  61:{title:"Sol Packs His Bag",paras:["Today Sol packs his mochila for school. He puts in dos cuadernos, un bolígrafo, y una goma.","Luna comes and adds una regla, unas tijeras, y pegamento for the art class.","'¿Llevamos también los sacapuntas?' asks Sol. '¡Sí!' replies Luna. Now they are ready for school!"],qs:[{q:"What does Sol pack first?",opts:["Notebooks","Glue","Scissors"],ans:0},{q:"What does Luna add for art class?",opts:["Ruler, scissors, glue","Books","Pens"],ans:0},{q:"Are they ready for school?",opts:["Yes","No","Maybe"],ans:0}]},
  62:{title:"Luna's Bath Time",paras:["After playing, Luna is muy sucia. 'Necesito un baño!' she says. She turns on the water.","She uses jabón to wash her arms, champú in her hair, and pasta de dientes to clean her teeth.","Finally, she uses una toalla suave to dry off. '¡Estoy limpia y feliz!' Luna shines bright."],qs:[{q:"How is Luna before her bath?",opts:["Dirty","Clean","Tired"],ans:0},{q:"What does she use on her hair?",opts:["Shampoo","Soap","Toothpaste"],ans:0},{q:"How does Luna feel at the end?",opts:["Clean and happy","Tired","Hungry"],ans:0}]},
  63:{title:"Cooking with Sol",paras:["Sol opens la nevera. Inside there are huevos and leche. He takes a plato and un vaso.","He uses una cuchara to mix and pone everything en el horno. The smell is amazing!","Luna comes, takes un tenedor, and they eat juntos. '¡Qué rico!'"],qs:[{q:"Where does Sol find the eggs?",opts:["In the fridge","In the oven","On the table"],ans:0},{q:"What does Sol use to mix?",opts:["A spoon","A fork","A knife"],ans:0},{q:"What do Sol and Luna do at the end?",opts:["Eat together","Wash dishes","Go to bed"],ans:0}]},
  64:{title:"Luna's New Bedroom",paras:["Luna has a new dormitorio! Hay una cama grande con dos almohadas suaves.","Las sábanas are blue and las mantas are warm. There's una lámpara amarilla on the table.","Luna puts her ropa in el armario. She looks in el espejo and smiles. '¡Qué bonito!'"],qs:[{q:"How many pillows does Luna's bed have?",opts:["Two","One","Three"],ans:0},{q:"What colour are the sheets?",opts:["Blue","Yellow","Red"],ans:0},{q:"Where does Luna put her clothes?",opts:["In the wardrobe","In a drawer","On the bed"],ans:0}]},
  65:{title:"Cleaning Day",paras:["The house is muy sucia! Sol coge la escoba. Luna usa la aspiradora to clean el polvo.","Together they sacan la basura and lavan los platos in the kitchen. Sol slips on water — '¡Ay!'","After two hours, the house is brillante. 'Limpiar es trabajo, pero juntos es divertido!'"],qs:[{q:"What does Sol grab first?",opts:["A broom","A vacuum","A cloth"],ans:0},{q:"What happens to Sol?",opts:["He slips","He falls","He cries"],ans:0},{q:"How long do they clean for?",opts:["Two hours","One hour","All day"],ans:0}]},
  66:{title:"Daily Chores",paras:["Cada día, Sol hace muchas tareas. Por la mañana, hace su cama y pone la mesa.","Después del cole, saca la basura y pasea al perro. Luna riega las plantas.","Mamá says: '¡Qué buenos sois ayudando en casa!' Sol and Luna feel orgullosos."],qs:[{q:"What does Sol do in the morning?",opts:["Make bed and set table","Walk the dog","Water plants"],ans:0},{q:"What does Luna do?",opts:["Water the plants","Make the bed","Walk the dog"],ans:0},{q:"How do they feel?",opts:["Proud","Tired","Sad"],ans:0}]},
  67:{title:"Sol's First Shop",paras:["Sol has ten euros for the supermarket. He sees una pelota that costs cinco euros — '¡Barato!'","He also wants chocolate de tres euros. He paga con un billete and gets dos euros de cambio.","Luna says 'Bien hecho!' Sol gasta his money pero is muy feliz with his pelota nueva."],qs:[{q:"How much does the ball cost?",opts:["Five euros","Ten euros","Three euros"],ans:0},{q:"How does Sol pay?",opts:["With a note","With coins","With a card"],ans:0},{q:"How does Sol feel after?",opts:["Happy","Sad","Worried"],ans:0}]},
  68:{title:"Home Champions",paras:["Sol and Luna have learned so much about everyday life. They know all about their casa, baño, and cocina.","They can clean, do chores, and even go shopping. 'Somos los mejores!' says Sol.","Mamá gives them un abrazo. 'Estoy muy orgullosa de los dos.' They are home champions! 🏠⭐"],qs:[{q:"What have they learned about?",opts:["Everyday home life","Sports","Space"],ans:0},{q:"What does Sol say?",opts:["We're the best","We're tired","We're hungry"],ans:0},{q:"How does mum feel?",opts:["Proud","Surprised","Worried"],ans:0}]},
  69:{title:"The Magic Book",paras:["Luna abre un libro mágico. ¡Encontró una llave!","Sol toma la llave. Together they empezan an adventure. 'Vamos a abrir la puerta secreta!'","Después de muchas horas, terminan their journey con un gran tesoro. ¡Qué aventura!"],qs:[{q:"What does Luna find?",opts:["A key","A book","A door"],ans:0},{q:"Who takes the key?",opts:["Sol","Luna","Both"],ans:0},{q:"What do they find at the end?",opts:["A treasure","Another book","A friend"],ans:0}]},
  70:{title:"The Playground Race",paras:["At the patio, Sol sube al columpio. Luna baja por el tobogán muy rápido.","Suddenly Sol se cae from the swing! '¡Ay!' But he se levanta and laughs.","Luna se esconde behind a tree. Sol la busca. '¡Te encontré!' Both are smiling."],qs:[{q:"Where does Sol go first?",opts:["The swing","The slide","The seesaw"],ans:0},{q:"What happens to Sol?",opts:["He falls","He wins","He cries"],ans:0},{q:"What do they play next?",opts:["Hide and seek","Football","Tag"],ans:0}]},
  71:{title:"Craft Day",paras:["Sol and Luna hacen manualidades. Luna corta papel into pieces. Sol pega them juntos.","They construyen una casita with paper. Then pintan it muchos colores. ¡Qué bonita!","'Doblé este pájaro!' Luna shows un origami pájaro. Sol is muy impressed."],qs:[{q:"What does Luna cut?",opts:["Paper","Cardboard","Plastic"],ans:0},{q:"What do they build?",opts:["A little house","A bird","A car"],ans:0},{q:"What is Luna's origami?",opts:["A bird","A flower","A box"],ans:0}]},
  72:{title:"The Toy Box",paras:["Sol opens his caja de juguetes. There's una pelota roja, un coche pequeño, and bloques.","Luna prefiere su muñeca and una cometa for windy days. They also tienen un puzzle de cien piezas.","'¿Jugamos con todo?' Sol asks. '¡Sí!' Luna replies. Toys make life muy divertida!"],qs:[{q:"What's in Sol's toy box?",opts:["Ball, car, blocks","Books","Crayons"],ans:0},{q:"What does Luna prefer?",opts:["Her doll","Her ball","Her car"],ans:0},{q:"How many pieces is the puzzle?",opts:["One hundred","Fifty","Twenty"],ans:0}]},
  73:{title:"Playing Games",paras:["Sol, Luna, y Estrella juegan al escondite. Luna cuenta to ten. Sol y Estrella se esconden.","Then they play piedra, papel, tijera. Sol always picks piedra! '¡Eres predecible!' Luna laughs.","Finally un juego de cartas. The game ends in empate. '¡Otra vez mañana!'"],qs:[{q:"What do they play first?",opts:["Hide and seek","Cards","Tag"],ans:0},{q:"What does Sol always pick?",opts:["Rock","Paper","Scissors"],ans:0},{q:"How does the card game end?",opts:["A tie","Sol wins","Luna wins"],ans:0}]},
  74:{title:"Bedtime Stories",paras:["Mamá lee un cuento. Hay una princesa valiente, un dragón friendly, y un héroe con espada.","Sol's favourite personaje es el dragón. Luna prefiere la heroína.","Al final, el héroe wins y el dragón becomes friends with todos. Sol y Luna se duermen felices."],qs:[{q:"Who reads the story?",opts:["Mum","Dad","Grandma"],ans:0},{q:"What is in the story?",opts:["Princess, dragon, hero","Animals","Adventures"],ans:0},{q:"Who is Sol's favourite?",opts:["The dragon","The hero","The princess"],ans:0}]},
  75:{title:"Movie Night",paras:["¡Es noche de cine! Sol and Luna get into la cama with palomitas. They ponen una película.","Es muy divertida — un robot has adventures con un niño. They laugh muchísimo.","After, they watch su serie favorita — dibujos animados about little stars. 'Mi favorita!' grita Luna."],qs:[{q:"What do they have?",opts:["Popcorn","Candy","Crisps"],ans:0},{q:"What's the movie about?",opts:["A robot and a boy","Animals","School"],ans:0},{q:"What's Luna's favourite?",opts:["Cartoons about stars","Drama","News"],ans:0}]},
  76:{title:"Game Champions",paras:["Sol and Luna have learned so much about play. Toys, games, books, movies — they love everything!","'Jugar es lo mejor!' says Sol. Luna agrees: 'Y aprender mientras jugamos es perfecto.'","They are los campeones del juego. Tomorrow, new adventures! 🎮🌟"],qs:[{q:"What is the best thing?",opts:["Playing","Eating","Sleeping"],ans:0},{q:"What does Luna add?",opts:["Learning while playing is perfect","Games are boring","Play is hard"],ans:0},{q:"What are they?",opts:["Game champions","Music champions","Sport champions"],ans:0}]},
  77:{title:"At the Zoo",paras:["Sol and Luna visit el zoo. They see un león yawning, un tigre running, and una jirafa with a very long neck!","Los monos jump from tree to tree. ¡Qué divertidos! Una serpiente verde slithers along a branch.","At the end, they see el panda eating bamboo. 'Es mi favorito!' Luna says. '¡Qué lindo!'"],qs:[{q:"What is the lion doing?",opts:["Yawning","Running","Sleeping"],ans:0},{q:"What is special about the giraffe?",opts:["Long neck","Big eyes","Loud voice"],ans:0},{q:"What does the panda eat?",opts:["Bamboo","Fruit","Fish"],ans:0}]},
  78:{title:"Under the Sea",paras:["Sol y Luna explore el mar. They see peces colourful and una tortuga lenta.","De repente, ¡un tiburón! But it's friendly! He swims away. Then un pulpo waves with eight arms.","Un delfín jumps out of the water. 'Hola amigos!' he sings. Sol y Luna laugh muy felices."],qs:[{q:"What does the turtle do?",opts:["Moves slowly","Swims fast","Sleeps"],ans:0},{q:"How many arms does the octopus have?",opts:["Eight","Six","Four"],ans:0},{q:"What does the dolphin do?",opts:["Sings hello","Swims away","Hides"],ans:0}]},
  79:{title:"Garden Insects",paras:["In the jardín, Sol sees una mariposa azul. It flies from flower to flower.","Una abeja makes miel from the flowers. Una mariquita roja lands on Sol's hand. '¡Buena suerte!'","Luna spots una hormiga carrying a leaf to her hill. 'Las hormigas son muy fuertes!' she says."],qs:[{q:"What does the butterfly do?",opts:["Flies between flowers","Sleeps","Eats"],ans:0},{q:"What lands on Sol's hand?",opts:["A ladybug","A bee","A spider"],ans:0},{q:"What is the ant carrying?",opts:["A leaf","A flower","Food"],ans:0}]},
  80:{title:"The Four Seasons",paras:["En primavera, las flores grow. En verano, hace mucho calor and we go to the beach.","En otoño, las hojas fall from the trees, red and orange and yellow.","En invierno, hay nieve in the mountains. Sol and Luna love every season."],qs:[{q:"What happens in autumn?",opts:["Leaves fall","Flowers grow","It snows"],ans:0},{q:"What is the weather like in summer?",opts:["Very hot","Cold","Rainy"],ans:0},{q:"Where is there snow in winter?",opts:["In the mountains","At the beach","In the garden"],ans:0}]},
  81:{title:"Sol's Plant",paras:["Sol planta una semilla in el jardín. He gives it agua and sol every day.","After two weeks, una hoja appears. The raíz grows down. La rama grows up.","After dos meses, it's una planta grande con flores rosas. '¡Yo crecí esta planta!' Sol is muy orgulloso."],qs:[{q:"What does Sol give the plant?",opts:["Water and sun","Sugar","Milk"],ans:0},{q:"When does the first leaf appear?",opts:["After two weeks","After one day","After a year"],ans:0},{q:"What colour are the flowers?",opts:["Pink","Blue","Yellow"],ans:0}]},
  82:{title:"The Big Storm",paras:["El cielo gets dark. Las nubes are heavy. De repente, ¡un relámpago! Then ¡el trueno!","¡Una tormenta! El viento blows hard. La lluvia falls. Sol y Luna se esconden in their casa.","After the storm, ¡un arcoíris! 'Mira, Luna!' grita Sol. The sky is beautiful again. ¡Qué maravilloso!"],qs:[{q:"What happens to the sky?",opts:["It gets dark","It gets bright","It gets pink"],ans:0},{q:"Where do they hide?",opts:["At home","Under a tree","In the car"],ans:0},{q:"What appears after the storm?",opts:["A rainbow","More clouds","Snow"],ans:0}]},
  83:{title:"Journey to the Stars",paras:["Sol y Luna sueñan con el espacio. They imagine un cohete grande. '¡Vamos al universo!'","They visit la Tierra from above — qué pequeña! Then la Luna — perfecta!","Las estrellas brillan around them. Otros planetas: Marte rojo, Júpiter enorme. ¡Qué increíble!"],qs:[{q:"What do they imagine?",opts:["A big rocket","A small car","A boat"],ans:0},{q:"What colour is Mars?",opts:["Red","Blue","Yellow"],ans:0},{q:"What does Jupiter look like?",opts:["Enormous","Tiny","Green"],ans:0}]},
  84:{title:"Nature Champions",paras:["Sol and Luna have learned about animals, weather, plants, and space. ¡Qué increíble!","'La naturaleza es lo más bonito del mundo,' says Luna. Sol agrees: 'Y debemos cuidarla.'","They are nature champions, ready to protect and enjoy our beautiful planeta. 🌍⭐"],qs:[{q:"What is most beautiful according to Luna?",opts:["Nature","Toys","Music"],ans:0},{q:"What does Sol say we must do?",opts:["Take care of it","Forget it","Sell it"],ans:0},{q:"What kind of champions are they?",opts:["Nature champions","Sport champions","Music champions"],ans:0}]},
  85:{title:"My New Look",paras:["Luna has long pelo rubio y ojos azules. Today she gets gafas nuevas — ¡rosas!","Sol has pelo moreno y corto. He has muchas pecas on his face. '¡Te ves diferente!' he tells Luna.","Luna laughs: 'Igual de bonita!' They both look in el espejo and smile."],qs:[{q:"What colour are Luna's eyes?",opts:["Blue","Brown","Green"],ans:0},{q:"What does Sol have on his face?",opts:["Freckles","A scar","Makeup"],ans:0},{q:"How does Luna feel about her new glasses?",opts:["Just as pretty","Sad","Ugly"],ans:0}]},
  86:{title:"What I'm Like",paras:["Luna dice: 'Soy paciente y curiosa. I love to learn new things.'","Sol replies: 'Soy gracioso y valiente. I love to make people laugh.'","Mamá says: 'Los dos sois muy amables y trabajadores. ¡Soy afortunada!'"],qs:[{q:"How does Luna describe herself?",opts:["Patient and curious","Funny and brave","Loud and silly"],ans:0},{q:"How does Sol describe himself?",opts:["Funny and brave","Quiet and shy","Tall and strong"],ans:0},{q:"What does Mum say about them?",opts:["Kind and hardworking","Loud","Boring"],ans:0}]},
  87:{title:"What I Love",paras:["Sol confiesa: 'Me encanta el chocolate. Odio las verduras.' Luna laughs.","'Yo prefiero el helado. Mi sabor favorito es la vainilla.'","Mamá says: 'Lo mejor es probar de todo!' They smile and agree. ¡Qué ricos son los gustos diferentes!"],qs:[{q:"What does Sol love?",opts:["Chocolate","Vegetables","Fish"],ans:0},{q:"What's Luna's favourite ice cream flavour?",opts:["Vanilla","Chocolate","Strawberry"],ans:0},{q:"What does mum say is best?",opts:["To try everything","To eat sweets","To skip dinner"],ans:0}]},
  88:{title:"The Family Reunion",paras:["Today todos los primos visit! Sol has dos tíos y tres primas. Luna has una tía favorita.","Su prima mayor cuenta cuentos divertidos. El sobrino más pequeño cries a little.","Los padrinos arrive with regalos. ¡Qué día tan especial con toda la familia!"],qs:[{q:"How many cousins does Sol have?",opts:["Three","Two","Five"],ans:0},{q:"What does the older cousin do?",opts:["Tells funny stories","Plays football","Sleeps"],ans:0},{q:"Who arrives with presents?",opts:["The godparents","The grandparents","The neighbours"],ans:0}]},
  89:{title:"Our Neighbourhood",paras:["Sol and Luna viven en un edificio de cinco pisos. They live en el tercer piso.","Sus vecinos are very friendly. Una vecina hace galletas for them sometimes.","El portero del edificio is called Carlos. He smiles every morning. ¡Qué bonito barrio!"],qs:[{q:"What floor do Sol and Luna live on?",opts:["Third","First","Fifth"],ans:0},{q:"What does their neighbour bake?",opts:["Cookies","Bread","Cake"],ans:0},{q:"What's the concierge called?",opts:["Carlos","Pedro","Juan"],ans:0}]},
  90:{title:"My School Day",paras:["Today is a busy school day. Primero matemáticas with números difíciles. Then la educación física — ¡corremos!","Después el arte — Luna paints una flor. Música — Sol sings una canción nueva.","Mañana hay un examen de inglés. They have to estudiar a lot tonight!"],qs:[{q:"What subject is first?",opts:["Maths","English","Art"],ans:0},{q:"What does Luna paint?",opts:["A flower","A house","A face"],ans:0},{q:"What's tomorrow's exam?",opts:["English","Maths","Science"],ans:0}]},
  91:{title:"Sol's Birthday Party",paras:["¡Es el cumple de Sol! All friends come to la fiesta with regalos.","They eat patatas fritas, caramelos, y galletas. They dance to música and have a piñata!","Sol sopla las velas of his tarta and makes a deseo. '¡Quiero más cumpleaños así!'"],qs:[{q:"What do they eat at the party?",opts:["Crisps, sweets, cookies","Pasta","Salad"],ans:0},{q:"What do they smash?",opts:["A piñata","A balloon","A drum"],ans:0},{q:"What does Sol wish for?",opts:["More birthdays like this","A new toy","Money"],ans:0}]},
  92:{title:"Person Champion",paras:["Sol y Luna can now describe themselves, their family, friends, school, and parties!","'Estoy orgullosa de quien soy,' says Luna. Sol agrees: 'Y yo de ti, mi mejor amiga.'","They are unique, kind, and ready for any conversation. ¡Personas excepcionales! 👫⭐"],qs:[{q:"What can they describe now?",opts:["Themselves and everything around","Just animals","Just food"],ans:0},{q:"How does Luna feel?",opts:["Proud of who she is","Tired","Sad"],ans:0},{q:"What does Sol say about Luna?",opts:["You're my best friend","You're my sister","You're funny"],ans:0}]},
  93:{title:"The Big Reunion",paras:["¡Hola a todos! Sol greets everyone. 'Encantado!' he says to a new face.","He counts his amigos — uno, dos… ¡veinte amigos! Treinta primos! Cuarenta peluches en casa.","'¡Hasta mañana!' shout the friends. ¡Qué fiesta tan grande!"],qs:[{q:"How does Sol greet a new person?",opts:["Encantado","Adiós","Buenas noches"],ans:0},{q:"How many friends does Sol have?",opts:["Twenty","Ten","Fifty"],ans:0},{q:"How many cousins?",opts:["Thirty","Twenty","Forty"],ans:0}]},
  94:{title:"The Shapes Show",paras:["Luna draws muchas formas. Un círculo grande, un cuadrado azul claro, un triángulo verde.","Sol adds un corazón rojo and una estrella amarilla. They make a beautiful painting.","'Mi favorita es la estrella oscura,' says Luna. 'Yo prefiero el corazón.' Both are happy."],qs:[{q:"What does Luna draw first?",opts:["A big circle","A heart","A star"],ans:0},{q:"What colour is the heart?",opts:["Red","Blue","Green"],ans:0},{q:"What is Luna's favourite?",opts:["The dark star","The heart","The circle"],ans:0}]},
  95:{title:"The Flavour Adventure",paras:["Sol y Luna try many flavours. Sol tastes un limón — '¡Ácido!' Then chocolate — 'Dulce!'","Luna tries un chile picante — '¡Necesito agua!' Then helado frío — 'Delicioso!'","They agree: la comida is muy interesante. ¡Cuántos sabores diferentes!"],qs:[{q:"What does Sol say about the lemon?",opts:["Sour","Sweet","Salty"],ans:0},{q:"What does Luna need after the chili?",opts:["Water","Milk","Bread"],ans:0},{q:"What is the ice cream?",opts:["Delicious","Bitter","Hot"],ans:0}]},
  96:{title:"Family at Home",paras:["Sol y Luna viven en una casa grande. Comparten una habitación con su hermana.","Mamá y papá cuidan a todos. They cenan juntos every night at las ocho.","'Quiero mucho a mi familia,' says Sol. ¡La familia es lo más importante!"],qs:[{q:"Who do they share a room with?",opts:["Their sister","Their brother","Their cousin"],ans:0},{q:"When do they dine together?",opts:["Every night at eight","Every morning","Sometimes"],ans:0},{q:"What does Sol say is most important?",opts:["Family","Toys","School"],ans:0}]},
  97:{title:"Through the Year",paras:["Hoy hace buen tiempo y Sol is happy. Ayer hizo mal tiempo with lots of rain.","Esta semana is special — Luna's cumpleaños. El próximo mes will be summer.","'El año pasa muy rápido,' says Sol. 'Pero cada día es una aventura nueva!'"],qs:[{q:"What is the weather like today?",opts:["Nice","Bad","Cold"],ans:0},{q:"What was the weather yesterday?",opts:["Rainy","Sunny","Snowy"],ans:0},{q:"What's special this week?",opts:["Luna's birthday","Sol's exam","A holiday"],ans:0}]},
  98:{title:"Dinner at the Restaurant",paras:["Sol's family go al restaurante. The camarero brings la carta. Sol says 'De primero quiero ensalada.'","Luna chooses pollo de segundo y helado de postre. Para beber, agua para todos.","After eating, papá pays and leaves una propina. '¡Qué delicioso! ¡Gracias!'"],qs:[{q:"What does Sol have first?",opts:["Salad","Chicken","Soup"],ans:0},{q:"What does Luna have for dessert?",opts:["Ice cream","Cake","Fruit"],ans:0},{q:"What does Dad leave?",opts:["A tip","Nothing","A note"],ans:0}]},
  99:{title:"Shopping Day",paras:["Luna goes to la tienda. She wants un vestido nuevo. The talla mediana fits well!","She goes to el probador to try it on. '¡Está perfecta!' she says. '¡Me lo llevo!'","Today is las rebajas, so it's muy barato. Luna is muy feliz with her new dress!"],qs:[{q:"What does Luna want to buy?",opts:["A dress","Shoes","A book"],ans:0},{q:"Where does she try it on?",opts:["Fitting room","At home","At the cash"],ans:0},{q:"Why is it cheap?",opts:["It's on sale","It's broken","It's small"],ans:0}]},
  100:{title:"The Mega Champion",paras:["Sol and Luna stand on top of the mountain. 'We did it!' they shout to the sky.","'100 lessons! 800 palabras! We can speak Spanish like real Spaniards!'","They look down at their journey — from ¡Hola! to today. ¡Qué viaje increíble! Eres un MEGA CAMPEÓN! 🏆🌟"],qs:[{q:"How many lessons have they done?",opts:["100","50","75"],ans:0},{q:"How many words have they learned?",opts:["800","500","1000"],ans:0},{q:"What kind of champion are they?",opts:["Mega champion","Small champion","Bronze champion"],ans:0}]},
};

// Patch stories onto lessons (lesson 31 already has one)
LESSONS.forEach(l => { if (STORIES[l.id] && !l.story) l.story = STORIES[l.id]; });

// ============================================================
// SONGS — classic Spanish kids' songs with karaoke lyrics
// ============================================================
const SONGS = [
  {
    id: "pollitos", title: "Los pollitos dicen", subtitle: "The little chicks say", emoji: "🐥",
    color: "#FFD93D", bg: "#FFFBE5", youtubeId: "R2CikV3xAxc", channel: "Canticos",
    about: "The classic Spanish song about baby chicks calling for their mother when they are hungry or cold. Sung by kids everywhere in Spain!",
    lines: [
      { es: "Los pollitos dicen pío, pío, pío,", en: "The little chicks say peep, peep, peep," },
      { es: "cuando tienen hambre, cuando tienen frío.", en: "when they are hungry, when they are cold." },
      { es: "La gallina busca el maíz y el trigo,", en: "The hen looks for the corn and the wheat," },
      { es: "les da la comida y les presta abrigo.", en: "she gives them food and keeps them warm." },
      { es: "Bajo sus dos alas, acurrucaditos,", en: "Under her two wings, all snuggled up," },
      { es: "duermen los pollitos hasta el otro día.", en: "the little chicks sleep until the next day." },
    ]
  },
  {
    id: "arana", title: "La araña chiquitita", subtitle: "The itsy bitsy spider", emoji: "🕷️",
    color: "#4D96FF", bg: "#E4F0FF", youtubeId: "uiJwTCUog34", channel: "Canticos",
    about: "The Spanish version of 'Itsy Bitsy Spider' — perfect for little hands doing the actions! Also teaches opposites: up/down, dry/wet, cold/hot.",
    lines: [
      { es: "La araña chiquitita", en: "The itsy bitsy spider" },
      { es: "subió, subió, subió.", en: "climbed up, up, up." },
      { es: "Vino la lluvia", en: "The rain came" },
      { es: "y se la llevó.", en: "and washed her away." },
      { es: "Salió el sol", en: "The sun came out" },
      { es: "y todo se secó.", en: "and dried everything up." },
      { es: "Y la araña chiquitita", en: "And the itsy bitsy spider" },
      { es: "subió, subió, subió.", en: "climbed up, up, up." },
      { es: "Chiquita — Grande", en: "Little — Big" },
      { es: "Arriba — Abajo", en: "Up — Down" },
      { es: "Seco — Mojado", en: "Dry — Wet" },
      { es: "Frío — Caliente", en: "Cold — Hot" },
      { es: "Triste — Feliz", en: "Sad — Happy" },
    ]
  },
  {
    id: "elefante", title: "Un elefante se balanceaba", subtitle: "One elephant was balancing", emoji: "🐘",
    color: "#B983FF", bg: "#F3EAFF", youtubeId: "2vCscfOuxEw", channel: "Canticos",
    about: "A counting song about elephants balancing on a spider's web — a Spanish classroom favourite!",
    lines: [
      { es: "Un elefante se balanceaba", en: "One elephant was balancing" },
      { es: "sobre la tela de una araña,", en: "on a spider's web," },
      { es: "como veía que resistía,", en: "and since it held up well," },
      { es: "fue a llamar a otro elefante.", en: "he went to call another elephant." },
      { es: "Dos elefantes se balanceaban,", en: "Two elephants were balancing," },
      { es: "sobre la tela de una araña,", en: "on a spider's web," },
      { es: "como veían que resistía,", en: "and since it held up well," },
      { es: "fueron a llamar a otro elefante.", en: "they went to call another elephant." },
      { es: "Tres elefantes se balanceaban,", en: "Three elephants were balancing," },
      { es: "sobre la tela de una araña,", en: "on a spider's web," },
      { es: "como veían que resistía,", en: "and since it held up well," },
      { es: "fueron a llamar a otro elefante.", en: "they went to call another elephant." },
      { es: "Cuatro elefantes se balanceaban,", en: "Four elephants were balancing," },
      { es: "sobre la tela de una araña…", en: "on a spider's web…" },
      { es: "¡Uuuuuupa!", en: "Ooooooops!" },
    ]
  },
  {
    id: "veo_veo", title: "Veo Veo", subtitle: "I spy (I see, I see)", emoji: "👀",
    color: "#FF6B6B", bg: "#FFE8E8", youtubeId: "klGK7ehiDPg", channel: "El Reino Infantil",
    about: "The famous Spanish 'I Spy' game turned into a song! A must-know classic from Spain. This version uses each vowel (A, E, I, O, U) — a full, traditional length (~4 min).",
    lines: [
      { es: "Veo, veo… ¿Qué ves?", en: "I see, I see… What do you see?" },
      { es: "Una cosita.", en: "A little thing." },
      { es: "¿Y qué cosita es?", en: "And what little thing is it?" },
      { es: "Empieza con la A.", en: "It starts with the letter A." },
      { es: "¿Qué será? ¿Qué será? ¿Qué será?", en: "What could it be? What could it be?" },
      { es: "¡No, no, no! Eso no es así.", en: "No, no, no! That's not it." },
      { es: "Con la A se escribe amor,", en: "With the A we write 'love' (amor)," },
      { es: "con la A se escribe adiós,", en: "with the A we write 'goodbye' (adiós)," },
      { es: "la alegría del amigo", en: "the joy of a friend" },
      { es: "y un montón de cosas más.", en: "and a whole bunch of other things." },
      { es: "(Y luego con la E, I, O, U…)", en: "(And then with E, I, O, U…)" },
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
  { id: "a2_legend", name: "A2 Super Legend", desc: "Finished A2 course!", emoji: "👑", check: p => (p.stars || {})[32] >= 1 },
  { id: "word_master", name: "Word Master", desc: "Conquered Plaza del Pueblo!", emoji: "📚", check: p => (p.stars || {})[40] >= 1 },
  { id: "comparison_champ", name: "Comparison Champion", desc: "Finished the Bridge!", emoji: "⚖️", check: p => (p.stars || {})[50] >= 1 },
  { id: "storyteller", name: "Master Storyteller", desc: "Reached B1 level!", emoji: "📖", check: p => (p.stars || {})[60] >= 1 },
  { id: "perfect_world", name: "World Conqueror", desc: "All stars in one world", emoji: "🌍", check: p => {
    const ranges = [[1,8],[9,16],[17,24],[25,32],[33,40],[41,50],[51,60],[61,68],[69,76],[77,84],[85,92],[93,100]];
    for (const r of ranges) {
      let all = true;
      for (let i = r[0]; i <= r[1]; i++) if ((p.stars||{})[i] < 3) { all = false; break; }
      if (all) return true;
    }
    return false;
  }},
  { id: "casa_champ", name: "Casa Champion", desc: "Mastered everyday home life!", emoji: "🏠", check: p => (p.stars || {})[68] >= 1 },
  { id: "juego_champ", name: "Juego Champion", desc: "Mastered play & toys!", emoji: "🎮", check: p => (p.stars || {})[76] >= 1 },
  { id: "naturaleza_champ", name: "Naturaleza Champion", desc: "Mastered the natural world!", emoji: "🌳", check: p => (p.stars || {})[84] >= 1 },
  { id: "persona_champ", name: "Persona Champion", desc: "Mastered self-expression!", emoji: "👤", check: p => (p.stars || {})[92] >= 1 },
  { id: "mega_champ", name: "MEGA CHAMPION!", desc: "Completed ALL 100 lessons!!!", emoji: "👑", check: p => (p.stars || {})[100] >= 1 },
  { id: "streak_3", name: "On Fire!", desc: "3-day streak", emoji: "🔥", check: p => (p.streak || 0) >= 3 },
  { id: "streak_7", name: "Week Warrior", desc: "7-day streak", emoji: "🔥", check: p => (p.streak || 0) >= 7 },
  { id: "streak_30", name: "Month Master", desc: "30-day streak!", emoji: "🔥", check: p => (p.streak || 0) >= 30 },
  { id: "first_song", name: "Little Singer", desc: "Sang your first song", emoji: "🎵", check: p => Object.keys(p.songsDone || {}).length >= 1 },
  { id: "all_songs", name: "Song Star", desc: "Sang all the songs!", emoji: "🎤", check: p => Object.keys(p.songsDone || {}).length >= SONGS.length },
  { id: "speaker", name: "Speaking Star", desc: "Used the mic 10 times", emoji: "🗣️", check: p => (p.micUses || 0) >= 10 },
  { id: "story_lover", name: "Story Lover", desc: "Read 10 stories", emoji: "📖", check: p => (p.storiesRead || 0) >= 10 },
  { id: "quiz_master", name: "Quiz Master", desc: "100 correct answers", emoji: "🧠", check: p => (p.correctAnswers || 0) >= 100 },
  { id: "halfway", name: "Halfway There!", desc: "Finished 50 lessons", emoji: "🎯", check: p => Object.keys(p.stars || {}).length >= 50 },
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
// MASCOTS — Sol (the sun) and Luna (the moon)
// ============================================================
function Sol({ size = 56 }) {
  const r = size / 2;
  return <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: "drop-shadow(0 4px 8px rgba(255,200,50,.4))" }} aria-label="Sol the sun">
    {/* Sun rays */}
    <g style={{ transformOrigin: "50px 50px", animation: "solSpin 22s linear infinite" }}>
      {Array.from({ length: 12 }).map((_, i) => <rect key={i} x="48" y="4" width="4" height="14" rx="2" fill="#FFD93D" transform={`rotate(${i * 30} 50 50)`} />)}
    </g>
    {/* Sun body */}
    <circle cx="50" cy="50" r="28" fill="#FFD93D" stroke="#FF8C42" strokeWidth="2" />
    <circle cx="50" cy="50" r="28" fill="url(#solGrad)" />
    <defs>
      <radialGradient id="solGrad" cx="40%" cy="38%">
        <stop offset="0%" stopColor="#FFEC84" />
        <stop offset="100%" stopColor="#FFB12B" />
      </radialGradient>
    </defs>
    {/* Cheeks */}
    <circle cx="38" cy="56" r="4.5" fill="#FF9EC7" opacity="0.75" />
    <circle cx="62" cy="56" r="4.5" fill="#FF9EC7" opacity="0.75" />
    {/* Eyes */}
    <g>
      <ellipse cx="41" cy="47" rx="3.2" ry="4" fill="#1E3A5F" />
      <circle cx="42" cy="46" r="1" fill="#fff" />
      <ellipse cx="59" cy="47" rx="3.2" ry="4" fill="#1E3A5F" />
      <circle cx="60" cy="46" r="1" fill="#fff" />
    </g>
    {/* Smile */}
    <path d="M 42 56 Q 50 64 58 56" stroke="#1E3A5F" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <style>{`@keyframes solSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
  </svg>;
}

function Luna({ size = 56 }) {
  return <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: "drop-shadow(0 4px 8px rgba(150,180,255,.4))" }} aria-label="Luna the moon">
    <defs>
      <radialGradient id="lunaGrad" cx="35%" cy="35%">
        <stop offset="0%" stopColor="#F7F4FF" />
        <stop offset="100%" stopColor="#B8B5E8" />
      </radialGradient>
    </defs>
    {/* Moon body (crescent-ish round) */}
    <circle cx="50" cy="50" r="32" fill="url(#lunaGrad)" stroke="#8F8BD6" strokeWidth="2" />
    {/* Craters */}
    <circle cx="70" cy="42" r="3" fill="#C9C5F0" opacity="0.7" />
    <circle cx="68" cy="64" r="4" fill="#C9C5F0" opacity="0.7" />
    <circle cx="78" cy="55" r="2" fill="#C9C5F0" opacity="0.6" />
    {/* Sleepy cap */}
    <path d="M 26 34 Q 30 20 48 22 L 56 30 Z" fill="#B983FF" />
    <circle cx="30" cy="22" r="4" fill="#FFD93D" />
    {/* Cheeks */}
    <circle cx="36" cy="58" r="4" fill="#FF9EC7" opacity="0.7" />
    <circle cx="56" cy="60" r="4" fill="#FF9EC7" opacity="0.7" />
    {/* Closed sleepy eyes */}
    <path d="M 36 49 Q 40 45 44 49" stroke="#1E3A5F" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <path d="M 52 50 Q 56 46 60 50" stroke="#1E3A5F" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    {/* Gentle smile */}
    <path d="M 42 58 Q 48 63 54 58" stroke="#1E3A5F" strokeWidth="2.4" fill="none" strokeLinecap="round" />
  </svg>;
}

// A sparkly starfield for dark navy backgrounds
function Starfield() {
  const stars = Array.from({ length: 50 }, (_, i) => ({
    left: (i * 37) % 100, top: (i * 53) % 100, size: 1 + (i % 4), delay: (i * 0.3) % 3,
  }));
  return <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
    {stars.map((s, i) => <div key={i} style={{
      position: "absolute", left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size,
      background: "#fff", borderRadius: "50%", opacity: 0.5 + (i % 3) * 0.15,
      animation: `twinkle ${2 + (i % 3)}s ${s.delay}s ease-in-out infinite alternate`,
    }} />)}
    <style>{`@keyframes twinkle { from { opacity: 0.2; transform: scale(0.8); } to { opacity: 1; transform: scale(1.3); } }`}</style>
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
  if (screen === "home") return <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#0B1A3A 0%,#14275A 40%,#1E3A70 100%)", color: "#fff" }}>
    <Starfield />
    <Confetti active={conf} />
    {newBadge && <BadgeToast badge={newBadge} onClose={() => setNewBadge(null)} />}
    <div style={{ position: "relative", zIndex: 1, maxWidth: 560, margin: "0 auto", padding: "14px 14px 60px" }}>
      {/* Top bar: Sol & Luna mascots on left, action buttons on right */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#FFD93D", fontFamily: FN, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4, opacity: 0.85 }}>Our friends</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Sol size={54} />
            <Luna size={54} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 900, color: "#fff", fontFamily: FN, marginTop: 4 }}>Sol y Luna</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => go("profile")} title="Profile" style={{ background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.2)", borderRadius: 12, padding: "8px 12px", fontSize: 14, fontFamily: FN, color: "#fff", cursor: "pointer", backdropFilter: "blur(10px)" }}>⚙️</button>
          <button onClick={backToChildPicker} title="Switch child" style={{ background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.2)", borderRadius: 12, padding: "8px 12px", fontSize: 14, fontFamily: FN, color: "#fff", cursor: "pointer", backdropFilter: "blur(10px)" }}>👥</button>
        </div>
      </div>

      {/* Child greeting */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, background: "rgba(255,255,255,0.08)", borderRadius: 16, padding: "10px 14px", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ fontSize: 32 }}>{child.avatar}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", fontFamily: FN }}>¡Hola, {child.name}! 👋</div>
          {progress.streak > 0 && <div style={{ fontSize: 11, color: "#FFD93D", fontFamily: FN, fontWeight: 700 }}>🔥 {progress.streak} day streak!</div>}
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <h1 style={{ fontSize: 34, fontWeight: 900, fontFamily: FN, background: "linear-gradient(135deg,#FFD93D,#FF8C42,#FF9EC7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 2 }}>¡Hola, Amigo!</h1>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: FN }}>Follow the golden path to learn Spanish!</p>
      </div>

      {/* Stats bar */}
      <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 16, padding: "10px 14px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-around", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#FFD93D", fontFamily: FN }}>⭐ {totalStars}</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", fontFamily: FN, textTransform: "uppercase", fontWeight: 700 }}>Stars</div>
        </div>
        <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.15)" }} />
        <button onClick={() => setScreen("badges")} style={{ textAlign: "center", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#B983FF", fontFamily: FN }}>🏆 {(progress.badges || []).length}</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", fontFamily: FN, textTransform: "uppercase", fontWeight: 700 }}>Badges</div>
        </button>
        <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.15)" }} />
        <button onClick={() => setScreen("songs")} style={{ textAlign: "center", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#FF9EC7", fontFamily: FN }}>🎵 {Object.keys(progress.songsDone || {}).length}</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", fontFamily: FN, textTransform: "uppercase", fontWeight: 700 }}>Songs</div>
        </button>
      </div>

      {/* Songs & Badges quick buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
        <button onClick={() => setScreen("songs")} style={{ flex: 1, background: "linear-gradient(135deg,#FF9EC7,#FFD93D)", border: "none", borderRadius: 14, padding: "11px", color: "#1E3A5F", fontWeight: 900, fontSize: 13, fontFamily: FN, cursor: "pointer", boxShadow: "0 4px 14px rgba(255,158,199,.35)" }}>🎵 Sing Along!</button>
        <button onClick={() => setScreen("badges")} style={{ flex: 1, background: "linear-gradient(135deg,#B983FF,#4D96FF)", border: "none", borderRadius: 14, padding: "11px", color: "#fff", fontWeight: 900, fontSize: 13, fontFamily: FN, cursor: "pointer", boxShadow: "0 4px 14px rgba(185,131,255,.35)" }}>🏆 Trophies</button>
      </div>

      {/* YELLOW BRICK ROAD of all 32 lessons */}
      <div style={{ position: "relative", padding: "12px 0" }}>
        {WORLDS.map((w) => {
          const ls = LESSONS.filter(l => l.id >= w.range[0] && l.id <= w.range[1]);
          const ws = ls.reduce((a, l) => a + (stars[l.id] || 0), 0);
          const wsMax = ls.length * 3;
          return <div key={w.id} style={{ marginBottom: 8 }}>
            {/* World banner */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "10px 14px", background: `linear-gradient(90deg, ${w.color}40, transparent)`, borderRadius: 14, border: `1px solid ${w.color}80` }}>
              <div style={{ fontSize: 30 }}>{w.emoji}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 900, color: w.color, fontFamily: FN, textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>{w.name}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontFamily: FN }}>{w.desc} · {ws}/{wsMax} ⭐</div>
              </div>
            </div>

            {/* The road itself — snake pattern, 2 per row with alternating alignment */}
            <div style={{ position: "relative", padding: "6px 4px" }}>
              {ls.map((l, i) => {
                const s = stars[l.id] || 0;
                const ch = [16, 24, 32, 40, 50, 60, 68, 76, 84, 92, 100].includes(l.id);
                const earnedSome = s > 0;
                const isLeft = i % 2 === 0;

                // Determine lesson lock state (unlock first lesson, then sequentially from max completed)
                const completedLessonIds = Object.keys(stars).map(Number);
                const maxCompleted = completedLessonIds.length ? Math.max(...completedLessonIds) : 0;
                const isUnlocked = l.id === 1 || l.id <= maxCompleted + 1;

                return <div key={l.id} style={{
                  display: "flex", justifyContent: isLeft ? "flex-start" : "flex-end",
                  position: "relative", marginBottom: 8, paddingLeft: isLeft ? 8 : 0, paddingRight: isLeft ? 0 : 8,
                }}>
                  {/* Connector line to next stone */}
                  {i < ls.length - 1 && <div style={{
                    position: "absolute",
                    left: isLeft ? "30%" : "auto", right: isLeft ? "auto" : "30%",
                    top: 58, width: "40%", height: 4, borderRadius: 2,
                    background: earnedSome ? "linear-gradient(90deg,#FFD93D,#FF8C42)" : "rgba(255,255,255,0.15)",
                    zIndex: 0,
                  }} />}

                  <button
                    onClick={() => isUnlocked && go("lesson", LESSONS.indexOf(l))}
                    disabled={!isUnlocked}
                    style={{
                      position: "relative", zIndex: 1,
                      width: ch ? 128 : 108, height: ch ? 128 : 108,
                      borderRadius: ch ? 26 : "50%",
                      background: !isUnlocked
                        ? "linear-gradient(135deg,#2a3a5f,#1a2a4a)"
                        : ch
                          ? "linear-gradient(135deg,#FFE580,#FFB12B,#FF8C42)"
                          : earnedSome
                            ? "linear-gradient(135deg,#FFE580,#FFD93D,#FFB12B)"
                            : "linear-gradient(135deg,#F5E0A0,#E3C97B)",
                      border: ch ? "4px solid #FFF4C7" : earnedSome ? "4px solid #FFF4C7" : "4px solid #D4B868",
                      cursor: isUnlocked ? "pointer" : "not-allowed",
                      boxShadow: isUnlocked
                        ? (ch ? "0 0 24px #FFD93D80, 0 6px 14px rgba(255,140,66,.5)" : earnedSome ? "0 0 16px rgba(255,217,61,.6), 0 4px 10px rgba(255,140,66,.4)" : "0 4px 10px rgba(0,0,0,0.3)")
                        : "0 2px 6px rgba(0,0,0,0.3)",
                      padding: 4, fontFamily: FN, color: "#1E3A5F",
                      transition: "transform .2s", opacity: isUnlocked ? 1 : 0.45,
                      animation: "cPop .4s ease-out backwards", animationDelay: `${i * 0.04}s`,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    }}
                    onMouseEnter={e => { if (isUnlocked) e.currentTarget.style.transform = "scale(1.05)"; }}
                    onMouseLeave={e => { if (isUnlocked) e.currentTarget.style.transform = "scale(1)"; }}
                  >
                    {/* Number badge */}
                    <div style={{
                      position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)",
                      background: ch ? "linear-gradient(135deg,#FF6B6B,#B983FF)" : "#1E3A5F",
                      color: "#fff", fontSize: 11, fontWeight: 900, fontFamily: FN,
                      borderRadius: 50, padding: "2px 8px", minWidth: 22, textAlign: "center",
                      border: "2px solid #FFF4C7", boxShadow: "0 2px 6px rgba(0,0,0,.3)",
                    }}>{l.id}</div>

                    {!isUnlocked ? (
                      <div style={{ fontSize: 30 }}>🔒</div>
                    ) : (
                      <>
                        <div style={{ fontSize: ch ? 34 : 28, lineHeight: 1, marginTop: 6 }}>{ch ? "🏆" : l.emoji}</div>
                        <div style={{ fontSize: 9, fontWeight: 800, color: "#1E3A5F", fontFamily: FN, marginTop: 3, padding: "0 4px", lineHeight: 1.15, textAlign: "center" }}>{l.subtitle}</div>
                        <div style={{ marginTop: 3, fontSize: 10, letterSpacing: 1 }}>
                          {[0, 1, 2].map(j => <span key={j} style={{ opacity: j < s ? 1 : 0.25, filter: j < s ? "drop-shadow(0 0 2px #FF8C42)" : "none" }}>⭐</span>)}
                        </div>
                      </>
                    )}
                  </button>
                </div>;
              })}
            </div>
          </div>;
        })}
      </div>

      {/* Sol & Luna footer message */}
      <div style={{ textAlign: "center", marginTop: 24, padding: "14px 18px", background: "rgba(255,255,255,0.06)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 6 }}>
          <Sol size={34} /><Luna size={34} />
        </div>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", fontFamily: FN, fontStyle: "italic", margin: 0 }}>Keep going, {child.name}! Sol y Luna are so proud of you! ✨</p>
      </div>
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
