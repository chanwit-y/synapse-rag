import { TableSkeleton } from "@/components/common/Skeleton";

export default function Loading() {
  return <TableSkeleton title="AI Models" columns={5} rows={6} />;
}
