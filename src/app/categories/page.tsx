import { db } from '@/lib/db';
import CategoriesClient from './categories-client';

export const revalidate = 0; // Disable cache so category manager updates live

export default async function CategoriesPage() {
  const categoriesList = await db.category.findMany({
    include: {
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
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-base-content">
          Categories Manager
        </h1>
        <p className="text-base-content/60 text-sm mt-1">
          Create, view, and delete financial categories and check transaction volumes.
        </p>
      </div>

      <CategoriesClient initialCategories={categories} />
    </div>
  );
}
