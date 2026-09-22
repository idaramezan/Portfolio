export function compareProductDisplayOrder(
  a: { displayOrder?: number; createdAt?: string },
  b: { displayOrder?: number; createdAt?: string },
) {
  return (
    (a.displayOrder ?? Number.MAX_SAFE_INTEGER) -
      (b.displayOrder ?? Number.MAX_SAFE_INTEGER) ||
    (Date.parse(b.createdAt || "") || 0) - (Date.parse(a.createdAt || "") || 0)
  );
}
