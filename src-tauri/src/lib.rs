use std::{
    fmt::Display,
    path::{Path, PathBuf},
    sync::Mutex,
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_updater::{Update, UpdaterExt};

const ORG_SLUG: &str = "testnew";
const APP_SLUG: &str = "release-channels-demo";

#[derive(Debug, thiserror::Error)]
enum Error {
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Json(#[from] serde_json::Error),
    #[error(transparent)]
    Url(#[from] url::ParseError),
    #[error(transparent)]
    Updater(#[from] tauri_plugin_updater::Error),
    #[error("there is no pending update")]
    NoPendingUpdate,
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_str())
    }
}

type Result<T> = std::result::Result<T, Error>;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct UpdateMetadata {
    version: String,
    current_version: String,
}

#[derive(Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
enum Channel {
    Stable,
    Beta,
    Nightly,
}

const ALL_AVAILABLE_CHANNELS: &[Channel] = &[Channel::Stable, Channel::Beta, Channel::Nightly];

impl Display for Channel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{}",
            match self {
                Self::Stable => "stable",
                Self::Beta => "beta",
                Self::Nightly => "nightly",
            }
        )
    }
}

struct PendingUpdate(Mutex<Option<Update>>);
struct AppChannel(Mutex<Channel>);

impl AppChannel {
    fn load(path: &Path) -> Self {
        Self(Mutex::new(Self::try_load(path).unwrap_or(Channel::Stable)))
    }

    fn try_load(path: &Path) -> Result<Channel> {
        if path.exists() {
            let channel_str = std::fs::read_to_string(path)?;
            serde_json::from_str(&channel_str).map_err(Into::into)
        } else {
            Ok(Channel::Stable)
        }
    }

    fn update(&self, channel: Channel) {
        *self.0.lock().unwrap() = channel;
    }

    fn save(&self, path: &Path) {
        let _ = std::fs::write(
            path,
            serde_json::to_string(&*self.0.lock().unwrap()).unwrap(),
        );
    }
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
async fn fetch_update(
    app: AppHandle,
    pending_update: State<'_, PendingUpdate>,
    app_channel: State<'_, AppChannel>,
) -> Result<Option<UpdateMetadata>> {
    let channel = *app_channel.0.lock().unwrap();
    let channel_query = if channel != Channel::Stable {
        format!("?channel={}", channel.to_string())
    } else {
        "".to_string()
    };
    let url = url::Url::parse(&format!(
        "https://cdn.cntest.me/update/{ORG_SLUG}/{APP_SLUG}/{{{{target}}}}-{{{{arch}}}}/{{{{current_version}}}}{channel_query}",
    ))?;
    println!("{url}");
    let update = app
        .updater_builder()
        .endpoints(vec![url])
        .build()?
        .check()
        .await?;

    let update_metadata = update.as_ref().map(|update| UpdateMetadata {
        version: update.version.clone(),
        current_version: update.current_version.clone(),
    });

    *pending_update.0.lock().unwrap() = update;

    Ok(update_metadata)
}

#[tauri::command]
async fn install_update(pending_update: State<'_, PendingUpdate>) -> Result<()> {
    let Some(update) = pending_update.0.lock().unwrap().take() else {
        return Err(Error::NoPendingUpdate);
    };

    let mut downloaded = 0;
    update
        .download_and_install(
            |chunk, content_length| {
                downloaded += chunk;
                println!(
                    "downloaded {downloaded} bytes from {}",
                    if let Some(l) = content_length {
                        l.to_string()
                    } else {
                        "unknown".to_string()
                    }
                );
            },
            || {
                println!("download completed");
            },
        )
        .await?;

    Ok(())
}

#[tauri::command]
fn set_channel(app: AppHandle, app_channel: State<'_, AppChannel>, channel: Channel) {
    app_channel.update(channel);
    app_channel.save(&app_channel_path(&app));
}

#[tauri::command]
fn get_channel(app_channel: State<'_, AppChannel>) -> Channel {
    *app_channel.0.lock().unwrap()
}

#[tauri::command]
fn available_channels() -> Vec<Channel> {
    ALL_AVAILABLE_CHANNELS.to_vec()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            fetch_update,
            install_update,
            set_channel,
            get_channel,
            available_channels
        ])
        .manage(PendingUpdate(Mutex::new(None)))
        .setup(|app| {
            app.manage(AppChannel::load(&app_channel_path(app.handle())));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn app_channel_path(app: &AppHandle) -> PathBuf {
    app.path()
        .app_config_dir()
        .expect("failed to resolve config dir")
        .join("app-channel")
}
