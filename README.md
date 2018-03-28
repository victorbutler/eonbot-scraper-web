# eonbot-scraper-web
Scrapes the Eonbot console during cycles, collects the data and passes it to a browser for display via Express web server.

This little script is basically a launcher for the bot binary. You tell the script where to launch your binary and you execute the script. It will sit in between the bot and you, scraping the `stdout` and organizing it into chunks based on pairs. That then gets shot out to the browser via `socket.io` and a script on the page will create and update the table.

Tested on:
* Linux
* Windows _(thanks @MattFL#8671)_

![eonbot-scraper-web](https://cdn.discordapp.com/attachments/428289935129313280/428599626430676993/unknown.png)

## Instructions

You need Node.js to run this app. Download and install version 9.x from here: https://nodejs.org/

1. Download this repository
2. Edit the `config.properties` file to reflect where your bot binary lives
3. Run `npm install` in the downloaded directory
4. Run `node web.js` to start
5. Once running, point your browser to http://localhost:9009 (or whatever you set the port to)

If you're running on a VPS, make sure that port is protected behind a firewall. I use SSH to do local port forwarding so I can access the web server.

On a Linux VPS: `ssh user@vps-ip -L 9009:localhost:9009`
