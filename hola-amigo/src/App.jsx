import { useState, useEffect, useMemo } from "react";

// ============================================================
// LOCAL STORAGE HELPERS (per-user, persistent)
// ============================================================
const db = {
  getUsers() { try { return JSON.parse(localStorage.getItem("hola_users") || "[]"); } catch { return []; } },
  saveUsers(u) { localStorage.setItem("hola_users", JSON.stringify(u)); },
  findUser(email) { return db.getUsers().find(u => u.email === email); },
  createUser(name, email, pass) {
    const users = db.getUsers();
    if (users.find(u => u.email === email)) return null;
    const user = { name, email, pass, created: Date.now() };
    users.push(user);
    db.saveUsers(users);
    db.saveProgress(email, { stars: {}, lastLesson: 1 });
    return user;
  },
  getSession() { try { return JSON.parse(localStorage.getItem("hola_session")); } catch { return null; } },
  setSession(user) { localStorage.setItem("hola_session", JSON.stringify({ email: user.email })); },
  clearSession() { localStorage.removeItem("hola_session"); },
  getProgress(email) { try { return JSON.parse(localStorage.getItem(`hola_progress_${email}`)) || { stars: {}, lastLesson: 1 }; } catch { return { stars: {}, lastLesson: 1 }; } },
  saveProgress(email, p) { localStorage.setItem(`hola_progress_${email}`, JSON.stringify(p)); },
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
  return <div onClick={() => setF(!f)} style={{ perspective:600, cursor:"pointer", animation:"cPop .4s ease-out backwards", animationDelay:`${index*.05}s` }}>
    <div style={{ width:"100%", minHeight:125, position:"relative", transformStyle:"preserve-3d", transition:"transform .5s cubic-bezier(.4,0,.2,1)", transform:f?"rotateY(180deg)":"rotateY(0)" }}>
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
    const user = db.createUser(name.trim(), email.toLowerCase().trim(), pass);
    if (!user) return setError("An account with this email already exists!");
    db.setSession(user);
    onLogin(user);
  };

  const handleLogin = () => {
    setError("");
    if (!email.trim() || !pass.trim()) return setError("Please fill in all fields!");
    const user = db.findUser(email.toLowerCase().trim());
    if (!user) return setError("No account found with this email.");
    if (user.pass !== pass) return setError("Wrong password! Try again.");
    db.setSession(user);
    onLogin(user);
  };

  return <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#FFF8E1 0%,#FFE0EC 50%,#E4F0FF 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <Bgs e={["☀️","🌈","⭐","🦋","🌻"]} />
    <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 400 }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 48, animation: "bIn .6s" }}>☀️</div>
        <h1 style={{ fontSize: 36, fontWeight: 900, fontFamily: FN, background: "linear-gradient(135deg,#FF8C42,#FF6B6B,#B983FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>¡Hola, Amigo!</h1>
        <p style={{ fontSize: 14, color: "#666", fontFamily: FN }}>Your Super Fun Spanish Adventure</p>
      </div>
      <div style={{ background: "#fff", borderRadius: 24, padding: "28px 24px", boxShadow: "0 8px 32px rgba(0,0,0,.08)" }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f5f5f5", borderRadius: 12, padding: 4 }}>
          {["login", "signup"].map(m => <button key={m} onClick={() => { setMode(m); setError(""); }} style={{ flex: 1, padding: 10, borderRadius: 10, border: "none", fontFamily: FN, fontWeight: 700, fontSize: 14, cursor: "pointer", background: mode === m ? "#fff" : "transparent", color: mode === m ? "#1E3A5F" : "#999", boxShadow: mode === m ? "0 2px 8px rgba(0,0,0,.08)" : "none", transition: "all .2s" }}>{m === "login" ? "Log In" : "Sign Up"}</button>)}
        </div>
        {mode === "signup" && <Input label="Your Name" placeholder="e.g. Sol" value={name} onChange={e => setName(e.target.value)} />}
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
// MAIN APP
// ============================================================
export default function App() {
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState({ stars: {}, lastLesson: 1 });
  const [screen, setScreen] = useState("home");
  const [lIdx, setLIdx] = useState(0);
  const [conf, setConf] = useState(false);
  const [result, setResult] = useState(null);
  const [ready, setReady] = useState(false);

  // Restore session on mount
  useEffect(() => {
    const sess = db.getSession();
    if (sess) {
      const u = db.findUser(sess.email);
      if (u) { setUser(u); setProgress(db.getProgress(u.email)); }
    }
    setReady(true);
  }, []);

  const login = (u) => { setUser(u); setProgress(db.getProgress(u.email)); setScreen("home"); };
  const logout = () => { db.clearSession(); setUser(null); setProgress({ stars: {}, lastLesson: 1 }); setScreen("home"); };
  const save = (p) => { setProgress(p); if (user) db.saveProgress(user.email, p); };

  const stars = progress.stars;
  const totalStars = Object.values(stars).reduce((a, b) => a + b, 0);
  const lesson = LESSONS[lIdx];

  const earn = (id) => {
    const p = stars[id] || 0;
    if (p < 3) {
      const ns = { ...stars, [id]: p + 1 };
      const np = { ...progress, stars: ns, lastLesson: Math.max(progress.lastLesson, id) };
      save(np);
      setConf(true);
      setTimeout(() => setConf(false), 2500);
    }
  };

  const go = (s, i) => { if (i !== undefined) setLIdx(i); setScreen(s); setResult(null); };

  // Loading
  if (!ready) return <div style={{ minHeight: "100vh", background: "#FFF8E1", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ textAlign: "center" }}><div style={{ fontSize: 48, animation: "bIn .8s" }}>☀️</div><p style={{ fontFamily: FN, color: "#999", marginTop: 12 }}>Loading…</p></div>
  </div>;

  // Auth gate
  if (!user) return <AuthScreen onLogin={login} />;

  // ============================================================
  // HOME SCREEN
  // ============================================================
  if (screen === "home") return <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#FFF8E1 0%,#FFE0EC 40%,#E4F0FF 80%,#F3EAFF 100%)" }}>
    <Bgs e={["☀️","🌈","⭐","🦋","🌻","🎈"]} />
    <Confetti active={conf} />
    <div style={{ position: "relative", zIndex: 1, maxWidth: 540, margin: "0 auto", padding: "16px 16px 50px" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#FF8C42,#FF6B6B)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 16, fontFamily: FN }}>{user.name.charAt(0).toUpperCase()}</div>
          <div><div style={{ fontSize: 14, fontWeight: 800, color: "#1E3A5F", fontFamily: FN }}>Hey, {user.name}! 👋</div><div style={{ fontSize: 11, color: "#999", fontFamily: FN }}>{user.email}</div></div>
        </div>
        <button onClick={() => go("profile")} style={{ background: "#fff", border: "2px solid #e8e8e8", borderRadius: 12, padding: "6px 14px", fontSize: 12, fontWeight: 700, fontFamily: FN, color: "#666", cursor: "pointer" }}>⚙️</button>
      </div>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, fontFamily: FN, background: "linear-gradient(135deg,#FF8C42,#FF6B6B,#B983FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>¡Hola, Amigo!</h1>
      </div>
      <div style={{ background: "#fff", borderRadius: 18, padding: "10px 18px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 3px 12px rgba(0,0,0,.05)" }}>
        <span style={{ fontSize: 24 }}>⭐</span><span style={{ fontSize: 18, fontWeight: 800, color: "#1E3A5F", fontFamily: FN }}>{totalStars}</span><span style={{ fontSize: 12, color: "#888", fontFamily: FN }}>stars · {LESSONS.length} lessons</span>
      </div>
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
  // PROFILE SCREEN
  // ============================================================
  if (screen === "profile") return <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#FFF8E1,#E4F0FF)", padding: 16 }}>
    <Bgs e={["⭐","🌟"]} />
    <div style={{ position: "relative", zIndex: 1, maxWidth: 440, margin: "0 auto", paddingTop: 16 }}>
      <Btn onClick={() => go("home")} style={{ marginBottom: 16, fontSize: 13 }}>← Back</Btn>
      <div style={{ background: "#fff", borderRadius: 24, padding: "28px 24px", boxShadow: "0 6px 24px rgba(0,0,0,.06)", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#FF8C42,#FF6B6B)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 28, fontFamily: FN, margin: "0 auto 12px" }}>{user.name.charAt(0).toUpperCase()}</div>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: "#1E3A5F", fontFamily: FN }}>{user.name}</h2>
        <p style={{ fontSize: 13, color: "#888", fontFamily: FN }}>{user.email}</p>
        <div style={{ margin: "16px 0", display: "flex", justifyContent: "center", gap: 20 }}>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 28, fontWeight: 900, color: "#FF8C42", fontFamily: FN }}>{totalStars}</div><div style={{ fontSize: 11, color: "#999", fontFamily: FN }}>Stars ⭐</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 28, fontWeight: 900, color: "#6BCB77", fontFamily: FN }}>{Object.keys(stars).length}</div><div style={{ fontSize: 11, color: "#999", fontFamily: FN }}>Lessons</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 28, fontWeight: 900, color: "#4D96FF", fontFamily: FN }}>{LESSONS.length}</div><div style={{ fontSize: 11, color: "#999", fontFamily: FN }}>Total</div></div>
        </div>
        <div style={{ background: "#f0f0f0", borderRadius: 50, height: 16, margin: "12px 0", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 50, background: "linear-gradient(90deg,#6BCB77,#4D96FF)", width: `${(Object.keys(stars).length / LESSONS.length * 100)}%`, transition: "width .5s" }} />
        </div>
        <p style={{ fontSize: 12, color: "#999", fontFamily: FN, marginBottom: 20 }}>{Math.round(Object.keys(stars).length / LESSONS.length * 100)}% complete</p>
        <Btn onClick={logout} bg="#fff" border="#FF6B6B" color="#FF6B6B" full>Log Out</Btn>
      </div>
    </div>
  </div>;

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
    ];
    if (hasS) acts.push({ label: "🔨 Sentences", desc: "Build sentences!", scr: "build", clr: "#B983FF" });
    if (hasSt) acts.push({ label: "📖 Story", desc: "Read a story!", scr: "story", clr: "#FF9EC7" });
    return <div style={{ minHeight: "100vh", background: lesson.bg }}>
      <Bgs e={[lesson.emoji, "⭐", "🌟"]} /><Confetti active={conf} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 500, margin: "0 auto", padding: "14px 14px 36px" }}>
        <Btn onClick={() => go("home")} style={{ marginBottom: 12, fontSize: 12 }}>← {w?.name || "Home"}</Btn>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 48, animation: "bIn .5s" }}>{lesson.emoji}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: lesson.color, fontFamily: FN, textTransform: "uppercase", letterSpacing: 2 }}>Lesson {lesson.id}</div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: "#1E3A5F", fontFamily: FN }}>{lesson.title}</h2>
          <p style={{ fontSize: 14, color: "#888", fontFamily: FN }}>{lesson.subtitle}</p>
          <div style={{ marginTop: 4, fontSize: 16, letterSpacing: 3 }}>{[0, 1, 2].map(j => <span key={j} style={{ opacity: j < s ? 1 : 0.2 }}>⭐</span>)}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 20, padding: "18px 16px", marginBottom: 14, textAlign: "center", boxShadow: "0 3px 12px rgba(0,0,0,.04)", borderLeft: `5px solid ${lesson.color}` }}>
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

  if (screen === "match") return <AW title="🎯 Matching" em="🎯">{card(result ? <Result score={result.s} total={result.t} onRetry={() => { setResult(null); go("match"); }} onBack={() => go("lesson")} onEarnStar={() => earn(lesson.id)} /> : <MatchGame words={lesson.words} onDone={() => setResult({ s: 6, t: 6 })} />)}</AW>;

  if (screen === "quiz") return <AW title="🧠 Quiz" em="🧠">{card(result ? <Result score={result.s} total={result.t} onRetry={() => { setResult(null); go("quiz"); }} onBack={() => go("lesson")} onEarnStar={() => earn(lesson.id)} /> : <Quiz words={lesson.words} gaps={lesson.gaps} onDone={(s, t) => setResult({ s, t })} />)}</AW>;

  if (screen === "build") return <AW title="🔨 Sentences" em="🔨">{card(result ? <Result score={result.s} total={result.t} onRetry={() => { setResult(null); go("build"); }} onBack={() => go("lesson")} onEarnStar={() => earn(lesson.id)} /> : <SentenceBuilder sentences={lesson.sentences} onDone={(s, t) => setResult({ s, t })} />)}</AW>;

  if (screen === "story") return <AW title="📖 Story" em="📖">{card(result ? <Result score={result.s} total={result.t} onRetry={() => { setResult(null); go("story"); }} onBack={() => go("lesson")} onEarnStar={() => earn(lesson.id)} /> : <StoryReader story={lesson.story} onDone={(s, t) => setResult({ s, t })} />)}</AW>;

  return null;
}
