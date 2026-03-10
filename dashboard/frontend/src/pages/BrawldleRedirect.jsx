import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function BrawldleRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(
      { pathname: "/brawldle", search: window.location.search },
      { replace: true },
    );
  }, []);
  return null;
}
