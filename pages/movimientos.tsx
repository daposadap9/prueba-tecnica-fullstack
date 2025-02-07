import { useState } from 'react'; 
import { gql, useQuery, useMutation } from '@apollo/client';
import { useSession } from 'next-auth/react';

// Consulta para obtener los movimientos del usuario
const GET_MOVEMENTS = gql`
  query GetMovements {
    movements {
      id
      concepto
      monto
      fecha
      tipo
      user {
        id
        name
      }
    }
  }
`;


// Mutación para crear un nuevo movimiento
const CREATE_MOVEMENT = gql`
  mutation CreateMovement($userId: ID!, $concepto: String!, $monto: Float!, $fecha: String!, $tipo: String!) {
    createMovement(userId: $userId, concepto: $concepto, monto: $monto, fecha: $fecha, tipo: $tipo) {
      id
      concepto
      monto
      fecha
      tipo
    }
  }
`;

/**
 * Función auxiliar para parsear la fecha que viene de la base de datos.
 * Si la cadena tiene el formato "YYYY-MM-DD 00:00:00", se reemplaza el espacio por "T"
 * para formar "YYYY-MM-DDT00:00:00" y así se interpreta en hora local.
 */
const parseMovementDate = (fecha: string): Date | null => {
  // Si la cadena contiene '-' y ':' se asume que es una fecha formateada
  if (fecha.includes('-') && fecha.includes(':')) {
    const isoString = fecha.replace(' ', 'T');
    return new Date(isoString);
  }
  // Si no, intentamos convertirla a número (timestamp)
  const timestamp = Number(fecha);
  if (!timestamp || isNaN(timestamp)) return null;
  const adjustedTimestamp = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
  return new Date(adjustedTimestamp);
};

export default function Movimientos() {
  // Estado para controlar la visibilidad de la modal
  const [showModal, setShowModal] = useState(false);
  // Estado para los datos del formulario
  const [formData, setFormData] = useState({
    concepto: '',
    monto: 0,
    fecha: '',
    tipo: 'ingreso', // Por defecto, el tipo es "ingreso"
  });

  // Obtener la sesión del usuario
  const { data: session, status } = useSession();

  if (status === 'loading') return <p>Cargando sesión...</p>;
  if (!session) return <p>No estás autenticado.</p>;

  // Consultar los movimientos del usuario actual con errorPolicy para poder manejar el error manualmente
  const { data, loading, error, refetch } = useQuery(GET_MOVEMENTS)

  // Si hay un error de red y es 400, lo tratamos como "sin movimientos"
  let movimientos: any[] = [];
  if (data && data.movements) {
    movimientos = data.movements;
  } else if (
    error &&
    error.networkError &&
    (error.networkError as any).statusCode === 400
  ) {
    movimientos = [];
  } else if (error) {
    return <p>Error al cargar movimientos: {error.message}</p>;
  }

  // Mutación para crear un nuevo movimiento
  const [createMovement] = useMutation(CREATE_MOVEMENT, {
    onCompleted: () => {
      refetch(); // Refresca la lista de movimientos
      setShowModal(false); // Cierra la modal
      setFormData({ concepto: '', monto: 0, fecha: '', tipo: 'ingreso' }); // Reinicia el formulario
    },
  });

  // Actualiza el estado del formulario al cambiar un input o select
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Maneja el envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    // Convertir monto a número
    const montoNumber = typeof formData.monto === "string" ? parseFloat(formData.monto) : formData.monto;
  
    // Convertir fecha al formato ISO-8601 (asegurándonos de que se interprete como local)
    // Si formData.fecha viene del input type="date" (YYYY-MM-DD), se puede agregar la hora "T00:00:00"
    const fechaISO = new Date(formData.fecha + "T00:00:00").toISOString();
  
    const formDataParsed = {
      ...formData,
      monto: montoNumber,
      fecha: fechaISO,
    };
  
    try {
      await createMovement({
        variables: {
          userId: session.user.id,
          ...formDataParsed,
        },
      });
    } catch (err) {
      console.error('Error al crear movimiento:', err);
    }
  };

  if (loading) return <p>Cargando movimientos...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Movimientos</h1>

      {/* Botón + para abrir la modal de creación (solo para administradores) */}
      {session.user.role === 'admin' && (
        <button
          onClick={() => setShowModal(true)}
          className="mb-4 px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
        >
          +
        </button>
      )}

      {/* Si no hay movimientos, se muestra un mensaje */}
      {movimientos.length === 0 ? (
        <p>No hay movimientos</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 border-b">Concepto</th>
                <th className="px-4 py-2 border-b">Monto</th>
                <th className="px-4 py-2 border-b">Fecha</th>
                <th className="px-4 py-2 border-b">Tipo</th>
                <th className="px-4 py-2 border-b">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((movement) => (
                <tr key={movement.id}>
                  <td className="px-4 py-2 border-b">{movement.concepto}</td>
                  <td className="px-4 py-2 border-b">${movement.monto.toFixed(2)}</td>
                  <td className="px-4 py-2 border-b">
                    {(() => {
                      const dateObj = parseMovementDate(movement.fecha);
                      return dateObj ? dateObj.toLocaleDateString() : "Fecha no válida";
                    })()}
                  </td>
                  <td className="px-4 py-2 border-b">{movement.tipo}</td>
                  <td className="px-4 py-2 border-b">{movement.user ? movement.user.name : 'Sin usuario'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para crear un nuevo movimiento */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-semibold mb-4">Nuevo Movimiento</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700">Concepto</label>
                <input
                  type="text"
                  name="concepto"
                  value={formData.concepto}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700">Monto</label>
                <input
                  type="number"
                  name="monto"
                  value={formData.monto}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700">Fecha</label>
                <input
                  type="date"
                  name="fecha"
                  value={formData.fecha}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Tipo</label>
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  required
                >
                  <option value="ingreso">Ingreso</option>
                  <option value="egreso">Egreso</option>
                </select>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="mr-2 px-4 py-2 bg-gray-300 text-black rounded-md hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
