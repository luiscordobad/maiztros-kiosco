import { prisma } from '../lib/prisma';
import KioscoClient from '../components/KioscoClient';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // El servidor va a la base de datos por los esquites
  const products = await prisma.product.findMany({
    orderBy: { basePrice: 'asc' }
  });

  // Se los pasa a la pantalla interactiva
  return <KioscoClient products={products} />;
}
