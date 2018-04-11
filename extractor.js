const enigma = require('enigma.js');
const WebSocket = require('ws');
const fs = require("fs");
const schema = require('enigma.js/schemas/12.34.11.json');
const utils = require('./utils');
var config = require('./config.json');

// create result folder struct
const dirResults = './results';
const dirData = './results/data';
const dirScripts = './results/scripts';
const dirFields = './results/fields';

if (!fs.existsSync(dirResults)) {
    fs.mkdirSync(dirResults);
}
if (!fs.existsSync(dirData)) {
    fs.mkdirSync(dirData);
}
if (!fs.existsSync(dirScripts)) {
    fs.mkdirSync(dirScripts);
}
if (!fs.existsSync(dirFields)) {
    fs.mkdirSync(dirFields);
}

// iterate apps
var docId = config.apps[0].id;
var output = config.apps[0].output;
const scriptFile = `${dirScripts}/${output}-script.qvs`;
const fieldsFile = `${dirFields}/${output}-fields.json`;

const doPostFilter = true;
const doPostProcess = true;

const docsession = enigma.create({
    schema,
    url: `wss://${config.server}/${config.prefix}/app/${docId}`,
    createSocket: url => new WebSocket(url)
});

const postFilter = function(item) {
    if (item.hasOwnProperty("ComponentName") && item.ComponentName === "CapabilityAPI"
        && item.hasOwnProperty("Product_Version") && item.Product_Version === "February 2018" 
        && item.hasOwnProperty("Status") && item.Status === "R") {
        return false;
    } else {
        return true;
    }
}

const postProcess = function(results) {
    var postres = [];

    results.forEach(function (item) {
        var i = JSON.parse(JSON.stringify(item)), i2 = [], e = [];
        if (item.hasOwnProperty("ComponentName") && item.hasOwnProperty("Element")) {
            e = item.Element.split(/[-.#]+/);
            if (item.ComponentName === "EngineAPI") {
                if (item.hasOwnProperty("ComparisonName")) {
                    // if (item.ComparisonName === "Methods") {
                    //     i.Type = "websocket";
                    ////     i.SearchMode = "AND";
                    //     if (e.length >= 2) {
                    //         i.Searches = ["jsonrpc", "method", e[1]];
                    //     } else {
                    //         i.Searches = ["jsonrpc", "method", e[0]];                            
                    //     }
                    //     postres.push(i);
                    //     // create additional entry for enigma
                    //     i2 = JSON.parse(JSON.stringify(i));
                    //     i2.ComponentName = "EnigmaJS";
                    //     i2.Type = "function";
                    //     i2.SearchMode = "OR";
                    //     i2.Searches = [utils.lowerFirstCase(e[0]) + "." + utils.lowerFirstCase(e[1]), utils.lowerFirstCase(e[1])];
                    //     postres.push(i2);
                    // } else 
                    if (item.ComparisonName === "Definitions") {
                        i.Type = "property";
                        i.SearchMode = "EXACT";
                        i.Searches = ["q" + item.Element];
                        postres.push(i);
                    }
                }
            } else if (item.ComponentName === "CapabilityAPI") {
                i.Type = "function";
                i.SearchMode = "AND";
                i.Searches = [e[e.length -1]];
                switch(e.length) {
                    case 4:
                        i.Searches = [
                            // e[0], 
                            // e[1], 
                            e[2], 
                            e[3]
                        ];
                        break;
                    case 3:
                        i.Searches = [
                            // e[0], 
                            e[1], 
                            e[2]
                        ];
                        break;
                    default:
                        i.Searches = [
                            // e[0], 
                            e[1]
                        ];
                }
                postres.push(i);
            } else if (item.ComponentName === "BackendAPI") {
                i.Type = "function";
                i.SearchMode = "AND";
                if (e[0] === "BackendApi") {
                    e[0] = utils.lowerFirstCase(e[0]);
                }
                switch(e.length) {
                    case 4:
                        i.Searches = [
                            e[0], 
                            e[1], 
                            e[2], 
                            e[3]
                        ];
                        break;
                    case 3:
                        i.Searches = [
                            e[0], 
                            e[1], 
                            e[2]
                        ];
                        break;
                    default:
                        i.Searches = [
                            e[0], 
                            e[1]
                        ];
                }
                postres.push(i);
            }
        }
    });
    return postres;
}

docsession.open()
    .then(global => {
        return global.openDoc(docId);
    })
    .catch(utils.genericCatch)
    .then((doc) => {
        doc.getScript()
            .catch(utils.genericCatch)
            .then((script) => {
                console.log("Writing Script: ", scriptFile);
                fs.writeFileSync(scriptFile, script, "utf8");
            });
           
        doc.createSessionObject({
            qInfo: {
                qId: "",
                qType: "custom"
            },
            qFieldListDef: {
            }
        })
        .catch(utils.genericCatch)
        .then((obj) => {
            obj.getLayout()
                .catch(utils.genericCatch)
                .then((layout) => {
                    console.log("Writing Fields: ", fieldsFile);
                    fs.writeFileSync(fieldsFile, JSON.stringify(layout.qFieldList.qItems.map((e) => { return e.qName; })), "utf8");
                });
        });

        return utils.executeQuery(doc, config.apps[0].versionlist, dirData)
            .then(() => {
                if (doPostFilter) {
                    config.apps[0].itemlist.postFilter = postFilter;
                }
                if (doPostProcess) {
                    config.apps[0].itemlist.postProcess = postProcess;
                }
                return utils.executeQuery(doc, config.apps[0].itemlist, dirData);
            });
    })
    .then(() => {
        docsession.close();                     
    })
    .catch((err) => {
        console.log(err);
    });

