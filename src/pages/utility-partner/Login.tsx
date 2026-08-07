import PartnerLogin from "@/components/PartnerLogin";

const UtilityPartnerLogin = () => (
  <PartnerLogin
    userType="selling_partner"
    title="Utility Partner Login"
    dashboardPath="/utility-partner/dashboard"
    signupPath="/utility-partner/signup"
    forgotPath="/selling-partner/forgot-password"
  />
);

export default UtilityPartnerLogin;