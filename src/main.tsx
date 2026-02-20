import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";  // ← Back to BrowserRouter
import App from "./App.tsx";
import "./index.css";
import './styles/globals.css';

console.log('🔍 main.tsx - Starting React app');

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

console.log('🔍 main.tsx - React render called');