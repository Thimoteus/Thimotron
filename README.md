# Thimotron [![Dependency Status](https://david-dm.org/Thimoteus/Thimotron.svg)](https://david-dm.org/Thimoteus/Thimotron)

A reddit bot to do my bidding.

## Usage

1. You must have iojs or node (>= 0.10) installed.
2. Fill in `example-settings.json` with real values and rename it to `settings.json`.

```bash
npm install
npm start
```

That's it!

Alternatively, you can specify your own settings file with the `--settings` flag, and
start the bot with `node build/index.js --settings path/to/settings.json`.

## Modules

### Bailiff

![Status](https://img.shields.io/badge/status-ready-green.svg)

Scans KC cases and archives evidence.
Can also be used to summon defendants if you call it by username and an approved calling message.
See the source code or doc page for more info.

Usage: `bailiff` in settings.modules.run.

### Image Scraper

![Status](https://img.shields.io/badge/status-ready-green.svg)

This scans a list of `subreddits` for up to `image_limit` many imgur links (only links to images, no albums),
then downloads them to `download_directory`.

It only runs once, unlike the `bailiff` and `search` modules.

Usage: `image-scraper` in settings.modules.run.

### Search

![Status](https://img.shields.io/badge/status-ready-green.svg)

This can be used to scan a list of `subreddits` for a keyword and PM you when it finds a mention.
It can also scan selftexts and titles.

Usage: `commentsSearch`, `selfTextsSearch` or `titlesSearch` in settings.modules.run.

## LICENSE

Copyright © 2015 Thimoteus

This work is free. You can redistribute it and/or modify it under the
terms of the Do What The Fuck You Want To Public License, Version 2,
as published by Sam Hocevar. See the LICENSE file for more details.
