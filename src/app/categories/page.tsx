import { db } from '@/lib/db';
import CategoriesClient from './categories-client';

export const revalidate = 0; // Disable cache so category manager updates live

export default async function CategoriesPage() {
  const categoriesList = await db.category.findMany({
    include: {
      rules: true,
      _count: {
        select: {
          transactions: true,
          rules: true,
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  const categories = categoriesList.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    cashFlowType: c.cashFlowType,
    transactionsCount: c._count.transactions,
    rulesCount: c._count.rules,
    rules: c.rules.map((r) => ({ id: r.id, pattern: r.pattern })),
  }));

  return (
    <CategoriesClient initialCategories={categories} />
  );
}
