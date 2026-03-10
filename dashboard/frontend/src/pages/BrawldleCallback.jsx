import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// Discord redirects here after OAuth login from the Brawldle page.
// We exchange the code for a session then send the user back to the game.
export default function BrawldleCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) {
      navigate("/brawldle");
      return;
    }

    axios
      .post("/auth/discord-activity", { code }, { withCredentials: true })
      .then(() => navigate("/brawldle"))
      .catch((err) => {
        console.error("Activity auth failed:", err);
        navigate("/brawldle");
      });
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d0d0d",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#888",
        fontFamily: "system-ui",
      }}
    >
      Logging you in…
    </div>
  );
}
