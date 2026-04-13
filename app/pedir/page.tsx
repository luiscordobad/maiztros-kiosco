import { prisma } from '@/lib/prisma';
import PedirClient from './PedirClient';

export const dynamic = 'force-dynamic'; // Asegura que el menú siempre esté actualizado

export default async function PedirPage() {
  // Descargamos el catálogo completo directamente desde la base de datos
  const products = await prisma.product.findMany();
  const modifiers = await prisma.modifier.findMany();
  
  // Se los pasamos al cliente para que los dibuje
  return <PedirClient products={products} modifiers={modifiers} />;
}
