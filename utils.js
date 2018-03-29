'use strict';

module.exports = {
    genericCatch: error => {
        console.error('Error occured:', error);
        process.exit(1);
    },

    dateFromQlikNumber: (n) => {
        // return: Date from QlikView number
        var d = new Date(Math.round((n - 25569) * 86400 * 1000));
        // since date was created in UTC shift it to the local timezone
        d.setTime(d.getTime() + d.getTimezoneOffset() * 60 * 1000);
        return d;
    },

    // generate qHyperCubeDef object out of payload
    getHyperCubeFromPayload(payload, labels, nxPage) {
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
                        } else {
                            // dimension
                            hyperCube.qHyperCubeDef.qDimensions.push({
                                qDef: { 
                                    qFieldDefs: [e],
                                    qFieldLabels: [labels[i]]
                                }
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

}