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
const dataFile = `${dirData}/${output}-data.json`;
const scriptFile = `${dirScripts}/${output}-script.qvs`;
const fieldsFile = `${dirFields}/${output}-fields.json`;

// fields to query
var fields = config.apps[0].fields;
const aliases = config.apps[0].aliases;
const doPostProcess = true;

const nxPage = {
    "qTop": 0,
    "qLeft": 0,
    "qWidth": 0,
    "qHeight": 0
};

const fieldTags = {
    date: "$date",
    timestamp: "$timestamp",
    ascii: "$ascii",
    text: "$text",
    numeric: "$numeric",
    integer: "$integer"
};

const fieldTypes = {
    discrete: "D",
    numeric: "N",
    timestamp: "T"
};

const measureTypes = {
    U: fieldTypes.discrete,
    A: fieldTypes.discrete,
    I: fieldTypes.numeric,
    R: fieldTypes.numeric,
    F: fieldTypes.numeric,
    M: fieldTypes.numeric,
    D: fieldTypes.timestamp,
    T: fieldTypes.timestamp,
    TS: fieldTypes.timestamp,
    IV: fieldTypes.discrete
};

const docsession = enigma.create({
    schema,
    url: `wss://${config.server}/${config.prefix}/app/${docId}`,
    createSocket: url => new WebSocket(url)
});

var w = 0, h = 10000, t = 0, page = 1;

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
            })
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

        var hyperCube = utils.getHyperCubeFromPayload(fields, aliases, nxPage);
        if (hyperCube.qHyperCubeDef.hasOwnProperty('qDimensions')) {
            w += hyperCube.qHyperCubeDef.qDimensions.length;
        }
        if (hyperCube.qHyperCubeDef.hasOwnProperty('qMeasures')) {
            w += hyperCube.qHyperCubeDef.qMeasures.length;
        }
        if (w > 1) {
            h = Math.floor(10000 / w);
        }
        //console.log(JSON.stringify(hyperCube));
        return doc.createSessionObject(hyperCube);
    })
    .catch(utils.genericCatch)
    .then((obj) => {
        var nxPageToGet = nxPage;
        nxPageToGet.qTop = t;
        nxPageToGet.qWidth = w;
        nxPageToGet.qHeight = h;
        obj.getLayout()
            .catch(utils.genericCatch)
            .then(layout => {
                if (layout.hasOwnProperty('qHyperCube')) {
                    return layout.qHyperCube;
                } else {
                    return {};
                }
            })
            .then(layout => {
                //console.log(JSON.stringify(layout));
                var names = [],
                    types = [];
                if (layout.hasOwnProperty('qDimensionInfo')) {
                    layout.qDimensionInfo.forEach((dim) => {
                        names.push(dim.qFallbackTitle);
                        if (dim.qTags.indexOf(fieldTags.date) > -1 || dim.qTags.indexOf(fieldTags.timestamp) > -1) {
                            types.push(fieldTypes.timestamp);
                        } else {
                            types.push(dim.qDimensionType);
                        }
                    });
                }
                if (layout.hasOwnProperty('qMeasureInfo')) {
                    layout.qMeasureInfo.forEach((measure) => {
                        names.push(measure.qFallbackTitle);
                        types.push(measureTypes[measure.qNumFormat.qType]);
                    });
                }
                return obj.getHyperCubeData("/qHyperCubeDef", [nxPageToGet])
                    .catch(utils.genericCatch)
                    .then(cube => {
                        docsession.close();
                        var res = [];
                        //console.log(JSON.stringify(cube));
                        if (cube.length > 0 && cube[0].hasOwnProperty('qMatrix')) {
                            cube[0].qMatrix.forEach(row => {
                                var resVal = {};
                                row.forEach((value, i) => {
                                    //console.log(i, types[i], value);
                                    if (value.hasOwnProperty('qIsNull') && value.qIsNull) {
                                        resVal[names[i]] = "null";
                                    } else {
                                        if (types[i] == fieldTypes.discrete) {
                                            if (value.hasOwnProperty('qText')) {
                                                resVal[names[i]] = value.qText;
                                            } else if (value.hasOwnProperty('qNum')) {
                                                resVal[names[i]] = value.qNum;
                                            } else {
                                                resVal[names[i]] = "null";
                                            }
                                        } else if (types[i] == fieldTypes.numeric) {
                                            resVal[names[i]] = value.qNum;
                                        } else if (types[i] == fieldTypes.timestamp) {
                                            resVal[names[i]] = utils.dateFromQlikNumber(value.qNum).toJSON();
                                        }
                                    }
                                });
                                //console.log(resVal);
                                res.push(resVal);
                            });
                        }
                        return res;
                    });
            })
            .then((res) => {
                //console.log(JSON.stringify(res));
                console.log("Writing Data:   ", dataFile);
                if (doPostProcess) {
                    fs.writeFileSync(dataFile, JSON.stringify(postProcess(res.filter(postFilter)), null, 4), "utf8");
                } else {
                    fs.writeFileSync(dataFile, JSON.stringify(res.filter(postFilter), null, 4), "utf8");
                }
            });
    })
    .catch((err) => {
        console.log(err);
    });

