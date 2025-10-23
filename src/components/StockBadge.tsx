import { Badge } from '@/components/ui/badge';

interface StockBadgeProps {
  type: 'in-stock' | 'incoming';
  count: number;
}

export function StockBadge({ type, count }: StockBadgeProps) {
  if (type === 'in-stock') {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200">
        In stock: {count}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
      Incoming: {count}
    </Badge>
  );
}
