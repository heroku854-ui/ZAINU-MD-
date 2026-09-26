// JavaScript | lib/pairing.js | Node.js 20+ | ZAINU-MD Pairing

"use strict";

function normalizePhoneNumber(number) {
  return String(number || "").replace(/\D/g, "");
}

function validatePhoneNumber(number) {
  const phone = normalizePhoneNumber(number);

  if (!phone) {
    return {
      valid: false,
      number: "",
      error: "WhatsApp phone number is required."
    };
  }

  if (phone.length < 8 || phone.length > 15) {
    return {
      valid: false,
      number: phone,
      error: "Invalid phone number length."
    };
  }

  return {
    valid: true,
    number: phone
  };
}

module.exports = {
  normalizePhoneNumber,
  validatePhoneNumber
};
