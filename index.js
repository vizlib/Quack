const enigma = require('enigma.js');
const WebSocket = require('ws');
const fs = require("fs");
const schema = require('enigma.js/schemas/12.34.11.json');

// Engine API
const docId = 'fb480889-8f0b-43fb-baf1-2dcdaad74222';
const fileName = './data/engine-api.json';

// fields to query
const payload = [
    "Title",
    "Version",
    "InterfaceName",
    "InterfaceDeprecated",
    "MethodName",
    "MethodDeprecated"
];

const nxPage = {
    "qTop": 0,
    "qLeft": 0,
    "qWidth": 0,
    "qHeight": 0
};

const hyperCubeDef = {
    qInfo: {
        qId: "",
        qType: "custom"
    },
    qHyperCubeDef: {
        qDimensions: [],
        qMeasures: [],
        qInitialDataFetch: []
    }
}

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

function dateFromQlikNumber(n) {
    // return: Date from QlikView number
    var d = new Date(Math.round((n - 25569) * 86400 * 1000));
    // since date was created in UTC shift it to the local timezone
    d.setTime(d.getTime() + d.getTimezoneOffset() * 60 * 1000);
    return d;
}

// generate qHyperCubeDef object out of payload
function getHyperCubeFromPayload(payload, nxPage) {
    var hyperCube = JSON.parse(JSON.stringify(hyperCubeDef));

    if (payload) {
        if (payload instanceof Array) {
            // column list
            payload.forEach((e) => {
                if (typeof e === "string") {
                    if (e.trim().substring(0, 1) === "=") {
                        // measure
                        hyperCube.qHyperCubeDef.qMeasures.push({
                            qDef: { qDef: e }
                        });
                    } else {
                        // dimension
                        hyperCube.qHyperCubeDef.qDimensions.push({
                            qDef: { qFieldDefs: [e] },
                        });
                    }
                } else if (typeof e === "object") {
                    if (e.hasOwnProperty("qDef")) {
                        if (e.qDef.hasOwnProperty("qDef")) {
                            // measure
                            hyperCube.qHyperCubeDef.qMeasures.push(e);
                        } else if (e.qDef.hasOwnProperty("qFieldDefs")) {
                            // dimension
                            hyperCube.qHyperCubeDef.qDimensions.push(e);
                        }
                    }
                }
            });
        } else if (typeof payload === "object") {
            // hypercube object
            if (payload.hasOwnProperty('qHyperCubeDef')) {
                hyperCube.qHyperCubeDef = payload.qHyperCubeDef;
            } else {
                hyperCube.qHyperCubeDef = payload;
            }
        }
        hyperCube.qHyperCubeDef.qInitialDataFetch = [nxPage];
    }
    return hyperCube;
}

function genericCatch(error) {
    docsession.close();
    console.error('Error occured:', error);
}


const docsession = enigma.create({
    schema,
    url: `wss://branch.qlik.com/anon/app/${docId}`,
    createSocket: url => new WebSocket(url)
});

var w = 0, h = 10000, t = 0, page = 1;

docsession.open()
    .then(global => {
        return global.openDoc(docId);
    })
    .catch(genericCatch)
    .then((doc) => {
        doc.getScript()
            .catch(genericCatch)
            .then((script) => {
                console.log("-----------------");
                console.log("Script:");
                console.log(script);
                console.log("-----------------");
            })
        doc.createSessionObject({
            qInfo: {
                qId: "",
                qType: "custom"
            },
            qFieldListDef: {
            }
        })
            .catch(genericCatch)
            .then((obj) => {
                obj.getLayout()
                    .catch(genericCatch)
                    .then((layout) => {
                        console.log("-----------------");
                        console.log("Fields:");
                        console.log(JSON.stringify(layout.qFieldList.qItems.map((e) => { return e.qName; })));
                        console.log("-----------------");
                    });
            });

        var hyperCube = getHyperCubeFromPayload(payload, nxPage);
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
    .catch(genericCatch)
    .then((obj) => {
        var nxPageToGet = nxPage;
        nxPageToGet.qTop = t;
        nxPageToGet.qWidth = w;
        nxPageToGet.qHeight = h;

        obj.getLayout()
            .catch(genericCatch)
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
                    .catch(genericCatch)
                    .then(cube => {
                        docsession.close();
                        var res = [];
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
                fs.writeFileSync(fileName, JSON.stringify(res), "utf8");
            });
    })
    .catch((err) => {
        console.log(err);
    });

