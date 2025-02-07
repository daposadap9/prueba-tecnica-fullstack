
//node --loader ts-node/esm prisma/seed.ts
//npx ts-node --loader ts-node/esm prisma/seed.ts
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs'; // Asegúrate de instalar bcryptjs: npm install bcryptjs

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('Milenita28**', 10); // Hashear la contraseña

  await prisma.user.create({
    data: {
      email: 'daposadap@gmail.com',
      name: 'user',
      role: 'user'
    },
  });

  console.log('Usuario creado correctamente.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
