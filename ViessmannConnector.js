
const https = require('https');
const { clearInterval } = require('timers');

const clientID = getState("javascript.0.custom.Viessmann.ClientID");
let refreshToken = getState("javascript.0.custom.Viessmann.RefreshToken");
let accessToken = getState("javascript.0.custom.Viessmann.AccessToken");
const installationID = getState("javascript.0.custom.Viessmann.InstallationID");
const gatewaySerial = getState("javascript.0.custom.Viessmann.GatewaySerial");
const deviceID = getState("javascript.0.custom.Viessmann.DeviceID");
const delayInMinutes = 5;

const valueMapping = {
    'heating.dhw.sensors.temperature.hotWaterStorage': ['hotWaterStorageTemperature', 'properties.value.value', '°C'],
    'heating.sensors.temperature.outside':             ['temperatureOutside', 'properties.value.value', '°C'],
    'heating.circuits.0.operating.programs.active':    ['activeProgram', 'properties.value.value'],
    'heating.circuits.0.operating.modes.active':       ['activeMode', 'properties.value.value'],
    'heating.circuits.0.operating.programs.comfort':   ['comfortTemperature', 'properties.temperature.value', '°C'],
    'heating.circuits.0.operating.programs.normal':    ['normalTemperature', 'properties.temperature.value', '°C'],
    'heating.circuits.0.operating.programs.reduced':   ['reducedTemperature', 'properties.temperature.value', '°C'],
    'heating.dhw.temperature.main':                    ['waterTemperature', 'properties.value.value', '°C']
}

/*
 * renew access token
 */
async function renewToken() {
    return new Promise((resolve, reject) => {

        var options = {
            hostname: "iam.viessmann.com",
            port: 443,
            path: `/idp/v2/token?grant_type=refresh_token&client_id=${clientID.val}&refresh_token=${refreshToken.val}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
          };

        const req = https.request(options, (res) => {

            var data = '';

            res.on('data', (chunk) => {
                data = data + chunk;
            });
    
            res.on('end', () => {
                resolve(JSON.parse(data));
            });

        });

        req.end();

    });
}

/*
 * query data by get request
 */
async function getData(path) {
    return new Promise((resolve, reject) => {

        var options = {
            hostname: "api.viessmann.com",
            port: 443,
            path: path,
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken.val}`
            }
          };

        const req = https.request(options, (res) => {

            var data = '';

            res.on('data', (chunk) => {
                data = data + chunk;
            });
    
            res.on('end', () => {
                resolve(JSON.parse(data));
            });

        });

        req.end();

    });
}


/*
 * process feature data
 */
async function processFeatureData(featureData) {

    const requiredFeatures = Object.keys(valueMapping);

    featureData.forEach(feature => {

        if (requiredFeatures.includes(feature.feature)) {
            const mapping = valueMapping[feature.feature];

            let options = undefined;
            if (mapping[2] !== undefined) {
                options = {unit: mapping[2]}
            }

            const key = `javascript.0.custom.Viessmann.data.${mapping[0]}`;
            const value = eval(`feature.${mapping[1]}`);

            if (!existsState(key)) {
                createState(key, value, options);
            } else {
                setState(key, value);
            }

        }

    });

    setTimeout(setCalculatedValues, 15000);

}


/*
 * set calculated values
 */
function setCalculatedValues() {

    const activeMode = getState('javascript.0.custom.Viessmann.data.activeProgram');

    let currentTemperature;
    if (activeMode.val === "normal") {
        const normalTemperature = getState('javascript.0.custom.Viessmann.data.normalTemperature');
        currentTemperature = normalTemperature ? normalTemperature.val : 0;
        
    
    } else if (activeMode.val === "reduced") {
        const reducedTemperature = getState('javascript.0.custom.Viessmann.data.reducedTemperature');  
        currentTemperature = reducedTemperature ? reducedTemperature.val : 0;
    }

    if (!existsState('javascript.0.custom.Viessmann.data.currentTemperature')) {
        createState('javascript.0.custom.Viessmann.data.currentTemperature', currentTemperature, {unit: '°C'});  
    } else {
        setState('javascript.0.custom.Viessmann.data.currentTemperature', currentTemperature); 
    }
    
}


/*
 * main loop
 */
let intervalToken = setInterval(async () => {

    try {

        let responseData = await getData(`/iot/v1/equipment/installations/${installationID.val}/gateways/${gatewaySerial.val}/devices/${deviceID.val}/features`);
    
        if (responseData.error === "EXPIRED TOKEN") {
            responseData = await renewToken();
            if (responseData.access_token) {
                setState("javascript.0.custom.Viessmann.AccessToken", responseData.access_token);
                accessToken = getState("javascript.0.custom.Viessmann.AccessToken");
            } else {
                log("Token not renewed", "error");
            }
        } else if (!!responseData.error) {
            log(responseData.error, "error");
        } else if (!!responseData.data) {
            processFeatureData(responseData.data);
        } else {
            log("Unhandeled response", "error");
        }
    
    } catch (e) {
        log(e.message, "error");
        clearInterval(intervalToken);
        stopScript();
    }
     
}, delayInMinutes * 60000);