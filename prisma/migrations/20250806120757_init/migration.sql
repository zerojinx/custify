-- CreateTable
CREATE TABLE "CustomerField" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "points" INTEGER,
    "couponCode" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerField_shop_customerId_key" ON "CustomerField"("shop", "customerId");
