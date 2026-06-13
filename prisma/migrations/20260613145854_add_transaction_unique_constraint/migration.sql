-- Deduplicate transactions before adding the unique index.
-- Keeps the earliest-created transaction record for each (date, payee, amount, accountId)
-- tuple and removes any later duplicates. This is necessary because existing databases
-- may already contain duplicates that would cause the CREATE UNIQUE INDEX to fail.
DELETE FROM "Transaction"
WHERE "id" NOT IN (
  SELECT MIN("id")
  FROM "Transaction"
  GROUP BY "date", "payee", "amount", "accountId"
);

-- CreateIndex
-- Add a unique constraint on (date, payee, amount, accountId) to prevent
-- duplicate transactions at the database level.
CREATE UNIQUE INDEX "Transaction_date_payee_amount_accountId_key" ON "Transaction"("date", "payee", "amount", "accountId");
