import { useAuth } from "@/hooks/useAuth";
import SellingPartnerDashboard from "./Dashboard";
import UtilityPartnerDashboard from "../utility-partner/Dashboard";

/**
 * Utility sellers (profiles.seller_type = "utility") get the simple
 * utility dashboard; normal selling partners get the full dashboard.
 */
const SellingPartnerDashboardRouter = () => {
  const { profile } = useAuth();
  if (profile?.seller_type === "utility") return <UtilityPartnerDashboard />;
  return <SellingPartnerDashboard />;
};

export default SellingPartnerDashboardRouter;
