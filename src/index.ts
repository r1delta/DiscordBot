import { Client, GatewayIntentBits, ActivityType } from "discord.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});
const ms_base = process.env.MS_URL || "http://localhost:80";
client.login(process.env.DISCORD_TOKEN);

client.on("ready", () => {
  console.log(`Logged in as ${client?.user?.tag}`);
  client.user?.setStatus("invisible");
  client.user?.setActivity("r1", {
    type: ActivityType.Custom,
    state: "🙂",
  });
  client.guilds.cache.forEach(async (guild) => {
    await guild.members.fetch({});
  });
});

client.on("guildMemberRemove", (member) => {
  console.log(`${member.user.username} left the server`);
  fetch(`${ms_base}/discord-auth`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      discord_id: member.user.id,
      username: member.user.username,
    }),
  });
});

client.on("guildMembersChunk", (members) => {
  console.log(`Received ${members.size} members`);
  const usersWithRole: any = [];
  members.forEach((member) => {
    if (member.roles.cache.has("1214775914836008990")) {
      usersWithRole.push({
        discord_id: member.user.id,
        username: member.user.username,
      });
    }
  });

  fetch(`${ms_base}/discord-auth-chunk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(usersWithRole),
  });
});

// every 1 minute check if user has role
setInterval(() => {
  client.guilds.cache.forEach(async (guild) => {
    await guild.members.fetch({});
  });
}, 60000);

client.on("guildMemberUpdate", (oldMember, newMember) => {
  if (newMember.roles.cache.has("1214775914836008990")) {
    // do something
    console.log("User has the role");
    console.log(newMember.user.username);
    // add user id to whitelist
    fetch(`${ms_base}/discord-auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        discord_id: newMember.user.id,
        username: newMember.user.username,
      }),
    });
  } else {
    console.log("User does not have the role");
    console.log(newMember.user.username);
    fetch(`${ms_base}/discord-auth`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        discord_id: newMember.user.id,
        username: newMember.user.username,
      }),
    });
  }
});
