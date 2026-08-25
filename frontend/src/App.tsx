import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import RunPage from "./pages/RunPage";
import Evaluations from "./pages/Evaluations";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-paper text-ink flex">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/evaluations" element={<Evaluations />} />
            <Route path="/run/:id" element={<RunPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
