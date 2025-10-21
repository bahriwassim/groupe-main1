import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import OrderList from './order-list';

export default function OrdersPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Bons de Commande</h1>
        <Link href="/orders/new" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouveau Bon de Commande
          </Button>
        </Link>
      </div>
      <OrderList />
    </div>
  );
}
