# CrabNebula Cloud Release Channels Demo

This repository contains a demo for the [release channels](https://docs.crabnebula.dev/cloud/cli/create-draft/#release-channels) feature of [CrabNebula Cloud](https://crabnebula.dev/cloud/).

The Tauri application lets the user select a release channel from a list (stable, beta or nightly). The update endpoint URL is then determined based on the selected release channel.

## Running the application

Requirements:
  - Node.js and pnpm
  - Rust

To run the app, install the NPM dependencies with `pnpm install` and run `pnpm tauri dev`. To actually install and update, downgrade the version in `src-tauri/tauri.conf.json` so an update can be detected using CrabNebula Cloud.

## Shipping updates

To ship updates to test changes with this example, create your own [updater signing key](https://tauri.app/plugin/updater/#signing-updates) and change the `ORG_SLUG` constant in `src-tauri/src/lib.rs`. The CrabNebula Cloud's CLI [bootstrap command](https://docs.crabnebula.dev/cloud/cli/bootstrap/) can help you set up the app to use your own CrabNebula Cloud organization.
