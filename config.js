import { 
    handleReceiveConfigUpdate, 
    updateConfigState, 
    updateGrimoireState,
    updateDisplayResolution,
    getConfigState,
} from "./viewer.js";
import { EBS_CASTER, EBS_URL, SECRET_LENGTH } from "./utils/constants.js";

const twitch = window.Twitch.ext;
const RADIUS_INCREMENT = 5;

let playerCount = 5;
const MAX_PLAYERS = 20;

let channelId;
let secretKey;
let jwt;

/**
 * Mock grimoire state to allow any number of tokens for config
 * 
 * @returns {Object} a mock grimoire with the correct number of players
 */
function makeGrimoire() {
    return {
        players: [
            {role: "washerwoman"},
            {role: "librarian"},
            {role: "investigator"},
            {role: "chef"},
            {role: "empath"},
            {role: "fortuneteller"},
            {role: "undertaker"},
            {role: "monk"},
            {role: "ravenkeeper"},
            {role: "virgin"},
            {role: "slayer"},
            {role: "soldier"},
            {role: "mayor"},
            {role: "butler"},
            {role: "drunk"},
            {role: "recluse"},
            {role: "saint"},
            {role: "imp"},
            {role: "baron"},
            {role: "spy"},
        ].slice(0, playerCount)
    };
}

updateGrimoireState(makeGrimoire());

twitch.onContext((context, changed) => {
    if(changed.includes("displayResolution")){
        updateDisplayResolution("845x480");
        // updateDisplayResolution(context.displayResolution);
    }
});
   
// Update config once it's available
twitch.configuration.onChanged(() => {
    if (twitch.configuration.broadcaster) {
        handleReceiveConfigUpdate(twitch.configuration.broadcaster.content);
    }
});

// Listen for pubsub messages
twitch.listen("broadcast", (target, contentType, message) => {
    const parsedMessage = JSON.parse(message);
    if(parsedMessage.type === "config") {
        updateConfigState(parsedMessage.settings);
    }

    // if(parsedMessage.type === "grimoire") {
    //     updateGrimoireState(parsedMessage.grimoire);
    // }
});


const log = (...args) => {
    console.log(...args);
    twitch.rig.log(...args);
};

twitch.configuration.onChanged(() => {
    log("config changed");
    if (twitch.configuration.broadcaster) {
        handleReceiveConfigUpdate(twitch.configuration.broadcaster.content);
    }


    // updateGrimoireState(dummyGrimoire);
    updateDisplayResolution("845x480");
});

twitch.onAuthorized(auth => {
    channelId = auth.channelId;
    jwt = auth.token;

    // fetch secretKey from backend if exists
    const ebsEndpointUrl = `${EBS_URL}/${EBS_CASTER}/${channelId}`;
    fetch( ebsEndpointUrl, {
        method: "GET",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin", 
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + jwt
        },
        redirect: "follow", // manual, *follow, error
        referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    }).then(response => response.json())
        .then(data => {
            if(data.secretKey) {
                secretKey = data.secretKey;
                updateSecretKeyDisplay(secretKey);
            }
        });
    
});

function sendSecretKey(secretKey) {
// Save secret key to backend
    const ebsEndpointUrl = `${EBS_URL}/${EBS_CASTER}`;
    const body = JSON.stringify({secretKey, channelId});

    fetch(ebsEndpointUrl, {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin", 
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + jwt
        },
        redirect: "follow", // manual, *follow, error
        referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        body: body
    }).then(console.log); 
}

/**
 * Update the Twitch Config Service with the current values in state
 */
function saveConfig() {
    const config = getConfigState();
    console.log(config);
    // set config in twitch service
    twitch.configuration.set("broadcaster", "1", JSON.stringify(config));

    // send updates to active viewers
    twitch.send("broadcast", "application/json", {type: "config", settings: config});
}

// Move overlay up
function handleClickUp() {
    const prevState = getConfigState();
    updateConfigState({y: prevState.y - 1});
}
document.getElementById("button-up").addEventListener("click", handleClickUp);

// Move overlay down
function handleClickDown() {
    const prevState = getConfigState();
    updateConfigState({y: prevState.y + 1});
}
document
    .getElementById("button-down")
    .addEventListener("click", handleClickDown);

// Move overlay left
function handleClickLeft() {
    const prevState = getConfigState();
    updateConfigState({x: prevState.x - 1});
}
document
    .getElementById("button-left")
    .addEventListener("click", handleClickLeft);

// Move overlay right
function handleClickRight() {
    const prevState = getConfigState();
    updateConfigState({x: prevState.x + 1});
}
document
    .getElementById("button-right")
    .addEventListener("click", handleClickRight);

// Increase token size
function handleBiggerToken() {
    const prevState = getConfigState();
    updateConfigState({tokenSize: prevState.tokenSize + 1});
}
document
    .getElementById("button-bigger")
    .addEventListener("click", handleBiggerToken);

// Decrease token size
function handleSmallerToken() {
    const prevState = getConfigState();
    updateConfigState({tokenSize: prevState.tokenSize - 1});
}
document
    .getElementById("button-smaller")
    .addEventListener("click", handleSmallerToken);

// Increase circle radius
function handleIncreaseRadius() {
    const prevState = getConfigState();
    updateConfigState({radius: prevState.radius + RADIUS_INCREMENT});
}
document
    .getElementById("button-expand")
    .addEventListener("click", handleIncreaseRadius);

// Decrease circle radius
function handleDecreaseRadius() {
    const prevState = getConfigState();
    updateConfigState({radius: prevState.radius - RADIUS_INCREMENT});
}
document
    .getElementById("button-contract")
    .addEventListener("click", handleDecreaseRadius);

// Add a player. On this page only, NOT saved to global config.
function handleAddPlayer() {
    if (playerCount < MAX_PLAYERS){
        playerCount++;
    }
    updateGrimoireState(makeGrimoire());
}
document.getElementById("button-addPlayer").addEventListener("click", handleAddPlayer);

// Remove a player. On this page only, NOT saved to global config.
function handleRemovePlayer() {
    if (playerCount > 0){
        playerCount--;
    }
    updateGrimoireState(makeGrimoire());
}
document.getElementById("button-removePlayer").addEventListener("click", handleRemovePlayer);

let reader = new FileReader();
reader.addEventListener("load", (event) => {
    const bg = document.getElementById("bg");
    bg.src = reader.result;
});

function handleSetBackground(e) {
    var file = e.target.files[0];

    if (file) {
        reader.readAsDataURL(file);
    }
}

document
    .getElementById("button-background")
    .addEventListener("input", handleSetBackground);

// Handle saving settings
document.getElementById("button-save").addEventListener("click", saveConfig);

// Handle Secret Key
function getSecretKeyInput(){
    return document.getElementById("secretKeyInput");
}

function updateSecretKeyDisplay(newSecret) {
    const inputNode = getSecretKeyInput();

    if(inputNode && typeof newSecret === "string") {
        inputNode.value=newSecret;
    }
}

function generateSecret() {
    // return Math.round((Math.pow(36, SECRET_LENGTH + 1) - Math.random() * Math.pow(36, SECRET_LENGTH))).toString(36).slice(1);
    const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let result = "";
    for (let i = SECRET_LENGTH; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

function handleSecretGenerateClick(event) {
    event.preventDefault();
    const newSecret = generateSecret();
    secretKey = newSecret;
    updateSecretKeyDisplay(newSecret);
}

function handleSaveSecretClick(event) {
    event.preventDefault();

    // check secrets match?

    const secretKeyNode = getSecretKeyInput();

    if (!secretKeyNode) {
        return;
    }

    const secretKeyFromNode = secretKeyNode.value;
    if(!secretKey === secretKeyFromNode) {
        return;
    }

    sendSecretKey(secretKey);
}

document.getElementById("secretKeyGenerate").addEventListener("click", handleSecretGenerateClick);
document.getElementById("secretKeySave").addEventListener("click", handleSaveSecretClick);


// Handle Bookmarklet
const bookmarkletLink = document.getElementById("bookmarkletLink");

//prevent clicking on link
bookmarkletLink.addEventListener("click", (event) => {
    event.preventDefault();
});

const minifiedBookmarkletJs = "javascript:(()=>{const extensionNodeId=\"botc-twitch-extension\";const EBS_URL=\"http://localhost:3000\";const localStorageKey=\"twitchBotcExtensionLoaded\";if(document.getElementById(extensionNodeId)){return}localStorage.setItem(localStorageKey,true);let state={session:\"\",playerId:null,isHost:false,players:[],bluffs:[],edition:{},secretKey:\"\",isExtensionActive:false};function grimoireToJson(data){return JSON.stringify({session:data.session,playerId:data.playerId,isHost:data.isHost,players:data.players,bluffs:data.bluffs,edition:data.edition})}function wrappedFetch(url,body){return fetch(url,{method:\"POST\",mode:\"cors\",cache:\"no-cache\",credentials:\"same-origin\",headers:{\"Content-Type\":\"application/json\"},redirect:\"follow\",referrerPolicy:\"no-referrer\",body:body})}function sendGrimoire(){const url=EBS_URL+\"/grimoire/\"+state.secretKey;const body=grimoireToJson(state);wrappedFetch(url,body).then(console.log)}function sendSession(){const url=EBS_URL+\"/session/\"+state.secretKey;const{session,playerId,isExtensionActive}=state;const body={session:session,playerId:playerId,isActive:isExtensionActive};wrappedFetch(url,JSON.stringify(body)).then(console.log)}function assignStyles(node,styles){Object.assign(node.style,styles)}const controlsNode=document.getElementById(\"controls\");const extensionNode=document.createElement(\"div\");extensionNode.id=extensionNodeId;const extensionStyles={position:\"absolute\",width:\"40px\",height:\"40px\",paddingTop:\"11px\",transform:\"translateX(calc(-100% - 3px)\"};assignStyles(extensionNode,extensionStyles);const svgNode=document.createElementNS(\"http://www.w3.org/2000/svg\",\"svg\");svgNode.setAttribute(\"width\",\"40\");svgNode.setAttribute(\"height\",\"40\");svgNode.setAttribute(\"viewBox\",\"0 0 100 100\");svgNode.innerHTML='<path d=\"M5.7 0L1.4 10.985V55.88h15.284V64h8.597l8.12-8.12h12.418l16.716-16.716V0H5.7zm51.104 36.3L47.25 45.85H31.967l-8.12 8.12v-8.12H10.952V5.73h45.85V36.3zM47.25 16.716v16.716h-5.73V16.716h5.73zm-15.284 0v16.716h-5.73V16.716h5.73z\" fill=\"#6441a4\" fill-rule=\"evenodd\"></path>';extensionNode.appendChild(svgNode);const configMenuNode=document.createElement(\"div\");configMenuNode.id=\"botc-twitch-extension-config\";const configMenuStyles={width:\"300px\",height:\"320px\",background:\"rgb(200, 181, 234\",color:\"black\",fontSize:\"16px\",overflow:\"wrap\",padding:\"10px\",border:\"10px solid #6441a4\",borderRadius:\"30px\",transform:\"translateX(-100%)\",display:\"none\",textAlign:\"left\"};assignStyles(configMenuNode,configMenuStyles);const createConfigMenuRow=(...elements)=>{const rowNode=document.createElement(\"div\");const rowStyles={display:\"flex\",flexDirection:\"row\",justifyContents:\"space-between\"};assignStyles(rowNode,rowStyles);rowNode.append(...elements);console.log(rowNode);return rowNode};const secretKeyInputNode=document.createElement(\"input\");secretKeyInputNode.type=\"password\";secretKeyInputNode.id=\"twitch-config-channelInput\";const secretKeyInputStyle={width:\"50%\",marginRight:\"10px\"};assignStyles(secretKeyInputNode,secretKeyInputStyle);const secretKeyLabelNode=document.createElement(\"label\");secretKeyLabelNode.htmlFor=\"twitch-config-channelInput\";secretKeyLabelNode.innerHTML=\"Secret Key:\";const secretKeyLabelStyles={color:\"black\",fontSize:\"16px\",paddingRight:\"5px\"};assignStyles(secretKeyLabelNode,secretKeyLabelStyles);const secretKeyButtonNode=document.createElement(\"button\");secretKeyButtonNode.innerHTML=\"Save\";secretKeyButtonNode.addEventListener(\"click\",event=>{event.preventDefault();state.secretKey=secretKeyInputNode.value;sendSession()});const secretKeyRow=createConfigMenuRow(secretKeyLabelNode,secretKeyInputNode,secretKeyButtonNode);configMenuNode.appendChild(secretKeyRow);const secretKeyInstructionsNode=document.createElement(\"p\");secretKeyInstructionsNode.innerHTML=\"Paste the secret key you generated on the extension config page. If you're not streaming, you don't need to worry about this.\";configMenuNode.appendChild(secretKeyInstructionsNode);const enableInstructionsNode=document.createElement(\"p\");enableInstructionsNode.innerHTML=\"Click the checkbox below to enable sending the grimoire to Twitch. Note that you must be in a live game sesion for this to work.\";configMenuNode.appendChild(enableInstructionsNode);const toggleListenNode=document.createElement(\"input\");toggleListenNode.id=\"twitch-config-listenToggle\";toggleListenNode.type=\"checkbox\";const toggleListenNodeStyles={transform:\"translateX(50%) scale(2)\"};assignStyles(toggleListenNode,toggleListenNodeStyles);const toggleListenLabel=document.createElement(\"label\");toggleListenLabel.htmlFor=\"twitch-config-listenToggle\";toggleListenLabel.style.color=\"black\";toggleListenLabel.innerHTML=\"Enable: \";const activationRow=createConfigMenuRow(toggleListenLabel,toggleListenNode);configMenuNode.appendChild(activationRow);extensionNode.appendChild(configMenuNode);controlsNode.prepend(extensionNode);let menuVisible=false;function toggleConfigMenu(){menuVisible=!menuVisible;configMenuNode.style.display=menuVisible?\"block\":\"none\"}function mapPlayerToObject(player){return{role:typeof player.role===\"string\"?player.role:\"\",name:player.name,id:player.id}}function parsePlayers(playersJson){return JSON.parse(playersJson).map(mapPlayerToObject)}function parseSession(sessionJson){const s=JSON.parse(sessionJson);return{isHost:!s[0],session:s[1]}}function isGrimoireStateUpdated(nextState){return grimoireToJson(state)!==grimoireToJson(nextState)}const intervalTimer=5*1e3;let intervalId=-1;function updateGrimoireState(shouldSendGrimoire=true){const localSession=localStorage.getItem(\"session\");const nextSession=localSession?parseSession(localSession):{session:null,isHost:false};const nextPlayers=parsePlayers(localStorage.getItem(\"players\"));const nextEdition={};const nextState={...state,session:nextSession.session,playerId:localStorage.getItem(\"playerId\"),isHost:nextSession.isHost,players:nextPlayers,edition:nextEdition};if(isGrimoireStateUpdated(nextState)){state=nextState;if(shouldSendGrimoire)sendGrimoire()}}function startWatchingGrimoire(){console.log(\"watching grimoire\");state.isExtensionActive=true;sendSession();intervalId=setInterval(updateGrimoireState,intervalTimer)}function stopWatchingGrimoire(){state.isExtensionActive=false;sendSession();clearInterval(intervalId);intervalId=-1}toggleListenNode.addEventListener(\"change\",e=>{if(e.target.checked){state.isExtensionActive=true;updateGrimoireState();startWatchingGrimoire()}else{state.isExtensionActive=false;stopWatchingGrimoire()}});svgNode.addEventListener(\"click\",()=>{toggleConfigMenu()});window.addEventListener(\"beforeunload\",()=>{state.isExtensionActive=false;const url=EBS_URL+\"/session/\"+state.secretKey;const{session,playerId,players}=state;const body={session:session,playerId:playerId,isActive:false,players:players};navigator.sendBeacon(url,JSON.stringify(body));localStorage.removeItem(localStorageKey)});updateGrimoireState(false)})();";

bookmarkletLink.href = minifiedBookmarkletJs;