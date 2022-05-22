/**
 * Imports
 */

const fs = require("fs");
const { parse } = require("csv");
const readline = require("readline");

/**
 * fields based on data type.
 */

const fields = {
  books: ["title", "isbn", "authors", "description"],
  magazines: ["title", "isbn", "authors", "publishedAt"],
};

/**
 * @function readData
 * reads in the data for given dataTypes
 * @param {Array} dataTypes
 * @returns {Object} read data
 */
function readData(dataTypes) {
  const dataObj = {};
  dataTypes.forEach((dataType) => {
    dataObj[dataType] = readDataHelper(dataType);
  });

  return dataObj;
}

/**
 * @function readDataHelper
 * helper function for readData function
 * @param {String} dataType 
 * @returns {Promise} record
 */
function readDataHelper(dataType) {
  return new Promise((resolve, reject) => {
    const record = [];
    fs.createReadStream(`data/${dataType}.csv`)
      .pipe(parse({ delimiter: ";", columns: true }))
      .on("data", (row) => {
        record.push(row);
      })
      .on("end", () => {
        resolve(record);
      })
      .on("error", (err) => {
        console.error(err.message);
        reject([]);
      });
  });
}

/**
 * @function addRecord
 * function for adding records to csv files.
 * @param {String} type
 * @returns {null}
 */

async function addRecord(type) {
  const record = {};
  for (const field of fields[type]) {
    await addRecordHelper(record, field);
  }

  // writing new record to the file.
  fs.appendFile(`data/${type}.csv`, Object.values(record).join(";"), (err) => {
    if (err) {
      console.error("append failed");
      console.error(err);
    } else {
      console.log("record added, file can be found in data folder.");
    }
  });
}

/**
 * @function addRecordHelper
 * helper function for addRecord function
 * @param {*} record - record object
 * @param {*} field - record field
 * @returns {Promise} 
 */
function addRecordHelper(record, field) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question(`${field}: `, (ans) => {
      rl.close();
      record[field] = ans;
      resolve(ans);
    });
  });
}

/**
 * @function goMenuOrClose
 * used for displaying the go back to main menu or close program prompt
 * @param {readline Object} rl 
 * @returns {Promise}
 */
function goMenuOrClose(rl) {
  const ques = [
    '9. Back to menu',
    '0. Exit program\n',
  ];
  return new Promise((resolve, reject) => {
    rl.question(ques.join('\n'), async ans => {
      switch(ans) {
        case "9":
          rl.close();
          await welcomeMenu();
          break;
        case "0":
          process.exit();
      }
      resolve(ans);
    })
  })
}

/**
 * @function askQuestion
 * ask a question in command line, and perform operation basis the menu and answer received
 * @param {String} query 
 * @param {String} menu 
 * @returns {Promise}
 */
function askQuestion(query, menu) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question(query, async (ans) => {
      
      if (menu === "welcome") {
        switch (ans) {
          case "1":
            console.table(await readData(["books"])["books"]);
            break;
          case "2":
            console.table(await readData(["magazines"])["magazines"]);
            break;
          case "3":
            rl.close();
            await askQuestion("enter the isbn", "isbn search");
            break;
          case "4":
            const data = await readData(["books", "magazines"]);
            const totalData = [...await data['books'], ...await data['magazines']];
            console.table(
              totalData.sort((a, b) => {
                // there was some issue with accessing key 'title'; 'isbn' and others worked fine.
                // hence this workaround.
                const title1 = Object.values(a)[0].toLowerCase();
                const title2 = Object.values(b)[0].toLowerCase();
                if (title1 < title2) return -1;
                if (title1 > title2) return 1;
                return 0;
              })
            );
            break;
          case "5":
            const ques = [
              "Would you like to add a...",
              "1. book",
              "2. magazine",
            ];
            askQuestion(ques.join("\n"), "add");
            break;
          case "0":
            rl.close();
            process.exit();
        };
      }

      if (menu === "isbn search") {
        const data = await readData(["books", "magazines"]);
        let ind = 0;
        for await (const val of Object.values(data)) {
          const recFound = val.filter((record) => record["isbn"] === ans);
          if (recFound.length > 0) {
            console.table(recFound);
            break;
          }
          if (ind === 1) {
            console.log("no records found");
          }
          ind++;
        }
      }

      if (menu === "add") {
        switch (ans) {
          case "1":
            await addRecord("books");
            break;
          case "2":
            await addRecord("magazines");
            break;
        }
      }

      
      await goMenuOrClose(rl);
      rl.close();
      resolve(ans);
    });
  });
}

async function welcomeMenu() {
  const menuText = [
    "Welcome to the library!",
    "Select what would you like to do",
    "1. Print all books data",
    "2. Print all magazines data",
    "3. Find a book or magazine by its ISBN",
    "4. Print out all books and magazines with their details sorted by title.",
    "5. Add a book / magazine and then export as CSV",
    "0. Exit program\n",
  ];

  await askQuestion(menuText.join("\n"), "welcome");
} 

/**
 * Program start
 */
(async function main() {
  await welcomeMenu();
})();
