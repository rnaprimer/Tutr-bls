import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    TUTR_TUTOR_ONBOARDING_FEE_INR: process.env.TUTR_TUTOR_ONBOARDING_FEE_INR || "149",
    TUTR_CONNECTION_FEE_INR: process.env.TUTR_CONNECTION_FEE_INR || "99",
  },
};

export default nextConfig;
