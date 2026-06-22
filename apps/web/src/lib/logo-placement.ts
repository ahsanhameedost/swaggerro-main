/**
 * Parses the structured "Logo placement" block that the Mockup Studio appends to
 * an order's notes, so the dashboard can show it as labeled fields + a preview
 * button instead of a raw text blob. Returns the customer's own comments
 * separately. Writer format lives in MockupBuilder.tsx — keep them in sync.
 */
export type LogoPlacement = {
  target: string | null; // "Product (Color / Size)"
  horizontal: number | null;
  vertical: number | null;
  width: number | null;
  rotation: number | null;
  opacity: number | null;
  imprint: string | null;
  mockupUrl: string | null;
};

const MARKER = "Logo placement —";

function num(re: RegExp, text: string): number | null {
  const m = text.match(re);
  return m ? Number(m[1]) : null;
}

export function parseLogoPlacement(notes?: string | null): {
  customerNotes: string;
  placement: LogoPlacement | null;
} {
  const raw = notes ?? "";
  const idx = raw.indexOf(MARKER);
  if (idx === -1) return { customerNotes: raw.trim(), placement: null };

  const customerNotes = raw.slice(0, idx).trim();
  const block = raw.slice(idx);

  const targetMatch = block.match(/Logo placement — (.+?):/);
  const imprintMatch = block.match(/Imprint:\s*([^.]+)\./);
  const mockupMatch = block.match(/Mockup preview:\s*(\S+)/);

  return {
    customerNotes,
    placement: {
      target: targetMatch ? targetMatch[1].trim() : null,
      horizontal: num(/horizontal\s*(-?\d+)%/, block),
      vertical: num(/vertical\s*(-?\d+)%/, block),
      width: num(/size\s*(-?\d+)%\s*of width/, block),
      rotation: num(/rotation\s*(-?\d+)°/, block),
      opacity: num(/opacity\s*(-?\d+)%/, block),
      imprint: imprintMatch ? imprintMatch[1].trim() : null,
      mockupUrl: mockupMatch ? mockupMatch[1].trim() : null,
    },
  };
}
