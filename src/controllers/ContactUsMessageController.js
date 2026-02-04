const ContactUsMessage = require('../models/ContactUsMessage');
const mongoose = require('mongoose');

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
      phone,
      message
    });
    await contactUsMessage.save();
    return res.status(201).json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/contactus/ -> get all contact us messages (admin only)
exports.getAllContactUsMessages = async (req, res) => {
  try {
    const messages = await ContactUsMessage.find();
    return res.status(200).json(messages);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
