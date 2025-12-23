import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import Index from "./pages/Index";
import Products from "./pages/Products";
import Clients from "./pages/Clients";
import Expenses from "./pages/Expenses";
import Users from "./pages/Users";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Transactions from "./pages/Transactions";
import Financial from "./pages/Financial";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/produtos" element={<ProtectedRoute><Products /></ProtectedRoute>} />
          <Route path="/clientes" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
          <Route path="/despesas" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
          <Route path="/transacoes" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
          <Route path="/financeiro" element={<ProtectedRoute><Financial /></ProtectedRoute>} />
          <Route path="/usuarios" element={<ProtectedRoute><Users /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

