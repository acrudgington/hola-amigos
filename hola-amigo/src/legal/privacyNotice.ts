// The privacy notice & short terms, in English and Castilian Spanish.
//
// This file is the single source of truth: the app shows it (PrivacyNotice.tsx)
// and `npm run legal:export` writes the review copies in legal/*.md from it.
// Written for Spain: EU GDPR (RGPD) + Ley Orgánica 3/2018 (LOPDGDD).
// DRAFT until reviewed; fill in PRIVACY.controller in src/config.ts.
//
// Markup: **bold**. A block is a paragraph (string) or a bulleted list (string[]).
import { APP, PRICING, PRIVACY, formatPrice } from "../config.ts";

export type LegalLang = "en" | "es";
export type Block = string | string[];
export interface Section { title: string; blocks: Block[] }
export interface NoticeText {
  title: string;
  version: string;
  draft: string;
  close: string;
  sections: Section[];
}

export function privacyNotice(lang: LegalLang, { cloud }: { cloud: boolean }): NoticeText {
  const c = PRIVACY.controller;
  const email = PRIVACY.contactEmail;
  const app = APP.name;

  if (lang === "es") {
    const monthly = formatPrice(PRICING.plans[0].price, "es-ES");
    const yearly = formatPrice(PRICING.plans[1].price, "es-ES");
    return {
      title: "Aviso de privacidad y condiciones",
      version: `Versión ${PRIVACY.version}`,
      draft: "Borrador pendiente de revisión antes del lanzamiento.",
      close: "Entendido",
      sections: [
        { title: "Quiénes somos", blocks: [
          `${app} es un servicio de **${c.name}** (NIF/NIE ${c.taxId}), ${c.address}. Somos los responsables del tratamiento de los datos personales que se describen aquí. Puedes escribirnos cuando quieras a **${email}**.`,
        ] },
        { title: "A quién va dirigido", blocks: [
          `${app} es un curso de español para niños, creado y gestionado por un padre, madre o tutor legal mayor de 18 años. Los niños no tienen cuentas, contraseñas ni correo electrónico propios. En España, los menores de 14 años no pueden dar su consentimiento para el tratamiento de sus datos, por eso solo trabajamos con el padre, la madre o el tutor legal, que lo da en su nombre al registrarse.`,
        ] },
        { title: "Qué datos guardamos", blocks: [[
          `**Sobre ti (la persona adulta):** tu nombre, tu correo electrónico y tu contraseña${cloud ? " (las contraseñas las gestiona Google Firebase Authentication; nosotros nunca las vemos)" : " (guardada cifrada solo en este dispositivo)"}, y la fecha y la versión de este aviso que aceptaste.`,
          "**Sobre cada niño o niña:** solo el nombre o apodo que escribas, el dibujo de animal que elijas y su progreso de aprendizaje (estrellas, palabras practicadas, rachas e insignias).",
          "**No** recogemos fotos, grabaciones de voz, ubicación, contactos, colegio ni fecha de nacimiento de los niños.",
          "**En tu dispositivo:** la aplicación guarda tus ajustes y una copia de tu progreso en el almacenamiento del navegador para poder funcionar sin conexión. Es imprescindible para que la aplicación funcione; no usamos cookies ni ninguna otra tecnología para hacer seguimiento ni publicidad.",
        ]] },
        { title: "Para qué los usamos y con qué base legal", blocks: [[
          "**Para prestarte el curso que has contratado:** tu cuenta, el progreso de cada niño, la sincronización entre dispositivos y los correos del servicio, como confirmar tu dirección o restablecer tu contraseña. Base legal: la ejecución del contrato contigo (artículo 6.1.b del RGPD). Eres tú quien añade a cada niño, como su padre, madre o tutor legal.",
          "**Para que el servicio sea seguro y funcione bien**, por ejemplo, bloqueando intentos repetidos con una contraseña incorrecta. Base legal: nuestro interés legítimo en ofrecer un servicio seguro (artículo 6.1.f del RGPD).",
          "**No** usamos los datos de nadie para publicidad, elaboración de perfiles ni venta, y no te enviaremos correos comerciales salvo que nos lo pidas expresamente.",
        ]] },
        { title: "El micrófono", blocks: [
          "El juego «Say It!» 🎤 (¡Dilo!) usa el reconocimiento de voz que incorpora tu navegador para comprobar la pronunciación. Nunca grabamos ni guardamos la voz de tu hijo o hija. Algunos navegadores (por ejemplo, Chrome) envían el audio a la empresa del navegador (como Google) para convertir la voz en texto, según sus propias condiciones de privacidad. Puedes saltarte este juego cuando quieras.",
        ] },
        { title: "Dónde se guardan y quién nos ayuda", blocks: cloud ? [[
          `Los datos de las familias (los niños y su progreso) se guardan en Google Cloud Firestore en **${PRIVACY.dataLocation.es}**, con una copia en cada uno de tus dispositivos para que las lecciones funcionen sin conexión.`,
          "El inicio de sesión (tu correo y tu contraseña) lo gestiona Google Firebase Authentication, que puede tratar estos datos fuera de la UE, incluido Estados Unidos.",
          "La aplicación se sirve a través de nuestro proveedor de alojamiento web, Vercel, que trata datos técnicos como tu dirección IP para enviarte la web y protegerla de ataques, y puede hacerlo fuera de la UE.",
          "Google y Vercel actúan como encargados del tratamiento, solo siguiendo nuestras instrucciones y con contratos de encargo del tratamiento. Cuando los datos salen de la UE, están protegidos por las garantías aprobadas por la Comisión Europea (el Marco de Privacidad de Datos UE-EE. UU. y/o las cláusulas contractuales tipo).",
        ]] : [
          "Todo se guarda solo en este dispositivo. Si borras los datos del navegador, se eliminan. La aplicación se sirve a través de nuestro proveedor de alojamiento web, Vercel, que trata datos técnicos como tu dirección IP para enviarte la web.",
        ] },
        { title: "Cuánto tiempo los conservamos", blocks: [
          "Mientras tengas una cuenta. Cuando eliminas tu cuenta (o el perfil de un niño), se borra de nuestra base de datos en ese momento; las copias que puedan quedar en las copias de seguridad de nuestros proveedores se eliminan según sus plazos habituales de borrado. Cuando empiecen los planes de pago, conservaremos los datos de facturación durante el tiempo que exija la normativa fiscal española.",
        ] },
        { title: "Lo que nunca hacemos", blocks: [[
          "Nada de anuncios, nada de seguimiento, nada de vender ni ceder datos a nadie para sus propios fines.",
          "Sin chat, mensajes, perfiles públicos ni contacto con desconocidos.",
          "Sin notificaciones insistentes ni trucos para que los niños sigan jugando. Las rachas y las recompensas son suaves y opcionales.",
          "Las fuentes, las voces y las imágenes se sirven desde la propia aplicación, no desde webs de terceros.",
        ]] },
        { title: "Tus derechos", blocks: [[
          "Puedes pedirnos **acceder** a los datos de tu familia, **rectificarlos**, **suprimirlos** o **limitar** su uso, **oponerte** a cómo los usamos o recibirlos en un formato **portable**.",
          "Puedes **descargar** todo lo que guardamos y **eliminar** tu cuenta de forma definitiva cuando quieras, desde el panel para adultos.",
          `Para cualquier otra cosa, escribe a **${email}**. Es gratuito y te responderemos en el plazo de un mes.`,
          `Si no estás conforme con cómo tratamos tus datos, puedes presentar una reclamación ante la ${PRIVACY.authority.name}, ${PRIVACY.authority.site}.`,
        ]] },
        { title: "Planes", blocks: [
          `El primer mundo es gratuito. El acceso completo cuesta ${monthly} al mes o ${yearly} al año; puedes cancelarlo cuando quieras.`,
        ] },
        { title: "Condiciones en resumen", blocks: [
          `Usa ${app} para el aprendizaje de tu propia familia, mantén tu contraseña en privado y sé la persona adulta responsable del uso que haga tu hijo o hija. Podemos actualizar este aviso; si cambia algo importante, te lo diremos y te pediremos que lo aceptes de nuevo.`,
        ] },
      ],
    };
  }

  const monthly = formatPrice(PRICING.plans[0].price, "en-GB");
  const yearly = formatPrice(PRICING.plans[1].price, "en-GB");
  return {
    title: "Privacy notice & terms",
    version: `Version ${PRIVACY.version}`,
    draft: "Draft for review before launch.",
    close: "Got it",
    sections: [
      { title: "Who we are", blocks: [
        `${app} is run by **${c.name}** (NIF/NIE ${c.taxId}), ${c.address}. We are responsible for (the “controller” of) the personal data described here. Contact us any time at **${email}**.`,
      ] },
      { title: "Who this is for", blocks: [
        `${app} is a Spanish course for children, set up and managed by a parent or guardian aged 18 or over. Children don’t have their own accounts, logins or email addresses. In Spain, children under 14 can’t consent to the use of their data themselves, so we only work with a parent or guardian, who agrees on their behalf when signing up.`,
      ] },
      { title: "What we keep", blocks: [[
        `**About you (the grown-up):** your name, email address and password${cloud ? " (passwords are handled by Google Firebase Authentication; we never see them)" : " (stored scrambled on this device only)"}, and the date and version of this notice you agreed to.`,
        "**About each child:** only the first name or nickname you type, the animal picture you choose, and their learning progress (stars, words practised, streaks and badges).",
        "We do **not** collect children’s photos, voice recordings, location, contacts, school or date of birth.",
        "**On your device:** the app saves your settings and a copy of your progress in the browser’s storage so it works offline. This is essential for the app to work; we don’t use cookies or anything else for tracking or advertising.",
      ]] },
      { title: "Why we use it, and our legal basis", blocks: [[
        "**To provide the course you signed up for:** your account, each child’s progress, syncing between devices, and service emails such as confirming your address or resetting your password. Legal basis: our contract with you (GDPR article 6.1.b). You choose to add each child as their parent or guardian.",
        "**To keep the service safe and working**, for example blocking repeated wrong passwords. Legal basis: our legitimate interest in running a secure service (article 6.1.f).",
        "We do **not** use anyone’s data for advertising, profiling or selling, and we won’t send marketing emails unless you separately ask for them.",
      ]] },
      { title: "The microphone", blocks: [
        "The “Say It!” 🎤 game uses your browser’s built-in speech recognition to check pronunciation. We never record or store your child’s voice. Some browsers (for example Chrome) send the audio to the browser maker (such as Google) to turn speech into text, under that company’s own privacy terms. You can skip this game at any time.",
      ] },
      { title: "Where it’s stored and who helps us", blocks: cloud ? [[
        `Families’ data (children and progress) is stored in Google Cloud Firestore in **${PRIVACY.dataLocation.en}**, with a copy on each of your devices so lessons work offline.`,
        "Logins (your email and password) are handled by Google Firebase Authentication, which may process them outside the EU, including in the United States.",
        "The app is delivered by our web host, Vercel, which handles technical details such as your IP address to send you the website and protect it from attacks, and may do so outside the EU.",
        "Google and Vercel act only on our instructions under data processing agreements. Where data leaves the EU, it is protected by the European Commission’s approved safeguards (the EU–US Data Privacy Framework and/or Standard Contractual Clauses).",
      ]] : [
        "Everything is stored on this device only. Clearing the browser’s data deletes it. The app is delivered by our web host, Vercel, which handles technical details such as your IP address to send you the website.",
      ] },
      { title: "How long we keep it", blocks: [
        "For as long as you have an account. When you delete your account (or a child’s profile), it is removed from our database straight away; any remaining copies in our providers’ backups are erased in line with their standard deletion periods. When paid plans start, we’ll keep billing records for as long as Spanish tax law requires.",
      ] },
      { title: "What we never do", blocks: [[
        "No adverts, no tracking, no selling or sharing data with anyone for their own purposes.",
        "No chat, messaging, public profiles or contact with strangers.",
        "No pushy notifications or tricks to keep children playing. Streaks and rewards are gentle and optional.",
        "Fonts, voices and pictures are served from the app itself, not third-party sites.",
      ]] },
      { title: "Your rights", blocks: [[
        "You can ask to **see**, **correct**, **delete** or **restrict** the use of your family’s data, **object** to how we use it, or receive it in a **portable** format.",
        "**Download** everything we hold and **delete** your account permanently, any time, from the grown-up dashboard.",
        `For anything else, email **${email}**. It’s free, and we’ll reply within one month.`,
        `If you’re unhappy with how we handle your data, you can complain to the ${PRIVACY.authority.name}, ${PRIVACY.authority.site}.`,
      ]] },
      { title: "Plans", blocks: [
        `The first world is free. Full access costs ${monthly} a month or ${yearly} a year; you can cancel any time.`,
      ] },
      { title: "Terms in short", blocks: [
        `Please use ${app} for your own family’s learning, keep your password private, and be the grown-up in charge of your child’s use. We may update this notice; if anything important changes we’ll tell you and ask you to agree again.`,
      ] },
    ],
  };
}

// "a **b** c" → [{text:"a "}, {text:"b", bold:true}, {text:" c"}]
export function parseBold(text: string): { text: string; bold: boolean }[] {
  return text.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(part =>
    part.startsWith("**") && part.endsWith("**") ? { text: part.slice(2, -2), bold: true } : { text: part, bold: false });
}

export function noticeToMarkdown(n: NoticeText): string {
  const out = [`# ${n.title}`, "", `**${n.version}** · ${n.draft}`, ""];
  for (const s of n.sections) {
    out.push(`## ${s.title}`, "");
    for (const b of s.blocks) {
      if (typeof b === "string") out.push(b, "");
      else { out.push(...b.map(item => `- ${item}`), ""); }
    }
  }
  return out.join("\n");
}
