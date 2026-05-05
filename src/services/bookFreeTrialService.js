const BookFreeTrial = require('../models/BookFreeTrial');

async function getAllBookFreeTrials() {
  return BookFreeTrial.find().sort({ createdAt: -1 }).lean();
}

async function bookFreeTrial(payload) {
  // Basic validation (controller also validates)
  if (!payload || !payload.first_name || !payload.last_name || !payload.email) {
    const err = new Error('Missing required fields: first_name, last_name, email');
    err.statusCode = 400;
    throw err;
  }

  // Normalize phone to a simple international/digit format (keep leading +)
  function normalizePhone(phone) {
    if (phone === undefined || phone === null) return phone;
    const s = String(phone).trim();
    // remove anything except + and digits
    const cleaned = s.replace(/[^+\d]/g, '');
    // collapse to +digits or digits only
    const digits = cleaned.replace(/\D/g, '');
    if (!digits) return cleaned;
    return cleaned.startsWith('+') ? `+${digits}` : digits;
  }

  if (payload.phone) payload.phone = normalizePhone(payload.phone);

  // Validate normalized phone loosely
  if (!payload.phone || !/^\+?\d{6,20}$/.test(payload.phone)) {
    const err = new Error('Invalid or missing phone number');
    err.statusCode = 400;
    throw err;
  }

  const doc = new BookFreeTrial(payload);
  await doc.save();
  return doc.toObject();
}

async function updateBookFreeTrial(id, updates) {
  if (!id) {
    const err = new Error('Missing id');
    err.statusCode = 400;
    throw err;
  }

  const existing = await BookFreeTrial.findById(id);
  if (!existing) return null;

  // Normalize phone on updates if provided
  if (updates && updates.phone !== undefined && updates.phone !== null) {
    const s = String(updates.phone).trim();
    const cleaned = s.replace(/[^+\d]/g, '');
    const digits = cleaned.replace(/\D/g, '');
    updates.phone = digits ? (cleaned.startsWith('+') ? `+${digits}` : digits) : cleaned;
  }

  Object.keys(updates || {}).forEach((k) => {
    existing[k] = updates[k];
  });

  await existing.save();
  return existing.toObject();
}

async function deleteBookFreeTrial(id) {
  if (!id) {
    const err = new Error('Missing id');
    err.statusCode = 400;
    throw err;
  }

  const existing = await BookFreeTrial.findById(id);
  if (!existing) return null;
  await BookFreeTrial.deleteOne({ _id: id });
  return true;
}

module.exports = {
  getAllBookFreeTrials,
  bookFreeTrial,
  updateBookFreeTrial,
  deleteBookFreeTrial,
};
