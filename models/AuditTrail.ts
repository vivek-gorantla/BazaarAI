import mongoose, { Schema } from "mongoose";

const { models } = mongoose;
const model = mongoose.model.bind(mongoose);




const BoundedCheckSchema = new Schema(
  {
    // Maximum amount/value the action was allowed to use
    limit: {
      type: Number,
      min: 0,
    },

    // Actual amount/value attempted
    value: {
      type: Number,
      min: 0,
    },

    // Whether the action satisfied the bound
    passed: {
      type: Boolean,
      required: true,
    },
  },
  { _id: false }
);



const AuditTrailEventSchema = new Schema(
  {
    orderId: {
      type: String,
      index: true,
    },

    // Buyer-agent conversation/session ID
    sessionId: {
      type: String,
      index: true,
    },

    // Who performed the action
    actor: {
      type: String,
      enum: [
        "buyer_agent",
        "owner_agent",
        "system",
      ],
      required: true,
      index: true,
    },

    // Machine-readable event type
    //
    // Examples:
    // catalog_query
    // product_match
    // price_lock
    // cart_created
    // cart_updated
    // payment_intent_created
    // payment_attempted
    // payment_captured
    // payment_failed
    // stock_check
    // item_removed
    // item_substituted
    actionType: {
      type: String,
      required: true,
      index: true,
    },

    // Human-readable explanation shown to the user
    reason: {
      type: String,
      required: true,
      trim: true,
    },

    // Monetary value involved in the action, if applicable
    amount: {
      type: Number,
      min: 0,
    },

    // Proof that the action stayed within its allowed boundary
    boundedCheck: {
      type: BoundedCheckSchema,
    },

    // Event creation time
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },

  {
    // We explicitly control timestamp because
    // the audit event already has `timestamp`.
    timestamps: false,
  }
);

// Retrieve complete order timeline
AuditTrailEventSchema.index({
  orderId: 1,
  timestamp: 1,
});

// Retrieve complete session timeline
AuditTrailEventSchema.index({
  sessionId: 1,
  timestamp: 1,
});

// Retrieve recent events by actor
AuditTrailEventSchema.index({
  actor: 1,
  timestamp: -1,
});




const AuditTrailEvent =
  models.AuditTrailEvent ||
  model("AuditTrailEvent", AuditTrailEventSchema);

export default AuditTrailEvent;