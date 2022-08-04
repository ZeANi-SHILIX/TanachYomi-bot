const IN_TESTING = Boolean(process.argv[2]) ?? true;
console.log("IN_TESTING:", IN_TESTING)
const RUN_ON_SERVER = process.platform !== 'win32'; // server is linux, the testing on windows

process.env.NTBA_FIX_319 = 1;
process.env.NTBA_FIX_350 = 1;

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const TelegramBot = require('node-telegram-bot-api');
const SoundCloud = require("soundcloud-scraper");
const qrcode = require('qrcode-terminal'); // remove?
const NodeID3Promise = require('node-id3').Promise
const { default: PQueue } = require("p-queue");
//const { exec } = require("child_process");
const Hebcal = require('hebcal');
const QRCode = require('qrcode');
const fs = require('fs');
const os = require('os');
require("dotenv").config();

var util = require('util');
var logFile = fs.createWriteStream('log.txt', { flags: 'w' });
var logStdout = process.stdout;
var logToFile = function () {
    logFile.write(util.format.apply(null, arguments) + '\n');
    logStdout.write(util.format.apply(null, arguments) + '\n');
}
let date = new Date();
logToFile("the bot started at " + getIsraelTime(date))

// t.me/TanachYomi_bot , when TEST => t.me/SB_Robotbot
let token = IN_TESTING ? process?.env?.TOKEN_TEST : process?.env?.TOKEN;

let puppeteer = {
    headless: true, // true - without browser
    args: ["--no-sandbox", '--disable-setuid-sandbox']
}

// only for phone server
// if (RUN_ON_SERVER) {
//     puppeteer['executablePath'] = '/usr/bin/chromium-browser'
// }

const SoundCloudClient = new SoundCloud.Client();
const telegram_bot = new TelegramBot(token, { polling: true });

const authStrategy = new LocalAuth();
var worker = `${authStrategy.dataPath}/session/Default/Service Worker`;
//delete the service worker fix the issue
if (fs.existsSync(worker)) {
    fs.rmSync(worker, { recursive: true });
}
const whatsapp_bot = new Client({
    authStrategy: authStrategy,
    puppeteer
});
whatsapp_bot.initialize();


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
    sefer: "בראשית",
    chapter: 1
};
let LIST_OF_GROUP = {
    'tanach_whatsapp': [

    ],
    'tanach_telegram': [
        {
            name: "t.me/Tanach_Yomi",
            id: "@Tanach_Yomi"
        }
    ],
    'five_min': [
        // {
        //     name: "MyName",
        //     id: "97250XXXXXXX@c.us"
        // }
    ],
    "broadcast": {
        // "ID": {
        //     name: chatInfo.name,
        //     sendto: 'tanach_whatsapp'
        // }
    }
};
let ADMINS = read_ADMINS();

/** Current WhatsApp Client ID */
let myID = process?.env?.WHATSAPP_DEBUG;
let userDebug = process?.env?.TELEGRAM_DEBUG;

/** stored messages from users */
const params = new Map();

/** stored start time of users's requests */
const timeStamp = new Map();

/** queue of promises */
const queue = new PQueue({
    concurrency: 1,
    interval: 200,
    autoStart: true
});

initializeFiles();

whatsapp_bot.on('qr', async (qr) => {
    console.log('QR RECEIVED');
    //console.log(qr);
    qrcode.generate(qr, { small: true });
    if (!IN_TESTING) {
        await QRCode.toFile('./qr_code.png', qr);
        telegram_bot.sendPhoto(userDebug, './qr_code.png');
    }
});

whatsapp_bot.on('disconnected', async (reason) => {
    logToFile('@WA Client was logged out', reason);
    telegram_bot.sendMessage(userDebug, 'whatsapp_bot was logged out');
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
    let date = new Date();
    var avg_load = os.loadavg();
    logToFile(`@WA Change State ${msg}, At ${date.toLocaleTimeString()}\navg load (1 min, 5 min, 15 min): ${avg_load}`);
    telegram_bot.sendMessage(userDebug, 'WhatsApp Bot: ' + msg);
});

whatsapp_bot.on('ready', () => {
    myID = whatsapp_bot.info?.wid?._serialized;
    let linkToMyself = 'wa.me/' + whatsapp_bot.info?.wid.user;
    console.log('WhatsApp READY! connected to', linkToMyself);
    logToFile('WhatsApp READY! connected to', linkToMyself);

    if (RUN_ON_SERVER && !IN_TESTING) {
        telegram_bot.sendMessage(userDebug, 'בוט התנ"ך היומי בוואטסאפ מחובר למספר ' + linkToMyself);
        startAtZeroMinute();
    } else {
        tanachYomi();
    }


    // for test
    if (IN_TESTING) {
        let nameToCompare = `קבוצה בוט`;
        initializeGroup(nameToCompare);
    } else {
        initializeGroup();
    }
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
    // check no double procces
    if (params.has('tanachYomiProcces')) return;
    params.set('tanachYomiProcces', true)

    while (true) {
        let t0 = performance.now();
        let t1 = performance.now();

        timeStamp.set('startTime', new Date())
        sendTodayTanachYomiChapter();

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
            await sleep(5 * 60 * 1000 - (t1 - t0)) // minute
        }

        if (!params.has('tanachYomiProcces')) {
            break;
        }
    }
}

whatsapp_bot.on('message', async msg => {
    console.log('MESSAGE RECEIVED');
    const {
        forwardingScore,
        isStarred,
        hasQuotedMsg,
        duration,
        location,
        vCards,
        inviteV4,
        mentionedIds,
        orderId,
        token,
        isGif,
        isEphemeral,
        links,
        _data,
        ...newMSG } = msg;
    console.table(newMSG);

    let userID = msg.from;

    // If is there a dialogue
    if (params.has(userID)) {
        if (msg.body === 'בטל' || msg.body === 'ביטול') {
            params.delete(userID);
            whatsapp_bot.sendMessage(userID, "בוטל");
            return;
        }

        let user = params.get(userID);
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
            case 'joinTo': // when bot joining to group
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
                if (queue.size > 0) {
                    whatsapp_bot.sendMessage(msg.from, "מעבד בקשות קודמות... מקומך בתור הוא " + queue.size);
                }


                if (sendAll || msg.body === 'אותיות א - ד' || msg.body === 'אותיות א-ד' || msg.body === '1') {
                    queue.add(() => sendTheFile({
                        "name": "תהילים מזמור קיט אותיות א - ד",
                        "chapter": "מזמור קיט",
                        "soundcloud": "https://soundcloud.com/ygolan/zrerkyce5h9g",
                        "spotify": "https://open.spotify.com/episode/1M23OgVKbz08RceLiP5tVS?si=V9JRau3eTI6eDopzSnfvLQ"
                    }, { isSearch: true, contactID: msg.from, source: "WhatsApp" }));
                    params.delete(userID)
                }
                if (sendAll || msg.body === 'אותיות ה - ט' || msg.body === 'אותיות ה-ט' || msg.body === '2') {
                    queue.add(() => sendTheFile({
                        "name": "תהילים מזמור קיט אותיות ה - ט",
                        "chapter": "מזמור קיט",
                        "soundcloud": "https://soundcloud.com/ygolan/qw0pzxw5l57f",
                        "spotify": "https://open.spotify.com/episode/7lakZPDp8UVTcdXVH5YFPV?si=BqZMfK04QqizUpDBGSIKXw"
                    }, { isSearch: true, contactID: msg.from, source: "WhatsApp" }));
                    params.delete(userID)
                }
                if (sendAll || msg.body === 'אותיות י - נ' || msg.body === 'אותיות י-נ' || msg.body === '3') {
                    queue.add(() => sendTheFile({
                        "name": "תהילים מזמור קיט אותיות י - נ",
                        "chapter": "מזמור קיט",
                        "soundcloud": "https://soundcloud.com/ygolan/stdzu2iecycw",
                        "spotify": "https://open.spotify.com/episode/5SLi3j1BpyDEUG9QSr305d?si=dRUpYYX2SM2YypsnCK_s-g"
                    }, { isSearch: true, contactID: msg.from, source: "WhatsApp" }));
                    params.delete(userID)
                }
                if (sendAll || msg.body === 'אותיות ס - צ' || msg.body === 'אותיות ס-צ' || msg.body === '4') {
                    queue.add(() => sendTheFile({
                        "name": "תהילים מזמור קיט אותיות ס - צ",
                        "chapter": "מזמור קיט",
                        "soundcloud": "https://soundcloud.com/ygolan/zidfok3zzkiu",
                        "spotify": "https://open.spotify.com/episode/4KWO5O94odgyT8n48I3XfI?si=SDfi3g5XSWmK2T_PqW6B0Q"
                    }, { isSearch: true, contactID: msg.from, source: "WhatsApp" }));
                    params.delete(userID)
                }
                if (sendAll || msg.body === 'אותיות ק - ת' || msg.body === 'אותיות ק-ת' || msg.body === '5') {
                    queue.add(() => sendTheFile({
                        "name": "תהילים מזמור קיט אותיות ק - ת",
                        "chapter": "מזמור קיט",
                        "soundcloud": "https://soundcloud.com/ygolan/fsu9lly3hhqe",
                        "spotify": "https://open.spotify.com/episode/3GJpW7ORE50d0zUgEfwySP?si=yZIEKz5SQbOUj3dIaVkw7w"
                    }, { isSearch: true, contactID: msg.from, source: "WhatsApp" }));
                    params.delete(userID)
                }
                break;

        }
        return;
    }

    let contactID = (await msg.getContact()).id._serialized;
    let startWithSefer = BIBLE_EPISODES?.order?.some(value => msg.body.startsWith(value))

    // CHECK IF ALIVE
    if (msg.body === '!פינג' || msg.body === '!ping' || msg.body === 'פינג') {
        msg.reply('פונג');
    }

    // ####################
    //     Day setting
    // ####################
    else if (msg.body === '!add-day' || msg.body === '!הוסף-יום') {
        let adminInfo = isADMIN(contactID);
        if (!adminInfo.isAdmin) {
            msg.reply("אינך מנהל, רק למנהלים יש גישה לפקודה זו.")
            return;
        }

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
        logToFile(`#TanachYomi: The user ${adminInfo.name} has add day`)
    }

    else if (msg.body === '!set-day' || msg.body === '!הגדר-יום') {
        let adminInfo = isADMIN(contactID);
        if (!adminInfo.isAdmin) {
            msg.reply("אינך מנהל, רק למנהלים יש גישה לפקודה זו.")
            return;
        }

        userID = msg.from
        whatsapp_bot.sendMessage(msg.from, "האם ברצונך לשנות את הפרק הנוכחי?\nאם כן - שלח את שם הספר\nאם לא - שלח 'בטל'.");

        let userInfo = new Map();
        userInfo.set('case', 'getSefer');
        userInfo.set('contactName', adminInfo.name);
        params.set(userID, userInfo);

    }

    else if (msg.body === '!remove-day' || msg.body === '!הסר-יום') {
        let adminInfo = isADMIN(contactID);
        if (!adminInfo.isAdmin) {
            msg.reply("אינך מנהל, רק למנהלים יש גישה לפקודה זו.")
            return;
        }

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
        logToFile(`#TanachYomi: The user ${adminInfo.name} has remove day`)
    }

    else if (msg.body === '!show-day' || msg.body === '!הצג-יום') {
        let nextChapter = getNextChapter();
        whatsapp_bot.sendMessage(msg.from, 'הפרק הבא שישלח: ' + nextChapter.name);
    }

    // ####################
    //       Get ID
    // ####################

    // personal
    else if (msg.body === '!my-id' || msg.body === '!המזהה-שלי') {
        let contactID = (await msg.getContact()).id._serialized;
        msg.reply('הID שלך הוא: ' + contactID);
    }
    // of the chat
    else if (msg.body === '!get-id' || msg.body === '!מזהה-השיחה') {
        let chatID = msg.from;
        whatsapp_bot.sendMessage(msg.from, "הID של הצ'אט: " + chatID);
    }

    // ####################
    // REMOVE / ADD CHAT
    // ####################
    else if (msg.body === '!add-chat-tanach' || msg.body === '!הוסף-צאט-תנך') {
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
    else if (msg.body === '!remove-chat-tanach' || msg.body === '!הסר-צאט-תנך') {
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
    else if (msg.body === '!show-chats' || msg.body === '!הצג-קבוצות') {
        let adminInfo = isADMIN(contactID);
        if (!adminInfo.isAdmin) {
            msg.reply("אינך מנהל, רק למנהלים יש גישה לפקודה זו.")
            return;
        }
        let str = `*רשימת הקבוצות בתנ"ך היומי:*\n`
        LIST_OF_GROUP.tanach_whatsapp.forEach(grObj => {
            str += grObj.name + "\n";
        })
        whatsapp_bot.sendMessage(msg.from, str);
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
    else if (msg.body === '!רשימת-הספרים' || msg.body === '!all-books') {
        whatsapp_bot.sendMessage(msg.from, "*רשימת הספרים במאגר:*\n" + String(BIBLE_EPISODES.order));
    }
    else if (msg.body === '!רשימת-הפקודות' || msg.body === '!commands' || msg.body === '!פקודות') {
        let commands = {
            '!ping': 'בדוק אם הבוט חי',
            '!הוסף-צאט-תנך': "הוסף את הצא'ט הנוכחי לרשימת שליחת התנך היומי",
            '!הסר-צאט-תנך': "הסר את הצא'ט הנוכחי מרשימת שליחת התנך היומי",
            '!הצג-קבוצות': "הצג את רשימת שליחת התנך היומי",
            '!רשימת-הספרים': "רשימת כל הספרים שנמצאים במאגר",
            '!מזהה-השיחה': "קבל את הID של הצ'אט",
            '!המזהה-שלי': "קבל את הID שלך",
            '!הצג-יום': "קבל את שם הפרק הבא שישלח בתנך היומי",
            '!הגדר-יום': "הגדר את הפרק הבא שישלח בתנך היומי",
            '!הוסף-יום': "דלג על פרק אחד בתנך היומי",
            '!הסר-יום': "חזור על פרק אחד בתנך היומי",
            '!הצג-מנהלים': "קבל את רשימת מנהלי הבוט",
            '!הוסף-מנהלים': "הוסף מנהל לבוט (על ידי ציטוט או תיוג)",
            '!הסר-מנהלים': "הסר מנהל מהבוט (על ידי ציטוט או תיוג)",
            '!הגדר-כרשימת-תפוצה': "הגדר את הקבוצה הנוכחית כרשימת תפוצה לקבוצות אחרות",
            'חפש {ספר} פרק {פרק}': "חיפוש פרק במאגר"
        }
        let str = "";
        for (let obj of Object.entries(commands)) {
            str += `${obj[0]} => ${obj[1]}\n`
        }
        whatsapp_bot.sendMessage(msg.from, "*רשימת הפקודות בבוט:*\n(חלק מהפקודות זמינות למנהלים בלבד)\n" + str);
    }

    else if (msg.body === '!print-msg') {
        whatsapp_bot.sendMessage(msg.from, JSON.stringify(msg, null, 4));
    }


    /*#########################
             admins
     ##########################*/
    else if (msg.body === '!get-admins' || msg.body === '!הצג-מנהלים') {
        let adminInfo = isADMIN(contactID);
        if (adminInfo.isAdmin) {
            msg.reply("רשימת מנהלי הבוט:\n" + JSON.stringify(ADMINS, null, 4));
        }
        else {
            msg.reply("אינך מנהל, רק למנהלים יש גישה לפקודה זו.");
        }
    }
    // !set-admins {mentions}/{QuotedMsg}
    else if (msg.body.startsWith('!set-admins') || msg.body.startsWith('!הוסף-מנהלים')) {
        let adminInfo = isADMIN(contactID);
        if (adminInfo.isAdmin) {
            let mentions = msg.mentionedIds;

            if (mentions.length != 0) {
                for (let id in mentions) {
                    let nameContact = (await whatsapp_bot.getContactById(id)).name ?? "No Name"
                    addAdminWA(id, nameContact, msg);
                    logToFile('=> ADMIN: the admin ' + adminInfo.name + ' added ' + nameContact + ' as admin')
                }
            }

            if (msg.hasQuotedMsg) {
                let quoted_msg = await msg.getQuotedMessage();
                let quoted_contact = await quoted_msg.getContact();

                let nameContact = quoted_contact.name ?? "No Name"
                let quoted_id = quoted_contact.id._serialized;

                if (!mentions.includes(quoted_id)) {
                    addAdminWA(quoted_id, nameContact, msg);
                    logToFile('=> ADMIN: the admin ' + adminInfo.name + ' added ' + nameContact + ' as admin')
                }
            }

        } else {
            msg.reply("אינך מנהל, רק למנהלים יש גישה לפקודה זו.");
        }
    }
    // !unset-admins {mentions}/{QuotedMsg}
    else if (msg.body.startsWith('!unset-admins') || msg.body.startsWith('!הסר-מנהלים')) {
        let adminInfo = isADMIN(contactID);
        if (adminInfo.isAdmin) {
            let mentions = msg.mentionedIds;
            if (mentions.length != 0) {
                for (let id of mentions) {
                    let nameContact = (await whatsapp_bot.getContactById(id)).name ?? "No Name"
                    removeAdminWA(id, nameContact, msg);
                    logToFile('=> ADMIN: the admin ' + adminInfo.name + ' remove ' + nameContact + ' from admins')
                }
            }

            if (msg.hasQuotedMsg) {
                let quoted_msg = await msg.getQuotedMessage();
                let quoted_contact = await quoted_msg.getContact();

                let nameContact = quoted_contact.name ?? "No Name"
                let quoted_id = quoted_contact.id._serialized;

                if (!mentions.includes(quoted_id)) {
                    removeAdminWA(quoted_id, nameContact, msg);
                    logToFile('=> ADMIN: the admin ' + adminInfo.name + ' remove ' + nameContact + ' from admins')
                }
            }

        } else {
            msg.reply("אינך מנהל, רק למנהלים יש גישה לפקודה זו.");
        }
    }

    // ####################################
    //             FIND FILE
    // ####################################
    else if (msg.body.startsWith('חפש')) {
        let chat = await msg.getChat()
        if (chat.isGroup) {
            return;
        }

        let str = msg.body.slice(3).trim();

        let contact = await msg.getContact();
        let contactName = contact.name || contact.pushname;
        let founded = search_One_Chapter(str, msg.from, contactName, 'WhatsApp');
        logToFile('Founded', founded)
    }

    // #########################
    //      broadcast group
    // #########################
    else if (msg.body === '!broadcast' || msg.body === '!הגדר-כרשימת-תפוצה') {
        if (!ADMINS.includes(contactID)) {
            msg.reply("אינך מנהל, רק למנהלים יש גישה לפקודה זו.")
            return;
        }

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
        if (params.has(msg.from)) return; // dont send on reply ###### ===>>> need check

        let msgtoforward = new Map();
        msgtoforward.set('case', 'sendBroadcast');
        params.set(msg.from, msgtoforward);
        msg.reply("האם ברצונך לשלוח הודעה זו לכל הקבוצות?\nאם כן שלח 'כן' או 'שלח' בציטוט על ההודעה שאתה רוצה להעביר, אם לא שלח 'בטל'.")
    }

    // ####################################
    //       FIND FILE - startWithSefer
    // ####################################

    else if (startWithSefer) {
        let chat = await msg.getChat()
        if (chat.isGroup) {
            return;
        }

        let str = msg.body.trim();

        let contact = await msg.getContact();
        let contactName = contact.name || contact.pushname;
        let founded = search_One_Chapter(str, msg.from, contactName, 'WhatsApp');
        logToFile('Founded', founded)
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

/* #########################################
 *                  TELEGRAM
 * ######################################### */

/** stores msg(promise) to delete */
let messaagesToDelete = [];

telegram_bot.onText(/\/start/, (msg) => {
    let str = `שלום ${msg.from?.first_name}!\nברוך הבא לבוט התנ"ך היומי.\n\n` +
        `אם תרצה, תוכל לקבל ממני כל יום את הפרק היומי בתנ"ך (בפרטי או בקבוצה)\n(לחץ  על כפתור הפקודות כדי לראות)\n` +
        `ובנוסף תוכל לחפש פרק ללימוד לפי בחירה, ` +
        `החיפוש מתבצע בפורמט הבא: \n` +
        `\`\`\`חפש חפש (ספר) פרק (שם הפרק)\`\`\`\n` +
        `או בחיפוש אינליין עם הפקודה /search\n\n` +
        `נא להקדיש את הלימוד לע"נ ינון ירון בן אברהם`
    telegram_bot.sendMessage(msg.chat.id, str, { parse_mode: 'Markdown' });
});

telegram_bot.on('message', async (msg) => {

    let trimMsg = msg.text?.trim();
    if (trimMsg === 'חפש' || trimMsg === 'חיפוש' || trimMsg === '/search') {

        return telegram_bot.sendMessage(msg.chat.id, "לחיפוש אינליין יש ללחוץ על הכפתור למטה", {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "לחץ כאן!", switch_inline_query_current_chat: "" }
                    ]
                ]
            }
        });
    }

    if (msg.text?.startsWith("חפש")) {
        let str = msg.text.slice(3).trim();

        let contactName = (msg.chat.first_name || msg.contact.first_name) ?? "cant get the name"
        let founded = search_One_Chapter(str, msg.chat.id, contactName, "Telegram")
        logToFile('founded', founded)
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

telegram_bot.onText(/\/getlog/, (msg) => {
    let contactID = msg.contact?.user_id ?? "No Contact"
    let adminInfo = isADMIN(String(contactID), String(msg.chat.id));
    if (!adminInfo.isAdmin) {
        return telegram_bot.sendMessage(msg.chat.id, "אינך מנהל, רק למנהלים יש גישה לפקודה זו.");
    }

    telegram_bot.sendDocument(msg.chat.id, "./log.txt");
});

telegram_bot.onText(/\/clearlog/, (msg) => {
    let contactID = msg.contact?.user_id ?? "No Contact"
    let adminInfo = isADMIN(String(contactID), String(msg.chat.id));
    if (!adminInfo.isAdmin) {
        return telegram_bot.sendMessage(msg.chat.id, "אינך מנהל, רק למנהלים יש גישה לפקודה זו.");
    }

    fs.createWriteStream('log.txt', { flags: 'w' });
    logToFile(adminInfo.name + " has cleared the log at " + getIsraelTime())
    telegram_bot.sendMessage(msg.chat.id, "הלוג נוקה")
})

telegram_bot.onText(/\/getbible/, (msg) => {
    telegram_bot.sendDocument(msg.chat.id, "./saved_files/BIBLE_EPISODES.json", { caption: 'מאגר התנ"ך' });
});

telegram_bot.onText(/\/getgroups/, (msg) => {
    let contactID = msg.contact?.user_id ?? "No Contact";
    let adminInfo = isADMIN(String(contactID), String(msg.chat.id));
    if (!adminInfo.isAdmin) {
        return telegram_bot.sendMessage(msg.chat.id, "אינך מנהל, רק למנהלים יש גישה לפקודה זו.");
    }
    telegram_bot.sendDocument(msg.chat.id, "./saved_files/LIST_OF_GROUP.json", { caption: "רשימת הקבוצות" });

});

telegram_bot.onText(/\/getadmins/, (msg) => {
    let contactID = msg.contact?.user_id ?? "No Contact";
    let adminInfo = isADMIN(String(contactID), String(msg.chat.id));
    if (!adminInfo.isAdmin) {
        return telegram_bot.sendMessage(msg.chat.id, "אינך מנהל, רק למנהלים יש גישה לפקודה זו.");
    }
    telegram_bot.sendDocument(msg.chat.id, "./saved_files/ADMINS_Tanach.json", { caption: "רשימת מנהלים" });

});

telegram_bot.onText(/\/getnext/, (msg) => {
    let nextChapter = getNextChapter();
    telegram_bot.sendMessage(msg.chat.id, 'הפרק הבא שישלח: ' + nextChapter.name);
});

telegram_bot.onText(/\/getprogress/, (msg) => {
    telegram_bot.sendDocument(msg.chat.id, "./saved_files/BIBLE_PROGRESS.json", { caption: "התקדמות הבוט" });
});

telegram_bot.onText(/\/getmsg/, (msg) => {
    telegram_bot.sendMessage(msg.chat.id, JSON.stringify(msg, null, 4));
});

telegram_bot.onText(/\/getid/, (msg) => {
    telegram_bot.sendMessage(msg.chat.id, "הID של השיחה: " + msg.chat.id);
});


telegram_bot.onText(/\/killbot/, (msg) => {
    let contactID = msg.contact?.user_id ?? "No Contact";
    let adminInfo = isADMIN(String(contactID), String(msg.chat.id));
    if (!adminInfo.isAdmin) {
        return telegram_bot.sendMessage(msg.chat.id, "אינך מנהל, רק למנהלים יש גישה לפקודה זו.");
    }
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

telegram_bot.onText(/\/wastart/, async (msg) => {
    let contactID = msg.contact?.user_id ?? "No Contact";
    let adminInfo = isADMIN(String(contactID), String(msg.chat.id));
    if (!adminInfo.isAdmin) {
        return telegram_bot.sendMessage(msg.chat.id, "אינך מנהל, רק למנהלים יש גישה לפקודה זו.");
    }

    let currentSession = whatsapp_bot.info?.wid?._serialized || false
    if (currentSession) {
        return telegram_bot.sendMessage(msg.chat.id, "בוט הוואטסאפ כבר פועל...\n\nאם אתה רוצה להפעיל אותו מחדש (ימחק את החשבון הקיים) שלח את הפקודה הבאה:\n\/warestart")
    }
    await whatsapp_bot.initialize();
    telegram_bot.sendMessage(msg.chat.id, "בוט הוואטסאפ הופעל.")
});

telegram_bot.onText(/\/wastop/, (msg) => {
    let contactID = msg.contact?.user_id ?? "No Contact";
    let adminInfo = isADMIN(String(contactID), String(msg.chat.id));
    if (!adminInfo.isAdmin) {
        return telegram_bot.sendMessage(msg.chat.id, "אינך מנהל, רק למנהלים יש גישה לפקודה זו.");
    }

    let currentSession = whatsapp_bot.info?.wid?._serialized || false
    if (currentSession) {
        return telegram_bot.sendMessage(msg.chat.id, "האם אתה בטוח שברצונך לעצור את הבוט של הוואטסאפ?", {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "לא, שישאר חי", callback_data: 'cancel' },
                        { text: "כן אני בטוח", callback_data: "wakillbot" }
                    ]
                ]
            }
        })
    }
    telegram_bot.sendMessage(msg.chat.id, "עוצר את בוט הוואטסאפ... (הבוט לא מחובר לחשבון וואטסאפ)")
    whatsapp_bot.destroy();
    //params.delete('tanachYomiProcces') - will stop telegram too
});

telegram_bot.onText(/\/warestart/, (msg) => {
    let contactID = msg.contact?.user_id ?? "No Contact";
    let adminInfo = isADMIN(String(contactID), String(msg.chat.id));
    if (!adminInfo.isAdmin) {
        return telegram_bot.sendMessage(msg.chat.id, "אינך מנהל, רק למנהלים יש גישה לפקודה זו.");
    }

    telegram_bot.sendMessage(msg.chat.id, "האם אתה בטוח שברצונך לאתחל את בוט הוואטסאפ?\nשים לב שפרטי החיבור הנוכחי יימחקו", {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "בטל", callback_data: 'cancel' },
                    { text: "כן אני בטוח", callback_data: "warestart" }
                ]
            ]
        }
    })

});

telegram_bot.onText(/\/getserverinfo/, (msg) => {
    let contactID = msg.contact?.user_id ?? "No Contact";
    let adminInfo = isADMIN(String(contactID), String(msg.chat.id));
    if (!adminInfo.isAdmin) {
        return telegram_bot.sendMessage(msg.chat.id, "אינך מנהל, רק למנהלים יש גישה לפקודה זו.");
    }

    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    const all = process.memoryUsage().heapTotal / 1024 / 1024;
    let freemem = os.freemem() / 1024 / 1024;
    let totalmem = os.totalmem() / 1024 / 1024;

    telegram_bot.sendMessage(msg.chat.id,
        `The script uses approximately ${Math.round(used * 100) / 100} MB \n(${Math.round(all * 100) / 100} MB - heapTotal)
    Server: 
    Free: ${Math.round(freemem * 100) / 100} MB
    Total: ${Math.round(totalmem * 100) / 100} MB`
    );

});

telegram_bot.onText(/\/addadmins/, (msg) => {
    let contactID = msg.contact?.user_id ?? "No Contact";
    let adminInfo = isADMIN(String(contactID), String(msg.chat.id));
    if (!adminInfo.isAdmin) {
        return telegram_bot.sendMessage(msg.chat.id, "אינך מנהל, רק למנהלים יש גישה לפקודה זו.");
    }

    let mentions = msg.entities;

    if (mentions?.length != 0) {
        for (let entity of mentions) {
            let isMention = entity.type === 'text_mention' || entity.type === 'mention';
            if (entity.user != undefined && isMention) {
                let nameContact = entity.user?.first_name + " " + entity.user?.last_name
                addAdminTel(entity.user.id, nameContact, msg);
                logToFile('=> ADMIN: the admin ' + adminInfo.name + ' added ' + nameContact + ' as admin')

            }
        }
    }

    if (msg.reply_to_message != undefined) {
        let quoted_contact = msg.reply_to_message.from;

        let nameContact = quoted_contact?.first_name + " " + quoted_contact?.last_name || "No Name"
        let quoted_id = quoted_contact.id;

        let notInMentions = mentions.every(entity => entity.user?.id !== quoted_id)

        if (notInMentions) {
            addAdminTel(quoted_id, nameContact, msg);
            logToFile('=> ADMIN: the admin ' + adminInfo.name + ' added ' + nameContact + ' as admin')
        }
    }

    //telegram_bot.sendMessage(msg.chat.id, "")

});

telegram_bot.onText(/\/removeadmins/, (msg) => {
    let contactID = msg.contact?.user_id ?? "No Contact";
    let adminInfo = isADMIN(String(contactID), String(msg.chat.id));
    if (!adminInfo.isAdmin) {
        return telegram_bot.sendMessage(msg.chat.id, "אינך מנהל, רק למנהלים יש גישה לפקודה זו.");
    }

    let mentions = msg.entities;

    if (mentions?.length != 0) {
        for (let entity of mentions) {
            let isMention = entity.type === 'text_mention' || entity.type === 'mention';
            if (entity.user != undefined && isMention) {
                let nameContact = entity.user?.first_name + " " + entity.user?.last_name
                removeAdminTel(entity.user.id, nameContact, msg);
                logToFile('=> ADMIN: the admin ' + adminInfo.name + ' remove ' + nameContact + ' from admins')

            }
        }
    }

    if (msg.reply_to_message != undefined) {
        let quoted_contact = msg.reply_to_message.from;

        let nameContact = quoted_contact?.first_name + " " + quoted_contact?.last_name || "No Name"
        let quoted_id = quoted_contact.id;

        let notInMentions = mentions.every(entity => entity.user?.id !== quoted_id)

        if (notInMentions) {
            removeAdminTel(quoted_id, nameContact, msg);
            logToFile('=> ADMIN: the admin ' + adminInfo.name + ' remove ' + nameContact + ' from admins')
        }
    }

    //telegram_bot.sendMessage(msg.chat.id, "")

});

telegram_bot.on("callback_query", async (msg) => {
    if (msg.data == 'cancel') {
        telegram_bot.editMessageText("בוטל", {
            chat_id: msg.message.chat.id,
            message_id: msg.message.message_id
        })
    }
    else if (msg.data == 'dontkillbot') {
        telegram_bot.editMessageText("יששש! ניצלתי מגזרת השמד!", {
            chat_id: msg.message.chat.id,
            message_id: msg.message.message_id
        })
    }
    else if (msg.data == 'killbot') {
        await telegram_bot.editMessageText("היה נעים להכיר! להתראות!", {
            chat_id: msg.message.chat.id,
            message_id: msg.message.message_id
        });
        process.exit(1); // pm2 restart automatically
    }
    else if (msg.data == 'wakillbot') {
        await whatsapp_bot.destroy();
        //params.delete('tanachYomiProcces') - will stop telegram too
        telegram_bot.editMessageText("בוט הוואטסאפ נעצר", {
            chat_id: msg.message.chat.id,
            message_id: msg.message.message_id
        });
    }
    else if (msg.data == 'warestart') {
        telegram_bot.editMessageText("בוט הוואטסאפ אותחל מחדש. \nשים לב שעליך לסרוק את הקוד על מנת לחבר את הבוט לחשבון הוואטסאפ.", {
            chat_id: msg.message.chat.id,
            message_id: msg.message.message_id
        });
        await whatsapp_bot.destroy();
        //params.delete('tanachYomiProcces') - will stop telegram too
        await fs.promises.rm('.wwebjs_auth', { recursive: true, force: true })
        whatsapp_bot.initialize();
    }


    // search (can't be inside 'else if')
    if (msg.data == 'miz119_cancel') {
        await telegram_bot.editMessageText("בוטל", {
            chat_id: msg.message.chat.id,
            message_id: msg.message.message_id
        })
        return
    }
    if (queue.size > 0 && msg.data.startsWith('miz119')) {
        telegram_bot.sendMessage(msg.message.chat.id, "מעבד בקשות קודמות... מקומך בתור הוא " + queue.size);
    }

    if (msg.data == 'miz119_1-4' || msg.data == 'miz119_all') {
        queue.add(() => sendTheFile({
            "name": "תהילים מזמור קיט אותיות א - ד",
            "chapter": "מזמור קיט",
            "soundcloud": "https://soundcloud.com/ygolan/zrerkyce5h9g",
            "spotify": "https://open.spotify.com/episode/1M23OgVKbz08RceLiP5tVS?si=V9JRau3eTI6eDopzSnfvLQ"
        }, { isSearch: true, contactID: msg.message.chat.id, source: "Telegram" }));
    }
    if (msg.data == 'miz119_5-9' || msg.data == 'miz119_all') {
        // telegram_bot.editMessageText("המתן...", {
        //     chat_id: msg.message.chat.id,
        //     message_id: msg.message.message_id
        // })
        queue.add(() => sendTheFile({
            "name": "תהילים מזמור קיט אותיות ה - ט",
            "chapter": "מזמור קיט",
            "soundcloud": "https://soundcloud.com/ygolan/qw0pzxw5l57f",
            "spotify": "https://open.spotify.com/episode/7lakZPDp8UVTcdXVH5YFPV?si=BqZMfK04QqizUpDBGSIKXw"
        }, { isSearch: true, contactID: msg.message.chat.id, source: "Telegram" }));
    }
    if (msg.data == 'miz119_10-50' || msg.data == 'miz119_all') {
        queue.add(() => sendTheFile({
            "name": "תהילים מזמור קיט אותיות י - נ",
            "chapter": "מזמור קיט",
            "soundcloud": "https://soundcloud.com/ygolan/stdzu2iecycw",
            "spotify": "https://open.spotify.com/episode/5SLi3j1BpyDEUG9QSr305d?si=dRUpYYX2SM2YypsnCK_s-g"
        }, { isSearch: true, contactID: msg.message.chat.id, source: "Telegram" }));
    }
    if (msg.data == 'miz119_60-90' || msg.data == 'miz119_all') {
        queue.add(() => sendTheFile({
            "name": "תהילים מזמור קיט אותיות ס - צ",
            "chapter": "מזמור קיט",
            "soundcloud": "https://soundcloud.com/ygolan/zidfok3zzkiu",
            "spotify": "https://open.spotify.com/episode/4KWO5O94odgyT8n48I3XfI?si=SDfi3g5XSWmK2T_PqW6B0Q"
        }, { isSearch: true, contactID: msg.message.chat.id, source: "Telegram" }));
    }
    if (msg.data == 'miz119_100-400' || msg.data == 'miz119_all') {
        queue.add(() => sendTheFile({
            "name": "תהילים מזמור קיט אותיות ק - ת",
            "chapter": "מזמור קיט",
            "soundcloud": "https://soundcloud.com/ygolan/fsu9lly3hhqe",
            "spotify": "https://open.spotify.com/episode/3GJpW7ORE50d0zUgEfwySP?si=yZIEKz5SQbOUj3dIaVkw7w"
        }, { isSearch: true, contactID: msg.message.chat.id, source: "Telegram" }));
    }

})

telegram_bot.on('polling_error', (error) => {
    //logToFile(error)
    console.log(error);  // => 'EFATAL'
});

telegram_bot.on('inline_query', ctx => {
    let str = ctx.query.trim();

    //console.log(str)
    let chaptersArr = searchChapters(str)
    if (chaptersArr.length > 40)
        chaptersArr = chaptersArr.slice(0, 40)

    telegram_bot.answerInlineQuery(ctx.id, chaptersArr.map((item, index) => {
        const { name } = item;
        //console.log('Found: ' + name)
        return {
            type: "article",
            title: name,
            description: "(הפרק ישלח לאחר הבחירה)",
            id: String(index),
            input_message_content: {
                message_text: `חפש ${name}`
            }
            // reply_markup: {
            //     inline_keyboard: makeKeyboard(item)
            // },
        }

    }))

});

// ####################################
//          Functions
// ####################################
/**
 * 
 * @param {{name:string, chapter:string, soundcloud:string}} episode 
 * @param {{isSearch:boolean, contactID:string, source:string}} arg 
 * @returns 
 */
async function sendTheFile(episode, arg = { isSearch: false, contactID: myID, source: "WhatsApp" }) {

    let link = fixSoundCloudLink(episode.soundcloud);
    let index = episode.name?.indexOf('מזמור') > -1 ? episode.name?.indexOf('מזמור') : episode.name?.indexOf('פרק')
    let sefer = episode.name?.slice(0, index).trim(); //OPTION 2: sefer = episode.name?.replace(episode.chapter, "").trim();

    let song = await SoundCloudClient.getSongInfo(link)
        .catch((err) => {
            console.error;
            logToFile(`ERROR! the link not working\n${link}\n${err}`);
        });

    if (episode.path != null) {
        if (fs.existsSync(episode.path)) {
            sendFromPath(episode, arg, episode.name);
            return;
        }
    }


    if (!fs.existsSync('Files')) fs.mkdirSync('Files');
    if (!fs.existsSync(`Files/${sefer}`)) fs.mkdirSync(`Files/${sefer}`);

    // wait to download to finish
    await new Promise(async (resolve, reject) => {

        logToFile('downloading ' + episode.name);
        const stream = await song.downloadProgressive();
        const writer = stream.pipe(fs.createWriteStream(`./Files/${sefer}/${episode.name}.mp3`));
        const filePath = `./Files/${sefer}/${episode.name}.mp3`;

        writer.on("finish", async () => {
            logToFile("%cFinished download the " + episode.name, 'color: green');

            // add tag to song
            const tags = {
                title: episode.name,
                artist: "הרב מוטי פרנקו (ישיבת הגולן)"
            }
            await NodeID3Promise.update(tags, filePath);

            // save the path
            episode.path = filePath;
            write_BIBLE_EPISODES();

            if (!arg.isSearch) {
                sendDownloadedFileToGroups(episode, episode.name);
            } else {
                sendSearchedFile(arg, episode);
            }

            resolve();
        });

        writer.on('error', err => {
            logToFile(err);
            reject(err);
        })
    });
}

/**
 * 
 * @param {{ isSearch: boolean, contactID: string, source: string }} arg 
 * @param {{name:string,path:string}} episode 
 */
function sendSearchedFile(arg, episode) {
    // whatsapp
    if (arg.source === "WhatsApp") {
        logToFile("@WhatsApp: Sending the file " + episode.name + "...");

        let soundFile = MessageMedia.fromFilePath(episode.path);
        queue.add(() => whatsapp_bot.sendMessage(arg.contactID, soundFile), { priority: 1 })
            .then((msg) => {
                msg.reply(episode.name);
                //console.log("sended seccesfully")

                let endTime = new Date();
                let startTime = endTime;
                if (timeStamp.has(arg.contactID)) {
                    startTime = timeStamp.get(arg.contactID);
                    timeStamp.delete(arg.contactID)
                }
                let timeDiff = (endTime - startTime) / 1000;
                logToFile("@WhatsApp: The file " + episode.name + " has sended to " + arg.contactID + ", Time: " + timeDiff + "\n---------")
            })
            .catch((err) => {
                //console.log("cant send to " + episode.name)
                logToFile(err)
                whatsapp_bot.sendMessage(arg.contactID, "לא הצלחתי לשלוח את " + episode.name);
            });
    }
    // telegram
    else if (arg.source === "Telegram") {
        logToFile("@Telegram: Start sending the file " + episode.name + "...");

        let kb = makeKeyboard(episode);
        queue.add(() => telegram_bot.sendAudio(arg.contactID, episode.path,
            {
                caption: episode.name,
                title: episode.name,
                reply_markup: {
                    inline_keyboard: kb
                }
            }), { priority: 1 })
            .then(() => {
                let endTime = new Date();
                let startTime = endTime;
                if (timeStamp.has(arg.contactID)) {
                    startTime = timeStamp.get(arg.contactID);
                    timeStamp.delete(arg.contactID)
                }
                let timeDiff = (endTime - startTime) / 1000;
                logToFile("@Telegram: The file " + episode.name + " has sended to " + arg.contactID + ", Time: " + timeDiff + "\n---------");
            })
            .catch(() => {
                //console.log("@Telegram: cant send to telegram " + episode.name)
                logToFile("@Telegram: cant send " + episode.name + " to " + arg.contactID)
                console.error
            })

        // delete 'wait...' msg - [NOT WORKING]
        // for (let msgPromise of messaagesToDelete) {
        //     msgPromise.then(msg => {
        //         telegram_bot.deleteMessage(msg.chat.id, msg.message_id);
        //         logToFile("delete msg from telegram")
        //     })
        // }
    }
}

function sendFromPath(episode, arg, title) {
    logToFile("%cSend file " + episode.name + " from local", 'color: green');
    if (!arg.isSearch) {
        return sendDownloadedFileToGroups(episode, title);
    }

    sendSearchedFile(arg, episode)
}

async function sendDownloadedFileToGroups(episode, title) {

    let soundFile;
    try {
        soundFile = MessageMedia.fromFilePath(episode.path);
    } catch (err) {
        logToFile("Cant get the file.\n" + err)
        whatsapp_bot.sendMessage(myID, "אזהרה! לא הצלחתי לגשת לקובץ.\nאנא שלח ידנית את הפרק היומי.")
        return;
    }

    let WaGroup_generate = everyItem(LIST_OF_GROUP.tanach_whatsapp);
    let TelGroup_generate = everyItem(LIST_OF_GROUP.tanach_telegram);

    let priority_ONE = [];

    // WhatsApp
    let WhatsApp_Queue = queue.add(() => sendMessageWA(WaGroup_generate.next().value, soundFile, title),
        { priority: 4 })
        .then(msgs => {
            while (true) {
                let item = WaGroup_generate.next();
                if (item.done) break;
                priority_ONE.push(queue.add(() => forwardMassagesWA(item.value, msgs), { priority: 1 }));
            }
        });

    // Telegram
    let Telegram_Queue = queue.add(() => sendAudioTelegram(TelGroup_generate.next().value, episode, title),
        { priority: 4 })
        .then(msg => {
            while (true) {
                let item = TelGroup_generate.next();
                if (item.done) break;
                priority_ONE.push(queue.add(() => forwardMassageTelegram(item.value, msg), { priority: 1 }));
            }
        });

    await Promise.all([WhatsApp_Queue, Telegram_Queue]); // now priority_ONE is full
    await Promise.all(priority_ONE);

    try {
        let startTime = timeStamp.get('startTime') ?? getIsraelTime();
        let endTime = new Date();
        let secound = (endTime - startTime) / 1000;
        logToFile('----------------\nFinished sending in ' + secound + ' secounds')
    } catch (err) {
        console.log(err);
    }



    // in small server - remove file (make sure all the msgs has sended)
    // deleteFile(pathToFile);
}

/**
 * @param {{id,name}} GRobj where to forward
 * @param {WAWebJS.Message[]} msgsToForward 
 */
async function forwardMassagesWA(GRobj, msgsToForward) {
    await msgsToForward[0]?.forward(GRobj.id);
    await msgsToForward[1]?.forward(GRobj.id);
    logToFile("@WhatsApp: The file has forward to " + GRobj.name);
}

async function sendMessageWA(GRobj, soundFile, title) {
    logToFile("@WhatsApp: start to send " + title + " to " + GRobj.name)
    let mediaMsg;
    try {
        mediaMsg = await whatsapp_bot.sendMessage(GRobj.id, soundFile);
    } catch (error) {
        logToFile("@WhatsApp: Error while sending to whatsapp " + title + "\n" + error)
        whatsapp_bot.sendMessage(myID, "אזהרה! התרחשה שגיאה במהלך שליחת הפרק.\nאנא שלח ידנית את הפרק היומי.")
        telegram_bot.sendMessage(userDebug, "Error while sending to whatsapp " + title + "\n" + error)
        console.error
        return
    }
    let txtMsg = await whatsapp_bot.sendMessage(GRobj.id, title);

    logToFile("@WhatsApp: the file " + title + " has sended to " + GRobj.name)

    return [mediaMsg, txtMsg];
}

/** old method */
async function sendToTelegram(episode, title) {
    let massToForward_Tel = null;
    let kb = makeKeyboard(episode);
    let Tel_Promises = [];

    for (let tel of LIST_OF_GROUP.tanach_telegram) {
        logToFile("@Telegram: start to send " + episode.name + " to " + tel.name);

        if (massToForward_Tel == null) {
            try {
                massToForward_Tel = await queue.add(() => telegram_bot.sendAudio(tel.id, episode.path, {
                    caption: title,
                    title: title,
                    reply_markup: {
                        inline_keyboard: kb
                    }
                }), { priority: 2 })

            }
            catch {
                logToFile("@Telegram: cant send to telegram " + episode.name)
                console.error
            }

            logToFile("@Telegram: The file " + episode.name + " has sended to " + tel.name);
        }
        else {
            Tel_Promises.push(
                queue.add(() => telegram_bot.forwardMessage(tel.id, massToForward_Tel.chat?.id, massToForward_Tel.message_id), { priority: 1 })
                    .then(logToFile("@Telegram: The file " + episode.name + " has sended to " + tel.name))
            );
        }

    }
    return Tel_Promises;
}

/**
 * @param {{name:String,path:String,...}} episode 
 * @param {{name:String,id:String}} chat 
 * @returns 
 */
async function sendAudioTelegram(chat, episode, title) {
    let kb = makeKeyboard(episode);
    logToFile("@Telegram: start to send " + title + " to " + chat.name);


    return await telegram_bot.sendAudio(chat.id, episode.path, {
        caption: title,
        title: title,
        reply_markup: {
            inline_keyboard: kb
        }
    }).then(logToFile("@Telegram: The file " + title + " has sended to " + chat.name))
}

/**
 * @param {{name:String,id:String}} chat 
 * @param {TelegramBot.Message} msg 
 */
async function forwardMassageTelegram(chat, msg) {
    await telegram_bot.forwardMessage(chat.id, msg.chat?.id, msg.message_id)
        .then(logToFile("@Telegram: The file " + msg.caption + " has forward to " + chat.name))
}

function deleteFile(pathToFile) {
    try {
        fs.unlinkSync(pathToFile);
        //console.log("%cThe " + pathToFile + " has deleted", 'color: red')
        logToFile("%cThe " + pathToFile + " has deleted", 'color: red')
    }
    catch (err) { console.error(err) }
}

/** 
    @param {number} ms milisec for wait. 
    @1000 * 60               is a minute, 
    @1000 * 60 * 60          is a hour,
    @1000 * 60 * 60 * 24     is a day,     */
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
        fs.writeFileSync('saved_files/BIBLE_EPISODES.json', JSON.stringify(BIBLE_EPISODES, null, 4));
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
        fs.writeFileSync('saved_files/BIBLE_PROGRESS.json', JSON.stringify(BIBLE_PROGRESS, null, 4));
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
        fs.writeFileSync('saved_files/LIST_OF_GROUP.json', JSON.stringify(LIST_OF_GROUP, null, 4));
    } catch (err) {
        console.error(err);
    }
}

function read_LIST_OF_GROUP() {
    try {
        const text = fs.readFileSync('saved_files/LIST_OF_GROUP.json', 'utf8');
        var text_json = JSON.parse(text);
        //console.log(text_json);
        //logToFile(text_json)
        return text_json;
    } catch (err) {
        console.log(err)
        logToFile(err)
    }
    return {};
}

/** @param {string} link remove `?...` from the link */
function fixSoundCloudLink(link) {
    var index = link.indexOf('?');
    if (index > -1) {
        link = link.slice(0, index)
    }
    return link;
}

/** @param {boolean} reset - when `true` it will reset all the data, default is `false` */
function initializeFiles(reset = false) {
    // if (reset) {
    //     write_BIBLE_EPISODES();
    //     write_BIBLE_PROGRESS();
    //     write_LIST_OF_GROUP();
    //     write_ADMINS();
    //     return
    // }

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

    if (!fs.existsSync(`saved_files/ADMINS_Tanach.json`)) {
        write_ADMINS();
    } else {
        ADMINS = read_ADMINS();
    }

    if (!fs.existsSync('Files')) {
        fs.mkdirSync('Files');
    }
}

/**
 * Add groups to `LIST_OF_GROUP.tanach_whatsapp`
 * @param {String} nameToCompare part of words of the groups 
 * @default 'התנ"ך היומי'
 */
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

/**
 * Server run at UTC time (+0:00), The time in israel is +2\3 hour more.
 * this function return the date with hour of israel
 * @param {Date} date Option, alse use the current time.
 * @returns {Date} (hour of israel, the day can be wrong)
 */
function getIsraelTime(date = new Date()) {
    var invdate = new Date(date.toLocaleString('en-US', {
        timeZone: "Asia/Jerusalem"
    }));
    var diff = date.getTime() - invdate.getTime();
    return new Date(date.getTime() - diff);
}

/**
 * Check if is Yom Tov today
 * @param {Hebcal} hebdate 
 */
function checkIsYomTov(hebdate) {
    let M = hebdate.month
    let D = hebdate.day

    // Tishrei
    if (M === 7) {
        if (D === 1 || D === 2 || D === 10 || D === 15 || D === 22)
            return true;
    }
    // Nissan
    if (M === 1) {
        if (D === 15 || D === 21)
            return true;
    }
    // Sivan
    if (M === 3) {
        if (D === 6)
            return true;
    }
    return false;
}

function sendTodayTanachYomiChapter() {

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

    const is_Holi_Today = dayInWeek === 6 || checkIsYomTov(HebDate);
    const is_Holi_tomorow = dayInWeek_tomorow === 6 || checkIsYomTov(HebDate_tomorow);

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
            queue.add(() => sendTheFile(TODAY_EPISODE), { priority: 2 })
            whatsapp_bot.sendMessage(myID, "מתחיל לשלוח את הפרק היומי...")
        }
        return;
    }
    // only tomorow
    if (is_Holi_tomorow) {
        if (hour === 10) {
            BIBLE_PROGRESS.chapter++;
            write_BIBLE_PROGRESS();
            queue.add(() => sendTheFile(TODAY_EPISODE), { priority: 2 })
            whatsapp_bot.sendMessage(myID, "מתחיל לשלוח את הפרק היומי...")
        }
        return;
    }
    // middle in the week
    if (hour === 19) {
        BIBLE_PROGRESS.chapter++;
        write_BIBLE_PROGRESS();
        queue.add(() => sendTheFile(TODAY_EPISODE), { priority: 2 })
        whatsapp_bot.sendMessage(myID, "מתחיל לשלוח את הפרק היומי...")
    }

    else if (IN_TESTING) {
        //let tzeit = getIsraelTime(HebDate.getZemanim().tzeit)
        //logToFile("test: tzeit: "+ tzeit.getHours())
        BIBLE_PROGRESS.chapter++;
        write_BIBLE_PROGRESS();
        queue.add(() => sendTheFile(TODAY_EPISODE), { priority: 2 })
        whatsapp_bot.sendMessage(myID, "מתחיל לשלוח את הפרק היומי...")
    }

    return
}

/**
 * @param {{spotify:link, soundcloud: link}} episode 
 * @returns {[[{text: "Spotify/SoundCloud",url:string}]]}
 */
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

/**
 * 
 * @returns {{name: string,
 *  chapter: string,
 *  path?: string
 *  soundcloud: link,
 *  spotify: link}}
 */
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
        whatsapp_bot.sendMessage(myID, JSON.stringify(BIBLE_PROGRESS, null, 4))
        nextChapter = getNextChapter();
    }
    return nextChapter;
}

/**
 * https://stackoverflow.com/a/41167909
 * @param {number} n the num to check
 * @param {number} a first num
 * @param {number} b secound num
 * @returns 
 */
function isBetween(n, a, b) {
    return (n - a) * (n - b) <= 0
}

process.on('uncaughtException', (err, origin) => {
    console.log(err);
    logToFile(err)
    //process.exit(1)
})

/**
 * @param {String} str 
 * @param {String[]} array 
 * @returns {number} `-1` when not found
 */
function isWordsInString(str, array) {
    for (let elem of array) {
        if (str.includes(" " + elem + " ")) return str.indexOf(" " + elem + " ");
    }
    return -1
}

/**
 * @param {{}[]} array 
 */
function* stopOnFirstElement(array) {
    let isfirst = true;
    let notfirst = [];
    for (let obj of array) {
        if (isfirst) {
            isfirst = false
            yield obj
            continue;
        }
        notfirst.push(obj)
    }
    return notfirst;
}

/**
 * @param {{name:string,id:string}[]} array 
 */
function* everyItem(array) {
    for (let obj of array) {
        yield obj
    }
}

function addAdminWA(id, nameContact, msg) {
    if (!isADMIN(id).isAdmin) {
        ADMINS[nameContact] = id // add
        logToFile(nameContact + " נוסף כמנהל")
        msg.reply(nameContact + " נוסף כמנהל");
        write_ADMINS();
    } else {
        console.log(nameContact + " כבר מנהל")
        msg.reply(nameContact + " כבר מנהל");
    }
}

function removeAdminWA(id, nameContact, msg) {
    let adminInfo = isADMIN(id);
    if (adminInfo.isAdmin) {
        delete ADMINS[adminInfo.name]; // remove
        logToFile(nameContact + " הוסר מרשימת המנהלים")
        msg.reply(nameContact + " הוסר מרשימת המנהלים");
        write_ADMINS();
    } else {
        console.log(nameContact + " Isn't Admin")
        msg.reply(nameContact + " אינו מנהל");
    }
}

function addAdminTel(id, nameContact, msg) {
    if (!isADMIN(String(id)).isAdmin) {
        ADMINS[nameContact] = String(id); // add
        logToFile(nameContact + " נוסף כמנהל");
        telegram_bot.sendMessage(msg.chat.id, nameContact + " נוסף כמנהל");
        write_ADMINS();
    } else {
        console.log(nameContact + " כבר מנהל");
        telegram_bot.sendMessage(msg.chat.id, nameContact + " כבר מנהל");
    }
}

function removeAdminTel(id, nameContact, msg) {
    let adminInfo = isADMIN(String(id));
    if (adminInfo.isAdmin) {
        delete ADMINS[adminInfo.name]; // remove
        logToFile(nameContact + " הוסר מרשימת המנהלים")
        telegram_bot.sendMessage(msg.chat.id, nameContact + " הוסר מרשימת המנהלים");
        write_ADMINS();
    } else {
        console.log(nameContact + " Isn't Admin")
        telegram_bot.sendMessage(msg.chat.id, nameContact + " אינו מנהל");
    }
}

function write_ADMINS() {
    try {
        if (!fs.existsSync('saved_files')) {
            fs.mkdirSync('saved_files');
        }
        fs.writeFileSync('saved_files/ADMINS_Tanach.json', JSON.stringify(ADMINS, null, 4));
    } catch (err) {
        console.error(err);
    }
}

/** @return {{name:id}} */
function read_ADMINS() {
    try {
        const text = fs.readFileSync('saved_files/ADMINS_Tanach.json', 'utf8');
        var text_json = JSON.parse(text);
        console.log(text_json);
        return text_json;
    } catch (err) {
        console.log(err)
    }
    return {
        TELEGRAM_DEBUG: String(process?.env?.TELEGRAM_DEBUG),
        WHATSAPP_DEBUG: String(process?.env?.WHATSAPP_DEBUG)
    };
}

function isADMIN(personID, groupID = "No Group") {
    for (let adminInfo of Object.entries(ADMINS)) {
        if (adminInfo[1] === personID || adminInfo[1] === groupID) {
            return { isAdmin: true, name: adminInfo[0] }
        }
    }
    return { isAdmin: false, name: "Null" }
}


function searchChapters(searchText = "") {
    let chaptersObject = [];

    if (!searchText.length === 0) return chaptersObject

    // remove first word
    let str = searchText // .slice(3).trim();

    // remove ' or "
    str = str.replace(/'/g, "").replace(/"/g, '') // g is global (replace all)

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

        return [
            {
                "name": "תהילים מזמור קיט אותיות א - ד",
                "chapter": "מזמור קיט",
                "soundcloud": "https://soundcloud.com/ygolan/zrerkyce5h9g",
                "spotify": "https://open.spotify.com/episode/1M23OgVKbz08RceLiP5tVS?si=V9JRau3eTI6eDopzSnfvLQ"
            },
            {
                "name": "תהילים מזמור קיט אותיות ה - ט",
                "chapter": "מזמור קיט",
                "soundcloud": "https://soundcloud.com/ygolan/qw0pzxw5l57f",
                "spotify": "https://open.spotify.com/episode/7lakZPDp8UVTcdXVH5YFPV?si=BqZMfK04QqizUpDBGSIKXw"
            },
            {
                "name": "תהילים מזמור קיט אותיות י - נ",
                "chapter": "מזמור קיט",
                "soundcloud": "https://soundcloud.com/ygolan/stdzu2iecycw",
                "spotify": "https://open.spotify.com/episode/5SLi3j1BpyDEUG9QSr305d?si=dRUpYYX2SM2YypsnCK_s-g"
            },
            {
                "name": "תהילים מזמור קיט אותיות ס - צ",
                "chapter": "מזמור קיט",
                "soundcloud": "https://soundcloud.com/ygolan/zidfok3zzkiu",
                "spotify": "https://open.spotify.com/episode/4KWO5O94odgyT8n48I3XfI?si=SDfi3g5XSWmK2T_PqW6B0Q"
            },
            {
                "name": "תהילים מזמור קיט אותיות ק - ת",
                "chapter": "מזמור קיט",
                "soundcloud": "https://soundcloud.com/ygolan/fsu9lly3hhqe",
                "spotify": "https://open.spotify.com/episode/3GJpW7ORE50d0zUgEfwySP?si=yZIEKz5SQbOUj3dIaVkw7w"
            }
        ]


    }

    for (let index in BIBLE_EPISODES[result[0]]) {
        if (BIBLE_EPISODES[result[0]][index].name.includes(str))
            chaptersObject.push(BIBLE_EPISODES[result[0]][index]);
    }

    return chaptersObject;
}

function search_One_Chapter(testToSearch, contactID, contactName, serachSource = 'WhatsApp') {
    logToFile("Searching " + testToSearch);

    // remove ' or "
    testToSearch = testToSearch.replace(/'/g, "").replace(/"/g, '') // g is global (replace all)

    // for comper time
    timeStamp.set(contactID, new Date());

    let ischapter = testToSearch.includes("פרק");
    let ismizmor = testToSearch.includes("מזמור");
    let sefer = BIBLE_EPISODES.order.filter(seferInOrder => testToSearch.includes(seferInOrder))?.[0]

    let searchChapter = testToSearch.slice(sefer?.length + 1)
    if (ischapter) {
        searchChapter = searchChapter.slice(4).trim()
    }
    if (ismizmor) {
        searchChapter = searchChapter.slice(6).trim()
    }

    if (searchChapter === "קיט") {
        logToFile(`@Search: the user ${contactName} request the mizmor 119`);
        miz119_isFound(contactID, contactName, serachSource);
        return true;
    }

    let notChapterName = ["פסוקים", "פס", "פסוק", "אותיות"]
    let founded = false;

    // old BIBLE_EPISODES[sefer][index] 'index in'
    for (let indexInSefer in BIBLE_EPISODES[sefer]) {
        let indexOfWord = isWordsInString(BIBLE_EPISODES[sefer][indexInSefer].chapter, notChapterName);
        // added blank space in front and back of chapter, so it will ignored when combination within a word
        let indexChapter = `${BIBLE_EPISODES[sefer][indexInSefer].chapter} `.indexOf(` ${searchChapter} `)

        if ((indexOfWord > -1 && -1 < indexChapter && indexChapter < indexOfWord) || (indexOfWord === -1 && indexChapter > -1)) {
            queue.add(() => sendTheFile(BIBLE_EPISODES[sefer][indexInSefer],
                {
                    isSearch: true,
                    contactID: contactID,
                    contactName: contactName,
                    source: serachSource
                }));
            founded = true;
        }
    }

    if (!founded) {
        sendMessage(contactID, `לא הצלחתי למצוא את מה שאתה מחפש...\nנסה לחפש ללא רווחים כפולים וללא סימנים מיוחדים.\nלדוגמא: חפש בראשית פרק ד`, source);
        timeStamp.delete(msg.chat.id, new Date());
    }
    else if (queue.size > 0) {
        sendMessage(contactID, "מעבד בקשות קודמות... מקומך בתור הוא " + queue.size, serachSource);

    }
    return founded;
}

function sendMessage(contactID, text, serachSource = "") {
    if (serachSource.toLowerCase() === "whatsapp") {
        whatsapp_bot.sendMessage(contactID, text);
    }
    else {
        telegram_bot.sendMessage(contactID, text);
    }
}

function miz119_isFound(contactID, contactName, serachSource = "") {
    if (serachSource.toLowerCase() === "whatsapp") {
        let miz119 = new Map();
        miz119.set('case', 'mizmor119');
        params.set(contactID, miz119);
        logToFile(`@Search: the user ${contactName} request the mizmor 119`)
        whatsapp_bot.sendMessage(contactID, `בחר מהרשימה את ההקלטה שברצונך לקבל:\n1. אותיות א - ד.\n2. אותיות ה - ט.\n3. אותיות י - נ.\n4. אותיות ס - צ.\n5. אותיות ק - ת.\n6. הכל.\nלביטול שלח 'בטל'.`);
    }
    else {
        telegram_bot.sendMessage(contactID, `בחר מהרשימה את ההקלטה שברצונך לקבל:`, {
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
        });
    }

}