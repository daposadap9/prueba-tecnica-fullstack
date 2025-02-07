import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

// Asumiendo que tu API GraphQL está en la ruta /api/graphql
const httpLink = new HttpLink({
  uri: '/api/graphql',
  // Opcionalmente, incluye credenciales para enviar cookies (para NextAuth)
  credentials: 'same-origin',
});

export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});
