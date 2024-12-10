import {
  createEffect,
  createSignal,
  For,
  Match,
  onMount,
  Show,
  Switch,
} from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from '@tauri-apps/api/app';
import { relaunch } from "@tauri-apps/plugin-process";
import "./App.css";

type PendingUpdate = {
  version: string;
  currentVersion: string;
};

function App() {
  const [activeChannel, setActiveChannel] = createSignal<string | null>(
    null
  );
  const [selectedChannel, setSelectedChannel] = createSignal<string | null>(
    null
  );
  const [availableChannels, setAvailableChannels] = createSignal<string[]>([
    "stable",
  ]);
  const [pendingUpdate, setPendingUpdate] = createSignal<PendingUpdate | null>(
    null
  );
  const [fetchUpdateResponse, setFetchUpdateResponse] = createSignal<
    string | null
  >(null);
  const [updated, setUpdated] = createSignal(false);
  const [currentVersion, setCurrentVersion] = createSignal<string | null>(
    null
  );

  createEffect(async () => {
    if (!currentVersion()) {
      setCurrentVersion(await getVersion());
    }
  });

  createEffect(() => {
    if (selectedChannel()) {
      invoke("set_channel", { channel: selectedChannel() });
    }
  });

  onMount(() => {
    invoke<string>("get_channel").then((channel) => {
      setSelectedChannel(channel);
      setActiveChannel(channel);
    });

    invoke<string[]>("available_channels").then((channels) => {
      setAvailableChannels(channels);
    });
  });

  async function fetchUpdate() {
    try {
      // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
      const maybeUpdate = await invoke<PendingUpdate | null>("fetch_update");
      setFetchUpdateResponse(maybeUpdate ? null : "up to date");
      setPendingUpdate(maybeUpdate);
    } catch (e: unknown) {
      setFetchUpdateResponse(typeof e === "string" ? e : JSON.stringify(e));
    }
  }

  async function installUpdate() {
    await invoke("install_update");
    setUpdated(true);
  }

  async function restartApp() {
    await relaunch();
  }

  return (
    <div class="container">

      <div class="row">
        <a href="https://tauri.app" target="_blank">
          <img src="/tauri.svg" class="logo tauri" alt="Tauri logo" />
        </a>
        <a href="https://crabnebula.dev" target="_blank">
          <img src="/nova.webp" class="logo nova" alt="nova logo" />
        </a>
      </div>
      <div class="row" >
      <h1>v.{currentVersion()} on {activeChannel()} channel!</h1>

      </div>

      <div class="row" style="padding-top:60px">
        <div class="custom-select" style="margin-right:20px">
          <select onchange={(e) => setSelectedChannel(e.target.value)} class="styled-select custom-select">
            <For each={availableChannels()}>
              {(channel) => (
                <option value={channel} selected={selectedChannel() === channel}>
                  {channel}
                </option>
              )}
            </For>
          </select>
        </div>

      <Switch
        fallback={
          <>

            <button type="button" style="width:300px" onClick={() => fetchUpdate()}>
              Check for {selectedChannel()} Updates
            </button>
            <Show when={fetchUpdateResponse()}>
              {(response) => <h3 style="position:fixed; bottom: 20px">{response()}</h3>}
            </Show>
          </>
        }
      >
        <Match when={updated()}>
          <button type="button" onClick={() => restartApp()}>
            Restart
          </button>
        </Match>
        <Match when={pendingUpdate()}>
          {(update) => (
            <>
              <div>
                Update from {update().currentVersion} to {update().version}
              </div>
              <button type="button" onClick={() => installUpdate()}>
                Install Update
              </button>
            </>
          )}
        </Match>
      </Switch>
      </div>
      <div style="position:fixed; bottom: 2px; font-size:12px">
        <a href="https://docs.crabnebula.dev/cloud/cli/create-draft/#release-channels" target="_blank">CrabNebula Channel Documentation</a>
      </div>
    </div>
  );
}

export default App;
