import { spawn } from "child_process";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

const app = "release-channels-demo";
// WARNING: DO NOT DO THIS IN PRODUCTION
// THIS IS JUST A DEMO, THE SIGNING KEY AND ITS PASSWORD IS A SECRET
// THE KEY IS INLINED HERE FOR SIMPLICITY
process.env.TAURI_SIGNING_PRIVATE_KEY =
  "dW50cnVzdGVkIGNvbW1lbnQ6IHJzaWduIGVuY3J5cHRlZCBzZWNyZXQga2V5ClJXUlRZMEl5NUh5VFpUOStGb0VENWtOWnNuNVNIOEVvV3REVUFYbEFwbStiN3J4VFJvRUFBQkFBQUFBQUFBQUFBQUlBQUFBQWMxcmphd3hleG1ycGVRcEYrM3JicjF4ZzQ3Y1Rma1k4dU1ORElaOG1hSFJtRnhDRyt5WHYwUTh2ZDBMVjJXYjRORDYwQkFzV0J0QVplZkZ0Z2k2bUxlN09FcFhkNzJpa2RoUlYxeU9HVFMzNXVUSzIyQ1Zic25MZzdUYThUV2drUVEyRkg0YmNjeEk9Cg==";
process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "cloud-test";

const argv = yargs(hideBin(process.argv)).argv;

const version = argv._[0] || "";
if (!version) {
  console.log("Version not provided, pulling from tauri.conf.json instead");
}

if (!process.env.CN_API_KEY) {
  console.error("missing CN_API_KEY environment variable");
  process.exit(1);
}

const channel = argv.channel || argv.c;
const maybeChannelArg =
  channel && channel !== "stable" ? `--channel ${channel}` : "";

function runCommand(command) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      stdio: "inherit",
      shell: true,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject();
      }
    });
  });
}

await runCommand(`pnpm tauri build`);

await runCommand(
  `cn release draft ${app} ${version} ${maybeChannelArg} --framework tauri`
);

await runCommand(
  `cn release upload ${app} ${version} ${maybeChannelArg} --framework tauri`
);

await runCommand(
  `cn release publish ${app} ${version} ${maybeChannelArg} --framework tauri`
);
