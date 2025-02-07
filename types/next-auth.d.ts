import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      name?: string | null;
      email?: string | null;
      phone?: string | null;
      image?: string | null; // Agregamos la propiedad "image"
    };
  }

  interface User {
    id: string;
    role: string;
    image?: string | null; // Y aquí, si lo deseas, para el objeto User
  }
}
