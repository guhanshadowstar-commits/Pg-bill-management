import { Card } from "@/components/ui/card";

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="animate-rise">
      <p className="text-sm text-mist">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </Card>
  );
}
