import { Badge } from "@/components/ui/badge";

export function DuelStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "PENDING":
      return <Badge variant="secondary">Pending</Badge>;
    case "ACCEPTED":
      return <Badge variant="success">Live</Badge>;
    case "DECLINED":
      return <Badge variant="destructive">Declined</Badge>;
    case "CANCELLED":
      return <Badge variant="outline">Cancelled</Badge>;
    case "COMPLETED":
      return <Badge variant="default">Completed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
