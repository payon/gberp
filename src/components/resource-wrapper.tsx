import { RESOURCE_DEFS, toResourceMeta } from "@/lib/resources";
import { ResourceTable, type RowLink } from "@/components/resource-table";

export function ResourceWrapper({
  resource,
  headerActions,
  rowLinks,
}: {
  resource: keyof typeof RESOURCE_DEFS;
  headerActions?: React.ReactNode;
  rowLinks?: RowLink[];
}) {
  const def = RESOURCE_DEFS[resource];
  const meta = toResourceMeta(def);
  return <ResourceTable meta={meta} headerActions={headerActions} rowLinks={rowLinks} />;
}