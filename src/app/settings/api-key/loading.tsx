import { TableSkeleton } from "@/components/common/Skeleton";

export default function Loading() {
  return <TableSkeleton title="API Keys" columns={4} rows={6} />;
}
