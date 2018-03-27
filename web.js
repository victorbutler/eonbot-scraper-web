process.title = 'eonbot-scraper-web';

/**
 * Config
 **/

const config = {
  bin: {
    cwd: 'gui/configs',
    cmd: './eonbot-v1.4.0-linux-amd64'
  },
  web: {
    root: 'static',
    port: 9009
  }
}

/**
 * Web Server Setup
 **/
const express = require('express'),
      app = express(),
      http = require('http').Server(app),
      io = require('socket.io')(http),
      path = require('path');

const setupWebServer = () => new Promise((resolve, reject) => {

  app.use(express.static(path.join(__dirname, config.web.root)))

  io.on('connection', function(socket){
    console.debug('Eonbot-Web: A user connected')

    socket.on('disconnect', function(){
      console.debug('Eonbot-Web: A user disconnected')
    })
  })

  try {
    http.listen(config.web.port, function(){
      console.log('Eonbot-Web: listening on *:' + config.web.port)
      resolve()
    })
  } catch (e) {
    reject(e)
  }
})

const startEonBot = () => new Promise((resolve, reject) => {
  const spawn = require('child_process').spawn
  const eon   = spawn(config.bin.cmd, {cwd: config.bin.cwd})

  var cycle_start = false;
  eon.stdout.on('data', function (data) {
    var package = {
      date: null,
      coin: null,
      base: null,
      mode: null,
      exchange: {
        last_price: null,
        ask_price: null,
        bid_price: null,
        base_balance: null,
        coin_balance: null,
        coin_value: null
      },
      bot: {
        buy_price: null,
        sell_price: null,
        max_amount: null,
        candle_period: null,
        sma: null,
        ema: null,
        buy_strategy: null,
        sell_strategy: null
      },
      status: [],
      error: false,
      cycle_start: false
    }
    const lines = data.toString().split('\r\n')
    if (lines[0] === '----------------------') {
      cycle_start = true;
    }
    if (lines[0] === '-------------') {
      if (cycle_start) {
        package.cycle_start = true;
        cycle_start = false;
      }
      package.date = lines[1]
      const pairSplit = lines[2].split('/')
      package.coin = pairSplit[1]
      package.base = pairSplit[0]
      // could be errors next
      if (lines[3].indexOf('error') > -1 || lines[3] === 'Pair already has open order(s)') {
        package.status = lines[3]
        package.error = true
      } else {
        if (lines[4] === '*Pair is in buy mode*') {
          package.mode = 'BUY'
        } else if (lines[4] === '*Pair is in sell mode*') {
          package.mode = 'SELL'
        }
        if (lines[7] === '~~~' && lines[8] === 'Exchange data:') {
          var currentLineIterator = 9
          var currentLine = lines[currentLineIterator]
          // Exchange data
          while (currentLine !== '~~~') {
            const lineParts = currentLine.split(/ - ([\w\s]+)(?:\(in (\w+)\))?\: ([\d\.]+)/)
            if (lineParts.length === 5) {
              if (lineParts[1] === 'Last price ') {
                package.exchange.last_price = lineParts[3]
              }
              if (lineParts[1] === 'Ask price ') {
                package.exchange.ask_price = lineParts[3]
              }
              if (lineParts[1] === 'Bid price ') {
                package.exchange.bid_price = lineParts[3]
              }
              if (lineParts[1] === package.coin + ' balance') {
                package.exchange.coin_balance = lineParts[3]
              }
              if (lineParts[1] === package.base + ' balance') {
                package.exchange.base_balance = lineParts[3]
              }
              if (lineParts[1] === 'Value ') {
                package.exchange.coin_value = lineParts[3]
              }
            }
            currentLine = lines[currentLineIterator++]
          }
          // Bot data
          currentLine = lines[currentLineIterator++]
          while (currentLine !== '~~~~~') {
            const lineParts = currentLine.split(/ - ([\w\s]+)\: ([\d\.]+m?|\w+)/)
            if (lineParts.length === 4) {
              if (lineParts[1] === 'Buy price') {
                package.bot.buy_price = lineParts[2]
              }
              if (lineParts[1] === 'Sell price') {
                package.bot.sell_price = lineParts[2]
              }
              if (lineParts[1] === 'Max amount of ' + package.base + ' to spend') {
                package.bot.max_amount = lineParts[2]
              }
              if (lineParts[1] === 'Candle Period') {
                package.bot.candle_period = lineParts[2]
              }
              if (lineParts[1] === 'SMA') {
                package.bot.sma = lineParts[2]
              }
              if (lineParts[1] === 'EMA') {
                package.bot.ema = lineParts[2]
              }
              if (lineParts[1] === 'Buy strategy') {
                package.bot.buy_strategy = lineParts[2]
              }
              if (lineParts[1] === 'Sell strategy') {
                package.bot.sell_strategy = lineParts[2]
              }
            }
            currentLine = lines[currentLineIterator++]
          }
          currentLine = lines[currentLineIterator++]
          if (currentLine !== 'No trades') {
            var status = []
            while (currentLine !== '-------------') {
              status.push(currentLine)
              currentLine = lines[currentLineIterator++]
            }
            package.status = status
          }
        }
      }
      io.emit('cycle_chunk', package)
    }
    // Pass the output through to the user
    console.log(data.toString())
  })

  eon.stderr.on('data', function (data) {
    console.log('stderr: ' + data.toString())
    reject(data.toString())
  })

  eon.on('exit', function (code) {
    console.log('child process exited with code ' + code.toString())
    reject('exited')
    process.exit(1)
  })

  resolve()
})

setupWebServer()
  .then(() => startEonBot())
  .catch((reason) => {
    console.log('Exiting: ', reason)
    process.exit(1)
  })
