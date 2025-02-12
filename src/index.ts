import {
  Client,
  GatewayIntentBits,
  ActivityType,
  SlashCommandBuilder,
  REST,
  Routes,
  MessageFlags,
  Events,
} from "discord.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});
const ms_base = process.env.MS_URL || "http://localhost:80";
console.log(ms_base);
client.login(process.env.DISCORD_TOKEN);

client.on("ready", () => {
  console.log(`Logged in as ${client?.user?.tag}`);
  client.user?.setStatus("invisible");
  client.user?.setActivity("r1", {
    type: ActivityType.Playing,
    state: "r1delta",
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
      displayName: member.user.displayName,
    }),
  });
});

client.on("guildMembersChunk", async (members) => {
  console.log(`Received ${members.size} members`);
  const usersWithRole: any = [];
  members.forEach((member) => {
    if (member.roles.cache.has("1214775914836008990")) {
      const jsonBody = {
        discord_id: member.user.id,
        username: member.user.username,
        display_name: member.user.displayName,
        pomelo_name: member.displayName,
      };
      usersWithRole.push(jsonBody);
    }
  });

  const result = await fetch(`${ms_base}/discord-auth-chunk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MS_TOKEN}`,
    },
    body: JSON.stringify(usersWithRole),
  });
  const data = await result.text();
  console.log(data);
});

// every 1 minute check if user has role
// setInterval(() => {
//   client.guilds.cache.forEach(async (guild) => {
//     await guild.members.fetch({});
//   });
// }, 60000);

const b = new SlashCommandBuilder().setName("hello").setDescription("Hello");

const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

// (async () => {
//   try {
//     console.log("Started refreshing application (/) commands.");

//     await rest.put(
//       Routes.applicationGuildCommands(
//         "1304910395013595176",
//         "1186901921567617115"
//       ),
//       {
//         body: [b.toJSON()],
//       }
//     );

//     console.log("Successfully reloaded application (/) commands.");
//   } catch (error) {
//     console.error(error);
//   }
// })();

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  if (newMember.roles.cache.has("1214775914836008990")) {
    // do something
    console.log("User has the role");
    console.log(newMember.user.username);
    console.log(newMember.user.displayName);
    const jsonBody = {
      discord_id: newMember.user.id,
      username: newMember.user.username,
      display_name: newMember.user.displayName,
      pomelo_name: newMember.displayName,
    };
    console.log(jsonBody);
    // add user id to whitelist
    const res = await fetch(`${ms_base}/discord-auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MS_TOKEN}`,
      },
      body: JSON.stringify(jsonBody),
    });
    const data = await res.text();
    console.log(data);
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

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === "hello") {
    const targetUser = interaction.options.getUser("target");
    if (targetUser) {
      const snowflake = targetUser.id;
      const number = parseInt(snowflake, 10);
      let binarySnowflake = convert(number);

      if (binarySnowflake.length < 64) {
        // Snowflake-to-date function.
        const n = 64 - binarySnowflake.length;
        const zero = "0";
        const sfbitSnowflake = zero.repeat(n) + binarySnowflake; // Adds zeros as needed to format into 64-bit.

        let binaryTimestamp = sfbitSnowflake.slice(0, 42);
        const timestamp = parseInt(binaryTimestamp, 2) + 1420070400000; // Adds epoch

        var date = new Date(timestamp); // Get Unix time
        await interaction.reply({
          content: `Hello, ${
            targetUser.username
          }! your account is ${date.toString()}`,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        // Will be a long time until this ever happens...
        let binaryTimestamp = binarySnowflake.slice(0, 42);

        const timestamp = parseInt(binaryTimestamp, 2) + 1420070400000;

        var date = new Date(timestamp);
        console.log(date.toString());
      }
    } else {
      await interaction.reply({
        content: "Hello!",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
});
function convert(number: number) {
  return number.toString(2);
}
