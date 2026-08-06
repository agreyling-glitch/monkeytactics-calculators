import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QrStudio } from "./components/QrStudio";
import "./styles/qr-studio.css";

const root = document.getElementById("qr-studio-root");
if (root) createRoot(root).render(<StrictMode><QrStudio /></StrictMode>);
