const UserForm = require('../models/UserForm');

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

function validatePersonal(data, errors) {
  if (!data.firstName || typeof data.firstName !== 'string' || !data.firstName.trim()) {
    errors.push({ field: 'firstName', message: 'First name is required' });
  }
  if (!data.lastName || typeof data.lastName !== 'string' || !data.lastName.trim()) {
    errors.push({ field: 'lastName', message: 'Last name is required' });
  }
  if (data.email && !EMAIL_REGEX.test(data.email)) {
    errors.push({ field: 'email', message: 'Invalid email address' });
  }
  if (data.phone && typeof data.phone === 'string') {
    const digits = data.phone.replace(/\D/g, '');
    if (digits.length < 7) errors.push({ field: 'phone', message: 'Phone number looks too short' });
  }
}

function validateEmergency(ec, errors) {
  if (!ec || typeof ec !== 'object') {
    errors.push({ field: 'emergencyContact', message: 'Emergency contact is required' });
    return;
  }
  if (!ec.name || !ec.name.trim()) errors.push({ field: 'emergencyContact.name', message: 'Emergency contact name is required' });
  if (ec.phone) {
    const digits = (ec.phone || '').replace(/\D/g, '');
    if (digits.length < 7) errors.push({ field: 'emergencyContact.phone', message: 'Emergency contact phone looks too short' });
  }
}

function validateMembership(m, errors) {
  const types = ['Basic', 'Premium', 'Family', 'Student', 'Other'];
  const durations = ['1 Month', '3 Months', '6 Months', '1 Year'];
  if (!m || typeof m !== 'object') {
    errors.push({ field: 'membership', message: 'Membership is required' });
    return;
  }
  if (!types.includes(m.type)) errors.push({ field: 'membership.type', message: 'Invalid membership type' });
  if (m.duration && !durations.includes(m.duration)) errors.push({ field: 'membership.duration', message: 'Invalid duration' });
  if (m.preferredStartDate && Number.isNaN(Date.parse(m.preferredStartDate))) errors.push({ field: 'membership.preferredStartDate', message: 'Invalid date' });
}

function validateFitness(f, errors) {
  if (!f) return;
  const levels = ['Beginner', 'Intermediate', 'Advanced'];
  const goals = ['Weight Loss', 'Muscle Gain', 'General Fitness', 'Other'];
  if (f.currentLevel && !levels.includes(f.currentLevel)) errors.push({ field: 'fitness.currentLevel', message: 'Invalid fitness level' });
  if (f.primaryGoal && !goals.includes(f.primaryGoal)) errors.push({ field: 'fitness.primaryGoal', message: 'Invalid primary goal' });
  if (f.hasMedicalConditions && (!f.medicalDetails || !f.medicalDetails.trim())) errors.push({ field: 'fitness.medicalDetails', message: 'Please describe medical conditions' });
}

function validateAgreements(a, errors) {
  if (!a) return;
  if (typeof a.termsAccepted !== 'undefined' && typeof a.termsAccepted !== 'boolean') errors.push({ field: 'agreements.termsAccepted', message: 'Invalid value' });
  if (typeof a.liabilityAccepted !== 'undefined' && typeof a.liabilityAccepted !== 'boolean') errors.push({ field: 'agreements.liabilityAccepted', message: 'Invalid value' });
}

function validatePayment(p, errors) {
  if (!p) return;
  if (p.cardLast4 && !/^\d{4}$/.test(p.cardLast4)) errors.push({ field: 'payment.cardLast4', message: 'cardLast4 must be 4 digits' });
}

// (createForm removed) API surface exposes only submitForm, getForm, updateForm

// Get a form by id
exports.getForm = async (req, res) => {
  const { id } = req.params;
  try {
    const form = await UserForm.findById(id).lean();
    if (!form) return res.status(404).json({ message: 'Form not found' });
    return res.json(form);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching form', error: err.message });
  }
};

// Update a form (partial updates allowed)
exports.updateForm = async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  try {
    const form = await UserForm.findById(id);
    if (!form) return res.status(404).json({ message: 'Form not found' });

    const errors = [];
    // Validate only provided fields
    if (updates.firstName || updates.lastName || updates.email || updates.phone) validatePersonal(updates, errors);
    if (updates.emergencyContact) validateEmergency(updates.emergencyContact, errors);
    if (updates.membership) validateMembership(updates.membership, errors);
    if (updates.fitness) validateFitness(updates.fitness, errors);
    if (updates.agreements) validateAgreements(updates.agreements, errors);
    if (updates.payment) validatePayment(updates.payment, errors);

    if (errors.length) return res.status(400).json({ message: 'Validation failed', errors });

    // merge updates shallowly
    Object.keys(updates).forEach((key) => {
      if (['membership', 'fitness', 'emergencyContact', 'agreements', 'payment'].includes(key)) {
        form[key] = Object.assign({}, form[key] ? form[key].toObject() : {}, updates[key]);
      } else {
        form[key] = updates[key];
      }
    });

    await form.save();
    return res.json({ message: 'Form updated', id: form._id.toString() });
  } catch (err) {
    return res.status(500).json({ message: 'Error updating form', error: err.message });
  }
};

// (listForms removed)
// Submit a form (mark as submitted)
// Accepts: { id?, email?, phone?, agreements } or a full form payload
// If id not provided, will try to find the latest draft form by email or phone.
// If no draft exists but a complete payload is provided, create the draft then submit.
exports.submitForm = async (req, res) => {
  let id = req.body.id || req.query.id || req.params.id;
  const payload = req.body || {};
  const { agreements } = payload;

  try {
    let form = null;

    if (id) {
      form = await UserForm.findById(id);
      if (!form) return res.status(404).json({ message: 'Form not found for provided id' });
    } else {
      // try to locate the draft by email or phone in the payload
      const email = (payload.email || '').toString().trim().toLowerCase();
      const phone = (payload.phone || '').toString().trim();

      if (!email && !phone) {
        // no identifiers — but we might have a full payload to create a form
        // defer check below
      } else {
        const query = {};
        if (email) query.email = email;
        if (phone) query.phone = phone;
        // prefer draft status and most recently updated
        form = await UserForm.findOne(Object.assign(query, { status: 'draft' })).sort({ updatedAt: -1 });
        if (!form) {
          // fallback: any form matching the identifiers
          form = await UserForm.findOne(query).sort({ updatedAt: -1 });
        }
      }

      // If no existing form found, but payload looks like a full form, create it
      const hasRequiredPersonal = payload.firstName && payload.lastName && payload.email;
      if (!form && hasRequiredPersonal) {
        // Validate incoming full payload before creating
        const errors = [];
        validatePersonal(payload, errors);
        if (payload.emergencyContact) validateEmergency(payload.emergencyContact, errors);
        if (payload.membership) validateMembership(payload.membership, errors);
        if (payload.fitness) validateFitness(payload.fitness, errors);
        if (payload.agreements) validateAgreements(payload.agreements, errors);
        if (payload.payment) validatePayment(payload.payment, errors);

        if (errors.length) return res.status(400).json({ message: 'Validation failed', errors });

        // Normalise date fields if present
        if (payload.dateOfBirth) {
          try { payload.dateOfBirth = new Date(payload.dateOfBirth); } catch (e) { /* keep as-is */ }
        }
        if (payload.membership && payload.membership.preferredStartDate) {
          try { payload.membership.preferredStartDate = new Date(payload.membership.preferredStartDate); } catch (e) { /* keep as-is */ }
        }

        // Create draft form
        form = new UserForm(Object.assign({}, payload, { status: 'draft' }));
        await form.save();
        id = form._id.toString();
      }

      if (!form) {
        return res.status(404).json({ message: 'No matching form found for provided identifiers' });
      }
    }

    // At this point we have a form (either found or created)
    const mergedAgreements = agreements || form.agreements || {};
    const termsAccepted = mergedAgreements.termsAccepted ?? form.agreements?.termsAccepted;
    const liabilityAccepted = mergedAgreements.liabilityAccepted ?? form.agreements?.liabilityAccepted;

    const errors = [];
    if (!termsAccepted) errors.push({ field: 'agreements.termsAccepted', message: 'Terms must be accepted' });
    if (!liabilityAccepted) errors.push({ field: 'agreements.liabilityAccepted', message: 'Liability must be accepted' });

    if (errors.length) return res.status(400).json({ message: 'Validation failed', errors });

    // Merge any incoming payload fields onto the stored form (shallow merge for sub-docs)
    Object.keys(payload).forEach((key) => {
      if (['membership', 'fitness', 'emergencyContact', 'agreements', 'payment'].includes(key)) {
        form[key] = Object.assign({}, form[key] ? form[key].toObject() : {}, payload[key]);
      } else if (key !== 'id') {
        form[key] = payload[key];
      }
    });

    form.agreements = Object.assign({}, form.agreements || {}, mergedAgreements);
    form.status = 'submitted';
    await form.save();

    return res.json({ message: 'Form submitted', id: form._id.toString() });
  } catch (err) {
    return res.status(500).json({ message: 'Error submitting form', error: err.message });
  }
};
