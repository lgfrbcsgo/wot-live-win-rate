// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * The address of the battle results websocket server.
 * @type {string}
 */
const SERVER_ADDRESS = 'ws://localhost:15455';

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
 * Calls `get_battle_results` and `subscribe` methods through JSON RPC to receive all previous battle results
 * and to subscribe to all new ones.
 */
function onOpen() {
    ws.send(JSON.stringify([
        {
            jsonrpc: '2.0',
            method: 'get_battle_results',
            id: 1,
        },
        {
            jsonrpc: '2.0',
            method: 'subscribe',
            id: 2,
        }
    ]));
}

/**
 * Called for every message which we receive through the websocket connection.
 * Parses the event data as JSON, and then proceeds with handling the JSON RPC messages.
 * @param event {MessageEvent}
 */
function onMessage(event) {
    const parsed = JSON.parse(event.data);
    if (Array.isArray(parsed)) {
        // received a response to our batch request
        for (const message of parsed) {
            onJsonRpcMessage(message);
        }
    } else {
        onJsonRpcMessage(parsed);
    }
}

/**
 * Called for every JSON RPC message we receive.
 * Reads battle results from the message and proceeds with handling them.
 * @param message {object}
 */
function onJsonRpcMessage(message) {
    if (message.method === 'subscription') {
        // received a `subscription` notification
        const battleResult = message.params.battleResult;
        onBattleResult(battleResult);
    } else if (message.result && message.id === 1) {
        // received response to our `get_battle_results` call
        for (const battleResult of message.result.battleResults) {
            onBattleResult(battleResult);
        }
    } else if (message.error) {
        // received an error
        console.error('Error:', message.error);
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
