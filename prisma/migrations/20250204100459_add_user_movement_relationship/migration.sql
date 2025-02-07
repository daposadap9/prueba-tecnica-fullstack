-- CreateTable
CREATE TABLE "Movement" (
    "id" SERIAL NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movement_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
