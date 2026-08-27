import mongoose, { Schema } from "mongoose";

const { models } = mongoose;
const model = mongoose.model.bind(mongoose);


// ============================================================
// MESSAGE
// ============================================================

const MessageSchema = new Schema(
  {
    role: {
      type: String,
      enum: [
        "user",
        "assistant",
        "tool",
      ],
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);


// ============================================================
// CHAT SESSION
// ============================================================

const ChatSessionSchema = new Schema(
  {
    // PostgreSQL User.id
    buyerId: {
      type: String,
      required: true,
      index: true,
    },

    // Conversation history
    messages: {
      type: [MessageSchema],
      default: [],
    },

    // PostgreSQL Order.id
    //
    // This represents the active draft cart/order.
    activeCartId: {
      type: String,
      index: true,
    },

    // Lifecycle of the buyer conversation
    status: {
      type: String,
      enum: [
        "active",
        "confirmed",
        "closed",
      ],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);


// ============================================================
// INDEXES
// ============================================================

// Get buyer's latest conversations
ChatSessionSchema.index({
  buyerId: 1,
  updatedAt: -1,
});


// Get active sessions for a buyer
ChatSessionSchema.index({
  buyerId: 1,
  status: 1,
});


// ============================================================
// MODEL
// ============================================================

const ChatSession =
  models.ChatSession ||
  model("ChatSession", ChatSessionSchema);

export default ChatSession;