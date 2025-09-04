const isFormEl = (n: any) =>
  n instanceof HTMLElement &&
  n.matches?.(
    'input, textarea, select, button, [contenteditable], [role="textbox"]',
  );

export function startedInsideFormField(evt: Event): boolean {
  const path = (evt as any).composedPath?.() as EventTarget[] | undefined;
  if (Array.isArray(path)) return path.some(isFormEl);
  const t = evt.target as HTMLElement | null;
  return !!t?.closest?.(
    'input, textarea, select, button, [contenteditable], [role="textbox"]',
  );
}
