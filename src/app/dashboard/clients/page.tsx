import { ResourceWrapper } from "@/components/resource-wrapper";
import { ResourceExcelActions } from "@/components/resource-excel-actions";

export default function ClientsPage() {
  return <ResourceWrapper resource="clients" headerActions={<ResourceExcelActions resource="clients" />} />;
}