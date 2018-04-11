const find = require('findit');
const path = require('path');
const esprima = require('esprima');
const readline = require('readline');
const fs = require('fs');

var apidata = require('./results/data/monitor-api-data.json');

const storeTokens = false;
const dirResults = './results';
const dirTokens = './results/tokens';

if (storeTokens) {
    if (!fs.existsSync(dirResults)) {
        fs.mkdirSync(dirResults);
    }
    if (!fs.existsSync(dirTokens)) {
        fs.mkdirSync(dirTokens);
    }    
}

// set extension and Sense version to check against:
const extension = 'C:\\Users\\Win7\\Documents\\Qlik\\Sense\\Extensions\\SenseUI-BarChart';
const productionVersion = 2017113;

apidata = apidata.filter( e =>{ return e.SortValue <= productionVersion; })
//console.log(JSON.stringify(apidata,null,4));

var finder = find(extension);
var files = [];
var occurances = 0;

finder.on('file', (file, stat) => {
    if (path.extname(file) === ".js" && file.indexOf("\\node_modules\\") === -1) {
        files.push(file);
    }
});

finder.on('end', () => {
    const res = files.reduce((prev, curr) => {
        return prev
            .then(() => {
                return new Promise((resolve, reject) => {
                    var file = curr;
                    console.log(`process file: ${file}`);
                    var lineReader = readline.createInterface({
                        input: fs.createReadStream(file)
                    });
                    var source = '';

                    lineReader.on('line', line => {
                        source += line + '\n';
                    });

                    lineReader.on('close', () => {
                        //console.log(`tokenize file: ${file}`);
                        const tokens = esprima.tokenize(source, {
                            jsx: true,
                            tolerant: true,
                            loc: true
                        });
                        //console.log(tokens);
                        if (storeTokens) {
                            fs.writeFileSync(dirTokens + '/' + path.basename(file) + '.json', JSON.stringify(tokens, null, 4), "utf8");
                        }

                        apidata.forEach(item => {
                            if (item.SearchMode === "EXACT" && item.Searches.length === 1) {
                                var res1 = tokens.filter(e => {
                                    return e.type === "Identifier" && e.value === item.Searches[0]; 
                                });
                                if (res1.length > 0) {
                                    occurances ++;
                                    console.log("found " + JSON.stringify(item.Searches) + " " + JSON.stringify(res1[0]));
                                }
                            } else if (item.SearchMode === "AND" && item.Searches.length >= 1) {
                                var res2 = tokens.filter(e => { 
                                    return e.type === "Identifier" && item.Searches.includes(e.value); 
                                });
                                if (res2.length >= item.Searches.length) {
                                    var allFound = 0;
                                    item.Searches.forEach(search => {
                                        if (res2.includes(search)) {
                                            allFound ++;
                                        }
                                    });
                                    if (allFound === item.Searches.length) {
                                        occurances ++;
                                        console.log("found " + JSON.stringify(item.Searches) + " " + JSON.stringify(res2[0]));                                    
                                    }
                                }
                            } else if (item.SearchMode === "OR" && item.Searches.length >= 1) {
                                var res3 = tokens.filter(e => { 
                                    return e.type === "Identifier" && item.Searches.includes(e.value); 
                                });
                                if (res3.length > 0) {
                                    occurances ++;
                                    console.log("found " + JSON.stringify(item.Searches) + " " + JSON.stringify(res3[0]));                                    
                                }
                            }
                        });

                        resolve();
                    });

                });
            });
    }, Promise.resolve([]));
    res.then(() => {
        console.log(`finished checking extension (${occurances} occurances): ${extension}`);
    });
});