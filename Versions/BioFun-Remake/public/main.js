'use-strict';

import { Grid, loadSprites, fitCanvas, changeMenuState } from './modules/helpers.js';


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
let gridObj = null, gridWidth = null, team = 0, menuState = 0;

function animationLoop() {
	if (!gridObj) return;
	gridObj.draw();
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
	gridObj = new Grid(canvas, SPRITES, game.grid, gridWidth, team, socket);
	animationLoop();
	menuState = changeMenuState('ready-menu');
});

socket.on('player left', reason => {
	console.error("Player left: ", reason);
	socket.emit('leave', 'Leaving room');
	
	// Go back to main menu
	menuState = changeMenuState('main-menu');
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	gridObj?.setGrid(null);
});

socket.on('ready accepted', (_grid, heartIndex) => {
	gridObj.confirmHeart(heartIndex);
	if (menuState === 'playing-menu') return;
	gridObj.setGrid(_grid);
	menuState = changeMenuState('waiting-menu');
});

socket.on('start game', _grid => {
	socket.emit('start game echo');
	console.log('Game starting!');
	gridObj.setGrid(_grid);
	menuState = changeMenuState('playing-menu');
});

socket.on('error', desc => {
	console.error(desc);
	//ctx.clearRect(0, 0, canvas.width, canvas.height);
	//gridObj?.setGrid(null);
});

socket.on('grid', _grid => gridObj?.setGrid(_grid));

//#endregion socket.io
/////////////////////////////////////////////////////////////////////////////////////////////////////
//#region controls

canvas.addEventListener('mousedown', (event) => event.button === 0 ? gridObj?.select(event.clientX, event.clientY, 2): null);
canvas.addEventListener('mousemove', (event) => gridObj?.select(event.clientX, event.clientY, 1));
canvas.addEventListener('touchstart', (event) => gridObj?.select(event.changedTouches[0].clientX, event.changedTouches[0].clientY, 2));

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
	socket.emit('ready', gridObj.team === 1 ? gridObj.grid.length - 1 - gridObj.heartIndex : gridObj.heartIndex);
}

//#endregion html tags
