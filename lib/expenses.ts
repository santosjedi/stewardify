// Rules shared by the submit form (in the browser) and the server.

export const CATEGORIES = ["Transport", "Food", "Supplies", "Other"] as const;

export const RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024; // 5 MB
