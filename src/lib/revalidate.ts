import { revalidatePath } from "next/cache";

export function revalidateSettings() {
  revalidatePath("/", "layout");
  revalidatePath("/login");
  revalidatePath("/dashboard");
  revalidatePath("/manifest.webmanifest");
}