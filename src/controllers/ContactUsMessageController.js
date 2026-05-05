const ContactUsMessage = require('../models/ContactUsMessage');
const mongoose = require('mongoose');
const { createAdminNotification } = require('../services/notificationService');

function normalizePhone(phone) {
  const raw = String(phone || '').trim();
  if (!raw) return '';

  const hasPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  return hasPlus ? `+${digits}` : digits;
}

function formatContactUsMessage(doc) {
  const message = typeof doc?.toObject === 'function' ? doc.toObject() : doc;
  if (!message) return message;

  return {
    id: message._id ? message._id.toString() : undefined,
    first_name: message.first_name,
    last_name: message.last_name,
    email: message.email,
    phone: message.phone,
    message: message.message,
    status: message.status,
    adminNotes: message.adminNotes,
    priority: message.priority,
    category: message.category,
    response: message.response,
    respondedAt: message.respondedAt,
    createdAt: message.createdAt
  };
}

// POST /api/contactus/  -> submit a contact us message
exports.postContactUsMessage = async (req, res) => {
  const { first_name, last_name, email, phone, message } = req.body;
  if (!first_name || !last_name || !email || !phone || !message) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const contactUsMessage = new ContactUsMessage({
      first_name,
      last_name,
      email,
      phone: normalizePhone(phone),
      message
    });
    await contactUsMessage.save();
    await createAdminNotification({
      title: 'New contact message',
      message: `${first_name} ${last_name} sent a contact message`,
      type: 'general',
      link: '/admin/contactus',
      metadata: {
        contactMessageId: contactUsMessage._id.toString(),
        email,
        phone: contactUsMessage.phone,
        status: contactUsMessage.status
      },
      createdBy: null
    });
    return res.status(201).json({ message: 'Message sent successfully', data: formatContactUsMessage(contactUsMessage) });
  } catch (error) {
    console.error(error);
    const status = error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500;
    return res.status(status).json({ message: status === 400 ? 'Validation failed' : 'Internal server error', error: error.message });
  }
};

// GET /api/contactus/ -> get all contact us messages (admin only)
exports.getAllContactUsMessages = async (req, res) => {
  try {
    const messages = await ContactUsMessage.find();
    return res.status(200).json({
      success: true,
      message: 'Contact us messages fetched successfully',
      data: messages.map(formatContactUsMessage)
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// GET /api/contactus/:id -> get a single contact message by id (admin only)
exports.getContactUsMessageById = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await ContactUsMessage.findById(id);

    if (!message) {
      return res.status(404).json({ success: false, message: 'Contact message not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Contact message fetched successfully',
      data: formatContactUsMessage(message)
    });
  } catch (error) {
    console.error(error);
    const status = error.name === 'CastError' ? 400 : 500;
    return res.status(status).json({ success: false, message: 'Error fetching contact message', error: error.message });
  }
};

exports.updateContactUsMessage = async (req, res) => {
  try {
    const id = (req.query.id || req.body.id || req.params.id || '').toString().trim();
    if (!id) {
      return res.status(400).json({ success: false, message: 'Contact message id is required' });
    }

    const message = await ContactUsMessage.findById(id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Contact message not found' });
    }

    const updates = req.body || {};

    if (updates.status !== undefined) {
      const normalizedStatus = String(updates.status).trim().toLowerCase().replace(/\s+/g, '_');
      const allowed = ['new', 'pending', 'in_progress', 'approved', 'rejected', 'resolved', 'closed', 'completed'];
      if (!allowed.includes(normalizedStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid status value' });
      }
      message.status = normalizedStatus;
    }

    if (updates.adminNotes !== undefined) {
      message.adminNotes = String(updates.adminNotes || '');
    }

    if (updates.response !== undefined) {
      message.response = String(updates.response || '');
      message.respondedAt = updates.response ? new Date() : null;
    }

    if (updates.priority !== undefined) {
      const priority = String(updates.priority).trim().toLowerCase();
      const allowedPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!allowedPriorities.includes(priority)) {
        return res.status(400).json({ success: false, message: 'Invalid priority value' });
      }
      message.priority = priority;
    }

    if (updates.category !== undefined) {
      const category = String(updates.category).trim().toLowerCase();
      const allowedCategories = ['general', 'membership', 'billing', 'technical', 'complaint'];
      if (!allowedCategories.includes(category)) {
        return res.status(400).json({ success: false, message: 'Invalid category value' });
      }
      message.category = category;
    }

    await message.save();

    return res.status(200).json({
      success: true,
      message: 'Contact message updated successfully',
      data: formatContactUsMessage(message)
    });
  } catch (error) {
    console.error(error);
    const status = error.name === 'CastError' ? 400 : 500;
    return res.status(status).json({ success: false, message: 'Error updating contact message', error: error.message });
  }
};
