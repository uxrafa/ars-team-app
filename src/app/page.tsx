import { redirect } from "next/navigation";

export default function Raiz() {
  // O middleware ja separa quem esta logado de quem nao esta.
  redirect("/app");
}
