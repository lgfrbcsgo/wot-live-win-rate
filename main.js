// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * The address of the battle results websocket server.
 * @type {string}
 */
const SERVER_ADDRESS = 'ws://localhost:61942';

/**
 * The numeric battle type of a random battle.
 * @type {number}
 */
const RANDOM_BATTLE = 1;

/**
 * The numeric battle type of a grand battle.
 * @type {number}
 */
const GRAND_BATTLE = 24;


// ============================================================================
// STATE
// ============================================================================

/**
 * The count of victories within the current session.
 * @type {number}
 */
let victoryCount = 0;

/**
 * The count of losses and draws within the current session.
 * @type {number}
 */
let lossCount = 0;

/**
 * Boolean flag whether we must show a hint that we're disconnected from the websocket server.
 * @type {boolean}
 */
let showDisconnectedHint = false;


// ============================================================================
// INIT
// ============================================================================

render();

/**
 * Websocket connection to the battle results server.
 * @type {WebSocket}
 */
const ws = new WebSocket(SERVER_ADDRESS);

ws.addEventListener('open', onOpen);
ws.addEventListener('message', onMessage);
ws.addEventListener('close', onDisconnect);
ws.addEventListener('error', onDisconnect);


// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Called once the websocket connection has been established.
 * Sends REPLAY and SUBSCRIBE commands to replay all previous battle results and subscribe to all new ones.
 */
function onOpen() {
    ws.send(JSON.stringify({
        messageType: 'REPLAY',
        payload: {}
    }));
    ws.send(JSON.stringify({
        messageType: 'SUBSCRIBE',
        payload: {}
    }));
}

/**
 * Called for every message which we receive through the websocket connection.
 * Parses the event data as JSON, and then
 *  - proceed with handling the received battle result, or
 *  - log an error to the console in case the server responds with an error.
 * @param event {MessageEvent}
 */
function onMessage(event) {
    const message = JSON.parse(event.data);
    if (message.messageType === 'BATTLE_RESULT') {
        const battleResult = message.payload.result;
        onBattleResult(battleResult);
    } else if (message.messageType === 'ERROR') {
        console.error('Protocol Error:', message.payload);
    }
}

/**
 * Called for every battle result which we receive from the server.
 * Checks whether the result is a random battle, updates the victory and loss counters, and finally renders the page.
 * @param battleResult {object}
 */
function onBattleResult(battleResult) {
    if (!isRandomBattle(battleResult)) {
        return
    }

    if (isVictory(battleResult)) {
        victoryCount++;
    } else {
        lossCount++;
    }

    render();
}

/**
 * Called when we couldn't connect to the server, or when the connection was closed.
 * Set the flag to show a hint to the user that we are disconnected from the server.
 */
function onDisconnect() {
    showDisconnectedHint = true;
    render();
}


// ============================================================================
// RENDERING
// ============================================================================

import {renderTitle, renderContent, renderFavicon} from './renderer.js';

/**
 * Calculates the current win rate and updates the page based on the current state.
 */
function render() {
    const winRate = victoryCount / (lossCount + victoryCount);
    document.title = renderTitle(winRate);
    document.body.innerHTML = renderContent(winRate, showDisconnectedHint);
    document.querySelector('#favicon').href = renderFavicon(winRate);
}


// ============================================================================
// BATTLE RESULT PARSING
// ============================================================================

/**
 * Determines whether the battle result is a random battle of not.
 * @param battleResult {object}
 * @returns {boolean}
 */
function isRandomBattle(battleResult) {
    const battleType = getBattleType(battleResult);
    return battleType === RANDOM_BATTLE || battleType === GRAND_BATTLE;
}

/**
 * Returns the numeric battle type of a battle result
 * @param battleResult {object}
 * @returns {number}
 */
function getBattleType(battleResult) {
    return battleResult && battleResult.common && battleResult.common.bonusType;
}

/**
 * Determines whether the battle result was a victory or a loss/draw.
 * @param battleResult {object}
 * @returns {boolean}
 */
function isVictory(battleResult) {
    return getTeam(battleResult) === getWinnerTeam(battleResult);
}

/**
 * Returns the number of the winner team from the battle result.
 * @param battleResult {object}
 * @returns {number}
 */
function getWinnerTeam(battleResult) {
    return battleResult && battleResult.common && battleResult.common.winnerTeam;
}

/**
 * Returns the number of the player's team from the battle result.
 * @param battleResult {object}
 * @returns {number}
 */
function getTeam(battleResult) {
    return battleResult && battleResult.personal && battleResult.personal.avatar && battleResult.personal.avatar.team;
}
