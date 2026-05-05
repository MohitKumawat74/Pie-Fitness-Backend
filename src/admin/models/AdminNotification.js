const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RegisterUser',
    required: [true, 'Recipient is required'],
    index: true
  },
  recipientType: {
    type: String,
    enum: ['admin', 'user'],
    default: 'admin'
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['general', 'payment', 'subscription', 'user', 'chat', 'trainer', 'system'],
    default: 'general'
  },
  link: {
    type: String,
    trim: true,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RegisterUser',
    default: null
  }
}, {
  timestamps: true
});

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

notificationSchema.statics.createNotification = async function(notificationData) {
  try {
    const notification = new this(notificationData);
    return await notification.save();
  } catch (error) {
    throw new Error('Failed to create notification: ' + error.message);
  }
};

notificationSchema.statics.getNotificationsForRecipient = async function(recipientId, filters = {}, pagination = {}) {
  try {
    const query = { recipientId };

    if (filters.recipientType) query.recipientType = filters.recipientType;
    if (filters.type) query.type = filters.type;
    if (typeof filters.isRead === 'boolean') query.isRead = filters.isRead;

    const page = Math.max(parseInt(pagination.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(pagination.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      this.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.countDocuments(query),
      this.countDocuments({ recipientId, isRead: false })
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1
      },
      unreadCount
    };
  } catch (error) {
    throw new Error('Failed to fetch notifications: ' + error.message);
  }
};

notificationSchema.statics.markAsRead = async function(notificationId, recipientId) {
  try {
    return await this.findOneAndUpdate(
      { _id: notificationId, recipientId },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );
  } catch (error) {
    throw new Error('Failed to mark notification as read: ' + error.message);
  }
};

notificationSchema.statics.markAllAsRead = async function(recipientId) {
  try {
    const result = await this.updateMany(
      { recipientId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    return {
      matchedCount: result.matchedCount ?? result.n,
      modifiedCount: result.modifiedCount ?? result.nModified
    };
  } catch (error) {
    throw new Error('Failed to mark notifications as read: ' + error.message);
  }
};

notificationSchema.statics.deleteNotification = async function(notificationId, recipientId) {
  try {
    return await this.findOneAndDelete({ _id: notificationId, recipientId });
  } catch (error) {
    throw new Error('Failed to delete notification: ' + error.message);
  }
};

const AdminNotification = mongoose.model('AdminNotification', notificationSchema);

module.exports = AdminNotification;