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
const { Pagination } = require("pagination.djs");

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

const b = new SlashCommandBuilder()
  .setName("servers")
  .setDescription("Lists all current R1Delta servers.");

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
  if (interaction.commandName === "servers") {
    const servers = await fetch(`${ms_base}/servers`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MS_TOKEN}`,
      },
    });
    const data = await servers.json();
    // sort the data by players
    const sorted = data.sort((a: any, b: any) => {
      return b.total_players - a.total_players;
    });

    const pagination = new Pagination(interaction, {
      limit: 5,
      loop: true,
    });
    pagination.setTitle("R1Delta Servers");
    pagination.setDescription("List of all current R1Delta servers.");
    pagination.setFields(
      sorted.map((guild) => {
        return {
          name: guild.host_name,
          // inline: true,b
          value: `IP: ${guild.ip}:${guild.port}\n Map: ${getMapName(
            guild.map_name
          )}\nPlaylist: ${getPlaylistName(guild.playlist)}\nPlayers: ${
            guild.players.length
          }/${guild.max_players}\n${
            guild.description ? `Description: ${guild.description}` : ""
          }`,
        };
      })
    );
    pagination.paginateFields();
    pagination.render();
  }
});

function getMapName(map: string): string {
  if (map === "mp_corporate") return "Corporate";
  else if (map === "mp_fracture") return "Fracture";
  else if (map === "mp_harmony_mines") return "Dig Site";
  else if (map === "mp_haven") return "Haven";
  else if (map === "mp_lagoon") return "Lagoon";
  else if (map === "mp_lobby") return "Lobby";
  else if (map === "mp_nexus") return "Nexus";
  else if (map === "mp_npe") return "Pilot Training";
  else if (map === "mp_outpost_207") return "Outpost 207";
  else if (map === "mp_overlook") return "Overlook";
  else if (map === "mp_sandtrap") return "Sandtrap";
  else if (map === "mp_swampland") return "Swampland";
  else if (map === "mp_wargames") return "War Games";
  else if (map === "mp_relic") return "Relic";
  else if (map === "mp_o2") return "Demeter";
  else if (map === "mp_colony") return "Colony";
  else if (map === "mp_runoff") return "Runoff";
  else if (map === "mp_smugglers_cove") return "Smuggler's Cove";
  else if (map === "mp_switchback") return "Export";
  else if (map === "mp_angel_city") return "Angel City";
  else if (map === "mp_backwater") return "Backwater";
  else if (map === "mp_zone_18") return "Zone 18";
  else if (map === "mp_airbase") return "Airbase";
  else if (map === "mp_boneyard") return "Boneyard";
  else if (map === "mp_rise") return "Rise";
  else if (map === "mp_training_ground") return "Training Ground";
  else return map.startsWith("mp_") ? map.substring(3) : map;
}

function getPlaylistName(playlist: string): string {
  if (playlist === "private_match") return "Private Match";
  else if (playlist === "mfd") return "Marked for Death";
  else if (playlist === "mfdp") return "MFD Pro";
  else if (playlist === "at") return "Attrition";
  else if (playlist === "campaign_carousel") return "Campaign";
  else if (playlist === "coop") return "Frontier Defense";
  else if (playlist === "lts") return "Last Titan Standing";
  else if (playlist === "lava") return "Deadly Ground";
  else if (playlist === "wlts") return "Wingman LTS";
  else if (playlist === "cp") return "Hardpoints";
  else if (playlist === "ctf") return "Capture the Flag";
  else if (playlist === "ps") return "Pilot Skirmish";
  else if (playlist === "all") return "Variety Pack";
  else if (playlist === "tdm") return "Pilot Hunter";
  else if (playlist === "Load a map on the command line") return "";
  else return playlist;
}

function convert(number: number) {
  return number.toString(2);
}
