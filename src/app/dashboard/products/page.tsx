import { ResourceWrapper } from "@/components/resource-wrapper";
import { ResourceExcelActions } from "@/components/resource-excel-actions";

export default function ProductsPage() {
  return <ResourceWrapper resource="products" headerActions={<ResourceExcelActions resource="products" />} />;
}