export interface OrgSettings {
  currency: string;
}

export function formatPrice(amount: number, orgSettings?: OrgSettings | null) {
  const currencySymbol = orgSettings?.currency === "INR" ? "₹" : "$";
  const finalAmount = amount;
  
  return `${currencySymbol}${finalAmount.toFixed(2)}`;
}
