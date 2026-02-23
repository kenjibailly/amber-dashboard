import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import EmbedEditor from "../components/embed/EmbedEditor";
import EmbedPreview from "../components/embed/EmbedPreview";
import useAuth from "../hooks/useAuth";
import styles from "../styles/Dashboard.module.css";
import embedStyles from "../styles/EmbedBuilder.module.css";

export default function EmbedBuilder() {
  const { guildId } = useParams();
  const navigate = useNavigate();
  const { user, guilds, loading: authLoading } = useAuth();

  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState("");
  const [messageLink, setMessageLink] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [messageId, setMessageId] = useState("");
  const [channelId, setChannelId] = useState("");

  const [embedData, setEmbedData] = useState({
    content: "",
    embeds: [
      {
        author: {
          name: "",
          url: "",
          icon_url: "",
        },
        title: "",
        url: "",
        description: "",
        color: 5814783, // #58b9ff in decimal
        fields: [],
        thumbnail: {
          url: "",
        },
        image: {
          url: "",
        },
        footer: {
          text: "",
          icon_url: "",
        },
        timestamp: "",
      },
    ],
    components: [],
  });

  useEffect(() => {
    if (!authLoading) {
      fetchChannels();
    }
  }, [guildId, authLoading]);

  const fetchChannels = async () => {
    try {
      const response = await axios.get(`/guilds/${guildId}/channels`, {
        withCredentials: true,
      });
      setChannels(response.data.channels || []);
    } catch (err) {
      console.error("Failed to fetch channels:", err);
    }
  };

  const loadExistingMessage = async () => {
    if (!messageLink.trim()) {
      alert("Please enter a message link");
      return;
    }

    const linkMatch = messageLink.match(/channels\/(\d+)\/(\d+)\/(\d+)/);
    if (!linkMatch) {
      alert("Invalid message link format");
      return;
    }

    const [, linkGuildId, channelIdFromLink, messageIdFromLink] = linkMatch;

    if (linkGuildId !== guildId) {
      alert("Message link is from a different server");
      return;
    }

    try {
      const response = await axios.get(
        `/guilds/${guildId}/message/${channelIdFromLink}/${messageIdFromLink}`,
        {
          withCredentials: true,
        }
      );

      setEmbedData({
        content: response.data.content || "",
        embeds:
          response.data.embeds.length > 0
            ? response.data.embeds
            : embedData.embeds,
        components: response.data.components || [],
      });

      setIsEditing(true);
      setMessageId(messageIdFromLink);
      setChannelId(channelIdFromLink);
      setSelectedChannel(channelIdFromLink);
    } catch (err) {
      console.error("Failed to load message:", err);
      alert("Failed to load message. Make sure the bot has access to it.");
    }
  };

  const handleSendOrEdit = async () => {
    if (!selectedChannel && !isEditing) {
      alert("Please select a channel");
      return;
    }

    // Validation
    const embed = embedData.embeds[0];
    if (embed) {
      if (embed.title && embed.title.length > 256) {
        alert("Title must be 256 characters or less");
        return;
      }
      if (embed.description && embed.description.length > 4096) {
        alert("Description must be 4096 characters or less");
        return;
      }
      if (embed.author?.name && embed.author.name.length > 256) {
        alert("Author name must be 256 characters or less");
        return;
      }
      if (embed.footer?.text && embed.footer.text.length > 2048) {
        alert("Footer text must be 2048 characters or less");
        return;
      }
      for (const field of embed.fields || []) {
        if (field.name.length > 256) {
          alert("Field name must be 256 characters or less");
          return;
        }
        if (field.value.length > 1024) {
          alert("Field value must be 1024 characters or less");
          return;
        }
      }
    }

    try {
      if (isEditing) {
        await axios.put(
          `/guilds/${guildId}/message/${channelId}/${messageId}`,
          embedData,
          {
            withCredentials: true,
          }
        );
        alert("Message updated successfully!");
      } else {
        await axios.post(
          `/guilds/${guildId}/message/${selectedChannel}`,
          embedData,
          {
            withCredentials: true,
          }
        );
        alert("Message sent successfully!");
        // Reset form
        setMessageLink("");
        setIsEditing(false);
        setMessageId("");
        setChannelId("");
      }
    } catch (err) {
      console.error("Failed to send/edit message:", err);
      alert(err.response?.data?.error || "Failed to send/edit message");
    }
  };

  if (authLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <Navbar user={user} guilds={guilds} selectedGuildId={guildId} />

      <div style={{ padding: "2rem" }}>
        <button
          className={styles.button}
          onClick={() => navigate(`/guild/${guildId}`)}
          style={{ marginBottom: "1rem" }}
        >
          ← Back to Guild Settings
        </button>

        <h1>Embed Builder</h1>

        <div className={embedStyles.controls}>
          <div className={embedStyles.controlGroup}>
            <label>Channel</label>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              disabled={isEditing}
            >
              <option value="">Select a channel...</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  # {channel.name}
                </option>
              ))}
            </select>
          </div>

          <div className={embedStyles.controlGroup}>
            <label>Load Existing Message</label>
            <div className={embedStyles.loadMessage}>
              <input
                type="text"
                placeholder="Paste message link here..."
                value={messageLink}
                onChange={(e) => setMessageLink(e.target.value)}
              />
              <button onClick={loadExistingMessage}>Load</button>
            </div>
          </div>

          <button className={embedStyles.sendButton} onClick={handleSendOrEdit}>
            {isEditing ? "Edit Message" : "Send Message"}
          </button>
        </div>

        <div className={embedStyles.builderContainer}>
          <div className={embedStyles.editorPanel}>
            <EmbedEditor
              embedData={embedData}
              setEmbedData={setEmbedData}
              guildId={guildId}
            />
          </div>

          <div className={embedStyles.previewPanel}>
            <h3>Preview</h3>
            <EmbedPreview embedData={embedData} />
          </div>
        </div>
      </div>
    </div>
  );
}
