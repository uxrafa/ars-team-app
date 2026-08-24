import type { MetadataRoute } from "next";

// O aplicativo e area privada de aluno. Quem capta e a vitrine, em arsteam.vercel.app.
// Nada aqui deve aparecer em busca.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
