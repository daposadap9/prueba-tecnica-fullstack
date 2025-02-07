// pages/usuarios.tsx
import UserList from '@/components/ui/UserList';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

export default function Usuarios() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') return <p>Cargando...</p>;

  if (!session || session.user.role !== 'admin') {
    router.push('/'); // redirige si no es admin
    return null;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
      <UserList userRole={session.user.role}/>
    </div>
  );
}
