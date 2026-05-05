const mongoose = require('mongoose');
const AdminMembership = require('../models/AdminMembership');
const Subscription = require('../../models/Subscription');
const RegisterUser = require('../../models/RegisterUser');

function normalizePlanType(value) {
  const key = String(value || '').toLowerCase().trim();
  const map = {
    monthly: 'monthly',
    quarterly: 'quarterly',
    halfyearly: 'halfYearly',
    'half-yearly': 'halfYearly',
    yearly: 'yearly',
    annual: 'yearly',
    annually: 'yearly'
  };
  return map[key] || null;
}

function inferPlanTypeFromName(name) {
  const key = String(name || '').toLowerCase().trim();
  if (!key) return null;
  if (key.includes('quarter')) return 'quarterly';
  if (key.includes('half')) return 'halfYearly';
  if (key.includes('year') || key.includes('annual')) return 'yearly';
  if (key.includes('month')) return 'monthly';
  return null;
}

function planNameFromType(planType) {
  const map = {
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    halfYearly: 'Half Yearly',
    yearly: 'Yearly'
  };
  return map[planType] || null;
}

function addMonths(date, months) {
  const result = new Date(date);
  const day = result.getDate();
  result.setMonth(result.getMonth() + months);
  if (result.getDate() !== day) {
    result.setDate(0);
  }
  return result;
}

function getDurationMonths(planType, planName) {
  const normalizedType = normalizePlanType(planType) || inferPlanTypeFromName(planName);

  switch (normalizedType) {
    case 'monthly':
      return 1;
    case 'quarterly':
      return 3;
    case 'halfYearly':
      return 6;
    case 'yearly':
      return 12;
    default:
      return 0;
  }
}

function planTypeFromName(name) {
  const key = String(name || '').toLowerCase().trim();
  if (!key) return null;
  if (key.includes('quarter')) return 'quarterly';
  if (key.includes('half')) return 'halfYearly';
  if (key.includes('year')) return 'yearly';
  if (key.includes('month')) return 'monthly';
  return null;
}

function userPlanFromType(planType) {
  const map = {
    monthly: 'monthly',
    quarterly: 'quarterly',
    halfYearly: 'halfYearly',
    yearly: 'annually'
  };
  return map[planType] || null;
}

class MembershipsController {
  // Get all memberships
  static async getAllMemberships(req, res) {
    try {
      const { isActive, targetAudience, type } = req.query;
      
      // By default, return user subscriptions (since that's what the form creates)
      // Use ?type=plans to get membership plans instead
      if (type === 'plans') {
        const filters = {};
        if (isActive !== undefined) filters.isActive = isActive === 'true';
        if (targetAudience) filters.targetAudience = targetAudience;

        const memberships = await AdminMembership.getAllMemberships(filters);

        return res.status(200).json({
          success: true,
          data: memberships,
          type: 'membership_plans'
        });
      }

      // Default: Return user subscriptions
      const subscriptions = await Subscription.find().lean();

      res.status(200).json({
        success: true,
        data: subscriptions,
        count: subscriptions.length,
        type: 'user_subscriptions'
      });

    } catch (error) {
      console.error('Get all memberships error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch memberships'
      });
    }
  }

  // Get membership by ID
  static async getMembershipById(req, res) {
    try {
      const membershipId = req.params.membershipId || req.params.id;

      if (!membershipId) {
        return res.status(400).json({
          success: false,
          message: 'Membership ID is required'
        });
      }

      // Try to get subscription first
      let membership = await Subscription.findById(membershipId).lean();

      // If not found in subscriptions, try membership plans
      if (!membership) {
        membership = await AdminMembership.getMembershipById(membershipId);
      }

      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'Membership or subscription not found'
        });
      }

      res.status(200).json({
        success: true,
        data: membership
      });

    } catch (error) {
      console.error('Get membership by ID error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch membership'
      });
    }
  }

  // Create new membership
  static async createMembership(req, res) {
    try {
      const membershipData = req.body;

      // Detect if this is a user subscription request instead of a membership plan
      if (membershipData.memberId || membershipData.memberEmail || membershipData.memberName) {
        // This is a user subscription request - delegate to createUserSubscription
        return MembershipsController.createUserSubscription(req, res);
      }

      // This is a membership plan request
      const newMembership = await AdminMembership.createMembership(membershipData);

      res.status(201).json({
        success: true,
        message: 'Membership created successfully',
        data: newMembership
      });

    } catch (error) {
      console.error('Create membership error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create membership'
      });
    }
  }

  // Update membership
  static async updateMembership(req, res) {
    try {
      const membershipId = req.params.membershipId || req.params.id;
      const updateData = { ...req.body };

      if (!membershipId) {
        return res.status(400).json({
          success: false,
          message: 'Membership ID is required'
        });
      }

      if (updateData.planType) {
        const normalized = normalizePlanType(updateData.planType);
        if (normalized) {
          updateData.planType = normalized;
          updateData.planName = planNameFromType(normalized) || updateData.planName;
        }
      } else if (updateData.planName) {
        const inferred = inferPlanTypeFromName(updateData.planName);
        if (inferred) {
          updateData.planType = inferred;
          updateData.planName = planNameFromType(inferred) || updateData.planName;
        }
      }

      // Try to update subscription first
      let updatedMembership = await Subscription.findByIdAndUpdate(membershipId, updateData, { new: true });

      // If not found in subscriptions, try membership plans
      if (!updatedMembership) {
        updatedMembership = await AdminMembership.updateMembership(membershipId, updateData);
      }

      if (!updatedMembership) {
        return res.status(404).json({
          success: false,
          message: 'Membership or subscription not found'
        });
      }

      if (updatedMembership.memberEmail || updatedMembership.memberId || updateData.memberEmail || updateData.memberId) {
        const currentPlanType = updatedMembership.planType || updateData.planType || inferPlanTypeFromName(updatedMembership.planName || updateData.planName);
        const durationMonths = getDurationMonths(currentPlanType, updatedMembership.planName || updateData.planName);
        if (durationMonths > 0 && updatedMembership.startDate) {
          updatedMembership.endDate = addMonths(updatedMembership.startDate, durationMonths);
          if (updatedMembership.nextBillingDate !== undefined) {
            updatedMembership.nextBillingDate = updatedMembership.endDate;
          }
          await updatedMembership.save();
        }
      }

      const updatedDoc = updatedMembership && updatedMembership.toObject ? updatedMembership.toObject() : updatedMembership;
      const isSubscriptionUpdate = updatedDoc && (updatedDoc.memberEmail || updatedDoc.memberId || updateData.memberEmail || updateData.memberId);

      if (isSubscriptionUpdate) {
        const effectivePlanType =
          updatedDoc.planType ||
          updateData.planType ||
          planTypeFromName(updatedDoc.planName || updateData.planName) ||
          'monthly';
        const effectivePlanName =
          updatedDoc.planName ||
          updateData.planName ||
          planNameFromType(effectivePlanType) ||
          'Monthly';

        const subscriptionSnapshot = {
          id: updatedDoc._id ? updatedDoc._id.toString() : membershipId,
          planName: effectivePlanName,
          status: updatedDoc.status || 'active',
          startDate: updatedDoc.startDate,
          endDate: updatedDoc.endDate,
          price: updatedDoc.price || updatedDoc.amount || 0
        };

        const planForUser = userPlanFromType(effectivePlanType) || 'monthly';

        const orQuery = [];
        const memberIdValue = updatedDoc.memberId || updateData.memberId;
        const memberEmailValue = updatedDoc.memberEmail || updateData.memberEmail;
        if (memberIdValue && mongoose.Types.ObjectId.isValid(memberIdValue)) {
          orQuery.push({ _id: new mongoose.Types.ObjectId(memberIdValue) });
        }
        if (memberEmailValue) {
          orQuery.push({ email: String(memberEmailValue).toLowerCase() });
        }

        if (orQuery.length > 0) {
          await RegisterUser.findOneAndUpdate(
            { $or: orQuery },
            { subscription: subscriptionSnapshot, membershipPlan: planForUser },
            { new: true }
          ).select('_id email membershipPlan subscription');
        }
      }

      res.status(200).json({
        success: true,
        message: 'Membership updated successfully',
        data: updatedMembership
      });

    } catch (error) {
      console.error('Update membership error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update membership'
      });
    }
  }

  // Delete membership
  static async deleteMembership(req, res) {
    try {
      const membershipId = req.params.membershipId || req.params.id;

      if (!membershipId) {
        return res.status(400).json({
          success: false,
          message: 'Membership ID is required'
        });
      }

      console.log('=== DELETE ATTEMPT ===');
      console.log('Membership ID:', membershipId);

      // First, verify the record exists
      const checkRecord = await Subscription.findById(membershipId);
      console.log('Record found in Subscription:', !!checkRecord);
      if (checkRecord) {
        console.log('Record data:', checkRecord);
      }

      // Try to delete
      const deleteResult = await Subscription.findByIdAndDelete(membershipId);
      console.log('Delete result from Subscription:', deleteResult);

      if (deleteResult) {
        console.log('✓ Successfully deleted from Subscription');
        return res.status(200).json({
          success: true,
          message: 'Membership deleted successfully',
          data: deleteResult
        });
      }

      // If not found in subscriptions, try membership plans
      console.log('Not in Subscription, checking AdminMembership...');
      const adminDeleteResult = await AdminMembership.deleteMembership(membershipId);
      console.log('Delete result from AdminMembership:', adminDeleteResult);

      if (adminDeleteResult) {
        console.log('✓ Successfully deleted from AdminMembership');
        return res.status(200).json({
          success: true,
          message: 'Membership deleted successfully',
          data: adminDeleteResult
        });
      }

      console.log('✗ Record not found in either collection');
      return res.status(404).json({
        success: false,
        message: 'Membership or subscription not found'
      });

    } catch (error) {
      console.error('✗ Delete membership error:', error.message);
      console.error(error.stack);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete membership'
      });
    }
  }

  // Get membership statistics
  static async getMembershipStats(req, res) {
    try {
      const stats = await AdminMembership.getMembershipStats();

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get membership stats error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch membership statistics'
      });
    }
  }

  // Bulk actions (delete, activate, deactivate, update)
  static async bulkActions(req, res) {
    try {
      const { action, membershipIds, updateData } = req.body || {};

      if (!action || !Array.isArray(membershipIds) || membershipIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid bulk action request' });
      }

      let result;
      switch (action) {
        case 'delete':
          result = await AdminMembership.deleteMany({ _id: { $in: membershipIds } });
          break;
        case 'activate':
          result = await AdminMembership.updateMany({ _id: { $in: membershipIds } }, { isActive: true });
          break;
        case 'deactivate':
          result = await AdminMembership.updateMany({ _id: { $in: membershipIds } }, { isActive: false });
          break;
        case 'update':
          if (!updateData || typeof updateData !== 'object') {
            return res.status(400).json({ success: false, message: 'Invalid update data' });
          }
          result = await AdminMembership.updateMany({ _id: { $in: membershipIds } }, updateData);
          break;
        default:
          return res.status(400).json({ success: false, message: 'Unknown bulk action' });
      }

      res.status(200).json({
        success: true,
        message: `Bulk ${action} completed successfully`,
        data: { result }
      });

    } catch (error) {
      console.error('Bulk membership action error:', error);
      res.status(500).json({ success: false, message: error.message || 'Bulk action failed' });
    }
  }

  // Create user subscription (assign membership plan to user)
  static async createUserSubscription(req, res) {
    try {
      const subscriptionData = req.body;

      // Validate required fields
      const requiredFields = ['memberId', 'memberName', 'memberEmail', 'amount', 'startDate', 'endDate'];
      const missingFields = requiredFields.filter(field => !subscriptionData[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`
        });
      }

      const planType = normalizePlanType(subscriptionData.planType)
        || inferPlanTypeFromName(subscriptionData.planName)
        || 'monthly';
      const normalizedPlanName = subscriptionData.planName
        ? String(subscriptionData.planName).trim()
        : planNameFromType(planType) || planType.charAt(0).toUpperCase() + planType.slice(1);
      const resolvedStartDate = new Date(subscriptionData.startDate);
      const durationMonths = getDurationMonths(planType, normalizedPlanName);
      const resolvedEndDate = durationMonths > 0
        ? addMonths(resolvedStartDate, durationMonths)
        : new Date(subscriptionData.endDate);

      // Create new subscription
      const newSubscription = new Subscription({
        memberId: String(subscriptionData.memberId),
        memberName: String(subscriptionData.memberName),
        memberEmail: String(subscriptionData.memberEmail),
        planName: normalizedPlanName,
        planType,
        amount: Number(subscriptionData.amount),
        price: Number(subscriptionData.price || subscriptionData.amount),
        paymentMethod: subscriptionData.paymentMethod || 'Cash',
        paymentStatus: subscriptionData.paymentStatus || 'pending',
        startDate: resolvedStartDate,
        endDate: resolvedEndDate,
        nextBillingDate: subscriptionData.nextBillingDate ? new Date(subscriptionData.nextBillingDate) : resolvedEndDate,
        lastPaymentDate: subscriptionData.lastPaymentDate ? new Date(subscriptionData.lastPaymentDate) : null,
        status: subscriptionData.status || 'active',
        autoRenewal: Boolean(subscriptionData.autoRenewal) || false
      });

      console.log('Saving subscription with data:', newSubscription);
      const savedSubscription = await newSubscription.save();
      
      console.log('Subscription saved successfully:', savedSubscription);

      // Link subscription to user profile for consistent API responses
      const subscriptionSnapshot = {
        id: savedSubscription._id.toString(),
        planName: normalizedPlanName,
        startDate: savedSubscription.startDate,
        endDate: savedSubscription.endDate,
        price: savedSubscription.price || 0,
        status: savedSubscription.status || 'active'
      };

      const planTypeKey = planType.toLowerCase();
      const planForUser = {
        monthly: 'monthly',
        quarterly: 'quarterly',
        halfyearly: 'halfYearly',
        'half-yearly': 'halfYearly',
        yearly: 'annually',
        annually: 'annually'
      }[planTypeKey] || 'monthly';

      const orQuery = [];
      if (subscriptionData.memberId && mongoose.Types.ObjectId.isValid(subscriptionData.memberId)) {
        orQuery.push({ _id: new mongoose.Types.ObjectId(subscriptionData.memberId) });
      }
      if (subscriptionData.memberEmail) {
        orQuery.push({ email: String(subscriptionData.memberEmail).toLowerCase() });
      }

      let linkedUser = null;
      if (orQuery.length > 0) {
        linkedUser = await RegisterUser.findOneAndUpdate(
          { $or: orQuery },
          { subscription: subscriptionSnapshot, membershipPlan: planForUser },
          { new: true }
        ).select('_id email membershipPlan subscription');
      }

      // Convert to plain object to ensure all fields are returned
      const subscriptionObject = savedSubscription.toObject ? savedSubscription.toObject() : JSON.parse(JSON.stringify(savedSubscription));

      res.status(201).json({
        success: true,
        message: 'User subscription created successfully',
        data: subscriptionObject,
        linkedUser
      });

    } catch (error) {
      console.error('Create user subscription error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create user subscription'
      });
    }
  }

  // Get user subscription by ID
  static async getUserSubscriptionById(req, res) {
    try {
      const { subscriptionId } = req.params;

      if (!subscriptionId) {
        return res.status(400).json({
          success: false,
          message: 'Subscription ID is required'
        });
      }

      const subscription = await Subscription.findById(subscriptionId).lean();

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      res.status(200).json({
        success: true,
        data: subscription
      });

    } catch (error) {
      console.error('Get user subscription error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve user subscription'
      });
    }
  }

  // Get all user subscriptions
  static async getAllUserSubscriptions(req, res) {
    try {
      const subscriptions = await Subscription.find().lean();

      res.status(200).json({
        success: true,
        data: subscriptions,
        count: subscriptions.length
      });

    } catch (error) {
      console.error('Get all user subscriptions error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve user subscriptions'
      });
    }
  }
}

module.exports = MembershipsController;