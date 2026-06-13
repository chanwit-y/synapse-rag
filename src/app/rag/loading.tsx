import { TableSkeleton } from "@/components/common/Skeleton";

export default function Loading() {
  return <TableSkeleton title="RAG" columns={5} rows={6} />;
}
