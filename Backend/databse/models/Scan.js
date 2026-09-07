const mongoose = require("mongoose");

const scanSchema = new mongoose.Schema({

cowId:{
type: mongoose.Schema.Types.ObjectId,
required:true
},

side:String,
neck:String,
back:String,
legs:String,
under:String,

lsd_percent:{
type:Number,
default:0
},

avg_score:{
type:Number,
default:0
},

severity:{
type:String,
default:"None"
},

daylight:Boolean,
centered:Boolean,
clear:Boolean,

 // Early symptoms (booleans)
 symptom_fever: { type: Boolean, default: false },
 symptom_milkReduced: { type: Boolean, default: false },
 symptom_eatingLess: { type: Boolean, default: false },
 symptom_discharge: { type: Boolean, default: false },
 symptom_vaccinated: { type: Boolean, default: false },

// Farmer meta
villageName: { type: String, default: "" },
animalAge: { type: String, default: "" },

// ML detail
per_image: { type: [Number], default: [] },
per_image_severity: { type: [String], default: [] },
visibility_scores: { type: [mongoose.Schema.Types.Mixed], default: [] },
reportDate: { type: String, default: "" },
remedies: {
type: [{
title: { type: String, default: "" },
purpose: { type: String, default: "" },
steps: { type: String, default: "" },
evidence: { type: String, default: "" }
}],
default: []
},
remedySource: { type: String, default: "" },
remedyModel: { type: String, default: "" },
aiAdvice: { type: String, default: "" },
aiAdviceSource: { type: String, default: "" },
aiAdviceModel: { type: String, default: "" },

// Generated PDF report filename
reportFile: { type: String, default: "" },

createdAt:{
type:Date,
default:Date.now
}

});

module.exports = mongoose.model("Scan", scanSchema);
