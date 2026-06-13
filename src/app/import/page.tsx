import { getAccounts } from '../actions';
import ImportClient from './import-client';

export const revalidate = 0; // Always fresh

export default async function ImportPage() {
  const accounts = await getAccounts();

  // Map to serializable format
  const mappedAccounts = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    currency: a.currency,
  }));

  return (
    <ImportClient initialAccounts={mappedAccounts} />
  );
}
