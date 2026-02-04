const RegisterUser = require('../models/RegisterUser');
const mongoose = require('mongoose');
const { deleteImageFile } = require('../middleware/uploadMiddleware');
const crypto = require('crypto');

// Generate a secure random token
function generateResetToken() {
  return crypto.randomBytes(20).toString('hex');
}

// Generate numeric OTP (6 digits)
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Validate phone numbers: accept optional country code and ensure total digits between 10 and 14.
// For Indian mobile numbers we still require the last 10 digits to start with 6-9.
function isValidPhoneWithOptionalCountryCode(phone) {
  if (!phone) return false;
  // Convert to string and strip all non-digit characters
  const digits = phone.toString().replace(/\D/g, '');
  // Total digits must be between 10 and 14
  if (digits.length < 10 || digits.length > 14) return false;
  // Ensure the last 10 digits look like an Indian mobile (start with 6-9)
  // This keeps compatibility with Indian numbers while allowing country codes.
  return /[6-9]\d{9}$/.test(digits);
}

// GET /api/user/  -> list users (no passwords)
exports.getUsers = async (req, res) => {
  try {
    const users = await RegisterUser.find().select('-password').lean();
  const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const transformedUsers = users.map(user => ({
      id: user._id.toString(),
      fullName: user.fullName || null,
      email: user.email || null,
      phone: user.phone || '',
      dateOfBirth: user.dateOfBirth?.toISOString() ?? null,
      image: user.image ? `${baseUrl}/${user.image}` : null,
      subscription: user.subscription || null,
    }));
    res.json(transformedUsers);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users', error: err.message });
  }
};

// GET /api/user/getuser/:id -> get user by id (no password)
exports.getUserById = async (req, res) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid or missing user id' });
  }

  try {
    const user = await RegisterUser.findById(id).select('-password').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { _id, fullName, username, email, phone, dateOfBirth, image, subscription, membershipPlan, joinDate, isActive, createdAt, updatedAt } = user;
  const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const payload = {
      id: _id.toString(),
      fullName: fullName || null,
      email: email || null,
      phone: phone || '',
      dateOfBirth: dateOfBirth?.toISOString() ?? null,
      image: image ? `${baseUrl}/${image}` : null,
      membershipPlan: membershipPlan || null,
      subscription: subscription || null,
      joinDate: joinDate?.toISOString() ?? null,
      isActive: isActive ?? true,
    };

  return res.json(payload);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching user', error: err.message });
  }
};


// POST /api/user/login -> authenticate user by email or username + password
exports.postUser = async (req, res) => {
  const { email, username, password } = req.body;
  if (!password || (!email && !username)) {
    return res.status(400).json({ message: 'Provide password and email or username' });
  }

  try {
    const user = email
      ? await RegisterUser.findOne({ email })
      : await RegisterUser.findOne({ username });

    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = user.comparePassword(password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

  const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const userResponse = {
      id: user._id.toString(),
      fullName: user.fullName || null,
      email: user.email || null,
      phone: user.phone || '',
      dateOfBirth: user.dateOfBirth?.toISOString() ?? null,
      image: user.image ? `${baseUrl}/${user.image}` : null,
      subscription: user.subscription || null,
    };

    res.json({ message: 'Login successful', user: userResponse });
  } catch (err) {
    res.status(500).json({ message: 'Error during authentication', error: err.message });
  }
};

// POST /api/user/register -> register new user
exports.createUser = async (req, res) => {
  const { fullName, username, email, phone, dateOfBirth, password, confirmPassword } = req.body;

  // Validate phone early (optional) - accept country code; total digits 10-14, Indian mobile last 10 digits must start with 6-9
  if (phone && !isValidPhoneWithOptionalCountryCode(phone)) {
    return res.status(400).json({ message: 'Phone must be a valid phone number (10-14 digits, country code optional)' });
  }

  if (!fullName || !email || !password || !confirmPassword) {
    return res.status(400).json({ message: 'fullName, email, password and confirmPassword are required' });
  }

  try {
    const existsEmail = await RegisterUser.findOne({ email });
    if (existsEmail) return res.status(409).json({ message: 'Email already in use' });

    if (username) {
      const existsUsername = await RegisterUser.findOne({ username });
      if (existsUsername) return res.status(409).json({ message: 'Username already in use' });
    }

    // Handle image upload if present
    let imagePath = null;
    if (req.file) {
      imagePath = `uploads/users/${req.file.filename}`;
    }

    const newUser = new RegisterUser({ 
      fullName, 
      username, 
      email, 
      phone: phone || '', 
      dateOfBirth, 
      password,
      image: imagePath
    });
    newUser.confirmPassword = confirmPassword;
    await newUser.save();

  const baseUrl2 = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
    res.status(201).json({
      message: 'User registered',
      user: {
        id: newUser._id.toString(),
        fullName: newUser.fullName,
        email: newUser.email,
        phone: newUser.phone || '',
        dateOfBirth: newUser.dateOfBirth?.toISOString() ?? null,
        image: newUser.image ? `${baseUrl2}/${newUser.image}` : null,
        subscription: newUser.subscription || null,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Error creating user', error: err.message });
  }
};

// PUT /api/user/:id -> update user fields (and password if provided)
exports.updateUser = async (req, res) => {
  const userId = req.params.id;
  const { fullName, username, email, phone, dateOfBirth, password, confirmPassword, subscription } = req.body;

  // Validate phone early when provided - accept optional country code
  if (phone !== undefined && phone !== '' && !isValidPhoneWithOptionalCountryCode(phone)) {
    return res.status(400).json({ message: 'Phone must be a valid phone number (10-14 digits, country code optional)' });
  }

  try {
    const user = await RegisterUser.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (email && email !== user.email) {
      const exists = await RegisterUser.findOne({ email, _id: { $ne: userId } });
      if (exists) return res.status(409).json({ message: 'Email already in use' });
      user.email = email;
    }

    if (username && username !== user.username) {
      const existsU = await RegisterUser.findOne({ username, _id: { $ne: userId } });
      if (existsU) return res.status(409).json({ message: 'Username already in use' });
      user.username = username;
    }

    // Handle image upload if present
    if (req.file) {
      // Delete old image if exists
      if (user.image) {
        deleteImageFile(user.image);
      }
      user.image = `uploads/users/${req.file.filename}`;
    }

    if (fullName !== undefined) user.fullName = fullName;
    if (phone !== undefined) user.phone = phone;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
    if (subscription !== undefined) user.subscription = subscription;

    if (password) {
      if (!confirmPassword) return res.status(400).json({ message: 'confirmPassword required when changing password' });
      user.password = password;
      user.confirmPassword = confirmPassword;
    }

    await user.save();
    const updated = await RegisterUser.findById(userId).select('-password').lean();
    
  const baseUrl3 = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const userResponse = {
      id: updated._id.toString(),
      fullName: updated.fullName || null,
      email: updated.email || null,
      phone: updated.phone || '',
      dateOfBirth: updated.dateOfBirth?.toISOString() ?? null,
      image: updated.image ? `${baseUrl3}/${updated.image}` : null,
      subscription: updated.subscription || null,
    };

    res.json({ message: 'User updated', user: userResponse });
  } catch (err) {
    res.status(500).json({ message: 'Error updating user', error: err.message });
  }
};

// POST /api/user/forgot-password -> generate and send OTP to user's email
exports.requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    const user = await RegisterUser.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No user with that email' });

    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 1000 * 60 * 10); // 10 minutes

    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = otpExpires;
    // clear any existing reset token
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    // Try to send OTP via email if SMTP config is available
    let emailSent = false;
    let emailError = null;
    try {
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.FROM_EMAIL) {
        console.log('SMTP config detected, attempting to send email...');
        
        const nodemailer = require('nodemailer');
        
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        // Verify transporter configuration
        try {
          await transporter.verify();
          console.log('SMTP server connection verified');
        } catch (verifyError) {
          console.warn('SMTP verification failed:', verifyError.message);
        }

        const mailOptions = {
          from: process.env.FROM_EMAIL,
          to: email,
          subject: 'Password Reset OTP - Pie Fitness',
          text: `Your password reset OTP is: ${otp}. This code will expire in 10 minutes. If you didn't request this, please ignore this email.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Password Reset OTP</h2>
              <p>Hello,</p>
              <p>You requested a password reset for your Pie-Fitness account.</p>
              <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
                <h1 style="color: #007bff; margin: 0; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
              </div>
              <p><strong>This OTP will expire in 10 minutes.</strong></p>
              <p>If you didn't request this password reset, please ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">This is an automated message from Pie Fitness.</p>
            </div>
          `,
        };

        try {
          const info = await transporter.sendMail(mailOptions);
          console.log('OTP email sent successfully:', info.messageId);
          emailSent = true;
        } catch (sendErr) {
          emailError = sendErr.message || String(sendErr);
          console.error('Error sending OTP email:', sendErr);
        }
      } else {
        console.log('SMTP config incomplete - missing required environment variables');
        emailError = 'SMTP configuration incomplete';
      }
    } catch (err) {
      console.error('Unexpected error when attempting to send OTP email:', err);
      emailError = (err && err.message) || String(err);
    }

    // Log OTP server-side for debugging as a fallback
    console.log(`Password reset OTP for ${email} is ${otp} (expires ${otpExpires.toISOString()})`);

    const resp = { message: 'OTP sent to email (if configured)' };
    if (emailSent) resp.email = 'sent';
    if (emailError) resp.emailError = emailError;
    if (process.env.DEBUG_RESET === '1') {
      resp.debug = { otp, otpExpires: otpExpires.toISOString() };
    }

    return res.status(200).json(resp);
  } catch (err) {
    console.error('Error requesting password reset', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/user/verify-otp -> verify OTP and generate a short-lived reset token
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'email and otp are required' });

  try {
    const user = await RegisterUser.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No user with that email' });

    if (!user.resetPasswordOtp || !user.resetPasswordOtpExpires) {
      return res.status(400).json({ message: 'No OTP request found or OTP expired' });
    }

    if (user.resetPasswordOtpExpires < new Date()) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    if (user.resetPasswordOtp !== otp.toString()) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // OTP is valid — generate reset token valid for a short period (e.g., 1 hour)
    const token = generateResetToken();
    const tokenExpires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    user.resetPasswordToken = token;
    user.resetPasswordExpires = tokenExpires;
    // clear OTP fields
    user.resetPasswordOtp = null;
    user.resetPasswordOtpExpires = null;
  // mark as verified for short time to support frontend sending token='verified'
  user.resetPasswordVerified = true;
  user.resetPasswordVerifiedExpires = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes
    await user.save();

    const resp = {
      message: 'OTP verified; use reset token to set new password',
      resetToken: token,
      resetTokenExpires: tokenExpires.toISOString(),
    };

    // For backward-compatibility, when DEBUG_RESET=1 include debug block as well
    if (process.env.DEBUG_RESET === '1') {
      resp.debug = { resetToken: token, resetTokenExpires: tokenExpires.toISOString() };
    }

    return res.status(200).json(resp);
  } catch (err) {
    console.error('Error verifying OTP', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/user/reset-password -> reset password with token (returned by verify-otp)
exports.resetPassword = async (req, res) => {
  const { email, token, newPassword, confirmPassword } = req.body;
  if (!email || !token || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'email, token, newPassword and confirmPassword are required' });
  }
  if (newPassword !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match' });

  try {
    // Lookup user by email first to provide clearer errors
    const user = await RegisterUser.findOne({ email });
    if (!user) return res.status(400).json({ message: 'No user found for that email' });

    // Accept a short-lived 'verified' token from frontend (convenience)
    const providedToken = token.toString().trim();

    if (providedToken === 'verified') {
      if (!user.resetPasswordVerified || !user.resetPasswordVerifiedExpires || user.resetPasswordVerifiedExpires < new Date()) {
        return res.status(400).json({ message: 'Verification has expired. Please re-run OTP verification.' });
      }
      // proceed to reset
    } else {
      // Otherwise validate against stored reset token
      if (!user.resetPasswordToken) {
        return res.status(400).json({ message: 'No reset token found for this user. Please request a new OTP.' });
      }
      // Timing-safe compare if possible
      try {
        const stored = Buffer.from(user.resetPasswordToken);
        const provided = Buffer.from(providedToken);
        if (stored.length !== provided.length || !crypto.timingSafeEqual(stored, provided)) {
          return res.status(400).json({ message: 'Invalid reset token' });
        }
      } catch (cmpErr) {
        if (user.resetPasswordToken !== providedToken) {
          return res.status(400).json({ message: 'Invalid reset token' });
        }
      }

      if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
        return res.status(400).json({ message: 'Reset token expired. Please request a new OTP.' });
      }
    }

    user.password = newPassword;
    user.confirmPassword = confirmPassword; // required by pre-save hook
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  user.resetPasswordVerified = false;
  user.resetPasswordVerifiedExpires = null;
    await user.save();

    return res.status(200).json({ message: 'Password has been reset' });
  } catch (err) {
    console.error('Error resetting password', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};