const RegisterUser = require('../models/RegisterUser');
const AdminNotification = require('../admin/models/AdminNotification');

async function getAdminRecipient() {
  const admin = await RegisterUser.findOne({}).sort({ createdAt: 1 }).select('_id fullName email');
  return admin || null;
}

async function createAdminNotification({ title, message, type = 'general', link = null, metadata = {}, createdBy = null }) {
  try {
    if (!title || !message) return null;

    const admin = await getAdminRecipient();
    if (!admin) return null;

    return await AdminNotification.createNotification({
      recipientId: admin._id,
      recipientType: 'admin',
      title,
      message,
      type,
      link,
      metadata,
      createdBy
    });
  } catch (error) {
    console.error('Failed to create admin notification:', error);
    return null;
  }
}

module.exports = {
  createAdminNotification,
  getAdminRecipient
};