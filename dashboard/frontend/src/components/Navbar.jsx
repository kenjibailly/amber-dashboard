import { useNavigate } from "react-router-dom";
import { useState } from "react";
import styles from "../styles/Dashboard.module.css";

export default function Navbar({ user, guilds = [], selectedGuildId = "" }) {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);

  const handleSelect = (guildId) => {
    // Simulate what you used to do in handleGuildChange
    if (guildId) {
      navigate(`/guild/${guildId}`);
    } else {
      navigate("/dashboard");
    }
    setOpen(false);
  };

  const handleLogout = () => {
    window.location.href = "/auth/logout";
  };

  const getAvatarUrl = (user) => {
    if (!user) return null;
    if (user.avatar) {
      const extension = user.avatar.startsWith("a_") ? "gif" : "png";
      return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${extension}`;
    }
    return `https://cdn.discordapp.com/embed/avatars/${
      (parseInt(user.id) >> 22) % 6
    }.png`;
  };

  const getGuildIconUrl = (guild) => {
    if (!guild || !guild.icon) return null;
    return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
  };

  return (
    <nav className={styles.navBar}>
      <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
        <h2
          onClick={() => navigate("/dashboard")}
          style={{ cursor: "pointer" }}
        >
          Discord Dashboard
        </h2>
        {guilds.length > 0 && (
          <div className={styles.dropdown}>
            <div className={styles.selected} onClick={() => setOpen(!open)}>
              {selectedGuildId ? (
                <div className={styles.selectedGuild}>
                  <img
                    src={getGuildIconUrl(
                      guilds.find((g) => g.id === selectedGuildId)
                    )}
                    alt={
                      guilds.find((g) => g.id === selectedGuildId)?.name ||
                      "Selected server"
                    }
                    className={styles.guildIcon}
                  />
                  <span>
                    {guilds.find((g) => g.id === selectedGuildId)?.name}
                  </span>
                </div>
              ) : (
                "Select a server..."
              )}
            </div>

            {open && (
              <div className={styles.menu}>
                {guilds.map((g) => (
                  <div
                    key={g.id}
                    className={styles.option}
                    onClick={() => handleSelect(g.id)}
                  >
                    <img
                      src={getGuildIconUrl(g)}
                      alt={g.name}
                      className={styles.icon}
                    />
                    <span>{g.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {user && (
          <>
            <img
              src={getAvatarUrl(user)}
              alt={user.global_name}
              className={styles.avatar}
            />
            <span>{user.global_name}</span>
          </>
        )}
        <button className={styles.button} onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
