import { prisma } from '@/lib/prisma';
import PedirClient from './PedirClient';

export const dynamic = 'force-dynamic'; // Para que siempre muestre el menú más fresco

export default async function PedirPage() {
  // Sacamos los productos reales directo de la base de datos
  const products = await prisma.product.findMany();
  const modifiers = await prisma.modifier.findMany();
  
  return <PedirClient products={products} modifiers={modifiers} />;
}
