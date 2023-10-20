const User = require("../model/user");
var KiteConnect = require("kiteconnect").KiteConnect;
var KiteTicker = require("kiteconnect").KiteTicker;

async function getValidUsers(users, exchange, symbol) {
    try {
        const data = await User.findByEmailId(users)
        const checkStatus = await checkuser(data, exchange, symbol)
        return checkStatus
    }
    catch (e) {
        return e;
    }
}

async function checkuser(data, exchange, symbol) {
    const status = await (async function (data) {
        kc = new KiteConnect({
            api_key: data?.api_key,
        });
    })(data)
        .then(resp => {
            kc.setAccessToken(data?.access_token);
        })
        .then((resp) => {
            return kc.getQuote(`${exchange}:${symbol}`)
        }).then(result => {
            return { "email": data?.email, "token": result[`${exchange}:${symbol}`].instrument_token, "api_key": data?.api_key, "access_token": data?.access_token }
        }).catch(err => {
            console.log(data?.email, " Has not logged in today")
        })
    return status
}


async function placeAllUserOrders(users, exchange, symbol, quantity) {
    try {
        const data = await User.findByEmailId(users?.email)
        const checkStatus = await placeIndividualTrade(data, exchange, symbol, quantity)
        return checkStatus
    }
    catch (e) {
        return e;
    }
}

async function placeIndividualTrade(data, exchange, symbol, quantity) {
    const status = await (async function (data) {
        kc = new KiteConnect({
            api_key: data?.api_key,
        });
    })(data)
        .then(resp => {
            kc.setAccessToken(data?.access_token);
        })
        .then(async (resp) => {
          return await kc
                .placeOrder('regular', {
                    exchange: exchange,
                    tradingsymbol: symbol,
                    transaction_type: "BUY",
                    quantity: quantity,
                    product: exchange == 'NSE' ? "MIS" : "NRML",
                    order_type: "MARKET",
                })
                .then(result => {
                    console.log(result, "trade Data")
                    return data?.email
                })
        }).catch(err => {
            console.log(err, "trade Error")
            return err
        })
    return status
}

async function runTradingStopLoss(user, lossPrice,exits) {
    let lastPrice = 0;
    let stopLoss = 0;
    let exit = false;
    const status = await (async function (data) {
         ticker = new KiteTicker({
            api_key: user?.api_key,
            access_token: user?.access_token
        })
    })(user)
    .then((resp => {
    ticker.connect()
    ticker.on('connect', subscribe)
    ticker.on("ticks", onTicks);
    ticker.autoReconnect(false)
    function onTicks(ticks,next) {
            console.log(`price is, ${ticks[0]?.last_price}`)
            if (lastPrice == 0) {
                console.log('firstPrice')
                lastPrice = ticks[0]?.last_price
                stopLoss = ticks[0]?.last_price - Number(lossPrice);
                console.log(stopLoss, "insideLoss")
            }
            else if (lastPrice > 0 && ticks[0]?.last_price > lastPrice) {
                lastPrice = ticks[0]?.last_price
                stopLoss = ticks[0]?.last_price - Number(lossPrice);
            }
            else if (stopLoss >= ticks[0]?.last_price) {
                ticker.disconnect()
                console.log(`will stop,${stopLoss}`)
                // return stopLoss
                let api_key, access_token;
                return exits();
            }
        }
        function subscribe() {
            // var items = [65610759];
            // var items =[64226055]
            var items = [user.token];
            ticker.subscribe(items);
            ticker.setMode(ticker.modeFull, items);
        }
    }))

    // function over(){
    //     console.log("inside main exit")
    //     return exits()
    // }

    // ticker.on('disconnect',() => exits())
}

async function exitAllUserOrders(users, exchange, symbol, quantity) {
    try {
        const data = await User.findByEmailId(users?.email)
        const checkStatus = await exitIndividualTrade(data, exchange, symbol, quantity)
        return checkStatus
    }
    catch (e) {
        return e;
    }
}

async function exitIndividualTrade(data, exchange, symbol, quantity) {
    const status = await (async function (data) {
        kc = new KiteConnect({
            api_key: data?.api_key,
        });
    })(data)
        .then(resp => {
            kc.setAccessToken(data?.access_token);
        })
        .then(async (resp) => {
           return await kc
                .placeOrder('regular', {
                    exchange: exchange,
                    tradingsymbol: symbol,
                    transaction_type: "SELL",
                    quantity: quantity,
                    product: exchange == 'NSE' ? "MIS" : "NRML",
                    order_type: "MARKET",
                }).then(result => {
                    console.log(result,"exit trade Data")
                    return data?.email
                })
        })
        .catch(err => {
            // console.log(err, "trade Error")
            return err.message
        })
    return status
}

exports.placeOrders = async (req, res, next) => {
    const {
        price,
        quantity,
        transaction_type,
        exchange,
        tradingsymbol,
        entry_type,
        email,
        lossPrice,
        profitPrice,
        date,
        order,
        primary
    } = req.body;

    var ticker;
    var api_key, secretkey, requestToken, access_token
    var tick_api
    var tick_accessvar
    var symbol
    var inst_token;

    if (entry_type === "CE") {
        newPrice = Math.round(Math.floor(price - 200) / 100) * 100;
        symbol = tradingsymbol + date + newPrice + "CE";
    } else if (entry_type === "PE") {
        newPrice = Math.round(Math.floor(price + 200) / 100) * 100;
        symbol = tradingsymbol + date + newPrice + "PE";
    } else {
        symbol = tradingsymbol;
    }

    const validUsers = []
    for (let i = 0; i < email.length; i++) {
        let valid = await getValidUsers(email[i], exchange, symbol)
        if (valid) {
            validUsers.push(valid)
        }
    }
    const orderPlaced = []
    if (validUsers.length > 0) {
        for (let i = 0; i < validUsers.length; i++) {
            let placed = await placeAllUserOrders(validUsers[i], exchange, symbol, quantity)
            if(placed){
                console.log (placed,"inplaced")
                orderPlaced.push(placed);
            }
        }
    }

    const exit = await runTradingStopLoss(validUsers[0], lossPrice, exits)
    const exitmails = []

   async function exits(){
    console.log(orderPlaced,"placed orders")
        for (let i = 0; i < orderPlaced.length; i++) {
        let valid =  await exitAllUserOrders(validUsers[i], exchange, symbol,quantity)
            if(valid){
                console.log(orderPlaced[i],"get data")
                exitmails.push(orderPlaced[i])
            }
     }     
     res.status(200).json({
        message: "trades executed successfully",
        users: exitmails
      });
    }
}