const AdminMembership = require('../admin/models/AdminMembership');

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

function formatPlanResponse(planDoc) {
  const plan = typeof planDoc.toObject === 'function' ? planDoc.toObject() : { ...planDoc };
  const months = Number(plan?.validityPeriod?.months) > 0 ? Number(plan.validityPeriod.months) : 1;
  const durationLabel = getDurationLabel(months);
  const priceField = getPriceFieldByMonths(months);
  const amount = plan?.price?.[priceField] ?? plan?.price?.monthly ?? 0;

  return {
    ...plan,
    status: plan.isActive ? 'active' : 'inactive',
    duration: durationLabel,
    durationMonths: months,
    amount,
    displayPrice: `₹${Number(amount || 0).toLocaleString('en-IN')}/${durationLabel}`
  };
}

exports.getAllPlans = async (req, res) => {
  try {
    const { targetAudience } = req.query;

    const filters = { isActive: true };
    if (targetAudience) filters.targetAudience = targetAudience;

    const plans = await AdminMembership.getAllMemberships(filters);

    res.status(200).json({
      success: true,
      data: plans.map(formatPlanResponse)
    });

  } catch (error) {
    console.error('Public get all plans error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch plans'
    });
  }
};

exports.getPlanById = async (req, res) => {
  try {
    const { planId } = req.params;

    const plan = await AdminMembership.getMembershipById(planId);

    if (!plan || plan.isActive === false) {
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
    console.error('Public get plan by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch plan'
    });
  }
};
