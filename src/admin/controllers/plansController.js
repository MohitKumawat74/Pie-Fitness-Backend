const AdminMembership = require('../models/AdminMembership');

function parseDurationMonths(value) {
  if (value === undefined || value === null) return undefined;

  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.floor(value));
  }

  const str = String(value).trim().toLowerCase();
  if (!str) return undefined;

  if (str === 'annually' || str === 'annual' || str === 'yearly' || str === 'year') {
    return 12;
  }

  if (str === 'half yearly' || str === 'half-yearly' || str === 'halfyearly') {
    return 6;
  }

  if (str === 'quarterly' || str === 'quarter') {
    return 3;
  }

  if (str === 'monthly' || str === 'month') {
    return 1;
  }

  const numeric = parseInt(str, 10);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }

  return undefined;
}

function getDurationLabel(months) {
  if (!months || months <= 1) return 'month';
  if (months === 12) return 'annually';
  return `${months} months`;
}

function getPriceFieldByMonths(months) {
  if (months === 12) return 'yearly';
  if (months === 6) return 'halfYearly';
  if (months === 3) return 'quarterly';
  return 'monthly';
}

function resolvePlanPrice(plan, months) {
  const price = plan?.price || {};
  const field = getPriceFieldByMonths(months);
  return price[field] ?? price.monthly ?? 0;
}

function formatPlanResponse(planDoc) {
  const plan = typeof planDoc.toObject === 'function' ? planDoc.toObject() : { ...planDoc };
  const months = parseDurationMonths(plan?.validityPeriod?.months) || 1;
  const durationLabel = getDurationLabel(months);
  const amount = resolvePlanPrice(plan, months);

  return {
    ...plan,
    status: plan.isActive ? 'active' : 'inactive',
    sortOrder: plan.priority,
    duration: durationLabel,
    durationMonths: months,
    amount,
    displayPrice: `₹${Number(amount || 0).toLocaleString('en-IN')}/${durationLabel}`
  };
}

function normalizeFeatures(features) {
  if (features === undefined || features === null) return undefined;

  if (typeof features === 'string') {
    const trimmed = features.trim();
    return trimmed ? [{ name: trimmed, included: true }] : [];
  }

  if (!Array.isArray(features)) return undefined;

  const mapped = features.map((item) => {
    if (typeof item === 'string') {
      const name = item.trim();
      return name ? { name, included: true } : null;
    }

    if (item && typeof item === 'object') {
      const name = String(item.name || item.title || item.feature || '').trim();
      if (!name) return null;
      return {
        name,
        included: item.included !== undefined ? Boolean(item.included) : true,
        description: item.description ? String(item.description) : undefined
      };
    }

    return null;
  }).filter(Boolean);

  return mapped;
}

function normalizePlanData(data, { partial = false } = {}) {
  const normalized = { ...data };
  const durationMonths = parseDurationMonths(data.duration ?? data?.validityPeriod?.months);

  const nameSource = data.name || data.planName || data.title || data.displayName;
  const displayNameSource = data.displayName || nameSource;
  const descriptionSource = data.description || (displayNameSource ? `${displayNameSource} plan` : undefined);

  if (!partial || nameSource) normalized.name = nameSource;
  if (!partial || displayNameSource) normalized.displayName = displayNameSource;
  if (!partial || data.description || displayNameSource) normalized.description = descriptionSource;

  const monthlyFrom = data.monthlyPrice ?? data.monthly ?? data.amount;
  let priceValue = data.price;

  if (typeof priceValue === 'number') {
    priceValue = { monthly: priceValue };
  } else if (!priceValue && monthlyFrom !== undefined) {
    priceValue = { monthly: Number(monthlyFrom) };
  } else if (priceValue && typeof priceValue === 'object' && monthlyFrom !== undefined && priceValue.monthly === undefined) {
    priceValue = { ...priceValue, monthly: Number(monthlyFrom) };
  }

  if (priceValue && typeof priceValue === 'object') {
    const priceField = getPriceFieldByMonths(durationMonths || 1);
    const amount = priceValue[priceField] ?? priceValue.monthly;
    if (amount !== undefined) {
      priceValue = {
        ...priceValue,
        [priceField]: Number(amount)
      };

      if (priceValue.monthly === undefined) {
        priceValue.monthly = Number(amount);
      }
    }
  }

  if (!partial || priceValue !== undefined) normalized.price = priceValue;

  if (durationMonths !== undefined) {
    normalized.validityPeriod = { months: durationMonths };
  }

  if (data.status !== undefined) {
    normalized.isActive = String(data.status).toLowerCase() === 'active';
  }

  if (data.sortOrder !== undefined) {
    const sortOrder = Number(data.sortOrder);
    if (Number.isFinite(sortOrder)) {
      normalized.priority = Math.max(1, Math.floor(sortOrder));
    }
  }

  if (data.isPopular !== undefined) {
    normalized.isPopular = Boolean(data.isPopular);
  }

  if (data.features !== undefined) {
    normalized.features = normalizeFeatures(data.features);
  }

  return normalized;
}

class PlansController {
  // Get all plans
  static async getAllPlans(req, res) {
    try {
      const { isActive, targetAudience } = req.query;

      const filters = {};
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (targetAudience) filters.targetAudience = targetAudience;

      const plans = await AdminMembership.getAllMemberships(filters);

      res.status(200).json({
        success: true,
        data: plans.map(formatPlanResponse)
      });

    } catch (error) {
      console.error('Get all plans error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch plans'
      });
    }
  }

  // Get plan by ID
  static async getPlanById(req, res) {
    try {
      const { planId } = req.params;

      const plan = await AdminMembership.getMembershipById(planId);

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Plan not found'
        });
      }

      res.status(200).json({
        success: true,
        data: formatPlanResponse(plan)
      });

    } catch (error) {
      console.error('Get plan by ID error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch plan'
      });
    }
  }

  // Create new plan
  static async createPlan(req, res) {
    try {
      const planData = normalizePlanData(req.body || {}, { partial: false });

      const missing = [];
      if (!planData.name) missing.push('name');
      if (!planData.displayName) missing.push('displayName');
      if (!planData.description) missing.push('description');
      if (!planData.price || planData.price.monthly === undefined || planData.price.monthly === null) {
        missing.push('price.monthly');
      }

      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missing.join(', ')}`
        });
      }

      const newPlan = await AdminMembership.createMembership(planData);

      res.status(201).json({
        success: true,
        message: 'Plan created successfully',
        data: formatPlanResponse(newPlan)
      });

    } catch (error) {
      console.error('Create plan error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create plan'
      });
    }
  }

  // Update plan
  static async updatePlan(req, res) {
    try {
      const { planId } = req.params;
      const updateData = normalizePlanData(req.body || {}, { partial: true });

      const updatedPlan = await AdminMembership.updateMembership(planId, updateData);

      if (!updatedPlan) {
        return res.status(404).json({
          success: false,
          message: 'Plan not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Plan updated successfully',
        data: formatPlanResponse(updatedPlan)
      });

    } catch (error) {
      console.error('Update plan error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update plan'
      });
    }
  }

  // Delete plan
  static async deletePlan(req, res) {
    try {
      const { planId } = req.params;

      const deletedPlan = await AdminMembership.deleteMembership(planId);

      if (!deletedPlan) {
        return res.status(404).json({
          success: false,
          message: 'Plan not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Plan deleted successfully'
      });

    } catch (error) {
      console.error('Delete plan error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete plan'
      });
    }
  }
}

module.exports = PlansController;
