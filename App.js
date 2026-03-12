import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TranscriberPage } from "./pages/TranscriberPage";
import { HistoryPage } from "./pages/HistoryPage";

function App() {
  return (
    <ThemeProvider>
      <div className="App min-h-screen bg-background text-foreground">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<TranscriberPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </BrowserRouter>
        <Toaster 
          position="bottom-right"
          toastOptions={{
            className: 'glass border border-border/50',
          }}
        />
      </div>
    </ThemeProvider>
  );
}

export default App;
