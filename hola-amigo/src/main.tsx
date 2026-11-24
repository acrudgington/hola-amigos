import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { UpdateBanner } from "./components/UpdateBanner.tsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    {import.meta.env.PROD && <UpdateBanner />}
  </React.StrictMode>,
);
