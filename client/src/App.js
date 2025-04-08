import React from 'react';
import { Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import './lightTheme.css'; // Importar estilos para el tema claro

// Layouts
import MainLayout from './layouts/MainLayout';
import PublicLayout from './layouts/PublicLayout';

// Pages
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import PDFAnalysis from './pages/PDFAnalysis';
import Login from './pages/Login';
import Feedback from './pages/Feedback';
import FeedbackForm from './pages/FeedbackForm';
import FeedbackDetail from './pages/FeedbackDetail';
import FeedbackResponse from './pages/FeedbackResponse';
import Questions from './pages/Questions';
import Employees from './pages/Employees';
import Companies from './pages/Companies';
import Categories from './pages/Categories';

// Components
import ProtectedRoute from './components/ProtectedRoute';

// Contexts
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/auth/login" element={<Login />} />
        <Route path="/feedback/form/:token" element={<FeedbackResponse />} />

        {/* Rutas protegidas */}
        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout>
              <Home />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/feedback" element={
          <ProtectedRoute>
            <MainLayout>
              <Feedback />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/feedback/new" element={
          <ProtectedRoute>
            <MainLayout>
              <FeedbackForm />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/feedback/edit/:id" element={
          <ProtectedRoute>
            <MainLayout>
              <FeedbackForm />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/feedback/:id" element={
          <ProtectedRoute>
            <MainLayout>
              <FeedbackDetail />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/employees" element={
          <ProtectedRoute>
            <MainLayout>
              <Employees />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/questions" element={
          <ProtectedRoute>
            <MainLayout>
              <Questions />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/companies" element={
          <ProtectedRoute>
            <MainLayout>
              <Companies />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/categories" element={
          <ProtectedRoute>
            <MainLayout>
              <Categories />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/supervision" element={
          <ProtectedRoute>
            <MainLayout>
              <PDFAnalysis />
            </MainLayout>
          </ProtectedRoute>
        } />

        {/* Ruta para páginas no encontradas */}
        <Route path="*" element={
          <MainLayout>
            <NotFound />
          </MainLayout>
        } />
      </Routes>
    </AuthProvider>
  );
}

export default App;
