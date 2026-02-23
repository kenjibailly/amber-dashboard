import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get("/auth/session", { withCredentials: true })
      .then((res) => {
        if (res.data.user) {
          setIsAuthenticated(true);
        } else {
          navigate("/");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Auth check failed:", err);
        navigate("/");
        setLoading(false);
      });
  }, [navigate]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>Loading...</div>
    );
  }

  return isAuthenticated ? children : null;
}
