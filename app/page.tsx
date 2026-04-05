import { prisma } from '@/lib/prisma';
import KioscoClient from '@/components/KioscoClient';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // SOLO TRAEMOS LO QUE ESTÁ EN STOCK
  const products = await prisma.product.findMany({
    where: { isAvailable: true },
    orderBy: { basePrice: 'asc' }
  });
  
  const modifiers = await prisma.modifier.findMany({
    where: { isAvailable: true }
  });

  return <KioscoClient products={products} modifiers={modifiers} />;
}
