const readXlsxFile = require('read-excel-file/node')
const fs = require("fs");

const bible = {
    "תהילים": {

    }
};

// File path.
readXlsxFile('ThilimFinal.xlsx').then((rows) => {

    rows.forEach((row, index) => {
        let elem = {
            name: row[1],
            chapter: row[2],
            soundcloud: row[4],
            spotify: row[3],
        }

        bible["תהילים"][index] = elem
    });

    fs.writeFileSync('תהילים.json', JSON.stringify(bible));
  // `rows` is an array of rows
  // each row being an array of cells.
})
