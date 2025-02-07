import { useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import EditUserModal from './EditUserModal'; // Asegúrate de que la ruta sea correcta

const GET_USERS = gql`
  query GetUsers {
    users {
      id
      name
      email
      image
      phone
      role
    }
  }
`;

export default function UserList({ userRole }: { userRole?: string }) {
  const { data, loading, error, refetch } = useQuery(GET_USERS);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  if (loading)
    return (
      <p className="text-center text-lg font-semibold text-gray-600 animate-pulse">
        Cargando...
      </p>
    );

  if (error)
    return (
      <p className="text-center text-red-500 font-semibold">
        Error: {error.message}
      </p>
    );

  const handleEdit = (user: any) => {
    setSelectedUser(user);
  };

  const closeModal = () => {
    setSelectedUser(null);
  };

  return (
    // Contenedor principal centrado horizontalmente con un ancho máximo
    <div className="max-w-6xl mx-auto p-6 bg-white shadow-2xl rounded-2xl">
      <h2 className="text-2xl font-extrabold text-center mb-6 text-gray-800">
        Lista de Usuarios
      </h2>

      {/* Contenedor para la tabla */}
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-blue-600 text-white text-left">
            <tr>
              <th className="p-4">Nombre</th>
              <th className="p-4">Email</th>
              <th className="p-4">Teléfono</th>
              <th className="p-4">Rol</th>
              {userRole === 'admin' && (
                <th className="p-4 text-center">Acciones</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data?.users?.map((user: any) => (
              <tr key={user.id}>
                <td className="p-4">{user.name}</td>
                <td className="p-4">{user.email}</td>
                <td className="p-4">{user.phone}</td>
                <td className="p-4">{user.role}</td>
                {userRole === 'admin' && (
                  <td className="p-4 flex justify-center gap-4">
                    <button
                      onClick={() => handleEdit(user)}
                      className="bg-yellow-400 text-white px-4 py-2 rounded-lg"
                    >
                      ✏️ Editar
                    </button>
                    <button className="bg-red-500 text-white px-4 py-2 rounded-lg">
                      🗑️ Eliminar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={closeModal}
          refetchUsers={refetch}
        />
      )}
    </div>
  );
}
