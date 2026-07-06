import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  PermissionFlagsBits,
  TextChannel,
  Collection,
  Events,
  type Message,
} from "discord.js";
import { extname } from "node:path";
import { computeImageChecksum } from "./checksumMatcher.js";
import {
  getChecksums,
  addChecksum,
  removeChecksum,
  getAction,
  setAction as setCfgAction,
  isWatched,
  type Action,
} from "./config.js";

const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
  console.error("Missing DISCORD_TOKEN in .env");
  process.exit(1);
}

const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const commands = [
  new SlashCommandBuilder()
    .setName("add-checksum")
    .setDescription("Add a SHA256 checksum to the watchlist")
    .addStringOption((o) =>
      o.setName("checksum").setDescription("SHA256 hex string").setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName("remove-checksum")
    .setDescription("Remove a SHA256 checksum from the watchlist")
    .addStringOption((o) =>
      o.setName("checksum").setDescription("SHA256 hex string").setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName("list-checksums")
    .setDescription("List all watched checksums")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName("set-action")
    .setDescription("Set the action to take on matched users")
    .addStringOption((o) =>
      o
        .setName("action")
        .setDescription("ban or kick")
        .setRequired(true)
        .addChoices(
          { name: "Ban", value: "ban" },
          { name: "Kick", value: "kick" },
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
];

async function deleteUserMessages(
  guildId: string,
  userId: string,
): Promise<number> {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return 0;

  let deleted = 0;
  const channels = await guild.channels.fetch();

  const promises: Promise<void>[] = [];
  for (const channel of channels.values()) {
    if (!(channel instanceof TextChannel)) continue;

    promises.push(
      (async () => {
        let lastId: string | undefined;
        let done = false;
        while (!done) {
          try {
            const options: { limit: number; before?: string } = { limit: 100 };
            if (lastId) options.before = lastId;

            const messages = await channel.messages.fetch(options);
            if (messages.size === 0) {
              done = true;
              break;
            }

            const userMessages = messages.filter((m) => m.author.id === userId);
            for (const msg of userMessages.values()) {
              await msg.delete();
              deleted++;
            }

            lastId = messages.last()!.id;
          } catch (err) {
            console.error(`[DELETE] Error in #${channel.name}:`, err);
            done = true;
          }
        }
      })(),
    );
  }

  await Promise.all(promises);
  return deleted;
}

async function handleMatch(message: Message) {
  const action = getAction();

  try {
    if (action === "ban") {
      await message.member?.ban({ deleteMessageSeconds: 0 });
    } else {
      await message.member?.kick();
    }

    const deleted = await deleteUserMessages(message.guildId!, message.author.id);
    console.log(
      `${action}ed ${message.author.tag} (${message.author.id}) and deleted ${deleted} messages`,
    );
  } catch (err) {
    console.error(`Failed to ${action} user ${message.author.id}:`, err);
  }
}

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".avif"]);

  const imageAttachments = message.attachments.filter((a) => {
    if (a.contentType?.startsWith("image/")) return true;
    const ext = extname(a.name || a.url).toLowerCase();
    return IMAGE_EXTS.has(ext);
  });

  if (imageAttachments.size === 0) return;

  for (const attachment of imageAttachments.values()) {
    try {
      const checksum = await computeImageChecksum(attachment.url);
      console.log(
        `[IMAGE] ${message.author.tag} (${message.author.id}) posted ${attachment.name}: sha256=${checksum}`,
      );
      if (isWatched(checksum)) {
        console.log(
          `[MATCH] checksum matched — taking action on ${message.author.tag}`,
        );
        await handleMatch(message);
        break;
      }
    } catch (err) {
      console.error(`[ERROR] processing ${attachment.url}:`, err);
    }
  }
});

client.on(Events.GuildCreate, (guild) => {
  console.log(`Joined guild: ${guild.name} (${guild.id})`);
});

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user!.tag}`);

  const guilds = client.guilds.cache.map((g) => `${g.name} (${g.id})`);
  console.log(`Guilds: ${guilds.join(", ") || "none"}`);

  if (!GUILD_ID || !CLIENT_ID) {
    console.log("GUILD_ID or CLIENT_ID not set — skipping slash command registration");
    return;
  }

  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) {
    console.error(`Guild ${GUILD_ID} not found — is the bot invited to it?`);
    return;
  }

  await guild.commands.set(commands);
  console.log(`Registered ${commands.length} slash commands`);
});

client.login(TOKEN);
