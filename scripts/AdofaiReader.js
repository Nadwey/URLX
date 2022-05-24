/**
 * @typedef {Object} Action
 * @property {"SetSpeed"|"Twirl"} eventType
 * @property {Number} floor
 *
 * SPEED
 * @property {"Multiplier"|"Bpm"} speedType
 * @property {Number} beatsPerMinute
 * @property {Number} bpmMultiplier
 */

/**
 * @typedef {Object} Settings
 * @property {String} song
 * @property {Number} bpm
 * @property {Number} offset
 * @property {Number} beatsBehind
 */

/**
 * @typedef {Object} AdofaiLevel
 * @property {?Number[]} angleData
 * @property {?String} pathData
 * @property {Settings} settings
 * @property {Action[]} actions
 */

/**
 * @typedef {Object} AdofaiEvent
 * @property {Number} time
 * @property {Number} angleChange angle difference to previous beat
 * @property {?Number} bpm If it's not null, then it's bpm change
 */

/**
 * @typedef {Object} AdofaiData
 * @property {AdofaiEvent[]} events
 * @property {Settings} settings
 */

/**
 * Tries to fix adofai's json
 * Apparently it serializes using just strings, and uses shitty parser that accepts that
 *
 * @param {String} input broken string
 * @returns {String} hopefully fixed json
 */
const FixAdofaiString = (input) => {
    const fixed = input
        .trim()
        .replaceAll(", ,", ",")
        .replaceAll(",,", ",")
        .replaceAll("}\n", "},\n")
        .replaceAll("},\n\t]", "}\n\t]")
        .replaceAll(", },", " },")
        .replaceAll(", }", " }")
        .replace(/,[\t]+\}/, "}");
    return fixed;
};

/**
 * Reads adofai string
 *
 * @param {String} adofaiString adofai string
 * @returns {AdofaiData}
 */
const ReadAfodaiString = (adofaiString) => {
    const angles = {
        U: 90,
        R: 180,
        L: 360,
        D: 270,
        E: 135,
        C: 225,
        Q: 45,
        Z: 315,
        H: 30,
        G: 60,
        T: 120,
        J: 150,
        M: 210,
        B: 240,
        F: 300,
        N: 330,
        "!": null, // unsupported (for now)
        X: null, // spawnpoint
    };

    /**
     * @type {AdofaiLevel}
     * @returns {Number} times in miliseconds
     */
    let data;

    try {
        data = JSON.parse(adofaiString);
    } catch {
        try {
            data = JSON.parse(FixAdofaiString(adofaiString));
        } catch (ex) {
            throw new Error("Ur json it to broken, rip\n" + ex);
        }
    }

    let bpm = data.settings.bpm;

    if (!data.angleData) {
        const pathData = data.pathData.split("");
        let angleData = [];
        pathData.forEach((val) => {
            if (angles[val.toUpperCase()]) angleData.push(angles[val.toUpperCase()]);
        });
        data.angleData = angleData;
    }
    
    // data.angleData.unshift(0); // NOO?

    const events = data.angleData.map((angle, index) => {
        let wasBpmChanged = false;
        let angleChange = Math.abs(data.angleData[index + 1] - angle + 540) % 360;

        const supportedActions = ["SetSpeed", "Twirl"];
        data.actions
            .filter((action) => action.floor === index && supportedActions.includes(action.eventType))
            .forEach((action) => {
                switch (action.eventType) {
                    case "SetSpeed": {
                        wasBpmChanged = true;
                        if (!action.speedType || action.speedType === "Bpm") {
                            bpm = action.beatsPerMinute;
                            break;
                        }
                        bpm *= action.bpmMultiplier;
                        break;
                    }
                    case "Twirl": {
                        angleChange = 360 - angleChange;
                        break;
                    }
                }
            });
        if (angleChange == 0) angleChange = 360;

        const milis = (1000 * angleChange) / (3 * bpm);

        return {
            time: milis,
            angleChange,
            bpm: wasBpmChanged ? bpm : null,
        };
    });

    return {
        events,
        settings: data.settings,
    };
};
