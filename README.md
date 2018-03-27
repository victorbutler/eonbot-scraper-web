# eonbot-scraper-web
Scrapes the Eonbot console during cycles, collects the data and passes it to a browser for display via Express web server.

This little script is basically a launcher for the bot binary. You tell the script where to launch your binary and you execute the script. It will sit in between the bot and you, scraping the `stdout` and organizing it into chunks based on pairs. That then gets shot out to the browser via `socket.io` and a script on the page will create and update the table.

I've only tested it on Linux.

## Instructions

You need Node.js to run this app.

1. Download the repository
2. Edit the `web.js` config section to reflect where your bot binary lives
3. Run `npm install` in the downloaded directory
4. Run `node web.js` to start
