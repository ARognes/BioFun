var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');

//Keep At 20 for 0s in array
var games = [];
var lastTime = Date.now (),
    timeSinceLastFrame = 0;

io.sockets.on ('connection', function (socket) {
	console.log ('player connected');
	
	//CLIENT ENTERED NICKNAME
	socket.on ('new user', function (data) {
		if (data) socket.nickname = data;
		console.log ('nickname: ' + socket.nickname);
	});
	
	//CLIENT READY TO BEGIN
	socket.on ('ready', function (room, team, startTile) {
		var roomId2;
		for (f=0; f<games.length; f++) {if (games [f].id == room) roomId2 = f;}
		if (games [roomId2].stage >= 2) {
			games [roomId2].stage++;
			if (team == 0) games [roomId2].tile [startTile] = -5;
			else if (team == 1) games [roomId2].tile [startTile] = 5;
			//GAME STARTING
			if (games [roomId2].stage >= 4) {
				games [roomId2].stage = 4;
				for (lu=0; lu<games [roomId2].tile.length; lu++) {if (games [roomId2].tile [lu] == 1 || games [roomId2].tile [lu] == -1) games [roomId2].tile [lu] = 0;}
				games [roomId2].p1 = 16;
				games [roomId2].p2 = 16;
				io.sockets.in (room).emit ('start');
				io.sockets.in (room).emit ('tiles', games [roomId2].tile);
				io.sockets.in (room).emit ('points', games [roomId2].p1, games [roomId2].p2);
				console.log (games [roomId2].id + ': ' + socket.nickname + ' is Ready, Game Starting');
			}
			else {
				console.log (games [roomId2].id + ': ' + socket.nickname + ' is Ready');
				socket.emit ('readied');
				socket.emit ('tiles', games [roomId2].tile);
			}
		}
	});
	
	//CLIENT WANTS ONLINE
	socket.on ('findRoom', function (name) {
		var id;
		var team;
		var filled;
		if (games.length > 0) {
			for (i=0; i<games.length; i++) {
				if (games [i].stage < 2) {
					id = games [i].id;
					team = games [i].stage;
					games [i].stage ++;
					if (team == 0) games [i].p1Name = name;
					else games [i].p2Name = name;
					if (games [i].stage >= 2) {
						filled = i;
						console.log ('Game Found: ' + id);
					}
					else console.log ('Game Created GLITCH: ' + id);
				}
			}
		}
		if (!id) {
			id = Math.random ();
			team = 0;
			//GENERATE TERRAIN
			var terrain = [];
			for (ter=0; ter<400; ter++) {
				if (Math.random () > 0.8) {
					if (Math.random () > 0.9) terrain.push (12);
					else if (Math.random () > 0.7) terrain.push (11);
					else terrain.push (10);
				}
				else {
					if (ter < 100) terrain.push (1);
					else if (ter >= 300) terrain.push (-1);
					else terrain.push (0);
				}
			}
			games.push ({'id': id, 'recycle': 0, 'stage': 1, 'p1Name': name, 'p2Name': '', 'p1': 0, 'p2': 0, 'p1Size': 1, 'p2Size': 1, 'p1Rage': 0, 'p2Rage': 0, 'tile': terrain});
			console.log ('Game Created: ' + id);
		}
		socket.join (id);
		socket.emit ('joinRoom', id, team);
		if (filled || filled == 0) io.sockets.in (id).emit ('roomReady', games [filled].tile, games [filled].p1Name, games [filled].p2Name);
	});
	
	//CLIENT SELECTED A TILE
	socket.on ('select', function (tileNum, room, team) {
		if (room) {
			var roomId;
			for (q=0; q<games.length; q++) {if (games [q].id == room) roomId = q;}
			if (games [roomId].stage == 4) {
				var terrainPoint = false;
				if (team == 0) {
					if (games [roomId].tile [tileNum] == 0 && games [roomId].p1 >= 3) {
						games [roomId].tile [tileNum] = -2;
						games [roomId].p1Size++;
						games [roomId].p1-= 3;
					}
					else if (games [roomId].tile [tileNum] >= 10) {
						games [roomId].p1 += games [roomId].tile [tileNum]-8;
						//games [roomId].p1 = Math.round (games [roomId].p1-0.5);
						terrainPoint = true;
						games [roomId].tile [tileNum] = 0;
					}
					else if (games [roomId].tile [tileNum] == 2 && games [roomId].p1 >= 1) {
						games [roomId].tile [tileNum] = 0;
						games [roomId].p2Size--;
						games [roomId].p1--;
						games [roomId].p1Rage++;
					}
					else if (games [roomId].tile [tileNum] > -4) {
						var price;
						if (games [roomId].p1 >= 1 && games [roomId].tile [tileNum] == -2) price = 1;
						else if (games [roomId].p1 >= 2 && Math.abs (games [roomId].tile [tileNum]) == 3) price = 2;
						else if (games [roomId].p1 >= 3 && games [roomId].tile [tileNum] == 4) price = 3;
						else if (games [roomId].p1 >= 4 && games [roomId].tile [tileNum] == 5) price = 4;
						if (price > 0) {
							games [roomId].tile [tileNum]--;
							games [roomId].p1 -= price;
						}
					}
					else if (games [roomId].tile [tileNum] == -4 && games [roomId].p1 >= 1) {
						//BASE MOVE
						var move;
						if (games [roomId].tile [tileNum+1] == -5) move = tileNum+1;
						if (games [roomId].tile [tileNum-1] == -5) move = tileNum-1;
						if (games [roomId].tile [tileNum+20] == -5) move = tileNum+20;
						if (games [roomId].tile [tileNum-20] == -5) move = tileNum-20;
						if (games [roomId].tile [tileNum+19] == -5) move = tileNum+19;
						if (games [roomId].tile [tileNum-19] == -5) move = tileNum-19;
						if (games [roomId].tile [tileNum+21] == -5) move = tileNum+21;
						if (games [roomId].tile [tileNum-21] == -5) move = tileNum-21;
						if (move) {
							games [roomId].tile [tileNum]--;
							games [roomId].p1--;
							games [roomId].tile [move] = -4;
						}
					}
					//CALCULATE BRANCHES
					calculateBranches (roomId, 1);
					io.sockets.in (room).emit ('tiles', games [roomId].tile, team, games [roomId].p1, games [roomId].p1Rage, terrainPoint);
				}
				if (team == 1) {
					if (games [roomId].tile [tileNum] == 0 && games [roomId].p2 >= 3) {
						games [roomId].tile [tileNum] = 2;
						games [roomId].p2Size++;
						games [roomId].p2 -= 3;
					}
					else if (games [roomId].tile [tileNum] >= 10) {
						games [roomId].p2 += games [roomId].tile [tileNum]-8;
						//games [roomId].p2 = Math.round (games [roomId].p2-0.5);
						terrainPoint = true;
						games [roomId].tile [tileNum] = 0;
					}
					else if (games [roomId].tile [tileNum] == -2 && games [roomId].p2 >= 1) {
						games [roomId].tile [tileNum] = 0;
						games [roomId].p1Size--;
						games [roomId].p2--;
						games [roomId].p2Rage++;
					}
					else if (games [roomId].tile [tileNum] < 4) {
						var price2;
						if (games [roomId].p2 >= 1 && games [roomId].tile [tileNum] == 2) price2 = 1;
						else if (games [roomId].p2 >= 2 && Math.abs (games [roomId].tile [tileNum]) == 3) price2 = 2;
						else if (games [roomId].p2 >= 3 && games [roomId].tile [tileNum] == -4) price2 = 3;
						else if (games [roomId].p2 >= 4 && games [roomId].tile [tileNum] == -5) price2 = 4;
						if (price2 > 0) {
							games [roomId].tile [tileNum]++;
							games [roomId].p2 -= price2;
						}
					}
					else if (games [roomId].tile [tileNum] == 4 && games [roomId].p2 >= 1) {
						//BASE MOVE
						var move2;
						if (games [roomId].tile [tileNum+1] == 5) move2 = tileNum+1;
						if (games [roomId].tile [tileNum-1] == 5) move2 = tileNum-1;
						if (games [roomId].tile [tileNum+20] == 5) move2 = tileNum+20;
						if (games [roomId].tile [tileNum-20] == 5) move2 = tileNum-20;
						if (games [roomId].tile [tileNum+19] == 5) move2 = tileNum+19;
						if (games [roomId].tile [tileNum-19] == 5) move2 = tileNum-19;
						if (games [roomId].tile [tileNum+21] == 5) move2 = tileNum+21;
						if (games [roomId].tile [tileNum-21] == 5) move2 = tileNum-21;
						if (move2) {
							games [roomId].tile [tileNum]++;
							games [roomId].p2--;
							games [roomId].tile [move2] = 4;
						}
					}
					//CALCULATE BRANCHES
					calculateBranches (roomId, 0);
					io.sockets.in (room).emit ('tiles', games [roomId].tile, team, games [roomId].p2, games [roomId].p2Rage, terrainPoint);
				}
			}
			games [roomId].recycle = 0;
		}
	});
	
	//CLIENT ACTIVATED RAGE
	socket.on ('rage', function (room, team) {
		var roomId2;
		for (r=0; r<games.length; r++) {if (games [r].id == room) roomId2 = r;}
		if (team == 0 && games [roomId2].p1Rage >= 16) {
			games [roomId2].p1Rage = 0;
			games [roomId2].p1+= 18;
			if (games [roomId2].p2 >= 6) games [roomId2].p2 = games [roomId2].p2/2;
			else games [roomId2].p2 = 0;
			socket.emit ('tiles', games [roomId2].tile, 0, games [roomId2].p1, 0);
			socket.emit ('points', games [roomId2].p1, games [roomId2].p2);
		}
		if (team == 1 && games [roomId2].p2Rage >= 16) {
			games [roomId2].p2Rage = 0;
			games [roomId2].p2+= 18;
			if (games [roomId2].p1 >= 6) games [roomId2].p1 = games [roomId2].p1/2;
			else games [roomId2].p1 = 0;
			socket.emit ('tiles', games [roomId2].tile, 1, games [roomId2].p2, 0);
			socket.emit ('points', games [roomId2].p1, games [roomId2].p2);
		}
	});
});

//CALCULATE BRANCHES
function calculateBranches (roomId, oppTeam) {
	var teamTiles = [];
	var searchTiles = [];

	//FIND TEAM TILES
	for (search=0; search<games [roomId].tile.length; search++) {
		if (oppTeam == 0) {
			if (games [roomId].tile [search] < -1) teamTiles.push (search);
		}
		else if (oppTeam == 1) {
			if (games [roomId].tile [search] > 1 && games [roomId].tile [search] < 10) teamTiles.push (search);
		}
	}
	
	//SEARCH FOR BASES
	for (bases=0; bases<teamTiles.length; bases++) {
		if (oppTeam == 0) {
			if (games [roomId].tile [teamTiles [bases]] == -5) {
				searchTiles.push (teamTiles [bases]);
				teamTiles.splice (teamTiles.indexOf (teamTiles [bases]), 1);
			}
		}
		else if (oppTeam == 1) {
			if (games [roomId].tile [teamTiles [bases]] == 5) {
				searchTiles.push (teamTiles [bases]);
				teamTiles.splice (teamTiles.indexOf (teamTiles [bases]), 1);
			}
		}
	}
	
	//SEARCH FOR BRANCHES
	for (branch=0; branch<searchTiles.length; branch++) {
		//LEFT RIGHT
		var lr = 0;
		for (left=0; left<400; left += 20) {if (games [roomId].tile [searchTiles [branch]] == left) lr = 1;}
		for (right=-1; right<=399; right += 20) {if (games [roomId].tile [searchTiles [branch]] == right) lr = 2;}
		if (oppTeam == 0) {
			if (teamTiles.indexOf (searchTiles [branch]+1) != -1 && games [roomId].tile [searchTiles [branch]+1] < -1 && lr != 2) {
				searchTiles.push (searchTiles [branch]+1);
				teamTiles.splice (teamTiles.indexOf (searchTiles [branch]+1), 1);
				branch = 0;
			}
			if (teamTiles.indexOf (searchTiles [branch]-1) != -1 && games [roomId].tile [searchTiles [branch]-1] < -1 && lr != 1) {
				searchTiles.push (searchTiles [branch]-1);
				teamTiles.splice (teamTiles.indexOf (searchTiles [branch]-1), 1);
				branch = 0;
			}
			if (teamTiles.indexOf (searchTiles [branch]+20) != -1 && games [roomId].tile [searchTiles [branch]+20] < -1) {
				searchTiles.push (searchTiles [branch]+20);
				teamTiles.splice (teamTiles.indexOf (searchTiles [branch]+20), 1);
				branch = 0;
			}
			if (teamTiles.indexOf (searchTiles [branch]-20) != -1 && games [roomId].tile [searchTiles [branch]-20] < -1) {
				searchTiles.push (searchTiles [branch]-20);
				teamTiles.splice (teamTiles.indexOf (searchTiles [branch]-20), 1);
				branch = 0;
			}
			if (games [roomId].tile [searchTiles [branch]] < -2) {
				if (teamTiles.indexOf (searchTiles [branch]+19) != -1 && games [roomId].tile [searchTiles [branch]+19] < -1 && lr != 1) {
					searchTiles.push (searchTiles [branch]+19);
					teamTiles.splice (teamTiles.indexOf (searchTiles [branch]+19), 1);
					branch = 0;
				}
				if (teamTiles.indexOf (searchTiles [branch]-19) != -1 && games [roomId].tile [searchTiles [branch]-19] < -1 && lr != 2) {
					searchTiles.push (searchTiles [branch]-19);
					teamTiles.splice (teamTiles.indexOf (searchTiles [branch]-19), 1);
					branch = 0;
				}
				if (teamTiles.indexOf (searchTiles [branch]+21) != -1 && games [roomId].tile [searchTiles [branch]+21] < -1 && lr != 2) {
					searchTiles.push (searchTiles [branch]+21);
					teamTiles.splice (teamTiles.indexOf (searchTiles [branch]+21), 1);
					branch = 0;
				}
				if (teamTiles.indexOf (searchTiles [branch]-21) != -1 && games [roomId].tile [searchTiles [branch]-21] < -1 && lr != 1) {
					searchTiles.push (searchTiles [branch]-21);
					teamTiles.splice (teamTiles.indexOf (searchTiles [branch]-21), 1);
					branch = 0;
				}
			}
		}
		else if (oppTeam == 1) {
			if (teamTiles.indexOf (searchTiles [branch]+1) != -1 && games [roomId].tile [searchTiles [branch]+1] > 1 && games [roomId].tile [searchTiles [branch]+1] < 10 && lr != 2) {
				searchTiles.push (searchTiles [branch]+1);
				teamTiles.splice (teamTiles.indexOf (searchTiles [branch]+1), 1);
				branch = 0;
			}
			if (teamTiles.indexOf (searchTiles [branch]-1) != -1 && games [roomId].tile [searchTiles [branch]-1] > 1 && games [roomId].tile [searchTiles [branch]-1] < 10 && lr != 1) {
				searchTiles.push (searchTiles [branch]-1);
				teamTiles.splice (teamTiles.indexOf (searchTiles [branch]-1), 1);
				branch = 0;
			}
			if (teamTiles.indexOf (searchTiles [branch]+20) != -1 && games [roomId].tile [searchTiles [branch]+20] > 1 && games [roomId].tile [searchTiles [branch]+20] < 10) {
				searchTiles.push (searchTiles [branch]+20);
				teamTiles.splice (teamTiles.indexOf (searchTiles [branch]+20), 1);
				branch = 0;
			}
			if (teamTiles.indexOf (searchTiles [branch]-20) != -1 && games [roomId].tile [searchTiles [branch]-20] > 1 && games [roomId].tile [searchTiles [branch]-20] < 10) {
				searchTiles.push (searchTiles [branch]-20);
				teamTiles.splice (teamTiles.indexOf (searchTiles [branch]-20), 1);
				branch = 0;
			}
			if (games [roomId].tile [searchTiles [branch]] > 2) {
				if (teamTiles.indexOf (searchTiles [branch]+19) != -1 && games [roomId].tile [searchTiles [branch]+19] > 1 && games [roomId].tile [searchTiles [branch]+19] < 10 && lr != 1) {
					searchTiles.push (searchTiles [branch]+19);
					teamTiles.splice (teamTiles.indexOf (searchTiles [branch]+19), 1);
					branch = 0;
				}
				if (teamTiles.indexOf (searchTiles [branch]-19) != -1 && games [roomId].tile [searchTiles [branch]-19] > 1 && games [roomId].tile [searchTiles [branch]-19] < 10 && lr != 2) {
					searchTiles.push (searchTiles [branch]-19);
					teamTiles.splice (teamTiles.indexOf (searchTiles [branch]-19), 1);
					branch = 0;
				}
				if (teamTiles.indexOf (searchTiles [branch]+21) != -1 && games [roomId].tile [searchTiles [branch]+21] > 1 && games [roomId].tile [searchTiles [branch]+21] < 10 && lr != 2) {
					searchTiles.push (searchTiles [branch]+21);
					teamTiles.splice (teamTiles.indexOf (searchTiles [branch]+21), 1);
					branch = 0;
				}
				if (teamTiles.indexOf (searchTiles [branch]-21) != -1 && games [roomId].tile [searchTiles [branch]-21] > 1 && games [roomId].tile [searchTiles [branch]-21] < 10 && lr != 1) {
					searchTiles.push (searchTiles [branch]-21);
					teamTiles.splice (teamTiles.indexOf (searchTiles [branch]-21), 1);
					branch = 0;
				}
			}
		}
	}
	
	//CALCULATE AMOUNT OF TRASH
	if (oppTeam == 0) {
		games [roomId].p1Size -= teamTiles.length;
		if (teamTiles.length > 1) {
			games [roomId].p2 += (teamTiles.length-1)*2;
			games [roomId].p2 = Math.round (games [roomId].p2-0.5);
			games [roomId].p2Rage += teamTiles.length;
		}
		if (games [roomId].p1Size <= 0) {
			games [roomId].stage = 6;
			io.sockets.in (games [roomId].id).emit ('gameOver', games [roomId].stage);
		}
	}
	else if (oppTeam == 1) {
		games [roomId].p2Size -= teamTiles.length;
		if (teamTiles.length > 1) {
			games [roomId].p1 += (teamTiles.length-1)*2;
			games [roomId].p1 = Math.round (games [roomId].p1-0.5);
			games [roomId].p1Rage += teamTiles.length;
		}
		if (games [roomId].p2Size <= 0) {
			games [roomId].stage = 5;
			io.sockets.in (games [roomId].id).emit ('gameOver', games [roomId].stage);
		}
	}
	for (trash=0; trash<teamTiles.length; trash++) {games [roomId].tile [teamTiles [trash]] = 0;}
}

function update () {
	//TIME
	var now = Date.now ();
	timeSinceLastFrame = now - lastTime;
	lastTime = now;
	for (w=0; w<games.length; w++) {
		//ADD POINTS
		if (games [w].stage == 4) {
			var pBef = [Math.round (games [w].p1-0.5), Math.round (games [w].p2-0.5)];
			games [w].p1 += timeSinceLastFrame/2000 + games [w].p1Size/40000;
			games [w].p2 += timeSinceLastFrame/2000 + games [w].p2Size/40000;
			if (pBef [0] < Math.round (games [w].p1-0.5)) games [w].p1 = Math.round (games [w].p1-0.5);
			if (pBef [1] < Math.round (games [w].p2-0.5)) games [w].p2 = Math.round (games [w].p2-0.5);
			if (pBef [0] < Math.round (games [w].p1-0.5) || pBef [1] < Math.round (games [w].p2-0.5)) io.sockets.in (games [w].id).emit ('points', games [w].p1, games [w].p2);
		}
		//DESTROY ROOM AFTER 1 MINUTE OF INACTIVITY
		if (games [w].recycle < 60000 && games [w].stage >= 3) games [w].recycle += timeSinceLastFrame;
		if (games [w].recycle >= 60000) {
			io.sockets.in (games [w].id).emit ('gameOver', 0);
			//GENERATE TERRAIN
			var terrain2 = [];
			for (ter2=0; ter<400; ter2++) {
				if (Math.random () > 0.8) {
					if (Math.random () > 0.9) terrain2.push (12);
					else if (Math.random () > 0.7) terrain2.push (11);
					else terrain2.push (10);
				}
				else {
					if (ter2 < 100) terrain2.push (1);
					else if (ter2 >= 300) terrain2.push (-1);
					else terrain2.push (0);
				}
			}
			games.splice (w, 1);
			console.log ('Game Destroyed');
		}
	}
}

setInterval (update, 1);
http.listen ('3000', function () {
	console.log('listening on "8080"');
});
http.listen