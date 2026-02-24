import { useState } from "react";
import styles from "../styles/ModuleSettings.module.css";

export default function UserPicker({ users, value, onChange }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = users.find((u) => u.id === value);

  const filtered = users.filter((u) => {
    const name = (u.globalName || u.username).toLowerCase();
    const nick = (u.nickname || "").toLowerCase();
    return (
      name.includes(query.toLowerCase()) || nick.includes(query.toLowerCase())
    );
  });

  const getAvatarUrl = (user) => {
    if (user.avatar)
      return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
    return `https://cdn.discordapp.com/embed/avatars/${parseInt(user.id) % 6}.png`;
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        className={styles.input}
        placeholder={
          selected
            ? selected.globalName || selected.username
            : "Search for a user..."
        }
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && filtered.length > 0 && (
        <div
          style={{
            position: "absolute",
            zIndex: 10,
            background: "#2b2d31",
            border: "1px solid #3f4248",
            borderRadius: "4px",
            width: "100%",
            maxHeight: "200px",
            overflowY: "auto",
          }}
        >
          {filtered.map((u) => (
            <div
              key={u.id}
              onMouseDown={() => {
                onChange(u.id);
                setQuery("");
                setOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                cursor: "pointer",
                background: value === u.id ? "#404249" : "transparent",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#35373c")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background =
                  value === u.id ? "#404249" : "transparent")
              }
            >
              <img
                src={getAvatarUrl(u)}
                alt=""
                style={{ width: 24, height: 24, borderRadius: "50%" }}
              />
              <span>{u.globalName || u.username}</span>
              {u.nickname && (
                <span style={{ color: "#888", fontSize: "0.85em" }}>
                  ({u.nickname})
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
