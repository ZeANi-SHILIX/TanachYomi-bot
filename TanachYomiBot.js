const IN_TESTING = false;
const RUN_ON_SERVER = process.platform !== 'win32'; // server is linux, the testing on windows

process.env.NTBA_FIX_319 = 1;
process.env.NTBA_FIX_350 = 1;

const { Client, Buttons, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const TelegramBot = require('node-telegram-bot-api');
const SoundCloud = require("soundcloud-scraper");
const qrcode = require('qrcode-terminal'); // remove?
const NodeID3Promise = require('node-id3').Promise
//const { exec } = require("child_process");
const Hebcal = require('hebcal');
const QRCode = require('qrcode')
const fs = require('fs');

var util = require('util');
var logFile = fs.createWriteStream('log.txt', { flags: 'w' });
var logStdout = process.stdout;
var logToFile = function () {
    //console.log(arguments)
    logFile.write(util.format.apply(null, arguments) + '\n');
    logStdout.write(util.format.apply(null, arguments) + '\n');
}
let date = new Date();
logToFile("the bot started at " + getIsraelTime(date))

// t.me/{telegramToken}
let token = '{telegramToken}';
// t.me/{telegramToken_testing}
if (IN_TESTING) {
    token = '{telegramToken_testing}';
}
let puppeteer = {
    headless: true, // true - without browser
    args: ["--no-sandbox", '--disable-setuid-sandbox']
}

// only for phone server
// if (RUN_ON_SERVER) {
//     puppeteer['executablePath'] = '/usr/bin/chromium-browser'
// }

const telegram_bot = new TelegramBot(token, { polling: true });
const SoundCloudClient = new SoundCloud.Client();
const whatsapp_bot = new Client({
    authStrategy: new LocalAuth(),
    puppeteer
});
whatsapp_bot.initialize();

// only part from all list
let BIBLE_EPISODES = {
    "order": [
        "בראשית",
        "שמות"
    ],
    "בראשית": {
        "1": {
            "name": "בראשית פרק א",
            "parasha": "בראשית",
            "chapter": "פרק א",
            "path": null,
            "spotify": "https://open.spotify.com/episode/1KnvxmVs4O5i7vTw7QDVOc?si=8eb46fb5aa0a4228",
            "soundcloud": "https://soundcloud.com/ygolan/dou9ebxpy0g4"
        },
        "2": {
            "name": "בראשית פרק ב",
            "parasha": "בראשית",
            "chapter": "פרק ב",
            "path": null,
            "spotify": "https://open.spotify.com/episode/6H0NZM5iB4esolI6W96yPO?si=f2e629ea470d460a",
            "soundcloud": "https://soundcloud.com/ygolan/yv272xwlb241"
        },
        "3": {
            "name": "בראשית פרק ג",
            "parasha": "בראשית",
            "chapter": "פרק ג",
            "path": null,
            "spotify": "https://open.spotify.com/episode/17qZdlpC8ultLbE5xbRQlf?si=0c3b9433ed1b4d15",
            "soundcloud": "https://soundcloud.com/ygolan/qezwsqzm0ipi"
        },
        "4": {
            "name": "בראשית פרק ד",
            "parasha": "בראשית",
            "chapter": "פרק ד",
            "path": null,
            "spotify": "https://open.spotify.com/episode/3y9oUS7yHc7m1xtJ1TGVaF?si=879309d5ec5e43af",
            "soundcloud": "https://soundcloud.com/ygolan/snnf28knebfg"
        },
        "5": {
            "name": "בראשית פרק ה",
            "parasha": "בראשית",
            "chapter": "פרק ה",
            "path": null,
            "spotify": "https://open.spotify.com/episode/3D10nJm6hwcEqhukWrpbYM?si=412e1d5ce27a46c1",
            "soundcloud": "https://soundcloud.com/ygolan/hh0q4tbmi9av"
        },
        "6": {
            "name": "בראשית פרק ו",
            "parasha": "בראשית",
            "chapter": "פרק ו",
            "path": null,
            "spotify": "https://open.spotify.com/episode/0W68kktGoml3essrjiTMij",
            "soundcloud": "https://soundcloud.com/ygolan/5ftpf1wlzshd?in=ygolan/sets/fuuw2ed8xbhm"
        },
        "7": {
            "name": "בראשית פרק ז",
            "parasha": "בראשית",
            "chapter": "פרק ז",
            "path": null,
            "spotify": "https://open.spotify.com/episode/1ePkx4EdRVkbJ4B3CAx8dK",
            "soundcloud": "https://soundcloud.com/ygolan/lacvgeujcbtk?in=ygolan/sets/fuuw2ed8xbhm"
        },
        "8": {
            "name": "בראשית פרק ח",
            "parasha": "בראשית",
            "chapter": "פרק ח",
            "path": null,
            "spotify": "https://open.spotify.com/episode/2ioTTi7pgeFMK7S3LUIrh5",
            "soundcloud": "https://soundcloud.com/ygolan/xhwl2vsd0n2h?in=ygolan/sets/fuuw2ed8xbhm"
        },
        "9": {
            "name": "בראשית פרק ט",
            "parasha": "בראשית",
            "chapter": "פרק ט",
            "path": null,
            "spotify": "https://open.spotify.com/episode/6sAprJym3KAjAfgaNwQZ4F",
            "soundcloud": "https://soundcloud.com/ygolan/fimud7nuhlnl?in=ygolan/sets/fuuw2ed8xbhm"
        }
    },
    "שמות": {
        "1": {
            "name": "שמות פרק א",
            "parasha": "שמות",
            "chapter": "פרק א",
            "path": null,
            "spotify": "https://open.spotify.com/episode/1Fl73SngHma8yOqQthf6DA?si=eaa086b68ca4408f",
            "soundcloud": "https://soundcloud.com/ygolan/x5qatgjumvuz?in=ygolan/sets/clm9pue2lyry"
        }
    }
};
let BIBLE_PROGRESS = {
    day: 1, // changed after the chapter send (not is use)
    sefer: "בראשית",
    chapter: 1
};
let LIST_OF_GROUP = {
    'tanach_whatsapp': [
        // {
        //     name: "{name}",
        //     id: "XXXXXXXXXXXX@g.us"
        // }
    ],
    'tanach_telegram': [
        {
            name: "t.me/Tanach_Yomi",
            id: "@Tanach_Yomi"
        }
    ],
    'five_min': [
        // {
        //     name: "{name}",
        //     id: "XXXXXXXXXXXX@g.us"
        // }
    ],
    "broadcast": {
        // "ID": {
        //     name: chatInfo.name,
        //     sendto: 'tanach_whatsapp'
        // }
    }
};
let userDebug = {
    whatsapp: "97250XXXXXXXXX@c.us",
    telegram: "{userInTelegramID}"
};
let myID = "{defaultID}";

// stored messages from users
const params = new Map();

initializeFiles();


whatsapp_bot.on('qr', async (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.generate(qr, { small: true });
    if (!IN_TESTING) {
        await QRCode.toFile('./qr_code.png', qr);
        telegram_bot.sendPhoto(userDebug.telegram, './qr_code.png');
    }
});

whatsapp_bot.on('disconnected', async (reason) => {
    logToFile('@WA Client was logged out', reason);
    telegram_bot.sendMessage(userDebug.telegram, 'whatsapp_bot was logged out');
    if (reason == "CONFILCT") {
        await whatsapp_bot.destroy();
        whatsapp_bot.initialize();
    }
});

whatsapp_bot.on("auth_failure", (msg) => {
    logToFile(msg);
    console.error("@WA AUTHENTICATION FAILURE", msg);
});
whatsapp_bot.on("change_state", (msg) => {
    //console.log("Change State: ", msg);
    logToFile("@WA Change State: ", msg);
    telegram_bot.sendMessage(userDebug.telegram, 'WhatsApp Bot: ' + msg);
});

whatsapp_bot.on('ready', () => {
    myID = whatsapp_bot.info?.wid?._serialized
    console.log('READY');
    logToFile('WhatsApp READY')
    if (RUN_ON_SERVER && !IN_TESTING) {
        //telegram_bot.sendMessage(userDebug.telegram, 'TanachYomi connected')
        startAtZeroMinute();
    } else {
        tanachYomi();
    }


    // for test
    //let nameToCompare = `קבוצה בוט`
    //initializeGroup(nameToCompare)
    initializeGroup()
});

async function startAtZeroMinute() {
    let date = new Date();
    let waitMin = 60 - date.getMinutes();
    let waitSec = 60 - date.getSeconds();
    await sleep(1000 * 60 * (waitMin - 1));
    await sleep(1000 * waitSec + 100); //100 ms more
    tanachYomi();
}

async function sleepV2(ms = 0) {
    let date = new Date();
    let waitMin = 60 - date.getMinutes();
    if (waitMin === 60) {
        return await sleep(1000 * 60 * 60 - ms);
    }
    await sleep(1000 * 60 * waitMin);
}

async function tanachYomi() {

    while (true) {
        let t0 = performance.now();
        let t1 = performance.now();

        sendTanachYomi();

        // wait before start the next time
        if (RUN_ON_SERVER) {
            if (IN_TESTING) {
                t1 = performance.now();
                await sleep(2 * 60 * 1000 - (t1 - t0) - 2) // 2 min
            } else {
                t1 = performance.now();
                await sleepV2(t1 - t0)
                // await sleep(60 * 60 * 1000 - (t1 - t0) - 2) //hour
            }
        } else {
            t1 = performance.now();
            await sleep(2 * 60 * 1000 - (t1 - t0) - 2) // minute
        }
    }
}

whatsapp_bot.on('message', async msg => {
    if (msg.body === 'בטל' || msg.body === 'ביטול') return; // handled in other place

    console.log('MESSAGE RECEIVED', msg);

    // CHECK IF ALIVE
    if (msg.body === '!פינג') {
        msg.reply('פונג');
    } else if (msg.body === '!ping') {
        whatsapp_bot.sendMessage(msg.from, 'pong');
    } else if (msg.body === 'פינג') {
        msg.reply('פונג');
    }

    // ####################
    //     Day setting
    // ####################
    else if (msg.body === '!add-day') {

        // current chapter is last in sefer
        if (BIBLE_EPISODES[BIBLE_PROGRESS.sefer][BIBLE_PROGRESS.chapter + 1] === undefined) {
            let index = BIBLE_EPISODES.order.indexOf(BIBLE_PROGRESS.sefer);
            BIBLE_PROGRESS.sefer = BIBLE_EPISODES.order[index + 1];
            // when finish the whole bible, start from begining
            if (BIBLE_EPISODES.order.length === index + 1) {
                BIBLE_PROGRESS.sefer = BIBLE_EPISODES.order[0];
            }
            BIBLE_PROGRESS.chapter = 1; //add 1 more
        }
        // // next chapter is last in sefer
        // else if (BIBLE_EPISODES[BIBLE_PROGRESS.sefer][BIBLE_PROGRESS.chapter + 2] == undefined) {
        //     let index = BIBLE_EPISODES.order.indexOf(BIBLE_PROGRESS.sefer);
        //     BIBLE_PROGRESS.sefer = BIBLE_EPISODES.order[index + 1];
        //     // when finish the whole bible, start from begining
        //     if (BIBLE_EPISODES.order.length === index + 1) {
        //         BIBLE_PROGRESS.sefer = BIBLE_EPISODES.order[0];
        //     }
        //     BIBLE_PROGRESS.chapter = 0; // not exist, means like last in prev sefer
        //     // Object.keys(BIBLE_EPISODES[BIBLE_PROGRESS.sefer]).length;
        // }

        // middle of sefer
        else {
            BIBLE_PROGRESS.chapter++;
        }
        let nextChapter = getNextChapter();
        write_BIBLE_PROGRESS();
        whatsapp_bot.sendMessage(msg.from, '*בוצע!*\nהפרק הבא שישלח: ' + nextChapter.name);
        let username = (await msg.getContact()).name;
        logToFile(`#TanachYomi: The user ${username} has add day`)
    }

    else if (msg.body === '!set-day') {
        userID = msg.from
        whatsapp_bot.sendMessage(msg.from, "האם ברצונך לשנות את הפרק הנוכחי?\nאם כן - שלח את שם הספר\nאם לא - שלח 'בטל'.");

        let userInfo = new Map();
        userInfo.set('case', 'getSefer')
        userInfo.set('isFirstMsg', true)
        params.set(userID, userInfo);

    }

    else if (msg.body === '!remove-day') {
        let nextChapter;
        // current chapter is first in sefer
        if (BIBLE_PROGRESS.chapter === 1) {
            //this will send next time
            nextChapter = BIBLE_EPISODES[BIBLE_PROGRESS.sefer][1];

            // to prev sefer
            let index = BIBLE_EPISODES.order.indexOf(BIBLE_PROGRESS.sefer);
            BIBLE_PROGRESS.sefer = BIBLE_EPISODES.order[index - 1];
            // when is the first sefer, set the last sefer
            if (index === 0) {
                BIBLE_PROGRESS.sefer = BIBLE_EPISODES.order[BIBLE_EPISODES.order.length - 1];
            }
            // set last chapter (will not send)
            BIBLE_PROGRESS.chapter = Object.keys(BIBLE_EPISODES[BIBLE_PROGRESS.sefer]).length;
        }
        // middle of sefer
        else {
            BIBLE_PROGRESS.chapter--;
            nextChapter = BIBLE_EPISODES[BIBLE_PROGRESS.sefer][BIBLE_PROGRESS.chapter + 1];
        }
        write_BIBLE_PROGRESS();
        whatsapp_bot.sendMessage(msg.from, '*בוצע!*\nהפרק הבא שישלח: ' + nextChapter.name);
        let username = (await msg.getContact()).name;
        logToFile(`#TanachYomi: The user ${username} has remove day`)
    }

    else if (msg.body === '!show-day') {
        let nextChapter = getNextChapter();
        whatsapp_bot.sendMessage(msg.from, 'הפרק הבא שישלח: ' + nextChapter.name);
    }

    // ####################
    //       Get ID
    // ####################

    // personal
    else if (msg.body === '!my-id') {
        let contactID = (await msg.getContact()).id._serialized;
        msg.reply('הID שלך הוא: ' + contactID);
    }
    // of the chat
    else if (msg.body === '!get-id') {
        let chatID = msg.from;
        whatsapp_bot.sendMessage(msg.from, "הID של הצ'אט: " + chatID);
    }

    // ####################
    // REMOVE / ADD CHAT
    // ####################
    else if (msg.body === '!add-chat-tanach') {
        let chatID = msg.from;
        let chatName = (await msg.getChat()).name;

        let isExist = false;
        for (chatObj of LIST_OF_GROUP.tanach_whatsapp) {
            if (chatObj.id == chatID) {
                isExist = true;
                break;
            }
        }

        if (isExist) {
            whatsapp_bot.sendMessage(msg.from, "הצ'אט " + chatName + ' נמצא כבר ברשימת התפוצה של התנ"ך היומי');
        } else {
            LIST_OF_GROUP.tanach_whatsapp.push({
                name: chatName,
                id: chatID
            });
            write_LIST_OF_GROUP();
            whatsapp_bot.sendMessage(msg.from, "הצ'אט " + chatName + ' נוסף לרשימת התפוצה של התנ"ך היומי');
            logToFile(`#TanachYomi: The chat ${chatName} has add tanach broadcast`)
        }

    }
    else if (msg.body === '!remove-chat-tanach') {
        let chatID = msg.from;
        let chatName = (await msg.getChat()).name;

        let isExist = false;
        for (let chatObj of LIST_OF_GROUP.tanach_whatsapp) {
            if (chatObj.id == chatID) {
                isExist = true;
                LIST_OF_GROUP.tanach_whatsapp = removeItemOnce(LIST_OF_GROUP.tanach_whatsapp, chatObj);
                write_LIST_OF_GROUP();
                logToFile(`#TanachYomi: The chat ${chatName} has remove from tanach broadcast`)
                break;
            }
        }

        if (isExist) {
            whatsapp_bot.sendMessage(msg.from, "הצ'אט " + chatName + 'הוסר מרשימת התפוצה של התנ"ך היומי');
        } else {
            whatsapp_bot.sendMessage(msg.from, "הצ'אט " + chatName + 'לא נמצא ברשימת התפוצה של התנ"ך היומי');
        }
    }
    else if (msg.body === '!show-chats') {
        whatsapp_bot.sendMessage(msg.from, JSON.stringify(LIST_OF_GROUP));
    }

    // ####################
    //     OTHERS
    // ####################
    else if (msg.body === '!reload-bible') {
        BIBLE_EPISODES = read_BIBLE_EPISODES();
        let lastSefer = BIBLE_EPISODES.order[BIBLE_EPISODES.order.length - 1];
        let lastChapter = Object.keys(BIBLE_EPISODES[lastSefer]).length;
        whatsapp_bot.sendMessage(msg.from, "*רשימת הפרקים עודכנה*\nהפרק האחרון ברשימה: " + BIBLE_EPISODES[lastSefer]?.[lastChapter].name);
    }

    else if (msg.body === '!print-msg') {
        whatsapp_bot.sendMessage(msg.from, JSON.stringify(msg));
    }

    // ####################################
    //             FIND FILE
    // ####################################
    else if (msg.body.startsWith('חפש')) {
        let str = msg.body.slice(3).trim();
        // remove ' or "
        str = str.replace(/'/g, "").replace(/"/g, '') // g is global (replace all)
        logToFile("Searching " + str)

        let ischapter = str.includes("פרק");
        let ismizmor = str.includes("מזמור");
        let result = BIBLE_EPISODES.order.filter(sefer => str.includes(sefer))

        let searchChapter = str.slice(result[0]?.length + 1)
        if (ischapter) {
            searchChapter = searchChapter.slice(4).trim()
        }
        if (ismizmor) {
            searchChapter = searchChapter.slice(6).trim()
        }

        if (searchChapter === "קיט") {
            let miz119 = new Map();
            miz119.set('case', 'mizmor119');
            miz119.set('isFirstMsg', true);
            params.set(msg.from, miz119);
            logToFile(`@Search: the user ${msg.from} request the mizmor 119`)
            msg.reply(`בחר מהרשימה את ההקלטה שברצונך לקבל:\n1. אותיות א - ד.\n2. אותיות ה - ט.\n3. אותיות י - נ.\n4. אותיות ס - צ.\n5. אותיות ק - ת.\n6. הכל.\nלביטול שלח 'בטל'.`)
            return;
        }

        let founded = false;
        for (let index in BIBLE_EPISODES[result[0]]) {
            // added blank space in front and back of chapter, so it will ignored when combination within a word
            if (`${BIBLE_EPISODES[result[0]][index].chapter} `.includes(` ${searchChapter} `)) {
                //msg.reply("המתן...")
                sendTheFile(BIBLE_EPISODES[result[0]][index], { isSearch: true, contactID: msg.from, source: "WhatsApp" });
                founded = true;
                break; // show only once
            }
        }

        if (!founded) {
            msg.reply(`לא הצלחתי למצוא את מה שאתה מחפש...\nנסה לחפש ללא רווחים כפולים וללא סימנים מיוחדים.\nלדוגמא: חפש בראשית פרק ד`);
        }

        //console.log("%cFounded? %c" + founded, 'color: white', 'color: blue');
        //logToFile("%cFounded? %c" + founded, 'color: white', 'color: blue');
    }

    // #########################
    //      broadcast group
    // #########################
    else if (msg.body === '!broadcast') {
        let chatInfo = await msg.getChat();
        if (chatInfo.isGroup) {
            msg.reply(`האם ברצונך להפוך את הקבוצה לרשימת תפוצה?\nאם כן, אנא בחר מהרשימה:\n1. התנ"ך היומי\n2. 5 דקות\nלביטול שלח 'בטל'.`)
            let broadcast = new Map();
            broadcast.set('case', 'toBroadcast');
            params.set(msg.from, broadcast);
            let username = (await msg.getContact()).name;
            logToFile(`The user ${username} has send '!broadcast' in ${chatInfo.name}`);
        }
        else {
            msg.reply("האפשרות הזו זמינה עבור קבוצות בלבד!")
        }
    }

    // #########################
    //      send to broadcast
    // #########################
    else if (LIST_OF_GROUP.broadcast[msg.from] !== undefined) {
        if (params.has(msg.from)) return; // dont send on reply

        let msgtoforward = new Map();
        msgtoforward.set('case', 'sendBroadcast');
        msgtoforward.set('isFirstMsg', true)
        params.set(msg.from, msgtoforward);
        msg.reply("האם ברצונך לשלוח הודעה זו לכל הקבוצות?\nאם כן שלח 'כן' או 'שלח' בציטוט על ההודעה שאתה רוצה להעביר, אם לא שלח 'בטל'.")
    }
})

whatsapp_bot.on("message", async msg => {
    let userID = msg.from;
    if ((msg.body === 'בטל' || msg.body === 'ביטול') && params.has(userID)) {
        params.delete(userID);
        whatsapp_bot.sendMessage(msg.from, "בוטל");
    }

    if (!params.has(userID)) return; // skip on this msg
    let user = params.get(userID);

    // ignore the 'switch' on first msg 
    if (user.has('isFirstMsg')) {
        user.delete('isFirstMsg')
        params.set(userID, user);
        return;
    }

    switch (user.get('case')) {
        case 'getSefer':
            //check if exist 
            if (BIBLE_EPISODES.order.includes(msg.body)) {
                //save in temp
                let sefer = msg.body;
                user.set('sefer', sefer);
                user.set('case', 'getChapter');
                params.set(userID, user);
                whatsapp_bot.sendMessage(msg.from, "מעולה! כעת שלח את *מספר* הפרק\nאם ברצונך לבטל - שלח 'בטל'.");
            }
            else {
                whatsapp_bot.sendMessage(msg.from, "לא מצאתי את הספר, אנא נסה שוב...\nאם ברצונך לבטל - שלח 'בטל'.");
            }
            break;
        case 'getChapter':
            let sefer = user.get('sefer');
            let tempChapter = parseInt(msg.body)
            //check if exist
            if (BIBLE_EPISODES[sefer][tempChapter] != undefined) {
                BIBLE_PROGRESS.sefer = sefer;
                BIBLE_PROGRESS.chapter = tempChapter;
                write_BIBLE_PROGRESS();

                let nextChapter = getNextChapter();
                whatsapp_bot.sendMessage(msg.from, "השינויים נשמרו בהצלחה!\nהפרק הבא שישלח: " + nextChapter.name);
                params.delete(userID)
                let username = (await msg.getContact()).name;
                logToFile(`#TanachYomi: The user ${username} has set a day (${nextChapter.name}) in Tanach`);
            }
            else {
                whatsapp_bot.sendMessage(msg.from, "לא מצאתי את הפרק, אנא נסה שוב...\nאם ברצונך לבטל - שלח 'בטל'.");
            }
            break;
        case 'joinTo': // when joining to group
            if (msg.body === 'התנך היומי' || msg.body === 'התנ"ך היומי' || msg.body === '1') {
                let chatInfo = await msg.getChat();
                for (let gr of LIST_OF_GROUP.tanach_whatsapp) {
                    if (gr.id == userID) {
                        msg.reply(`הקבוצה הזו נמצאת כבר ברשימת התפוצה של התנ"ך היומי.`)
                        params.delete(userID)
                        return;
                    }
                }
                LIST_OF_GROUP.tanach_whatsapp.push({
                    name: chatInfo.name,
                    id: userID
                })
                logToFile('#LISTGROUP: added ' + chatInfo.name + 'to tanachYomi WA')
                msg.reply(`הקבוצה נוספה לרשימת התפוצה של התנ"ך היומי.`)
                params.delete(userID)
            }
            else if (msg.body === '5 דקות' || msg.body === '2') {
                let chatInfo = await msg.getChat();
                for (let gr of LIST_OF_GROUP.five_min) {
                    if (gr.id == userID) {
                        msg.reply(`הקבוצה הזו נמצאת כבר ברשימת התפוצה של ה5 דקות.`)
                        params.delete(userID)
                        return;
                    }
                }
                LIST_OF_GROUP.five_min.push({
                    name: chatInfo.name,
                    id: userID
                })
                params.delete(userID)
                logToFile('#LISTGROUP: added ' + chatInfo.name + 'to 5 Dakut WA')
            }
            break;
        case 'toBroadcast': // when sended !broadcast
            let chatInfo = await msg.getChat();
            if (msg.body === 'התנך היומי' || msg.body === 'התנ"ך היומי' || msg.body === '1') {
                LIST_OF_GROUP.broadcast[userID] = {
                    name: chatInfo.name,
                    sendto: 'tanach_whatsapp'
                }
                logToFile('@Broadcast: ' + chatInfo.name + ' now forward to tanachYomi WA list')
                msg.reply(`הקבוצה נוספה כרשימת תפוצה לתנ"ך היומי`)
                params.delete(userID)
            }
            else if (msg.body === '5 דקות' || msg.body === '2') {
                LIST_OF_GROUP.broadcast[userID] = {
                    name: chatInfo.name,
                    sendto: 'five_min'
                }
                logToFile('@Broadcast: ' + chatInfo.name + ' now forward to 5 Dakut list')
                msg.reply(`הקבוצה נוספה כרשימת תפוצה ל5 דקות`)
                params.delete(userID)
            }
            break;
        case 'sendBroadcast':
            if (msg.body === "כן" || msg.body === 'שלח') {
                if (msg.hasQuotedMsg) {
                    let quoted_Message = await msg.getQuotedMessage();
                    let username = (await msg.getContact()).name;
                    let whereSendTo = LIST_OF_GROUP.broadcast[userID].sendto;

                    for (let gr of LIST_OF_GROUP[whereSendTo]) {
                        logToFile("@Broadcast: forward msg to " + gr.name + " from " + username)
                        await quoted_Message.forward(gr.id);
                    }
                    msg.reply('ההודעה הועברה')
                    params.delete(userID)
                }
                else {
                    msg.reply(`לא הבנתי איזו הודעה להעביר...\nאנא שלח שוב עם המילה 'כן' אך הפעם עם ציטוט של ההודעה להעברה`)
                }
            }
            break;
        case 'mizmor119':
            const sendAll = msg.body === 'הכל' || msg.body === '6';

            if (sendAll || msg.body === 'אותיות א - ד' || msg.body === 'אותיות א-ד' || msg.body === '1') {
                sendTheFile({
                    "name": "תהילים מזמור קיט אותיות א - ד",
                    "chapter": "מזמור קיט",
                    "soundcloud": "https://soundcloud.com/ygolan/zrerkyce5h9g",
                    "spotify": "https://open.spotify.com/episode/1M23OgVKbz08RceLiP5tVS?si=V9JRau3eTI6eDopzSnfvLQ"
                }, { isSearch: true, contactID: msg.from, source: "WhatsApp" });
                params.delete(userID)
            }
            if (sendAll || msg.body === 'אותיות ה - ט' || msg.body === 'אותיות ה-ט' || msg.body === '2') {
                sendTheFile({
                    "name": "תהילים מזמור קיט אותיות ה - ט",
                    "chapter": "מזמור קיט",
                    "soundcloud": "https://soundcloud.com/ygolan/qw0pzxw5l57f",
                    "spotify": "https://open.spotify.com/episode/7lakZPDp8UVTcdXVH5YFPV?si=BqZMfK04QqizUpDBGSIKXw"
                }, { isSearch: true, contactID: msg.from, source: "WhatsApp" });
                params.delete(userID)
            }
            if (sendAll || msg.body === 'אותיות י - נ' || msg.body === 'אותיות י-נ' || msg.body === '3') {
                sendTheFile({
                    "name": "תהילים מזמור קיט אותיות י - נ",
                    "chapter": "מזמור קיט",
                    "soundcloud": "https://soundcloud.com/ygolan/stdzu2iecycw",
                    "spotify": "https://open.spotify.com/episode/5SLi3j1BpyDEUG9QSr305d?si=dRUpYYX2SM2YypsnCK_s-g"
                }, { isSearch: true, contactID: msg.from, source: "WhatsApp" });
                params.delete(userID)
            }
            if (sendAll || msg.body === 'אותיות ס - צ' || msg.body === 'אותיות ס-צ' || msg.body === '4') {
                sendTheFile({
                    "name": "תהילים מזמור קיט אותיות ס - צ",
                    "chapter": "מזמור קיט",
                    "soundcloud": "https://soundcloud.com/ygolan/zidfok3zzkiu",
                    "spotify": "https://open.spotify.com/episode/4KWO5O94odgyT8n48I3XfI?si=SDfi3g5XSWmK2T_PqW6B0Q"
                }, { isSearch: true, contactID: msg.from, source: "WhatsApp" });
                params.delete(userID)
            }
            if (sendAll || msg.body === 'אותיות ק - ת' || msg.body === 'אותיות ק-ת' || msg.body === '5') {
                sendTheFile({
                    "name": "תהילים מזמור קיט אותיות ק - ת",
                    "chapter": "מזמור קיט",
                    "soundcloud": "https://soundcloud.com/ygolan/fsu9lly3hhqe",
                    "spotify": "https://open.spotify.com/episode/3GJpW7ORE50d0zUgEfwySP?si=yZIEKz5SQbOUj3dIaVkw7w"
                }, { isSearch: true, contactID: msg.from, source: "WhatsApp" });
                params.delete(userID)
            }
            break;

    }
})

whatsapp_bot.on('group_join', groupNoti => {
    if (groupNoti.type.toUpperCase() !== 'ADD') return;

    let whatsapp_info = whatsapp_bot.info;
    const isMe = groupNoti.recipientIds.includes(whatsapp_info.wid._serialized)
    if (!isMe) return;

    let groupMap = new Map();
    groupMap.set('case', 'joinTo');
    params.set(groupNoti.chatId, groupMap);
    groupNoti.reply(`*היי, אני הבוט של ישיבת הגולן!*\nהאם ברצונך להוסיף את הקבוצה הזאת לרשימת התפוצה?\nאם כן, בחר מהרשימה:\n1. התנ"ך היומי\n2. 5 דקות\n\nאם לא, שלח 'בטל'.`)

})

/*
 * #########################################
 *                  TELEGRAM
 * #########################################
 */

/** 
stores msg(promise) to delete 
*/
let messaagesToDelete = [];

telegram_bot.on('message', async (msg) => {

    if (msg.text?.startsWith("חפש")) {
        let str = msg.text.slice(3).trim();
        // remove ' or "
        str = str.replace(/'/g, "").replace(/"/g, '') // g is global (replace all)
        logToFile("Searching " + str)

        let ischapter = str.includes("פרק");
        let ismizmor = str.includes("מזמור");
        let result = BIBLE_EPISODES.order.filter(sefer => str.includes(sefer))

        let searchChapter = str.slice(result[0]?.length + 1)
        if (ischapter) {
            searchChapter = searchChapter.slice(4).trim()
        }
        if (ismizmor) {
            searchChapter = searchChapter.slice(6).trim()
        }

        if (searchChapter === "קיט") {
            logToFile(`@Search: the user ${msg.chat.id} request the mizmor 119`)
            telegram_bot.sendMessage(msg.chat.id, `בחר מהרשימה את ההקלטה שברצונך לקבל:`, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "אותיות ה - ט", callback_data: 'miz119_5-9' },
                            { text: "אותיות א - ד", callback_data: 'miz119_1-4' }

                        ], [
                            { text: "אותיות ס - צ", callback_data: 'miz119_60-90' },
                            { text: "אותיות י - נ", callback_data: 'miz119_10-50' }
                        ], [
                            { text: "כל האותיות", callback_data: 'miz119_all' },
                            { text: "אותיות ק - ת", callback_data: 'miz119_100-400' }
                        ], [
                            { text: "בטל", callback_data: 'miz119_cancel' }
                        ]
                    ]
                }
            })
            return;
        }

        let founded = false;
        for (let index in BIBLE_EPISODES[result[0]]) {
            // added blank space in front and back of chapter, so it will ignored when combination within a word
            if (`${BIBLE_EPISODES[result[0]][index].chapter} `.includes(` ${searchChapter} `)) {
                //msg.reply("המתן...")
                sendTheFile(BIBLE_EPISODES[result[0]][index], { isSearch: true, contactID: msg.chat.id, source: "Telegram" });
                founded = true;
                break; // show only once
            }
        }

        if (!founded) {
            telegram_bot.sendMessage(msg.chat.id, `לא הצלחתי למצוא את מה שאתה מחפש...\nנסה לחפש ללא רווחים כפולים וללא סימנים מיוחדים.\nלדוגמא: חפש בראשית פרק ד`);
        }

        //console.log("%cFounded? %c" + founded, 'color: white', 'color: blue');
        //logToFile("%cFounded? %c" + founded, 'color: white', 'color: blue');
    }

});

telegram_bot.onText(/\/addchat/, (msg) => {
    let chatName = msg.chat.title || msg.from.username || 'NoName';
    let chatID = msg.chat.id;

    let isExist = false;
    for (let chatObj of LIST_OF_GROUP.tanach_telegram) {
        if (chatObj.id == chatID) {
            isExist = true;
            break;
        }
    }

    if (isExist) {
        telegram_bot.sendMessage(chatID, "הצ'אט " + chatName + ' נמצא כבר ברשימת התפוצה של התנ"ך היומי');
    } else {
        LIST_OF_GROUP.tanach_telegram.push({
            name: chatName,
            id: chatID
        });
        write_LIST_OF_GROUP();
        telegram_bot.sendMessage(chatID, "הצ'אט " + chatName + ' נוסף לרשימת התפוצה של התנ"ך היומי');
        logToFile(`#TanachYomi: The chat ${chatName} has add tanach broadcast`)
    }
});

telegram_bot.onText(/\/removechat/, (msg) => {
    let chatName = msg.chat.title || msg.from.username || 'NoName';
    let chatID = msg.chat.id;

    let isExist = false;
    for (let chatObj of LIST_OF_GROUP.tanach_telegram) {
        if (chatObj.id == chatID) {
            isExist = true;
            LIST_OF_GROUP.tanach_telegram = removeItemOnce(LIST_OF_GROUP.tanach_telegram, chatObj);
            write_LIST_OF_GROUP();
            logToFile(`#TanachYomi: The chat ${chatName} has remove from tanach broadcast`)
            break;
        }
    }

    if (isExist) {
        telegram_bot.sendMessage(chatID, "הצ'אט " + chatName + 'הוסר מרשימת התפוצה של התנ"ך היומי');
    } else {
        telegram_bot.sendMessage(chatID, "הצ'אט " + chatName + 'לא נמצא ברשימת התפוצה של התנ"ך היומי');
    }
});

// maybe only for userDebug
telegram_bot.onText(/\/getlog/, (msg) => {
    telegram_bot.sendDocument(msg.chat.id, "./log.txt");
});
telegram_bot.onText(/\/clearlog/, (msg) => {
    fs.createWriteStream('log.txt', { flags: 'w' });
    logToFile("the log has clear at " + getIsraelTime())
    telegram_bot.sendMessage(msg.chat.id, "הלוג נוקה")
})

telegram_bot.onText(/\/getbible/, (msg) => {
    telegram_bot.sendDocument(msg.chat.id, "./saved_files/BIBLE_EPISODES.json", { caption: 'מאגר התנ"ך' });
});
telegram_bot.onText(/\/getgroups/, (msg) => {
    telegram_bot.sendDocument(msg.chat.id, "./saved_files/LIST_OF_GROUP.json", { caption: "רשימת הקבוצות" });
});
telegram_bot.onText(/\/getprogress/, (msg) => {
    telegram_bot.sendDocument(msg.chat.id, "./saved_files/BIBLE_PROGRESS.json", { caption: "התקדמות הבוט" });
});

telegram_bot.onText(/\/getmsg/, (msg) => {
    telegram_bot.sendMessage(msg.chat.id, JSON.stringify(msg));
});

telegram_bot.onText(/\/getid/, (msg) => {
    telegram_bot.sendMessage(msg.chat.id, "הID של השיחה: " + msg.chat.id);
});

// telegram_bot.onText(/\/restartbot/, async (msg) => {
//     await telegram_bot.sendMessage(msg.chat.id, "מאתחל את הבוט...");
//     exec("pm2 restart TanachYomiBot.js")
//     process.exit(1)
// })
telegram_bot.onText(/\/killbot/, (msg) => {
    telegram_bot.sendMessage(msg.chat.id, "האם אתה בטוח שברצונך לעצור את הבוט?", {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "לא, שישאר חי", callback_data: 'dontkillbot' },
                    { text: "כן אני בטוח", callback_data: "killbot" }
                ]
            ]
        }
    })
});

telegram_bot.on("callback_query", async (msg) => {
    if (msg.data == 'dontkillbot') {
        telegram_bot.editMessageText("יששש! ניצלתי מגזרת השמד!", {
            chat_id: msg.message.chat.id,
            message_id: msg.message.message_id
        })
    } else if (msg.data == 'killbot') {
        await telegram_bot.editMessageText("היה נעים להכיר! להתראות!", {
            chat_id: msg.message.chat.id,
            message_id: msg.message.message_id
        });
        process.exit(1);
    }


    // search
    if (msg.data == 'miz119_cancel') {
        await telegram_bot.editMessageText("בוטל", {
            chat_id: msg.message.chat.id,
            message_id: msg.message.message_id
        })
        return
    }
    if (msg.data == 'miz119_1-4' || msg.data == 'miz119_all') {
        telegram_bot.editMessageText("המתן...", {
            chat_id: msg.message.chat.id,
            message_id: msg.message.message_id
        })
        sendTheFile({
            "name": "תהילים מזמור קיט אותיות א - ד",
            "chapter": "מזמור קיט",
            "soundcloud": "https://soundcloud.com/ygolan/zrerkyce5h9g",
            "spotify": "https://open.spotify.com/episode/1M23OgVKbz08RceLiP5tVS?si=V9JRau3eTI6eDopzSnfvLQ"
        }, { isSearch: true, contactID: msg.message.chat.id, source: "Telegram" });
    }
    if (msg.data == 'miz119_5-9' || msg.data == 'miz119_all') {
        telegram_bot.editMessageText("המתן...", {
            chat_id: msg.message.chat.id,
            message_id: msg.message.message_id
        })
        sendTheFile({
            "name": "תהילים מזמור קיט אותיות ה - ט",
            "chapter": "מזמור קיט",
            "soundcloud": "https://soundcloud.com/ygolan/qw0pzxw5l57f",
            "spotify": "https://open.spotify.com/episode/7lakZPDp8UVTcdXVH5YFPV?si=BqZMfK04QqizUpDBGSIKXw"
        }, { isSearch: true, contactID: msg.message.chat.id, source: "Telegram" });
    }
    if (msg.data == 'miz119_10-50' || msg.data == 'miz119_all') {
        telegram_bot.editMessageText("המתן...", {
            chat_id: msg.message.chat.id,
            message_id: msg.message.message_id
        })
        sendTheFile({
            "name": "תהילים מזמור קיט אותיות י - נ",
            "chapter": "מזמור קיט",
            "soundcloud": "https://soundcloud.com/ygolan/stdzu2iecycw",
            "spotify": "https://open.spotify.com/episode/5SLi3j1BpyDEUG9QSr305d?si=dRUpYYX2SM2YypsnCK_s-g"
        }, { isSearch: true, contactID: msg.message.chat.id, source: "Telegram" });
    }
    if (msg.data == 'miz119_60-90' || msg.data == 'miz119_all') {
        telegram_bot.editMessageText("המתן...", {
            chat_id: msg.message.chat.id,
            message_id: msg.message.message_id
        })
        sendTheFile({
            "name": "תהילים מזמור קיט אותיות ס - צ",
            "chapter": "מזמור קיט",
            "soundcloud": "https://soundcloud.com/ygolan/zidfok3zzkiu",
            "spotify": "https://open.spotify.com/episode/4KWO5O94odgyT8n48I3XfI?si=SDfi3g5XSWmK2T_PqW6B0Q"
        }, { isSearch: true, contactID: msg.message.chat.id, source: "Telegram" });
    }
    if (msg.data == 'miz119_100-400' || msg.data == 'miz119_all') {
        telegram_bot.editMessageText("המתן...", {
            chat_id: msg.message.chat.id,
            message_id: msg.message.message_id
        })
        sendTheFile({
            "name": "תהילים מזמור קיט אותיות ק - ת",
            "chapter": "מזמור קיט",
            "soundcloud": "https://soundcloud.com/ygolan/fsu9lly3hhqe",
            "spotify": "https://open.spotify.com/episode/3GJpW7ORE50d0zUgEfwySP?si=yZIEKz5SQbOUj3dIaVkw7w"
        }, { isSearch: true, contactID: msg.message.chat.id, source: "Telegram" });
    }

})

telegram_bot.on('polling_error', (error) => {
    //logToFile(error)
    console.log(error);  // => 'EFATAL'
});


// ####################################
//          Functions
// ####################################

async function sendTheFile(episode, arg = { isSearch: false, contactID: myID, source: "WhatsApp" }) {

    if (episode.path != null) {
        if (fs.existsSync(episode.path)) {
            sendFromPath(episode, arg);
            return;
        }
    }

    let link = fixSoundCloudLink(episode.soundcloud);
    let sefer = BIBLE_PROGRESS.sefer;

    if (!fs.existsSync('Files')) {
        fs.mkdirSync('Files');
    }
    if (!fs.existsSync(`Files/${sefer}`)) {
        fs.mkdirSync(`Files/${sefer}`);
    }

    let song = await SoundCloudClient.getSongInfo(link)
        .catch((err) => {
            console.error;
            logToFile(`ERROR! the link not working\n${link}\n${err}`);
        });

    let words;
    try {
        words = song.title.split(' ');
    } catch (error) {
        return logToFile(`ERROR! title is broke\n${link}\n${error}`);;
    }
    sefer = words[0];
    if (!fs.existsSync(`Files/${sefer}`)) {
        fs.mkdirSync(`Files/${sefer}`);
    }

    //console.log('downloading ' + song.title);
    logToFile('downloading ' + song.title);
    const stream = await song.downloadProgressive();
    const writer = stream.pipe(fs.createWriteStream(`./Files/${sefer}/${song.title}.mp3`));
    const filePath = `./Files/${sefer}/${song.title}.mp3`
    writer.on("finish", async () => {
        //console.log("%cFinished download the " + song.title, 'color: green');
        logToFile("%cFinished download the " + song.title, 'color: green');
        const tags = {
            title: song.title,
            artist: "הרב מוטי פרנקו (ישיבת הגולן)"
        }
        await NodeID3Promise.update(tags, filePath)
        episode.path = filePath;
        write_BIBLE_EPISODES();

        if (!arg.isSearch) {
            sendFileToGroup(episode);
            return;
        }

        // whatsapp
        if (arg.source === "WhatsApp") {
            var soundFile = MessageMedia.fromFilePath(filePath);
            //console.log("Sending the search file...")
            logToFile("@WhatsApp: Sending the file" + episode.name + "...")

            whatsapp_bot.sendMessage(arg.contactID, soundFile)
                .then((msg) => {
                    msg.reply(episode.name);
                    //console.log("sended seccesfully")
                    logToFile("@WhatsApp: The file " + episode.name + " has sended to " + arg.contactID)
                })
                .catch((err) => {
                    //console.log("cant send to " + episode.name)
                    logToFile(err)
                    whatsapp_bot.sendMessage(arg.contactID, "לא הצלחתי לשלוח את " + episode.name);
                });
        }
        // telegram
        else if (arg.source === "Telegram") {
            let kb = makeKeyboard(episode);
            logToFile("@Telegram: Start sending the file " + episode.name + "...")
            await telegram_bot.sendAudio(arg.contactID, filePath,
                {
                    caption: episode.name,
                    title: song.title,
                    reply_markup: {
                        inline_keyboard: kb
                    }
                })
                .catch(() => {
                    //console.log("@Telegram: cant send to telegram " + episode.name)
                    logToFile("@Telegram: cant send " + episode.name + " to " + arg.contactID)
                    console.error
                })

            logToFile("@Telegram: The file " + episode.name + " has sended to " + arg.contactID);

            // delete 'wait...' msg - NOT WORKING
            // for (let msgPromise of messaagesToDelete) {
            //     msgPromise.then(msg => {
            //         telegram_bot.deleteMessage(msg.chat.id, msg.message_id);
            //         logToFile("delete msg from telegram")
            //     })
            // }
        }

    });


}

function sendFromPath(episode, arg) {
    //console.log("%cSend file " + episode.name + " from local", 'color: green');
    logToFile("%cSend file " + episode.name + " from local", 'color: green');
    if (!arg.isSearch) {
        sendFileToGroup(episode);
        return;
    }
    var soundFile = MessageMedia.fromFilePath(episode.path);
    //console.log("Sending the search file...")
    logToFile("Sending the search file...")

    // whatsapp
    if (arg.source === "WhatsApp") {
        whatsapp_bot.sendMessage(arg.contactID, soundFile)
            .then((msg) => {
                msg.reply(episode.name);
                logToFile("sended seccesfully")
            })
            .catch((err) => {
                logToFile(err)
                whatsapp_bot.sendMessage(arg.contactID, "לא הצלחתי לשלוח את מה שחיפשת")
            });
    }
    // telegram
    else if (arg.source === "Telegram") {
        let kb = makeKeyboard(episode);
        logToFile("@Telegram: Sending the file " + episode.name + "...")
        telegram_bot.sendAudio(arg.contactID, episode.path,
            {
                caption: episode.name,
                title: episode.name,
                reply_markup: {
                    inline_keyboard: kb
                }
            })
            .then(() => {
                //console.log("@Telegram: The file " + episode.name + " has sended to " + arg.contactID);
                logToFile("@Telegram: The file " + episode.name + " has sended to " + arg.contactID);
            })
            .catch(() => {
                //console.log("@Telegram: cant send to telegram " + episode.name)
                logToFile("@Telegram: cant send to telegram " + episode.name)
                console.error
            })


    }
};

async function sendFileToGroup(episode) {

    try {
        // Telegram
        sendToTelegram(episode);

        // WhatsApp
        let soundFile = MessageMedia.fromFilePath(episode.path);

        let massToForward_WA = null;
        for (obj of LIST_OF_GROUP.tanach_whatsapp) {
            // have to be function, otherwise the next massage (title) will send to another group
            // await used duo the internet speed
            if (massToForward_WA == null) {
                massToForward_WA = await sendMessageWA(obj, soundFile, episode.name);
            } else {
                await forwardMassage(obj, episode.name, massToForward_WA);
            }
        }

    } catch {
        logToFile("%cCant get the file", 'color: red')
        whatsapp_bot.sendMessage(myID, "אזהרה! משהו לא עבד טוב...")
    }

    // in small server - remove file 
    //deleteFile(pathToFile);
}

async function forwardMassage(GRobj, title, msg) {
    await msg.forward(GRobj.id);
    await whatsapp_bot.sendMessage(GRobj.id, title);
    logToFile("@WhatsApp: The file " + title + " has forward to " + GRobj.name);
}

async function sendMessageWA(GRobj, soundFile, title) {
    //console.log("@WhatsApp: start to send " + title + " to " + GRobj.name)
    logToFile("@WhatsApp: start to send " + title + " to " + GRobj.name)
    let massSended = null;
    await whatsapp_bot.sendMessage(GRobj.id, soundFile)
        .then(msg => {
            massSended = msg;
            msg.reply(title)
            //console.log("@WhatsApp: The file " + title + " has sended to " + GRobj.name)
            logToFile("@WhatsApp: The file " + title + " has sended to " + GRobj.name)
        })
        .catch(() => {
            //console.log("@WhatsApp: cant send to whatsapp " + title)
            logToFile("@WhatsApp: cant send to whatsapp " + title)
            telegram_bot.sendMessage(userDebug.telegram, "cant send " + title + " to whatsapp")
            console.error
        })
    return massSended;
}

async function sendToTelegram(episode) {
    let massToForward_Tel = null;
    let kb = makeKeyboard(episode);
    for (let tel of LIST_OF_GROUP.tanach_telegram) {
        logToFile("@Telegram: start to send " + episode.name + " to " + tel.name);

        if (massToForward_Tel == null) {
            try {
                massToForward_Tel = await telegram_bot.sendAudio(tel.id, episode.path, {
                    caption: episode.name,
                    title: episode.name,
                    reply_markup: {
                        inline_keyboard: kb
                    }
                })

            }
            catch {
                logToFile("@Telegram: cant send to telegram " + episode.name)
                console.error
            }

            logToFile("@Telegram: The file " + episode.name + " has sended to " + tel.name);
        }
        else {
            await telegram_bot.forwardMessage(tel.id, massToForward_Tel.chat?.id, massToForward_Tel.message_id)
            logToFile("@Telegram: The file " + episode.name + " has sended to " + tel.name);
        }

    }
}

function deleteFile(pathToFile) {
    try {
        fs.unlinkSync(pathToFile);
        //console.log("%cThe " + pathToFile + " has deleted", 'color: red')
        logToFile("%cThe " + pathToFile + " has deleted", 'color: red')
    }
    catch (err) { console.error(err) }
}

/*  1000*60         is a minute 
    1000*60*60      is a hour
    1000*60*60*24   is a day     */
function sleep(ms = 1000) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function removeItemOnce(arr, value) {
    var index = arr.indexOf(value);
    if (index > -1) {
        arr.splice(index, 1);
    }
    return arr;
}

function write_BIBLE_EPISODES() {
    try {
        fs.writeFileSync('saved_files/BIBLE_EPISODES.json', JSON.stringify(BIBLE_EPISODES));
    } catch (err) {
        console.error(err);
    }
}

function read_BIBLE_EPISODES() {
    try {
        const text = fs.readFileSync('saved_files/BIBLE_EPISODES.json', 'utf8');
        var text_json = JSON.parse(text);
        //console.log(text_json);
        return text_json;
    } catch (err) {
        console.log(err)
        logToFile(err)
    }
    return {};
}

function write_BIBLE_PROGRESS() {
    try {
        if (!fs.existsSync('saved_files')) {
            fs.mkdirSync('saved_files');
        }
        fs.writeFileSync('saved_files/BIBLE_PROGRESS.json', JSON.stringify(BIBLE_PROGRESS));
    } catch (err) {
        console.error(err);
    }
}

function read_BIBLE_PROGRESS() {
    try {
        const text = fs.readFileSync('saved_files/BIBLE_PROGRESS.json', 'utf8');
        var text_json = JSON.parse(text);
        //console.log(text_json);
        logToFile(text_json);
        return text_json;
    } catch (err) {
        console.log(err)
        logToFile(err)
    }
    return {};
}

function write_LIST_OF_GROUP() {
    try {
        if (!fs.existsSync('saved_files')) {
            fs.mkdirSync('saved_files');
        }
        fs.writeFileSync('saved_files/LIST_OF_GROUP.json', JSON.stringify(LIST_OF_GROUP));
    } catch (err) {
        console.error(err);
    }
}

function read_LIST_OF_GROUP() {
    try {
        const text = fs.readFileSync('saved_files/LIST_OF_GROUP.json', 'utf8');
        var text_json = JSON.parse(text);
        //console.log(text_json);
        logToFile(text_json)
        return text_json;
    } catch (err) {
        console.log(err)
        logToFile(err)
    }
    return {};
}

function fixSoundCloudLink(link) {
    var index = link.indexOf('?');
    if (index > -1) {
        link = link.slice(0, index)
    }
    return link;
}


/**
 * @param {boolean} reset - set `true` if you want to reset all the data. 
 * default is `false`
 */
function initializeFiles(reset = false) {
    if (reset) {
        write_BIBLE_EPISODES();
        write_BIBLE_PROGRESS();
        write_LIST_OF_GROUP();
        return
    }

    if (!fs.existsSync(`saved_files/LIST_OF_GROUP.json`)) {
        write_LIST_OF_GROUP();
    } else {
        LIST_OF_GROUP = read_LIST_OF_GROUP();
    }

    if (!fs.existsSync(`saved_files/BIBLE_PROGRESS.json`)) {
        write_BIBLE_PROGRESS();
    } else {
        BIBLE_PROGRESS = read_BIBLE_PROGRESS();
    }

    if (!fs.existsSync(`saved_files/BIBLE_EPISODES.json`)) {
        write_BIBLE_EPISODES();
    } else {
        BIBLE_EPISODES = read_BIBLE_EPISODES();
    }

    if (!fs.existsSync('Files')) {
        fs.mkdirSync('Files');
    }
}

async function initializeGroup(nameToCompare = 'התנ"ך היומי') {
    let chats = await whatsapp_bot.getChats();
    let countGroupAdded = 0;

    for (let chat of chats) {
        if (chat.isGroup && chat.name.includes(nameToCompare)) {
            let chatID = chat.id._serialized;

            let isExist = false;
            for (let chatObj of LIST_OF_GROUP.tanach_whatsapp) {
                if (chatObj.id == chatID) {
                    isExist = true;
                    break;
                }
            }

            if (!isExist) {
                LIST_OF_GROUP.tanach_whatsapp.push(
                    {
                        name: chat.name,
                        id: chatID
                    }
                );
                countGroupAdded++;
            }
        }
    }
    if (countGroupAdded !== 0) {
        whatsapp_bot.sendMessage(myID, 'נוספו ' + countGroupAdded + ' קבוצות לרשימת התפוצה של התנ"ך היומי');
        write_LIST_OF_GROUP();
    }
}

function getIsraelTime(date = new Date()) {
    var invdate = new Date(date.toLocaleString('en-US', {
        timeZone: "Asia/Jerusalem"
    }));
    var diff = date.getTime() - invdate.getTime();
    return new Date(date.getTime() - diff);
}

function checkIsYomTov(hebdate) {
    //hebdate is Hebcal obj
    let M = hebdate.month
    let D = hebdate.day

    if (M === 7) {
        if (D === 1 || D === 2 || D === 10 || D === 15 || D === 22)
            return true;
    }
    if (M === 1) {
        if (D === 15 || D === 21)
            return true;
    }
    if (M === 3) {
        if (D === 6)
            return true;
    }
    return false;
}

function sendTanachYomi() {

    // when finish the current sefer, move to next one
    if (BIBLE_EPISODES[BIBLE_PROGRESS.sefer]?.[BIBLE_PROGRESS.chapter + 1] === undefined) {
        let index = BIBLE_EPISODES.order?.indexOf(BIBLE_PROGRESS.sefer);
        BIBLE_PROGRESS.sefer = BIBLE_EPISODES.order[index + 1];

        // when finish the whole bible, start from begining
        if (BIBLE_EPISODES.order.length === index + 1) {
            BIBLE_PROGRESS.sefer = BIBLE_EPISODES.order[0];
        }
        BIBLE_PROGRESS.chapter = 0;
    }

    //console.log(BIBLE_PROGRESS)

    // the next chapter to learn
    var TODAY_EPISODE = BIBLE_EPISODES[BIBLE_PROGRESS.sefer][BIBLE_PROGRESS.chapter + 1];

    let serverTime = new Date();
    var date = getIsraelTime(serverTime);
    var tomorrow = getIsraelTime(serverTime);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let hour = date.getHours();

    let dayInWeek = date.getDay(); // sunday is 0
    let dayInWeek_tomorow = tomorrow.getDay();

    let HebDate = new Hebcal.HDate(date);
    HebDate.setCity('Jerusalem');
    let HebDate_tomorow = new Hebcal.HDate(tomorrow);
    HebDate_tomorow.setCity('Jerusalem');

    is_Holi_Today = dayInWeek === 6 || checkIsYomTov(HebDate);
    is_Holi_tomorow = dayInWeek_tomorow === 6 || checkIsYomTov(HebDate_tomorow);

    //console.log(date)
    logToFile(date + ", ms: " + serverTime.getMilliseconds())

    if (is_Holi_Today && is_Holi_tomorow) {
        return; // do nothing
    }
    // only today
    if (is_Holi_Today) {
        let tzeit = getIsraelTime(HebDate.getZemanim().tzeit)
        let tzeit_hour = tzeit.getHours();

        if (isBetween(hour, 19, tzeit_hour)) {
            logToFile("tzeit at: " + tzeit_hour)
        }
        if (hour === (tzeit_hour + 1)) {
            BIBLE_PROGRESS.chapter++;
            write_BIBLE_PROGRESS();
            sendTheFile(TODAY_EPISODE);
            whatsapp_bot.sendMessage(myID, "מתחיל לשלוח את הפרק היומי...")
        }
        return;
    }
    // only tomorow
    if (is_Holi_tomorow) {
        if (hour === 10) {
            BIBLE_PROGRESS.chapter++;
            write_BIBLE_PROGRESS();
            sendTheFile(TODAY_EPISODE);
            whatsapp_bot.sendMessage(myID, "מתחיל לשלוח את הפרק היומי...")
        }
        return;
    }
    // middle in the week
    if (hour === 19) {
        BIBLE_PROGRESS.chapter++;
        write_BIBLE_PROGRESS();
        sendTheFile(TODAY_EPISODE);
        whatsapp_bot.sendMessage(myID, "מתחיל לשלוח את הפרק היומי...")
    }

    else if (IN_TESTING) {
        //let tzeit = getIsraelTime(HebDate.getZemanim().tzeit)
        //logToFile("test: tzeit: "+ tzeit.getHours())
        BIBLE_PROGRESS.chapter++;
        write_BIBLE_PROGRESS();
        sendTheFile(TODAY_EPISODE);
        whatsapp_bot.sendMessage(myID, "מתחיל לשלוח את הפרק היומי...")
    }
    return

    /*
        TODO- Parashat Shavoah
        // sunday, send at 10
        if (dayInWeek === 0 && hour === 10){}
        */
}

function makeKeyboard(episode) {
    let Keyboard = [
        []
    ];
    if (episode.soundcloud != null) {
        Keyboard[0].push({
            text: "SoundCloud",
            url: episode.soundcloud
        })
    }
    if (episode.spotify != null) {
        Keyboard[0].push({
            text: "Spotify",
            url: episode.spotify
        })
    }
    return Keyboard;
}

function getNextChapter() {
    let nextChapter;
    if (BIBLE_EPISODES[BIBLE_PROGRESS.sefer][BIBLE_PROGRESS.chapter + 1] === undefined) {
        let index = BIBLE_EPISODES.order.indexOf(BIBLE_PROGRESS.sefer);
        let tempSefer = BIBLE_EPISODES.order[index + 1];
        // when finish the whole bible, start from begining
        if (BIBLE_EPISODES.order.length === index + 1) {
            tempSefer = BIBLE_EPISODES.order[0];
        }
        nextChapter = BIBLE_EPISODES[tempSefer]?.[1];
    } else {
        nextChapter = BIBLE_EPISODES[BIBLE_PROGRESS.sefer][BIBLE_PROGRESS.chapter + 1];
    }

    if (nextChapter === undefined) {
        whatsapp_bot.sendMessage(myID, JSON.stringify(BIBLE_PROGRESS))
        nextChapter = getNextChapter();
    }
    return nextChapter;
}

/**
 * https://stackoverflow.com/a/41167909
 * @param {*} n the num to check
 * @param {*} a first num
 * @param {*} b secound num
 * @returns 
 */
function isBetween(n, a, b) {
    return (n - a) * (n - b) <= 0
}