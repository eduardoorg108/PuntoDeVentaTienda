import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Inicio from './pages/Inicio';
import Vender from './pages/Vender';
import Productos from './pages/Productos';
import Estadisticas from './pages/Estadisticas';
import Proveedores from './pages/Proveedores';
import Corte from './pages/Corte';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/inicio" element={<Inicio />} />
            <Route path="/vender" element={<Vender />} />
            <Route path="/productos" element={<Productos />} />
            <Route path="/estadisticas" element={<Estadisticas />} />
            <Route path="/proveedores" element={<Proveedores />} />
            <Route path="/corte" element={<Corte />} />
          </Route>

          <Route path="*" element={<Navigate to="/vender" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}