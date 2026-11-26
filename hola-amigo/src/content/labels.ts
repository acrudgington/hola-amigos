// Printable labels for things around the house, grouped by room. Stick them on
// the real objects so the whole family sees the Spanish word every day.
export interface HomeLabel { es: string; en: string; say: string; emoji: string }
export interface LabelRoom { id: string; es: string; en: string; emoji: string; labels: HomeLabel[] }

const l = (es: string, en: string, say: string, emoji: string): HomeLabel => ({ es, en, say, emoji });

export const LABEL_ROOMS: LabelRoom[] = [
  { id: "kitchen", es: "La cocina", en: "The kitchen", emoji: "🍳", labels: [
    l("la nevera", "the fridge", "lah neh-BEH-rah", "🧊"),
    l("el horno", "the oven", "el OR-noh", "🔥"),
    l("el microondas", "the microwave", "el mee-kroh-ON-das", "⏲️"),
    l("el fregadero", "the sink", "el freh-gah-DEH-roh", "🚰"),
    l("el grifo", "the tap", "el GREE-foh", "💧"),
    l("el plato", "the plate", "el PLAH-toh", "🍽️"),
    l("el vaso", "the glass", "el BAH-soh", "🥛"),
    l("la taza", "the mug", "lah TAH-thah", "☕"),
    l("el tenedor", "the fork", "el teh-neh-DOR", "🍴"),
    l("la cuchara", "the spoon", "lah koo-CHAH-rah", "🥄"),
    l("el cuchillo", "the knife", "el koo-CHEE-yoh", "🔪"),
    l("la mesa", "the table", "lah MEH-sah", "🪵"),
    l("la silla", "the chair", "lah SEE-yah", "🪑"),
    l("la basura", "the bin", "lah bah-SOO-rah", "🗑️"),
    l("el reciclaje", "the recycling", "el rreh-thee-KLAH-heh", "♻️"),
  ] },
  { id: "living", es: "El salón", en: "The living room", emoji: "🛋️", labels: [
    l("el sofá", "the sofa", "el soh-FAH", "🛋️"),
    l("la tele", "the TV", "lah TEH-leh", "📺"),
    l("el mando", "the remote", "el MAN-doh", "🎛️"),
    l("la ventana", "the window", "lah ben-TAH-nah", "🪟"),
    l("la lámpara", "the lamp", "lah LAM-pah-rah", "💡"),
    l("la estantería", "the bookshelf", "lah es-tan-teh-REE-ah", "📚"),
    l("el libro", "the book", "el LEE-broh", "📖"),
    l("la alfombra", "the rug", "lah al-FOM-brah", "🟫"),
    l("el reloj", "the clock", "el rreh-LOH", "🕰️"),
    l("la planta", "the plant", "lah PLAN-tah", "🪴"),
    l("el cojín", "the cushion", "el koh-HEEN", "🟦"),
    l("el enchufe", "the plug socket", "el en-CHOO-feh", "🔌"),
  ] },
  { id: "bedroom", es: "El dormitorio", en: "The bedroom", emoji: "🛏️", labels: [
    l("la cama", "the bed", "lah KAH-mah", "🛏️"),
    l("la almohada", "the pillow", "lah al-moh-AH-dah", "😴"),
    l("el armario", "the wardrobe", "el ar-MAH-ryoh", "🚪"),
    l("la ropa", "the clothes", "lah RROH-pah", "👕"),
    l("los zapatos", "the shoes", "los thah-PAH-tos", "👟"),
    l("el pijama", "the pyjamas", "el pee-HAH-mah", "🌙"),
    l("el juguete", "the toy", "el hoo-GEH-teh", "🧸"),
    l("el escritorio", "the desk", "el es-kree-TOH-ryoh", "✏️"),
    l("la mochila", "the school bag", "lah moh-CHEE-lah", "🎒"),
    l("el espejo", "the mirror", "el es-PEH-hoh", "🪞"),
    l("la luz", "the light", "lah looth", "💡"),
    l("la persiana", "the blind", "lah per-SYAH-nah", "🪟"),
  ] },
  { id: "bathroom", es: "El baño", en: "The bathroom", emoji: "🛁", labels: [
    l("la bañera", "the bath", "lah bah-NYEH-rah", "🛁"),
    l("la ducha", "the shower", "lah DOO-chah", "🚿"),
    l("el váter", "the toilet", "el BAH-ter", "🚽"),
    l("el lavabo", "the washbasin", "el lah-BAH-boh", "🚰"),
    l("la toalla", "the towel", "lah toh-AH-yah", "🧺"),
    l("el jabón", "the soap", "el hah-BON", "🧼"),
    l("el cepillo de dientes", "the toothbrush", "el theh-PEE-yoh deh DYEN-tes", "🪥"),
    l("la pasta de dientes", "the toothpaste", "lah PAS-tah deh DYEN-tes", "🦷"),
    l("el champú", "the shampoo", "el cham-POO", "🧴"),
    l("el peine", "the comb", "el PEY-neh", "💇"),
  ] },
  { id: "hall", es: "La entrada", en: "The hall", emoji: "🚪", labels: [
    l("la puerta", "the door", "lah PWER-tah", "🚪"),
    l("las llaves", "the keys", "las YAH-bes", "🔑"),
    l("el abrigo", "the coat", "el ah-BREE-goh", "🧥"),
    l("el paraguas", "the umbrella", "el pah-RAH-gwas", "☂️"),
    l("las escaleras", "the stairs", "las es-kah-LEH-ras", "🪜"),
    l("el timbre", "the doorbell", "el TEEM-breh", "🔔"),
    l("el gorro", "the woolly hat", "el GOH-rroh", "🧢"),
    l("la bufanda", "the scarf", "lah boo-FAN-dah", "🧣"),
  ] },
  { id: "garden", es: "La terraza", en: "The terrace & garden", emoji: "🌿", labels: [
    l("la terraza", "the terrace", "lah teh-RRAH-thah", "🌿"),
    l("el balcón", "the balcony", "el bal-KON", "🏙️"),
    l("la flor", "the flower", "lah flor", "🌸"),
    l("el árbol", "the tree", "el AR-bol", "🌳"),
    l("la pelota", "the ball", "lah peh-LOH-tah", "⚽"),
    l("la bici", "the bike", "lah BEE-thee", "🚲"),
    l("el tendedero", "the clothes airer", "el ten-deh-DEH-roh", "👚"),
    l("la piscina", "the pool", "lah pees-THEE-nah", "🏊"),
  ] },
];

export const ALL_LABELS = LABEL_ROOMS.flatMap(r => r.labels);
