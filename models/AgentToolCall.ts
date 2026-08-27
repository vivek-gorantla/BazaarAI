import mongoose, { Schema } from "mongoose";

const { models } = mongoose;
const model = mongoose.model.bind(mongoose);

const AgentToolCallSchema = new Schema(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },

    // Name of the tool executed by the agent
    // Examples:
    // search_catalog
    // get_store
    // check_stock
    // create_cart
    // confirm_cart
    // create_payment
    toolName: {
      type: String,
      required: true,
      index: true,
    },

    // Arguments supplied to the tool
    //
    // Example:
    //
    // {
    //   query: "5kg atta",
    //   maxPrice: 300,
    //   radiusKm: 2
    // }
    input: {
      type: Schema.Types.Mixed,
    },

    // Raw result returned by the tool
    output: {
      type: Schema.Types.Mixed,
    },

    // Tool execution duration
    latencyMs: {
      type: Number,
      min: 0,
    },

    // When the tool call occurred
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);


AgentToolCallSchema.index({
  sessionId: 1,
  timestamp: 1,
});


// Useful for monitoring specific tools
AgentToolCallSchema.index({
  toolName: 1,
  timestamp: -1,
});



const AgentToolCall =
  models.AgentToolCall ||
  model("AgentToolCall", AgentToolCallSchema);

export default AgentToolCall;