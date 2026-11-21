import type { ReactNode } from "react";

/** Layout padrão: tabuleiro (com barras de jogador) + painel lateral */
export function GameLayout({
  board,
  side,
  top,
  bottom,
  evalBar,
}: {
  board: ReactNode;
  side: ReactNode;
  top?: ReactNode;
  bottom?: ReactNode;
  evalBar?: ReactNode;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start xl:grid-cols-[minmax(0,1fr)_390px]">
      <div className="flex justify-center gap-2 lg:sticky lg:top-4">
        {evalBar && <div className="flex pt-0">{evalBar}</div>}
        <div className="w-full max-w-[min(100%,calc(100dvh-200px))] space-y-2" style={{ minWidth: 0 }}>
          {top}
          {board}
          {bottom}
        </div>
      </div>
      <div className="space-y-4">{side}</div>
    </div>
  );
}
