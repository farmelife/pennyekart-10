import PartnerSignup from "@/components/PartnerSignup";

const UtilityPartnerSignup = () => (
  <PartnerSignup
    userType="selling_partner"
    sellerType="utility"
    loginPath="/utility-partner/login"
    title="Utility Service Partner Signup"
    description="Register to offer outsourced / outside services on Pennyekart"
  />
);

export default UtilityPartnerSignup;