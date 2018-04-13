'use strict';

const find = require('findit');
const path = require('upath');
const esprima = require('esprima');
const readline = require('readline');
const fs = require('fs');

var apidata = require('./results/data/monitor-api-data.json');
const apiversions = require('./results/data/api-versions-data.json');

const storeTokens = false; // JSON.stringify Invalid string length, should use JSONStream https://www.bennadel.com/blog/3232-parsing-and-serializing-large-objects-using-jsonstream-in-node-js.htm
const excludePaths = ['/lib','/node_modules'];
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
const extension = process.argv[2] || 'C:\\Users\\Win7\\Documents\\Qlik\\Sense\\Extensions\\SenseUI-BarChart';
const productionVersion = process.argv[3] || 2018021;
const apiversion = apiversions.filter(e => { return e.SortValue == productionVersion; });
var versionText = 'unknown';
if (apiversion.length > 0) {
    versionText = apiversion[0].Product_Version;
}
console.log('\x1Bc');
console.log(`q.u.a.c.k`);
console.log(`\nStarting code check of extension: ${extension}\nagainst Qlik Sense version: ${productionVersion} (${versionText})\n`);

apidata = apidata.filter( e =>{ return e.SortValue <= productionVersion; })

var finder = find(extension);
var files = [];
var occurances = 0;

finder.on('file', (file, stat) => {
    file = path.normalize(file);
    if (path.extname(file) === ".js") {
        var pathExlude = false;
        excludePaths.forEach(p => {
            if (!pathExlude && file.indexOf(p + '/') != -1) {
                pathExlude = true;
            }
        });
        if (!pathExlude) {
            files.push(file);
        }
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
                            console.log("Token length:", tokens.length);
                            fs.writeFileSync(dirTokens + '/' + path.basename(file) + '.json', JSON.stringify(tokens, null, 4), "utf8");
                        }

                        apidata.forEach(item => {
                            if (item.SearchMode === "EXACT" && item.Searches.length === 1) {
                                var res1 = tokens.filter(e => {
                                    return e.type === "Identifier" && e.value === item.Searches[0]; 
                                });
                                if (res1.length > 0) {
                                    occurances ++;
                                    console.log(`Problem found at line: ${res1[0].loc.start.line}, column: ${res1[0].loc.start.column}\n` + JSON.stringify(item, null, 4));
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
                                        console.log(`Problem found at line: ${res2[0].loc.start.line}, column: ${res2[0].loc.start.column}\n` + JSON.stringify(item, null, 4));
                                    }
                                }
                            } else if (item.SearchMode === "OR" && item.Searches.length >= 1) {
                                var res3 = tokens.filter(e => { 
                                    return e.type === "Identifier" && item.Searches.includes(e.value); 
                                });
                                if (res3.length > 0) {
                                    occurances ++;
                                    console.log(`Problem found at line: ${res3[0].loc.start.line}, column: ${res3[0].loc.start.column}\n` + JSON.stringify(item, null, 4));
                                }
                            }
                        });

                        resolve();
                    });

                });
            });
    }, Promise.resolve([]));
    res.then(() => {
        console.log(`\nFinished code check of extension: ${extension}\n\nq.u.a.c.k found: ${occurances} occurances`);
    });
});