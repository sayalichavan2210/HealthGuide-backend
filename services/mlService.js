const axios = require("axios");

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

exports.analyseRisk = async (profile) => {
  const heightM = profile.heightCm / 100;
  const bmi     = parseFloat((profile.weightKg / (heightM * heightM)).toFixed(1));

  const payload = {
    age:                    profile.age,
    bmi,
    bloodPressureSystolic:  profile.bloodPressureSystolic  || 120,
    bloodPressureDiastolic: profile.bloodPressureDiastolic || 80,
    bloodSugarFasting:      profile.bloodSugarFasting      || 90,
    cholesterolTotal:       profile.cholesterolTotal       || 180,
    heartRateBpm:           profile.heartRateBpm           || 75,
    smokingStatus:          profile.smokingStatus          || "never",
    exerciseDaysPerWeek:    profile.exerciseDaysPerWeek    || 0,
    familyDiabetes:         profile.familyHistory?.diabetes     || false,
    familyHeartDisease:     profile.familyHistory?.heartDisease || false,
    symptoms:               profile.symptoms               || [],
  };

  const { data } = await axios.post(`${ML_URL}/predict`, payload, {
    timeout: 10000,
  });
  return data;
};