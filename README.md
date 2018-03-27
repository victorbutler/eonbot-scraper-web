# eonbot-scraper-web
Scrapes the Eonbot console during cycles, collects the data and passes it to a browser for display via Express web server.

This little script is basically a launcher for the bot binary. You tell the script where to launch your binary and you execute the script. It will sit in between the bot and you, scraping the `stdout` and organizing it into chunks based on pairs. That then gets shot out to the browser via `socket.io` and a script on the page will create and update the table.

I've only tested it on Linux.

![eonbot-scraper-web](https://cdn.discordapp.com/attachments/380748730854539264/428235762698289163/Screen_Shot_2018-03-27_at_2.16.41_AM.png)

## Instructions

You need Node.js to run this app. Download and install from here: https://nodejs.org/

1. Download the repository
2. Edit the `web.js` config section to reflect where your bot binary lives
3. Run `npm install` in the downloaded directory
4. Run `node web.js` to start
5. Once running, point your browser to http://localhost:9009 (or whatever you set the port to)

If you're running on a VPS, make sure that port is protected behind a firewall. I use SSH to do local port forwarding so I can access the web server.

On a Linux VPS: `ssh user@vps-ip -L 9009:localhost:9009`
