import { SessionProvider } from 'next-auth/react';
import { ApolloProvider } from '@apollo/client';
import { apolloClient } from '../lib/apolloClient';
import '../styles/globals.css';

function MyApp({ Component, pageProps: { session, ...pageProps } }: any) {
  return (
    <SessionProvider session={session}
    refetchInterval={0} // Desactiva polling
    refetchOnWindowFocus={false} // Evita revalidar al cambiar de pestaña
    >
      <ApolloProvider client={apolloClient}>
        <Component {...pageProps} />
      </ApolloProvider>
    </SessionProvider>
  );
}

export default MyApp;
