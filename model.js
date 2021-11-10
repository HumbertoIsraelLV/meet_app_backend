const {Schema, model} = require("mongoose");

const SessionSchema = new Schema({
  _id: {
    type: Date,
    required: true,
  },
  participants:[{
    _id: {
      type: Number,
    },
    score: {
      type: Number,
    }
  }],
});
module.exports=model("Session", SessionSchema, "Session");