/** Thermal receipt paper width used for print CSS and on-screen preview. */
export const RECEIPT_PAPER_WIDTH_MM = 80;
/** Usable content width after small side margins on the roll. */
export const RECEIPT_CONTENT_WIDTH_MM = 72;

const PRINT_ROOT_ID = 'receipt-print-root';

/**
 * Clone the on-screen receipt into a body-level print root, then print.
 * Sized for small thermal receipt printers (default 80mm roll), not A4.
 */
export function printReceipt(fromEl?: HTMLElement | null): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const source =
    fromEl?.closest('.receipt-print-area') ??
    fromEl ??
    document.querySelector<HTMLElement>('.receipt-print-area');

  if (!source) {
    window.print();
    return;
  }

  let root = document.getElementById(PRINT_ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = PRINT_ROOT_ID;
    document.body.appendChild(root);
  }

  const clone = source.cloneNode(true) as HTMLElement;
  clone.classList.add('receipt-print-area--thermal');
  root.replaceChildren(clone);
  document.body.classList.add('printing-receipt');

  const cleanup = () => {
    document.body.classList.remove('printing-receipt');
    root?.replaceChildren();
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  window.setTimeout(cleanup, 60_000);

  window.requestAnimationFrame(() => {
    window.print();
  });
}
