import { redirect } from "next/navigation";

export const metadata = {
  title: "Substitutions | Aurea CRM",
  description: "Manage instructor substitution requests",
};

export default function RequestsPage(): never {
  redirect("/studio/substitutions");
}
