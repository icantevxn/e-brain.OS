import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import EBrainOS from "./EBrainOS.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <EBrainOS />
  </StrictMode>
);
