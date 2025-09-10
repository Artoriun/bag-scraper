# BAG Scraper (excel-parser-node)

A small Node.js/Express tool that scrapes the "samenvatting" sidebar content from a BAG (Basisregistratie Adressen en Gebouwen) details page using Puppeteer. It serves a simple web UI where you can paste a URL and get the extracted fields in a table and as HTML (copied to clipboard automatically).

## Features

- Launches a local server and opens the default browser.
- Uses Puppeteer to load the target page and extract structured data from the `[data-testid="samenvatting"]` sidebar.
- Displays scraped data in a simple HTML table and provides the HTML snippet ready to paste elsewhere.

## Project files

- `server.js` - Main server and scraper implementation.
- `package.json` - Project manifest with dependencies and scripts.
- `bag-scraper.exe`, `excel-parser-node-node16.exe`, `excel-parser-node-node18.exe` - Prebuilt packaged executables (if present in this folder). These are optional and may be artifacts produced by `pkg`.

## Prerequisites

- Node.js 16 or 18 (project is ESM; tested with Node 16/18).
- npm (or yarn) to install dependencies.
- On Windows, Puppeteer will download a compatible Chromium by default. If you run this in an environment without a display or with sandboxing restrictions, the code already passes `--no-sandbox` and `--disable-setuid-sandbox` to Chromium.

## Install

Open a PowerShell terminal in the project folder and run:

```powershell
npm install
```

## Run (development)

Start the server with:

```powershell
npm start
```

This will run `node server.js`, start an Express server on port 3001 (or the port defined in the `PORT` environment variable), and open your default browser to the app.

Then paste a BAG details page URL into the input and submit. The scraper expects the page to contain a `[data-testid="samenvatting"]` element and an `objectId` query parameter in the URL.

## Usage (CLI / Packaged binaries)

If you have a packaged binary in this folder (for example `bag-scraper.exe` or the `node16`/`node18` executables), you can run the executable directly instead of `node server.js`.

## Notes & Troubleshooting

- Puppeteer downloads Chromium and can use ~100MB+ of disk space. If you prefer to use an existing Chrome installation, set the `PUPPETEER_EXECUTABLE_PATH` environment variable to the Chrome executable path and modify `server.js` to pass `executablePath` to `puppeteer.launch()`.

- If scraping hangs or fails, increase the selector timeout in `page.waitForSelector(...)` or inspect `console` output (the script forwards the page console to the server logs).

- The script copies the generated HTML (without headers) to the clipboard automatically in the browser window; if clipboard permission is denied, you can copy the contents manually from the textarea.

- The server prints `Press Enter to exit...` and will exit on Enter. If you run it as a background service, remove the `readline`/exit logic.

## Contract (inputs/outputs)

- Input: Query parameter `url` containing an encoded BAG details page URL (example: `/?url=https%3A%2F%2Fexample.com%2Fdetails%3FobjectId%3D1234`).
- Output: HTML page showing a table of keys and values and textareas containing the generated HTML snippet.

## License

ISC

## Author

Peter de Keijzer
