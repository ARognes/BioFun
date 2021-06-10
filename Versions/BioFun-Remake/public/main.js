'use-strict';

import { Game, loadSprites, fitCanvas, changeMenuState } from './modules/helpers.js';


//#region setup

const socket = io();
const SPRITE_FILE_NAMES = ['Check', 'EnemyBank', 'EnemyDefense', 'EnemyHeart',
													'EnemyOffense', 'EnemyStructure', 'PlayerBank', 'PlayerDefense',
													'PlayerHeart', 'PlayerOffense', 'PlayerStructure', 'Player', 'Point',
													'Rand', 'Selected'],
			SPRITES_DIR = '/sprites/',
			SPRITES = loadSprites(SPRITE_FILE_NAMES, SPRITES_DIR);

let canvas = document.getElementById('canvas'),
    ctx = canvas.getContext('2d');
let gameObj = null, gridWidth = null, team = 0, menuState = 0;

function animationLoop() {
	if (!gameObj) return;
	gameObj.draw();
	requestAnimationFrame(animationLoop);
};

// Resize the canvas to dynamically fill browser window, return if device is now mobile
let isMobile = fitCanvas(canvas, ctx);
window.addEventListener('resize', () => isMobile = fitCanvas(canvas, ctx), false);

//#endregion setup
/////////////////////////////////////////////////////////////////////////////////////////////////////
//#region socket.io

socket.on('game found', (game, _team) => {
	console.log('Found game');
	socket.emit('game found echo');

	team = _team;
	gridWidth = Math.sqrt(game.grid.length);
	gameObj = new Game(canvas, SPRITES, game.grid, gridWidth, team, socket);
	animationLoop();
	menuState = changeMenuState('ready-menu');
});

socket.on('player left', reason => {
	console.error("Player left: ", reason);
	socket.emit('leave', 'Leaving room');
	
	// Go back to main menu
	menuState = changeMenuState('main-menu');
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	gameObj?.setGrid(null);
});

socket.on('ready accepted', (_grid, heartIndex) => {
	gameObj.confirmHeart(heartIndex);
	if (menuState === 'playing-menu') return;
	gameObj.setGrid(_grid);
	menuState = changeMenuState('waiting-menu');
});

socket.on('start game', _grid => {
	socket.emit('start game echo');
	console.log('Game starting!');
	gameObj.setGrid(_grid);
	menuState = changeMenuState('playing-menu');
});

socket.on('grid', _grid => gameObj?.setGrid(_grid));

socket.on('error', desc => {
	console.error(desc);
	//ctx.clearRect(0, 0, canvas.width, canvas.height);
	//gridObj?.setGrid(null);
});


//#endregion socket.io
/////////////////////////////////////////////////////////////////////////////////////////////////////
//#region controls

canvas.addEventListener('mousedown', (event) => event.button === 0 ? gameObj?.select(event.clientX, event.clientY, 2): null);
canvas.addEventListener('mousemove', (event) => gameObj?.select(event.clientX, event.clientY, 1));
canvas.addEventListener('touchstart', (event) => gameObj?.select(event.changedTouches[0].clientX, event.changedTouches[0].clientY, 2));
document.addEventListener('keydown', (event) => {
	let key = event.keyCode;
	
	if (!gameObj) return;
	if (key === 65) gameObj.tileMode = 'barrier';
	else if (key === 82) gameObj.tileMode = 'storage';
	else if (key === 83) gameObj.tileMode = 'offense';
	else if (key === 84) gameObj.tileMode = 'break';
});

//#endregion controls
/////////////////////////////////////////////////////////////////////////////////////////////////////
//#region html tags


document.getElementById('nickname-input').onkeypress = (e => {
	if (e.code === 'Enter') document.getElementById('play-btn').click();
});

document.getElementById('play-btn').onclick = () => {
	let nickname = document.getElementById('nickname-input').value;
	if (!nickname || nickname.length <= 0) nickname = "anonymous";
  socket.emit('new user', nickname);
	menuState = changeMenuState('main-menu');
}

document.getElementById('find-game-btn').onclick = () => {
	socket.emit('find game');
	menuState = changeMenuState('loading-menu');
}

document.getElementById('ready-btn').onclick = () => {
	socket.emit('ready', gameObj.team === 1 ? gameObj.grid.length - 1 - gameObj.heartIndex : gameObj.heartIndex);
}

//#endregion html tags
