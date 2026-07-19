import { redirect } from "next/navigation";

export default function EmailDomainsPage() {
  redirect("/settings/communications/email?view=sender-domains");
}
