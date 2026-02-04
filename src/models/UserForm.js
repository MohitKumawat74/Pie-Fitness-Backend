const mongoose = require('mongoose');

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

const EmergencyContactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  relationship: { type: String, trim: true },
  phone: { type: String, trim: true },
});

const MembershipSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['monthly', 'quarterly', 'halfYearly', 'annually'],
    default: 'monthly',
  },
  duration: {
    type: String,
    enum: ['1 Month', '3 Months', '6 Months', '1 Year'],
    default: '1 Month',
  },
  preferredStartDate: { type: Date },
});

const FitnessSchema = new mongoose.Schema({
  currentLevel: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
  primaryGoal: { type: String, enum: ['Weight Loss', 'Muscle Gain', 'General Fitness', 'Other'], default: 'General Fitness' },
  hasMedicalConditions: { type: Boolean, default: false },
  medicalDetails: { type: String, trim: true },
  additionalInterests: [{ type: String, trim: true }],
});

const PaymentSchema = new mongoose.Schema({
  method: { type: String, trim: true },
  cardLast4: { type: String, trim: true },
  transactionId: { type: String, trim: true },
});

const UserFormSchema = new mongoose.Schema(
  {
    // Step 1: Personal Information
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    email: { type: String, required: true, trim: true, lowercase: true, validate: { validator: v => EMAIL_REGEX.test(v), message: 'Invalid email' } },
    phone: { type: String, trim: true },

    // Step 2: Emergency Contact
    emergencyContact: { type: EmergencyContactSchema, required: true },

    // Step 3: Membership Details
    membership: { type: MembershipSchema, required: true },

    // Step 4: Fitness & Health Information
    fitness: { type: FitnessSchema },

    // Step 5: Agreements & Payment
    agreements: {
      termsAccepted: { type: Boolean, default: false },
      liabilityAccepted: { type: Boolean, default: false },
    },
    payment: { type: PaymentSchema },

    // Meta
    status: { type: String, enum: ['draft', 'submitted', 'cancelled'], default: 'draft' },
  },
  { timestamps: true }
);

// Virtual: fullName
UserFormSchema.virtual('fullName').get(function () {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

// Instance method: produce a compact review summary for Step 6
UserFormSchema.methods.getSummary = function () {
  return {
    id: this._id.toString(),
    fullName: this.fullName,
    dateOfBirth: this.dateOfBirth?.toISOString() ?? null,
    gender: this.gender ?? null,
    email: this.email ?? null,
    phone: this.phone ?? null,
    emergencyContact: this.emergencyContact || null,
    membership: this.membership || null,
    fitness: this.fitness || null,
    agreements: this.agreements || null,
    payment: this.payment || null,
    status: this.status,
    createdAt: this.createdAt?.toISOString() ?? null,
    updatedAt: this.updatedAt?.toISOString() ?? null,
  };
};

const UserForm = mongoose.model('UserForm', UserFormSchema);

module.exports = UserForm;
