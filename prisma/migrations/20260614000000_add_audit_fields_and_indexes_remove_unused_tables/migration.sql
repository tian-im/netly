-- DropIndex
DROP INDEX IF EXISTS "Challenge_state_key";

-- DropIndex
DROP INDEX IF EXISTS "SetupToken_token_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE IF EXISTS "Challenge";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE IF EXISTS "SetupToken";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CategoryRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pattern" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CategoryRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CategoryRule" ("categoryId", "id", "pattern") SELECT "categoryId", "id", "pattern" FROM "CategoryRule";
DROP TABLE "CategoryRule";
ALTER TABLE "new_CategoryRule" RENAME TO "CategoryRule";
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "payee" TEXT NOT NULL,
    "description" TEXT,
    "amount" REAL NOT NULL,
    "accountId" TEXT NOT NULL,
    "categoryId" TEXT,
    "isReviewed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("accountId", "amount", "categoryId", "createdAt", "date", "description", "id", "isReviewed", "payee") SELECT "accountId", "amount", "categoryId", "createdAt", "date", "description", "id", "isReviewed", "payee" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE INDEX "Transaction_accountId_idx" ON "Transaction"("accountId");
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");
CREATE UNIQUE INDEX "Transaction_date_payee_amount_accountId_key" ON "Transaction"("date", "payee", "amount", "accountId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
