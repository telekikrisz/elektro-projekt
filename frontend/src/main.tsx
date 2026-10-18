import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Adatlap } from "./Adatlap";
import { Belepes } from "./Belepes";
import { Jelszo } from "./Jelszo";
import { Kereso } from "./Kereso";
import { Tanar } from "./Tanar";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Kereso />} />
        <Route path="/belepes" element={<Belepes />} />
        <Route path="/jelszo" element={<Jelszo />} />
        <Route path="/tanar" element={<Tanar />} />
        <Route path="/alkatresz/:id" element={<Adatlap />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
