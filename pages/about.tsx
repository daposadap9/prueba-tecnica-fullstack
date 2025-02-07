import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function About() {
    return (
      <main className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center flex flex-col items-center gap-4">
        <h1 className="text-3xl font-bold text-blue-600">¡Bienvenido a la página About!</h1>
        <Link href="/">
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow-lg hover:bg-blue-600 transition">
            Ir a inicio
          </button>
          <Button>Boton de componente</Button>
        </Link>
        </div>
      </main>
    );
  }