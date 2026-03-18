import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { AuthInit } from "@/components/AuthInit";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Discover from "./pages/Discover";
import Results from "./pages/Results";
import Configure from "./pages/Configure";
import Evaluation from "./pages/Evaluation";
import NotFound from "./pages/NotFound";

const App = () => (
  <ErrorBoundary>
    <TooltipProvider>
      <AuthInit>
        <Toaster />
        <Sonner />
        <Routes>
      <Route path="/" element={<Discover />} />
      <Route path="/results" element={<Results />} />
      <Route path="/configure" element={<Configure />} />
      <Route path="/evaluation" element={<Evaluation />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
      </AuthInit>
    </TooltipProvider>
  </ErrorBoundary>
);

export default App;
