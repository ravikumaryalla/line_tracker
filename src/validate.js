export const digits = (t) => (t || '').replace(/[^0-9]/g, '');

export const isPhone = (t) => digits(t).length === 10;

const num = (t) => parseInt(t, 10) || 0;

// Weekly instalment implied by the total and the number of weeks, or 0 when it isn't a whole amount.
export function weeklyFor(total, weeks) {
  const t = num(total);
  const w = num(weeks);
  return t && w && t % w === 0 ? t / w : 0;
}

// Returns an error message for the toast, or null when the contact fields are fine.
export function customerContactError({ name, phone }) {
  if (!name || !name.trim()) return 'Name is required';
  if (!isPhone(phone)) return 'Enter a 10-digit phone number';
  return null;
}

// Validates the add-customer form; returns the first problem as a toast message, or null.
export function customerFormError({ name, phone, amt, weeks, total }) {
  const contact = customerContactError({ name, phone });
  if (contact) return contact;
  if (!num(amt)) return 'Amount is required';
  if (!num(weeks)) return 'Number of weeks is required';
  if (!num(total)) return 'Need to collect is required';
  if (num(total) < num(amt)) return 'Need to collect cannot be less than the amount';
  if (!weeklyFor(total, weeks)) return `₹${num(total)} ÷ ${num(weeks)} weeks isn't a whole weekly amount`;
  return null;
}
