import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';

const UPDATE_USER = gql`
  mutation UpdateUser($id: ID!, $name: String, $email: String, $image: String, $phone: String, $role: String) {
    updateUser(id: $id, name: $name, email: $email, image: $image, phone: $phone, role: $role) {
      id
      name
      email
      image
      phone
      role
    }
  }
`;

interface EditUserModalProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
    phone: string;
    role: string;
  };
  onClose: () => void;
  refetchUsers: () => void;
}

export default function EditUserModal({ user, onClose, refetchUsers }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    image: user.image || '',
    phone: user.phone || '',
    role: user.role || '',
  });

  const [updateUser, { loading, error }] = useMutation(UPDATE_USER);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUser({
        variables: {
          id: user.id,
          ...formData,
        },
      });
      // Aquí podrías agregar una llamada para actualizar el usuario en Auth0 usando la Management API, si fuera necesario.
      onClose();
      refetchUsers();
    } catch (err) {
      console.error("Error updating user:", err);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">Editar Usuario</h3>
        {error && <p className="text-red-500 mb-2">{error.message}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700">Nombre</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              required
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              required
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700">Imagen (URL)</label>
            <input
              type="text"
              name="image"
              value={formData.image}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              placeholder="URL de la imagen"
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700">Teléfono</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Rol</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              required
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
