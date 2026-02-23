import Navbar from "../components/Navbar";
import useAuth from "../hooks/useAuth";
import styles from "../styles/Dashboard.module.css";

export default function Dashboard() {
  const { user, guilds, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <Navbar user={user} guilds={guilds} />

      <div style={{ padding: "2rem" }}>
        <h1>Welcome to your Dashboard!</h1>
        {guilds.length > 0 ? (
          <div>
            <p>Select a server from the dropdown to configure its settings.</p>
            <p>
              <a
                href={`https://discord.com/api/oauth2/authorize?client_id=${
                  import.meta.env.VITE_DISCORD_CLIENT_ID
                }&permissions=8&scope=bot`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginRight: "10px" }}
              >
                <button class={styles.button}>Add to server</button>
              </a>
            </p>
          </div>
        ) : (
          <div>
            <p>No servers available to manage.</p>
            <p>To manage a server, you need:</p>
            <ul>
              <li>The bot must be in the server</li>
              <li>You must have "Manage Server" permissions</li>
            </ul>
            <p>
              <a
                href={`https://discord.com/api/oauth2/authorize?client_id=${
                  import.meta.env.VITE_DISCORD_CLIENT_ID
                }&permissions=8&scope=bot`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginRight: "10px" }}
              >
                <button class={styles.button}>Add to server</button>
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
