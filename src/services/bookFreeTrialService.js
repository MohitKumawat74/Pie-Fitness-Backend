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
