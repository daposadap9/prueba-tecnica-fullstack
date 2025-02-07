import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Usuarios from './usuarios';
import Movimientos from './movimientos';
import Reportes from './reportes';

export default function Home() {
  const { data: session, status } = useSession();
  // Valor por defecto "usuarios" (para admin); se actualizará en el useEffect
  const [activeTab, setActiveTab] = useState('usuarios');

  // Cuando se cargue la sesión, se ajusta la pestaña activa según el rol
  useEffect(() => {
    if (session) {
      if (session.user?.role !== 'admin') {
        setActiveTab('movimientos');
      } else {
        setActiveTab('usuarios');
      }
    }
  }, [session]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg text-gray-600 animate-pulse">Cargando...</p>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut({ redirect: false });
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-gradient-to-br from-blue-400 to-indigo-600 p-6">
      <div className="bg-white max-w-4xl mx-auto w-full h-full shadow-lg rounded-lg flex flex-col">
        {session ? (
          <>
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <div className="flex items-center gap-4">
                {session.user?.image ? (
                  <img
                    src={session.user.image}
                    alt="Avatar del usuario"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300" />
                )}
                <h2 className="text-xl font-semibold text-gray-700">
                  Bienvenido, <span className="text-indigo-600">{session.user?.email}</span>
                </h2>
              </div>
              <button
                onClick={handleSignOut}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow-md transition-transform transform hover:scale-105"
              >
                Cerrar sesión
              </button>
            </div>

            {/* Tabs */}
            <div className="flex justify-center space-x-2 mt-2 px-4">
              {session.user?.role === 'admin' && (
                <button
                  className={`p-3 flex-1 text-center rounded-t-lg transition-all duration-200 shadow-md
                    ${activeTab === 'usuarios' ? 'bg-blue-600 text-white scale-105' : 'bg-gray-200 text-gray-700'}`}
                  onClick={() => setActiveTab('usuarios')}
                >
                  Usuarios
                </button>
              )}
              <button
                className={`p-3 flex-1 text-center rounded-t-lg transition-all duration-200 shadow-md
                    ${activeTab === 'movimientos' ? 'bg-blue-600 text-white scale-105' : 'bg-gray-200 text-gray-700'}`}
                onClick={() => setActiveTab('movimientos')}
              >
                Movimientos y Gastos
              </button>
              {session.user?.role === 'admin' && (
                <button
                  className={`p-3 flex-1 text-center rounded-t-lg transition-all duration-200 shadow-md
                    ${activeTab === 'reportes' ? 'bg-blue-600 text-white scale-105' : 'bg-gray-200 text-gray-700'}`}
                  onClick={() => setActiveTab('reportes')}
                >
                  Reportes
                </button>
              )}
            </div>

            {/* Contenido */}
            <div className="flex-grow p-6 overflow-auto">
              {activeTab === 'usuarios' && <Usuarios />}
              {activeTab === 'movimientos' && <Movimientos />}
              {activeTab === 'reportes' && <Reportes />}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center flex-grow">
            <h2 className="text-xl font-semibold text-gray-700">No estás autenticado</h2>
            <button
              onClick={() => signIn('auth0', { prompt: 'none' })}
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md transition-transform transform hover:scale-105"
            >
              Iniciar sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
