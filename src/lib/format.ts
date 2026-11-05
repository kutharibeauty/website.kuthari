/** Whole rupees in Indian grouping: ₹1,23,456. Safe on server and client. */
export const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`
