import { useEffect, useState } from "react";
import axios from "axios";

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const res = await axios.get("/auth/session", { withCredentials: true });
      setUser(res.data.user);
      setGuilds(res.data.guilds || []);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch session:", err);
      setLoading(false);
    }
  };

  const refreshGuilds = async () => {
    try {
      const res = await axios.post(
        "/auth/refresh-guilds",
        {},
        { withCredentials: true }
      );
      setGuilds(res.data.guilds || []);
      return res.data.guilds;
    } catch (err) {
      console.error("Failed to refresh guilds:", err);
      return null;
    }
  };

  useEffect(() => {
    fetchSession();

    // Auto-refresh guilds when user returns to the tab
    const handleFocus = () => {
      if (user) {
        refreshGuilds();
      }
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [user]);

  return { user, guilds, loading, refreshGuilds };
}
