import { prisma } from '../lib/prisma';
import KioscoClient from '../components/KioscoClient';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const products = await prisma.product.findMany({
    orderBy: { basePrice: 'asc' }
  });
  
  // Novedad: Traemos los modificadores (toppings)
  const modifiers = await prisma.modifier.findMany();

  return <KioscoClient products={products} modifiers={modifiers} />;
}
