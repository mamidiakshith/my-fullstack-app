const mongoose = require('mongoose');
const { Schema } = mongoose;

// Models/message.js
const messageSchema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  read: { type: Boolean, default: false },
  delivered: { type: Boolean, default: false },
  edited: { type: Boolean, default: false },   // ✅ new
  deleted: { type: Boolean, default: false },  // ✅ optional for "deleted" state
}, { timestamps: true });


// ✅ Prevent OverwriteModelError
const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

module.exports = Message;