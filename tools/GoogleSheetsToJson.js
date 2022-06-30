const fetch = require("node-fetch-commonjs");
const fs = require("fs");
const googleSheet = 'https://docs.google.com/spreadsheets/d/';
const endUrl = '/gviz/tq?gid=1'//&tqx=out:json';
let original_url = "https://docs.google.com/spreadsheets/d/1Vr5iDFomME6I30Q1ExxpNw_bbgvqhP8Ep6qax1on61M/edit?usp=sharing"
let googleSheet_ID = '1KfK61zq0lBQWNytCz58kDbnoLxTYP7VF'
let url = `${googleSheet}${googleSheet_ID}${endUrl}`;
console.log(url)
const bible = {
    
};
fetch(url)
    .then(res => res.text())
    .then(data => {
        var json = JSON.parse(data.substr(47).slice(0, -2));
        rows = json.table.rows;
        rows.forEach((row, index) => {
            let elem = {
                name: row.c[1]?.v,
                chapter: row.c[2]?.v,
                soundcloud: row.c[3]?.v,
                spotify: row.c[4]?.v
            }
            if (bible[row.c[0]?.v] == undefined){
                bible[row.c[0]?.v] = {}
            }

            bible[row.c[0]?.v][index] = elem
        });
    }).then(() => {
        fs.writeFileSync('bible.json', JSON.stringify(bible));
    })