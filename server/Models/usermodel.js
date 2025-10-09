const mongoose = require('mongoose');
const { Schema } = mongoose;

// User Schema
const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    isOnline: {
      type: Boolean,
      default: false
    },
    lastSeen: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true // automatically adds createdAt and updatedAt
  }
);

// ✅ Prevent OverwriteModelError (useful in dev/hot reload)
const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;
