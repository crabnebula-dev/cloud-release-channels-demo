import {
  createEffect,
  createSignal,
  For,
  Match,
  onMount,
  Show,
  Switch,
} from "solid-js";
import logo from "./assets/logo.svg";
import { invoke } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import "./App.css";

type PendingUpdate = {
  version: string;
  currentVersion: string;
};

function App() {
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

  createEffect(() => {
    if (selectedChannel()) {
      invoke("set_channel", { channel: selectedChannel() });
    }
  });

  onMount(() => {
    invoke<string>("get_channel").then((channel) => {
      setSelectedChannel(channel);
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
      <h1>Welcome to Tauri!</h1>

      <div class="row">
        <a href="https://vitejs.dev" target="_blank">
          <img src="/vite.svg" class="logo vite" alt="Vite logo" />
        </a>
        <a href="https://tauri.app" target="_blank">
          <img src="/tauri.svg" class="logo tauri" alt="Tauri logo" />
        </a>
        <a href="https://solidjs.com" target="_blank">
          <img src={logo} class="logo solid" alt="Solid logo" />
        </a>
      </div>

      <p>Click on the Tauri, Vite, and Solid logos to learn more.</p>

      <select onchange={(e) => setSelectedChannel(e.target.value)}>
        <For each={availableChannels()}>
          {(channel) => (
            <option value={channel} selected={selectedChannel() === channel}>
              {channel}
            </option>
          )}
        </For>
      </select>

      <Switch
        fallback={
          <>
            <Show when={fetchUpdateResponse()}>
              {(response) => <div>{response()}</div>}
            </Show>
            <button type="button" onClick={() => fetchUpdate()}>
              Check for Updates
            </button>
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
  );
}

export default App;
