const find = require('findit');
const path = require('path');
const readline = require('readline');
const fs = require('fs'); 

const extension = 'C:\\Users\\Win7\\Documents\\Qlik\\Sense\\Extensions\\VizlibTable';
var finder = find(extension);
var files = [];
var occurances = 0;
 
finder.on('file', (file, stat) => {
    if (path.extname(file) === ".js") {
        files.push(file);
    }
});

finder.on('end', () => {
    const res = files.reduce((prev,curr) => {
        return prev
            .then(() => {
                return new Promise((resolve, reject) => {
                    var file = curr;
                    var lineReader = readline.createInterface({
                        input: fs.createReadStream(file)
                    });
                    var process = true;
                    var lineNo = 0;
                    var pos = -1;
                    var search = 'qlik';

                    lineReader.on('line', (line) => {
                        if (process) {
                            lineNo ++;
                            pos = line.indexOf(search);
                            if(pos >= 0){
                                occurances ++;
                                process = false;
                                console.log("file: " + file);
                                console.log(`found "${search}" at line ${lineNo}, pos ${pos}: `, line);
                                lineReader.close();
                            }
                        }
                    });    
                    
                    lineReader.on('close', function () {
                        resolve(occurances);
                    });
                    
                });
            });
    }, Promise.resolve([]));
    res.then((occ) => {
        console.log(`finished checking extension (${occ} occurances): ${extension}`);
    });
});