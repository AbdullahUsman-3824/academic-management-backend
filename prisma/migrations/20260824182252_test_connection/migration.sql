-- CreateTable
CREATE TABLE "TestConnection" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestConnection_pkey" PRIMARY KEY ("id")
);
