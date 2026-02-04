// src/models/RegisterUser.js
const mongoose = require('mongoose');
const crypto = require('crypto');

// Simple email regex; replace with a stricter one if needed
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
// Indian phone number regex: allows 10 digits, optional country code +91, 91 (without plus), or leading 0
const IN_PHONE_REGEX = /^(?:\+91|91|0)?[6-9]\d{9}$/;

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    username: {
      type: String,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (v) => EMAIL_REGEX.test(v),
        message: (props) => `${props.value} is not a valid email`,
      },
    },
    phone: {
      type: String,
      default: '',
      trim: true,
      set: function (v) {
        if (!v) return '';
        let s = v.toString().trim();
        // Remove all whitespace
        s = s.replace(/\s+/g, '');
        // Remove all non-digit characters except a leading +
        s = s.replace(/(?!^\+)[^\d]/g, '');

        // Normalize formats like '919898987676' -> '+919898987676'
        if (/^91\d{10}$/.test(s)) return '+' + s;
        // Normalize '+919898987676' or '+91XXXXXXXXXX' (keep as-is)
        if (/^\+91\d{10}$/.test(s)) return s;
        // Keep plain 10-digit local numbers
        return s.replace(/\D/g, '');
      },
      validate: {
        validator: function (v) {
          // allow empty string (optional phone), otherwise enforce Indian number format
          if (!v) return true;
          return IN_PHONE_REGEX.test(v);
        },
        message: props => `${props.value} is not a valid Indian phone number (10 digits, optional country code)`,
      },
    },
    dateOfBirth: {
      type: Date,
    },
    image: {
      type: String,
      default: null,
    },
    subscription: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    membershipPlan: {
      type: String,
      enum: ['monthly', 'quarterly', 'halfYearly', 'annually'],
      default: 'monthly',
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },
    suspendedAt: {
      type: Date,
      default: null,
    },
    suspendReason: {
      type: String,
      default: null,
    },
    // Password reset token and expiry
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    // OTP for password reset (one-time password sent to email) and expiry
    resetPasswordOtp: {
      type: String,
      default: null,
    },
    resetPasswordOtpExpires: {
      type: Date,
      default: null,
    },
    // Short-lived marker that OTP was successfully verified (allows 'verified' token from frontend)
    resetPasswordVerified: {
      type: Boolean,
      default: false,
    },
    resetPasswordVerifiedExpires: {
      type: Date,
      default: null,
    },
    // Password will be stored as `salt:hash` using crypto.scryptSync
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        // remove sensitive fields when converting to JSON
        delete ret.password;
        return ret;
      },
    },
  }
);

// Virtual for confirm password (not persisted)
userSchema.virtual('confirmPassword')
  .set(function (value) {
    this._confirmPassword = value;
  })
  .get(function () {
    return this._confirmPassword;
  });

// Pre-save hook: validate confirmPassword and hash password
userSchema.pre('save', function (next) {
  const user = this;

  if (!user.isModified('password')) return next();

  // Ensure confirm password was provided and matches
  if (!user._confirmPassword) {
    return next(new Error('Please confirm your password'));
  }

  if (user.password !== user._confirmPassword) {
    return next(new Error('Passwords do not match'));
  }

  try {
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.scryptSync(user.password, salt, 64).toString('hex');
    user.password = `${salt}:${derived}`;
    // clear the virtual value
    user._confirmPassword = undefined;
    return next();
  } catch (err) {
    return next(err);
  }
});

// Instance method to compare a plain password with stored hash
userSchema.methods.comparePassword = function (candidatePassword) {
  if (!this.password) return false;
  try {
    const [salt, storedHash] = this.password.split(':');
    const derived = crypto.scryptSync(candidatePassword, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(storedHash, 'hex'), Buffer.from(derived, 'hex'));
  } catch (err) {
    return false;
  }
};

const RegisterUser = mongoose.model('RegisterUser', userSchema);

module.exports = RegisterUser;
