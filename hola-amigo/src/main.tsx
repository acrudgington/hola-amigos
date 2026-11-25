import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { UpdateBanner } from "./components/UpdateBanner.tsx";
// Fonts are bundled with the app (no requests to Google): better privacy for
// children under EU data protection law (GDPR), and they work offline. Latin subset
// covers Spanish (á é í ó ú ñ ¿ ¡).
import "@fontsource/fredoka/latin-500.css";
import "@fontsource/fredoka/latin-600.css";
import "@fontsource/fredoka/latin-700.css";
import "@fontsource/nunito/latin-600.css";
import "@fontsource/nunito/latin-700.css";
import "@fontsource/nunito/latin-800.css";
import "@fontsource/nunito/latin-900.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import "@fontsource/jetbrains-mono/latin-700.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    {import.meta.env.PROD && <UpdateBanner />}
  </React.StrictMode>,
);
