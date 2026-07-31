const PRINT_ROOT_ID = 'receipt-print-root';

/**
 * Clone the on-screen receipt into a body-level print root, then print.
 * Avoids blank extra pages from dashboard/modal layout that still take space
 * when only `visibility: hidden` is used.
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

  root.replaceChildren(source.cloneNode(true));
  document.body.classList.add('printing-receipt');

  const cleanup = () => {
    document.body.classList.remove('printing-receipt');
    root?.replaceChildren();
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  // Some browsers fire afterprint unreliably; also clean up on a timer.
  window.setTimeout(cleanup, 60_000);

  // Let the clone paint before the print dialog opens.
  window.requestAnimationFrame(() => {
    window.print();
  });
}
