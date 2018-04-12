const fs = require("fs");

exports.nxPage = {
    "qTop": 0,
    "qLeft": 0,
    "qWidth": 0,
    "qHeight": 0
};

exports.fieldTags = {
    date: "$date",
    timestamp: "$timestamp",
    ascii: "$ascii",
    text: "$text",
    numeric: "$numeric",
    integer: "$integer"
};

exports.fieldTypes = {
    discrete: "D",
    numeric: "N",
    timestamp: "T"
};

exports.measureTypes = {
    U: exports.fieldTypes.discrete,
    A: exports.fieldTypes.discrete,
    I: exports.fieldTypes.numeric,
    R: exports.fieldTypes.numeric,
    F: exports.fieldTypes.numeric,
    M: exports.fieldTypes.numeric,
    D: exports.fieldTypes.timestamp,
    T: exports.fieldTypes.timestamp,
    TS: exports.fieldTypes.timestamp,
    IV: exports.fieldTypes.discrete
};

exports.genericCatch = error => {
    console.error('Error occured:', error);
    process.exit(1);
};

exports.dateFromQlikNumber = n => {
    // return: Date from QlikView number
    var d = new Date(Math.round((n - 25569) * 86400 * 1000));
    // since date was created in UTC shift it to the local timezone
    d.setTime(d.getTime() + d.getTimezoneOffset() * 60 * 1000);
    return d;
};


exports.lowerFirstCase = s => {
    return s.charAt(0).toLowerCase() + s.substring(1);
};

exports.executeQuery = (doc, query, dirData) => {
    var w = 0, h = 10000, t = 0, page = 1;
    var hyperCube = this.getHyperCubeFromPayload(query.fields, query.aliases, exports.nxPage);
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
    return doc.createSessionObject(hyperCube)
        .catch(exports.genericCatch)
        .then((obj) => {
            var nxPageToGet = exports.nxPage;
            nxPageToGet.qTop = t;
            nxPageToGet.qWidth = w;
            nxPageToGet.qHeight = h;
            return obj.getLayout()
                .catch(exports.genericCatch)
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
                            if (dim.qTags.indexOf(exports.fieldTags.date) > -1 || dim.qTags.indexOf(exports.fieldTags.timestamp) > -1) {
                                types.push(exports.fieldTypes.timestamp);
                            } else {
                                types.push(dim.qDimensionType);
                            }
                        });
                    }
                    if (layout.hasOwnProperty('qMeasureInfo')) {
                        layout.qMeasureInfo.forEach((measure) => {
                            names.push(measure.qFallbackTitle);
                            types.push(exports.measureTypes[measure.qNumFormat.qType]);
                        });
                    }
                    return obj.getHyperCubeData("/qHyperCubeDef", [nxPageToGet])
                        .catch(exports.genericCatch)
                        .then(cube => {
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
                                            if (types[i] == exports.fieldTypes.discrete) {
                                                if (value.hasOwnProperty('qText')) {
                                                    resVal[names[i]] = value.qText;
                                                } else if (value.hasOwnProperty('qNum')) {
                                                    resVal[names[i]] = value.qNum;
                                                } else {
                                                    resVal[names[i]] = "null";
                                                }
                                            } else if (types[i] == exports.fieldTypes.numeric) {
                                                resVal[names[i]] = value.qNum;
                                            } else if (types[i] == exports.fieldTypes.timestamp) {
                                                resVal[names[i]] = utils.dateFromQlikNumber(value.qNum).toJSON();
                                            }
                                        }
                                    });
                                    //console.log(resVal);
                                    res.push(resVal);
                                });
                            }
                            return res;
                        })
                        .then((res) => {
                            const dataFile = `${dirData}/${query.output}.json`;
                            //console.log(JSON.stringify(res));
                            console.log("Writing Data:   ", dataFile);
                            if (query.postFilter) {
                                res = res.filter(query.postFilter);
                            }
                            if (query.postProcess) {
                                res = query.postProcess(res);
                            }
                            return new Promise((resolve,reject) => {
                                fs.writeFileSync(dataFile, JSON.stringify(res, null, 4), "utf8");
                                resolve();
                            });
                        });
                });
        });
};

// generate qHyperCubeDef object out of payload
exports.getHyperCubeFromPayload = (payload, labels, nxPage) => {
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
    };
    var hyperCube = JSON.parse(JSON.stringify(hyperCubeDef));
    if (payload) {
        if (payload instanceof Array) {
            // column list
            payload.forEach((e, i) => {
                if (typeof e === "string") {
                    if (e.trim().substring(0, 1) === "=") {
                        // measure
                        hyperCube.qHyperCubeDef.qMeasures.push({
                            qDef: {
                                qDef: e,
                                qLabel: labels[i]
                            }
                        });
                    }
                    else {
                        // dimension
                        hyperCube.qHyperCubeDef.qDimensions.push({
                            qDef: {
                                qFieldDefs: [e],
                                qFieldLabels: [labels[i]]
                            }
                        });
                    }
                }
                else if (typeof e === "object") {
                    if (e.hasOwnProperty("qDef")) {
                        if (e.qDef.hasOwnProperty("qDef")) {
                            // measure
                            hyperCube.qHyperCubeDef.qMeasures.push(e);
                        }
                        else if (e.qDef.hasOwnProperty("qFieldDefs")) {
                            // dimension
                            hyperCube.qHyperCubeDef.qDimensions.push(e);
                        }
                    }
                }
            });
        }
        else if (typeof payload === "object") {
            // hypercube object
            if (payload.hasOwnProperty('qHyperCubeDef')) {
                hyperCube.qHyperCubeDef = payload.qHyperCubeDef;
            }
            else {
                hyperCube.qHyperCubeDef = payload;
            }
        }
        hyperCube.qHyperCubeDef.qInitialDataFetch = [nxPage];
    }
    return hyperCube;
};
