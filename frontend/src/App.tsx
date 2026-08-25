import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import RunPage from "./pages/RunPage";
import Evaluations from "./pages/Evaluations";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-paper dark:bg-dark-paper text-ink dark:text-dark-ink flex transition-colors duration-200">
          <Sidebar />
          <main className="flex-1 min-w-0 overflow-x-hidden pt-12 md:pt-0">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/evaluations" element={<Evaluations />} />
              <Route path="/run/:id" element={<RunPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}
