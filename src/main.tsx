import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import Letterboxed from "./games/Letterboxed";
import { BrowserRouter, Routes, Route } from "react-router-dom";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/letterboxed" element={<Letterboxed />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
