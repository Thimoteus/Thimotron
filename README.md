# Thimotron [![Dependency Status](https://david-dm.org/Thimoteus/Thimotron.svg)](https://david-dm.org/Thimoteus/Thimotron)

A reddit bot to do my bidding.

## Usage

1. You must have mongodb installed and running first.
2. Fill in `settings-example.json` with real values and rename it to `settings.json`.

```bash
npm install
npm start
```

That's it!

## Modules

### Bailiff

![Status](https://img.shields.io/badge/status-ready-green.svg)

This scans /r/KarmaCourt for new cases and sends a PM to you when it finds a well-formatted case. If you respond with "yes", it will send a PM to the defendant with a list of charges and a link to the KarmaCourt case.

### Image Scraper

![Status](https://img.shields.io/badge/status-ready-green.svg)

This scans a list of `subreddits` for up to `image_limit` many imgur links (only links to images, no albums), then downloads them to `download_directory`.

It only runs once, unlike the `bailiff` and `search` modules.

### Search

![Status](https://img.shields.io/badge/status-not ready-red.svg)

This can be used to scan a list of `subreddits` for a keyword and PM you when it finds a mention. It can also scan selftexts and titles.
