const Subscription = require('../models/Subscription');

// Helper: add months to a date while preserving day where possible
function addMonths(date, months) {
    const d = new Date(date);
    const day = d.getDate();
    d.setMonth(d.getMonth() + months);
    // If month rolled over (e.g., from Jan 31 adding 1 month -> Mar 3), adjust
    if (d.getDate() !== day) {
        d.setDate(0); // set to last day of previous month
    }
    return d;
}

// Map plan name to duration in months
function monthsForPlan(planName) {
    if (!planName) return 0;
    const p = String(planName).toLowerCase();
    if (p.includes('month') && p.includes('quarter') === false && p.includes('quarterly') === false) return 1; // 'monthly' or 'month'
    if (p.includes('quarter') || p.includes('quarterly')) return 3;
    if (p.includes('half') || p.includes('half-year') || p.includes('halfyear') || p.includes('half yearly')) return 6;
    if (p.includes('year') || p.includes('annual') || p.includes('annually') || p.includes('yearly')) return 12;
    // Fallbacks for named plans (e.g. Basic/Elite) -- you can add explicit mappings here
    const named = p.trim();
    if (named === 'basic' || named === 'monthly') return 1;
    if (named === 'quarterly') return 3;
    if (named === 'half yearly' || named === 'half-yearly' || named === 'halfyearly') return 6;
    if (named === 'annual' || named === 'annually' || named === 'yearly') return 12;
    return 0;
}

// Create a new subscription    
exports.createSubscription = async (req, res) => {
    try {
        const { plan, startDate, endDate, price } = req.body;
        if (!plan || !startDate) {
            return res.status(400).json({ message: 'plan and startDate are required' });
        }
        // Compute endDate from plan duration (override any provided endDate)
        const months = monthsForPlan(plan);
        let computedEndDate = null;
        if (months > 0) {
            computedEndDate = addMonths(startDate, months);
        } else if (endDate) {
            computedEndDate = new Date(endDate);
        }

        const newSubscription = new Subscription({
            planName: plan,
            startDate,
            endDate: computedEndDate,
            price: price || 0,
            status: 'active'
        });
        await newSubscription.save();
        const payload = {
            id: newSubscription._id.toString(),
            planName: newSubscription.planName,
            startDate: newSubscription.startDate,
            endDate: newSubscription.endDate,
            price: newSubscription.price || 0,
            status: newSubscription.status || 'active'
        };
        return res.status(201).json({ message: 'Subscription created successfully', subscription: payload });
    } catch (error) {
        console.error('Error creating subscription:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
// get a subscription by id
exports.getSubscriptionById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ message: 'Missing subscription id' });
        const subscription = await Subscription.findById(id);
        if (!subscription) return res.status(404).json({ message: 'Subscription not found' });
        return res.status(200).json({ subscription: {
            id: subscription._id.toString(),
            planName: subscription.planName,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            price: subscription.price || 0,
            status: subscription.status || 'inactive'
        }});
    } catch (error) {
        console.error('Error fetching subscription:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
// get all subscriptions
exports.getAllSubscriptions = async (req, res) => {
    try {
        const subscriptions = await Subscription.find().lean();
        const mapped = subscriptions.map(s => ({
            id: s._id.toString(),
            planName: s.planName,
            startDate: s.startDate,
            endDate: s.endDate,
            price: s.price || 0,
            status: s.status || 'inactive'
        }));
        return res.status(200).json({ subscriptions: mapped });
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
// update a subscription by id
exports.updateSubscription = async (req, res) => {
    try {
    const { id } = req.params;
    const { planName, startDate, endDate, status, price } = req.body;
        if (!id) return res.status(400).json({ message: 'Missing subscription id' });
        const subscription = await Subscription.findById(id);
        if (!subscription) return res.status(404).json({ message: 'Subscription not found' });
        const oldPlan = subscription.planName;
        subscription.planName = planName || subscription.planName;
        subscription.startDate = startDate || subscription.startDate;
        // If plan changed or startDate provided, recompute endDate based on plan
        const recompute = (planName && planName !== oldPlan) || (startDate && startDate !== subscription.startDate);
        if (recompute) {
            const months = monthsForPlan(subscription.planName);
            if (months > 0) {
                subscription.endDate = addMonths(subscription.startDate, months);
            } // else keep existing
        } else if (endDate) {
            subscription.endDate = endDate;
        }
    subscription.status = status || subscription.status;
    if (price !== undefined) subscription.price = typeof price === 'number' ? price : Number(price);
        await subscription.save();
        return res.status(200).json({ message: 'Subscription updated successfully', subscription: {
            id: subscription._id.toString(),
            planName: subscription.planName,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            price: subscription.price || 0,
            status: subscription.status || 'inactive'
        }});
    } catch (error) {
        console.error('Error updating subscription:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// delete a subscription by id
exports.deleteSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ message: 'Missing subscription id' });
        const subscription = await Subscription.findById(id);
        if (!subscription) return res.status(404).json({ message: 'Subscription not found' });
        await subscription.remove();
        return res.status(200).json({ message: 'Subscription deleted successfully' });
    } catch (error) {
        console.error('Error deleting subscription:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
