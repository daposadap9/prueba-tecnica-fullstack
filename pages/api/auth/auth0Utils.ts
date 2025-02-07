import fetch from 'node-fetch';

type Auth0TokenResponse = {
  access_token: string;
  token_type: string;
};

const AUTH0_ISSUER = process.env.AUTH0_ISSUER?.replace(/\/$/, ''); // Remueve '/' final si existe
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;
const AUTH0_AUDIENCE = `${AUTH0_ISSUER}/api/v2/`;

if (!AUTH0_ISSUER || !AUTH0_CLIENT_ID || !AUTH0_CLIENT_SECRET) {
  throw new Error('Faltan variables de entorno para Auth0');
}

/**
 * Obtiene un token para la Auth0 Management API.
 */
export async function getManagementApiToken(): Promise<string> {
  try {
    const response = await fetch(`${AUTH0_ISSUER}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: AUTH0_CLIENT_ID,
        client_secret: AUTH0_CLIENT_SECRET,
        audience: AUTH0_AUDIENCE,
        grant_type: 'client_credentials',
      }),
    });

    const data: Auth0TokenResponse = await response.json();

    if (!response.ok) {
      throw new Error(`Error obteniendo token: ${JSON.stringify(data)}`);
    }
    if (!data.access_token) {
      throw new Error('No se pudo obtener el token de Management API');
    }
    return data.access_token;
  } catch (error) {
    console.error('Error en getManagementApiToken:', error);
    throw error;
  }
}

/**
 * Actualiza la información (email y/o name) de un usuario en Auth0.
 * @param userId - ID del usuario en Auth0 (ejemplo: "auth0|123456789").
 * @param updates - Propiedades a actualizar (email, name).
 */
export async function updateUserInAuth0(
  userId: string,
  updates: { email?: string; name?: string }
): Promise<any> {
  try {
    const token = await getManagementApiToken();
    const response = await fetch(`${AUTH0_AUDIENCE}users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Error al actualizar usuario: ${JSON.stringify(data)}`);
    }
    return data;
  } catch (error) {
    console.error(`Error en updateUserInAuth0 para ${userId}:`, error);
    throw error;
  }
}

/**
 * Asigna roles a un usuario en Auth0.
 * @param userId - ID del usuario en Auth0.
 * @param roles - Array con los IDs de los roles a asignar.
 */
export async function assignRolesToUser(userId: string, roles: string[]): Promise<any> {
  try {
    const token = await getManagementApiToken();
    const response = await fetch(`${AUTH0_AUDIENCE}users/${encodeURIComponent(userId)}/roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ roles }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Error al asignar roles: ${JSON.stringify(data)}`);
    }
    return data;
  } catch (error) {
    console.error(`Error en assignRolesToUser para ${userId}:`, error);
    throw error;
  }
}