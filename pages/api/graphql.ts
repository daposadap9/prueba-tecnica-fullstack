import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { gql } from 'graphql-tag';
import { Movement, PrismaClient, User } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { updateUserInAuth0, assignRolesToUser, getManagementApiToken } from './auth/auth0Utils'; // Ajusta la ruta si es necesario

const prisma = new PrismaClient();

// ===================
// Interfaces para argumentos
// ===================
interface UserArgs {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
}

interface CreateUserInput {
  name: string;
  email: string;
  image?: string;
  phone: string;
  role: string;
}

interface UpdateUserInput {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  phone?: string;
  role?: string;
}

// ===================
// Esquema GraphQL
// ===================

/* 
  Se eliminó el parámetro "id" en la mutación createUser ya que 
  Prisma se encargará de generar el id automáticamente y se guardará 
  el id de Auth0 en el campo "auth0Id".
*/
const typeDefs = gql`
  type Query {
    users: [User!]!
    user(id: ID!): User
    movements: [Movement!]!
  }

  type Mutation {
    createUser(
      name: String!,
      email: String!,
      image: String,
      phone: String!,
      role: String!
    ): User!
    updateUser(
      id: ID!,
      name: String,
      email: String,
      image: String,
      phone: String,
      role: String
    ): User!
    deleteUser(id: ID!): User!
    createMovement(
      userId: ID!,
      concepto: String!,
      monto: Float!,
      fecha: String!,
      tipo: String!
    ): Movement!
  }

  type User {
    id: ID!
    auth0Id: String
    name: String
    email: String!
    emailVerified: String
    image: String
    phone: String
    role: String!
    createdAt: String!
    updatedAt: String!
  }

  type Movement {
    id: ID!
    concepto: String!
    monto: Float!
    fecha: String!
    tipo: String!
    user: User
  }
`;

// ===================
// Contexto y función auxiliar para protección (requireAuth)
// ===================
interface Context {
  session?: {
    user: {
      id: string;
      role: string;
    };
  };
}

/**
 * Verifica que exista la sesión; en caso contrario lanza un error.
 */
const requireAuth = (context: Context): { id: string; role: string } => {
  if (!context.session) {
    throw new Error('No autenticado');
  }
  return context.session.user;
};

// ===================
// Resolvers con RBAC y llamadas a Auth0
// ===================
const resolvers = {
  Query: {
    users: async (_: any, __: any, context: Context): Promise<User[]> => {
      requireAuth(context);
      return await prisma.user.findMany();
    },
    user: async (_: any, { id }: UserArgs, context: Context): Promise<User | null> => {
      requireAuth(context);
      return await prisma.user.findUnique({ where: { id } });
    },
    movements: async (_: any, __: any, context: Context): Promise<Movement[]> => {
      // Se requiere autenticación, pero se muestran TODOS los movimientos para todos los usuarios.
      requireAuth(context);
      return await prisma.movement.findMany({
        include: { user: true },
      });
    },
  },
  Mutation: {
    createUser: async (
      _: any,
      { name, email, image, phone, role }: CreateUserInput,
      context: Context
    ): Promise<User> => {
      requireAuth(context);

      // Determinar el rol final basado en la autenticación
      let finalRole =
        role === 'admin' && context.session!.user.role === 'admin'
          ? 'admin'
          : 'user';

      try {
        // Obtener el token dinámicamente desde el método getManagementApiToken
        const token = await getManagementApiToken();

        // Crear usuario en Auth0
        const auth0Response = await fetch(
          `https://${process.env.AUTH0_ISSUER}/api/v2/users`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`, // Usamos el token dinámico
            },
            body: JSON.stringify({
              email,
              name,
              password: Math.random().toString(36).slice(-8), // Contraseña aleatoria
              connection: 'Username-Password-Authentication',
            }),
          }
        );

        if (!auth0Response.ok) {
          throw new Error('Error al crear usuario en Auth0');
        }

        const auth0User = await auth0Response.json();

        if (!auth0User.user_id) {
          throw new Error('No se obtuvo un user_id válido de Auth0');
        }
        console.log('Auth0 User ID:', auth0User.user_id);

        // Crear el usuario en Prisma (el id se genera automáticamente)
        // Guardamos el id de Auth0 en el campo auth0Id
        const newUser = await prisma.user.create({
          data: {
            auth0Id: auth0User.user_id,
            name,
            email,
            image,
            phone,
            role: finalRole,
            emailVerified: null, // Puedes actualizarlo si lo necesitas más adelante
          },
        });

        // Asignar rol en Auth0
        const roleId =
          finalRole === 'admin'
            ? process.env.AUTH0_ROLE_ADMIN
            : process.env.AUTH0_ROLE_USER;

        if (roleId) {
          await assignRolesToUser(auth0User.user_id, [roleId]);
        }

        return newUser;
      } catch (err) {
        console.error('Error al sincronizar con Auth0:', err);
        throw new Error('Error al crear usuario');
      }
    },
    updateUser: async (
      _: any,
      { id, name, email, image, phone, role }: UpdateUserInput,
      context: Context
    ): Promise<User> => {
      requireAuth(context);

      if (role && context.session!.user.role !== 'admin') {
        throw new Error('No autorizado a cambiar el rol');
      }

      const data: Partial<UpdateUserInput> = {
        name,
        email,
        image,
        phone,
        role,
      };

      const updatedUser = await prisma.user.update({ where: { id }, data });

      try {
        // Usar auth0Id para actualizar el usuario en Auth0 (si está disponible)
        if (updatedUser.auth0Id) {
          await updateUserInAuth0(updatedUser.auth0Id, { email, name });
        } else {
          console.warn(
            'No se encontró auth0Id para el usuario, omitiendo actualización en Auth0'
          );
        }

        // Actualiza el rol en Auth0 si es necesario
        if (role !== undefined && updatedUser.auth0Id) {
          const roleId =
            role === 'admin'
              ? process.env.AUTH0_ROLE_ADMIN
              : process.env.AUTH0_ROLE_USER;

          if (roleId) {
            await assignRolesToUser(updatedUser.auth0Id, [roleId]);
          }
        }
      } catch (err) {
        console.error('Error al sincronizar con Auth0:', err);
      }
      return updatedUser;
    },
    deleteUser: async (_: any, { id }: UserArgs, context: Context): Promise<User> => {
      requireAuth(context);
      if (context.session!.user.role !== 'admin') {
        throw new Error('Solo administradores pueden eliminar usuarios');
      }
      return await prisma.user.delete({ where: { id } });
    },
    createMovement: async (
      _: any,
      { userId, concepto, monto, fecha, tipo }: { userId: string; concepto: string; monto: any; fecha: string; tipo: string },
      context: Context
    ): Promise<Movement> => {
      requireAuth(context);
      if (context.session!.user.role !== 'admin' && context.session!.user.id !== userId) {
        throw new Error('No autorizado para crear movimientos para otros usuarios');
      }
      const montoFloat = parseFloat(monto);
      if (isNaN(montoFloat)) {
        throw new Error('El monto debe ser un número válido.');
      }
      return await prisma.movement.create({
        data: {
          userId,
          concepto,
          monto: montoFloat,
          fecha,
          tipo,
        },
      });
    },
  },
};

export const schema = makeExecutableSchema({ typeDefs, resolvers });

const server = new ApolloServer({ schema });

// Se obtiene la sesión mediante getServerSession y se incluye en el contexto
export default startServerAndCreateNextHandler(server, {
  context: async (req, res) => {
    const session = await getServerSession(req, res, authOptions);
    return { session };
  },
});
