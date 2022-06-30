const fs = require('fs');
const SoundCloud = require("soundcloud-scraper");
const SoundCloudClient = new SoundCloud.Client();

const text = fs.readFileSync('saved_files/BIBLE_EPISODES.json', 'utf8');
const Bible = JSON.parse(text);

let keysBible = Object.keys(Bible);
if (keysBible.length -1 !== Bible.order.length){
    console.log("All keys: "+ keysBible.length -1 +", in DB: "+ Bible.order.length)

    for (let key of keysBible){
        if (key !== 'order' && !keysBible.includes(key)){
            Bible.order.push(key)
            console.log('the key '+ key+" have push to order")
        }
    }
    console.log(Bible.order)
}
main()

async function main(){
    for (let sefer of Bible.order){
        let chapters = Bible[sefer]
        console.log("checking "+sefer+"...")
        for (let chapterIndex = 1; chapterIndex <= Object.keys(chapters).length; chapterIndex ++){
            let elem = chapters[chapterIndex];
            //console.log(elem);
            let scLink = fixSoundCloudLink(elem.soundcloud)
            await checkLinkSoundcloud(scLink)
            
        }
    }
}


function fixSoundCloudLink(link) {
    var index = link.indexOf('?');
    if (index > -1) {
        link = link.slice(0, index)
    }
    return link;
}

async function checkLinkSoundcloud(link){
    await SoundCloudClient.getSongInfo(link)
        .then(async song => {
            let words = song.title.split(' ');
            sefer = words[0];
            //console.log('SUCCESE! can get to ' + song.title);
            })
            .catch((err) => {
                console.log('ERROR! cant get to ' + link);
                console.error;
            });
}