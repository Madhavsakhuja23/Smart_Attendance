import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "./context/ToastContext.jsx";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
    <BrowserRouter>
        <ToastProvider>
            <App />
        </ToastProvider>
    </BrowserRouter>
);