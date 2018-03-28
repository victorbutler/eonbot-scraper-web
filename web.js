process.title = 'eonbot-scraper-web'
const debug = !(process.env.NODE_ENV === 'production') || false
console.debug = (...args) => debug && console.log(...args)

/**
 * Config (read from config.properties)
 **/
const config = {
  eonbot: {
    dir: null,
    bin: null
  },
  web: {
    root: null,
    port: null
  }
}

/**
 * Read bot config
 **/
const prop = require('properties')
const propOptions = {
  path: true,
  namespaces: true
}

const configSetup = () => new Promise((resolve, reject) => {
  prop.parse(path.join(__dirname, 'config.properties'), propOptions, (err, data) => {
    if (!err) {
      console.debug('eonbot-scraper-web: Setup: Reading config.properties')
      config.eonbot.dir = data.eonbot.dir
      config.eonbot.bin = data.eonbot.bin
      config.web.root = data.web.root
      config.web.port = data.web.port
      resolve()
    } else {
      reject(err)
    }
  })
})

/**
 * Web Server Setup
 **/
const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const path = require('path')

const setupWebServer = () => new Promise((resolve, reject) => {

  app.use(express.static(path.join(__dirname, config.web.root)))

  io.on('connection', function(socket){
    console.debug('eonbot-scraper-web: Web Server: A user connected')

    socket.on('disconnect', function(){
      console.debug('eonbot-scraper-web: Web Server: A user disconnected')
    })
  })

  try {
    http.listen(config.web.port, function(){
      console.log('eonbot-scraper-web: Setup: Web server listening on *:' + config.web.port)
      resolve()
    })
  } catch (e) {
    reject(e)
  }
})

const startEonBot = () => new Promise((resolve, reject) => {
  const spawn = require('child_process').spawn
  const eon   = spawn(config.eonbot.bin, {cwd: config.eonbot.dir})

  var cycle_start = false
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
        sell_strategy: null,
        buy_disabled: null,
        auto_cancel_open: null,
        bagbuster: {
          enabled: null,
          buy_percentage: null,
          buy_price: null,
          buy_amount: null
        },
        trend_watcher: {
          disable: null,
          state: null
        }
      },
      status: [],
      error: false,
      cycle_start: false
    }
    const lines = data.toString().split('\r\n')
    if (lines[0] === '----------------------') {
      cycle_start = true
    }
    if (lines[0] === '-------------') {
      if (cycle_start) {
        package.cycle_start = true
        cycle_start = false
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
        var currentLineIterator = 4
        var currentLine = lines[currentLineIterator]
        while (currentLine !== '~~~') {
          if (currentLine === '*Pair is in buy mode*') {
            package.mode = 'BUY'
          }
          if (currentLine === '*Pair is in sell mode*') {
            package.mode = 'SELL'
          }
          if (currentLine === 'Bot buying for this pair is disabled') {
            package.bot.buy_disabled = true
          }
          if (currentLine === 'Bot open orders auto cancelling is activated') {
            package.bot.auto_cancel_open = true
          }
          currentLine = lines[currentLineIterator++]
        }
        if (currentLine === '~~~') {
          currentLine = lines[currentLineIterator++]
          if (currentLine === 'Exchange data:') {
            // Exchange data
            currentLine = lines[currentLineIterator++]
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
          }
          // Bot data
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
            // BagBuster
            if (currentLine === ' - BagBuster is active') {
              package.bot.bagbuster.enabled = true
              currentLine = lines[currentLineIterator++]
              while (currentLine.indexOf(' - Next BagBuster buy') === 0) {
                if (currentLine.indexOf(' - Next BagBuster buy: after ') === 0) {
                  const buyPctMatches = currentLine.match(/[\d\.]+%/)
                  package.bot.bagbuster.buy_percentage = buyPctMatches[0]
                }
                if (currentLine.indexOf(' - Next BagBuster buy price:') === 0) {
                  const buyPriceMatches = currentLine.match(/[\d\.]+/)
                  package.bot.bagbuster.buy_price = buyPriceMatches[0]
                }
                if (currentLine.indexOf(' - Next BagBuster buy amount:') === 0) {
                  const buyAmountMatches = currentLine.match(/[\d\.]+%/)
                  package.bot.bagbuster.buy_amount = buyAmountMatches[0]
                }
                currentLine = lines[currentLineIterator++]
              }
            }
            if (currentLine !== '~~~~~') {
              currentLine = lines[currentLineIterator++]
            }
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

configSetup()
  .then(() => setupWebServer())
  .then(() => startEonBot())
  .catch((reason) => {
    console.log('Exiting: ', reason)
    process.exit(1)
  })
