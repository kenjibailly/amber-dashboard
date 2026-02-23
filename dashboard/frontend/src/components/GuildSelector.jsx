export default function GuildSelector({ guilds }) {
  if (!guilds.length) return <p>No guilds found</p>;

  return (
    <div>
      <h2>Select a guild</h2>
      <select>
        {guilds.map((guild) => (
          <option key={guild.id} value={guild.id}>
            {guild.name}
          </option>
        ))}
      </select>
    </div>
  );
}
