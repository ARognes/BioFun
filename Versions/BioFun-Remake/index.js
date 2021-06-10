const express = require('express');
const app = express();
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = 3000;
const SimplexNoise = require('simplex-noise'),
    simplex = new SimplexNoise(Math.random);
const DEBUG = true;

server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));

// Server variables
const closedGames = [];	// { stack } games with 2 players
const openGames = [];	// { queue } games with only 1 player 
const GRID_WIDTH = 20;

io.on('connection', (socket) => {
  let state = 'unnamed';
  let team = 0;
  let gameIndex = -1;

  // Enter nickname
	socket.on ('new user', (data) => {
		if (state !== 'unnamed') return logError('Incorrect State: tried to set nickname');

		if (data) socket.nickname = data;
		else socket.nickname = 'anonymous';
		console.log(data, 'joined');
		state = 'idle';
	});

  // Find game
  socket.on('find game', () => {
		if (state != 'idle') return logError('Incorrect State: tried to find a game');
    state = 'queued';

		console.log(socket.nickname, 'looking for game...');

    // Create openGame and socket.io room
    if (openGames.length <= 0) {
      let roomId = Math.random();
      let newGame = {'id': roomId,
                    'player1': {'id': socket.id, 'nickname': socket.nickname, 'points': 20},
                    'player2': null,
                    'state' : 'unfilled'};
      openGames.unshift(newGame);
      socket.join(roomId);
      team = 1;
    }
    else {	// Find openGame to close
      let foundGame = openGames.pop();
      foundGame.player2 = {'id': socket.id, 'nickname': socket.nickname, 'points': 20};
      foundGame.state = 'full';

			// Generate grid
			let grid = [];
			grid.length = GRID_WIDTH * GRID_WIDTH;
			let now = Date.now();
			for(let i = 0; i < GRID_WIDTH; i++) {
				for(let j = 0; j < GRID_WIDTH; j++) {
					let tile = {};
					tile.team = 0;
					tile.level = Math.round(Math.max(0, simplex.noise2D(i + now, j + now)) * 3);
					tile.type = tile.level ? 'point' : null;
					grid[i + j * GRID_WIDTH] = tile;
				}
			}
			foundGame.grid = grid;

			// Enter openGame into closedGame
			let enteredGame = false;
			closedGames.forEach((game, i) => {
				if (game === 0) {
					closedGames[i] = foundGame;
					enteredGame = true;
					return;
				}
			});
      if (!enteredGame) closedGames.push(foundGame);

      socket.emit('game found', foundGame, 2);
      socket.to(foundGame.id).emit('game found', foundGame, 1);
      socket.join(foundGame.id);
      team = 2;
    }
  });

	// Update server level user variables: store gameIndex
  socket.on('game found echo', () => {
		if (state !== 'queued') return logError('Incorrect State: tried to echo game found');
    state = 'ready';

    closedGames.forEach((game, i) => {
      if (game && 
				((game.player1 && game.player1.id === socket.id) || 
				(game.player2 && game.player2.id === socket.id))) gameIndex = i;
    });
		console.log(socket.nickname, 'found game:', gameIndex);
  });

  socket.on('ready', (heartIndex) => {
		if (state !== 'ready') return logError('Incorrect State: tried to ready up');
		let game = closedGames[gameIndex];
		if (game['player' + team].ready) return;	// Player already ready, don't call again
		if (!heartIndex || heartIndex < 0 || heartIndex >= game.grid.length) return logError('Invalid heartIndex chosen: ' + heartIndex);
		if (game.grid[heartIndex].type !== null) return logError('HeartIndex not free: ' + game.grid[heartIndex].type);
		if ((team === 1 && heartIndex >= game.grid.length / 4) || (team === 2 && heartIndex < game.grid.length * 3 / 4)) return logError('HeartIndex on wrong team side: ' + heartIndex);
			


		// Place heart
		game.grid[heartIndex] = {'team': team, 'level': 1, 'type': 'heart'};
		game['player' + team].ready = true;
		socket.emit('ready accepted', game.grid, heartIndex);
		console.log(socket.nickname, 'is ready, game:', gameIndex);

    if (game.player1.ready && game.player2.ready) {

			// Begin game
			console.log('game', gameIndex, 'starting');
			io.in(game.id).emit('start game', game.grid);
			closedGames[gameIndex] = game;

			//socket.emit('start game', closedGames[gameIndex].grid);
    }
  });

	socket.on('start game echo', () => {
		if (state != 'ready') return logError('Incorrect State: tried to echo game found');
    state = 'playing';
	});

  socket.on('disconnecting', reason => {

    // Remove game from queue
    if (state === 'queued') {
      console.log(socket.nickname, 'disconnected from queue');
      openGames.forEach((game, i) => {
        if ((game.player1 && game.player1.id === socket.id) || (game.player2 && game.player2.id === socket.id)) {
          openGames.splice(i, 1);
          return;
        }
      });
    }
    else if (state === 'playing') { //  Disconnected from playing
      console.log(socket.nickname, 'disconnected from game');
			socket.to(closedGames[gameIndex].id).emit('player left', reason);
			closedGames[gameIndex] = closedGames[gameIndex].id;
    }
  });

	socket.on('leave', () => {
		if (state != 'playing') return logError('Incorrect State: tried to leave game');

		console.log(socket.nickname, 'left game');
		socket.leave(closedGames[gameIndex]);
		closedGames[gameIndex] = 0;
		gameIndex = -1;
		state = 'idle';
		team = 0;
	});

	socket.on('select tile', (tileIndex, selectMode) => {
		if (state !== 'playing' || !team) return logError('Incorrect State: tried to select tile');

		// Destructure game and selected tile properties
		let game = closedGames[gameIndex],
				points = game['player' + team].points,
				grid = game.grid,
				tile = grid[tileIndex];

		if (!tile) return logError('Index out of bounds: tried to select tile index: ' + tileIndex);

		// Don't allow tile.level++ in wrong selectMode
		if (tile.type !== null && selectMode !== 'break' && selectMode != tile.type) return;
		
		switch (selectMode) {
			case 'break':
				if (--tile.level === 0) tile.type = null;
				break;
			default:
				if (points >= tile.level && tile.level < 3) {
					points -= tile.level + 1;
					tile.level++;
					tile.type = selectMode;
					tile.team = team;
				}
				break;
		}
		closedGames[gameIndex].grid[tileIndex] = tile;
		closedGames[gameIndex]['player' + team].points = points;

		// Considering sending only changed tiles over socket.io
		io.in(game.id).emit('grid', closedGames[gameIndex].grid);	
	});

	function logError(errorString) {
		if (!DEBUG) return;
		socket.emit('error', 'Invalid server request');
		console.error(errorString, '--' + state, socket.id);
	}
});