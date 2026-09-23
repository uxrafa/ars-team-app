/**
 * Bloco cinza que pulsa enquanto a tela carrega.
 *
 * Serve às telas de `loading.tsx`: o Next troca a tela por elas assim que o
 * aluno toca, antes de o servidor responder. Sem isso, o toque na aba ficava
 * sem resposta por um segundo no 4G da academia e parecia travado
 * (Rafael, 23/09).
 *
 * O desenho imita a forma do que vem depois -- cartão, linha, título -- para a
 * tela não "pular" quando o conteúdo real chega.
 */
export function Esqueleto({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`block animate-pulse rounded-xl bg-tinta-3 ${className}`} />
  );
}

/** Cartão inteiro em cinza, com algumas linhas dentro. */
export function CartaoEsqueleto({ linhas = 3, className = "" }: { linhas?: number; className?: string }) {
  return (
    <div className={`rounded-2xl border border-linha bg-tinta-2 p-5 ${className}`}>
      <Esqueleto className="h-3.5 w-24" />
      <div className="mt-4 flex flex-col gap-2.5">
        {Array.from({ length: linhas }).map((_, i) => (
          <Esqueleto key={i} className={`h-4 ${i === linhas - 1 ? "w-2/3" : "w-full"}`} />
        ))}
      </div>
    </div>
  );
}

/**
 * A tela inteira de carregamento, com o aviso para leitor de tela. Cada
 * `loading.tsx` do app é uma linha chamando isto.
 */
export function TelaCarregando({ titulo, cartoes = 3 }: { titulo?: string; cartoes?: number }) {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-5">
      <span className="sr-only">Carregando</span>
      {titulo ? (
        <h1 className="font-display text-3xl uppercase leading-none tracking-wide">{titulo}</h1>
      ) : (
        <Esqueleto className="h-7 w-40" />
      )}
      {Array.from({ length: cartoes }).map((_, i) => (
        <CartaoEsqueleto key={i} linhas={i === 0 ? 4 : 2} />
      ))}
    </div>
  );
}
