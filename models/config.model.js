const mongoose = require("mongoose");

const configSchema = new mongoose.Schema({
    key: { type: String, required: true }, // Config key
    value: {},
});

const Config = mongoose.model("Config", configSchema);

module.exports = Config;



