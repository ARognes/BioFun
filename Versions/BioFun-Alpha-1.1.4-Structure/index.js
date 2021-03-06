const express = require('express');
const app = express();
const path = require('path');
const http = require('http').createServer(app);
const io = require('socket.io')(http);

//Keep At 20 for 0s in array
var games = [];
var levelPop = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
var record = 3000;
var lastTime = Date.now (),
    timeSinceLastFrame = 0;

io.sockets.on ('connection', function (socket) {
	//CLIENT ENTERED NICKNAME
	socket.on ('new user', function (data) {
		if (data) socket.nickname = data;
	});
	//CLIENT WANTS ONLINE
	socket.on ('findRoom', function (name, level) {
		var id;
		var team;
		var filled;
		if (games.length > 0) {	//FIND ROOM
			for (i=0; i<games.length; i++) {
				if (games [i].stage < 2 && games [i].level == level) {
					id = games [i].id;
					team = games [i].stage;
					games [i].stage ++;
					if (team == 0) games [i].p1Name = name;
					else games [i].p2Name = name;
					if (games [i].stage >= 2) filled = i;
					levelPop [level]++;
				}
			}
		}
		if (!id) {	//CREATE ROOM
			id = Math.random ();
			team = 0;
			//GENERATE TERRAIN
			var terrain = [];
			for (ter=0; ter<400; ter++) {
				if (Math.random () > 0.8) {
					if (Math.random () > 0.9) terrain.push (22);
					else if (Math.random () > 0.7) terrain.push (21);
					else terrain.push (20);
				}
				else {
					if (ter < 100) terrain.push (1);
					else if (ter >= 300) terrain.push (-1);
					else terrain.push (0);
				}
			}
			games.push ({'id': id, 'level': level, 'recycle': 0, 'stage': 1, 'p1Face': 0, 'p2Face': 0, 'p1Name': name, 'p2Name': '', 'p1': 0, 'p2': 0, 'p1Income': 1, 'p2Income': 1, 'p1Rage': 0, 'p2Rage': 0, 'tile': terrain});
			levelPop [level]++;
		}
		socket.join (id);
		socket.emit ('joinRoom', id, team);
		if (filled || filled == 0) io.sockets.in (id).emit ('roomReady', games [filled].tile, games [filled].p1Name, games [filled].p2Name);
	});
	//CLIENT BACKED OUT
	socket.on ('back', function (room) {
		var roomId;
		for (f=0; f<games.length; f++) {if (games [f].id == room) roomId = f;}
		io.sockets.in (games [roomId].id).emit ('gameOver', 0);
		levelPop [games [roomId].level] -= 2;
		games.splice (roomId, 1);
		console.log ('Backed Out');
	});
	//CLIENT READY TO BEGIN
	socket.on ('ready', function (room, team, startTile) {
		var roomId2;
		for (f=0; f<games.length; f++) {if (games [f].id == room) roomId2 = f;}
		if (games [roomId2].stage >= 2) {
			games [roomId2].stage++;
			if (team == 0) games [roomId2].tile [startTile] = -10;
			else if (team == 1) games [roomId2].tile [startTile] = 10;
			//GAME STARTING
			if (games [roomId2].stage >= 4) {
				games [roomId2].stage = 4;
				for (lu=0; lu<games [roomId2].tile.length; lu++) {if (games [roomId2].tile [lu] == 1 || games [roomId2].tile [lu] == -1) games [roomId2].tile [lu] = 0;}
				games [roomId2].p1 = 16;
				games [roomId2].p2 = 16;
				io.sockets.in (room).emit ('start');
				io.sockets.in (room).emit ('tiles', games [roomId2].tile);
				io.sockets.in (room).emit ('points', games [roomId2].p1, games [roomId2].p2);
			}
			else {
				socket.emit ('readied');
				socket.emit ('tiles', games [roomId2].tile);
			}
		}
	});
	//CLIENT SELECTED A TILE
	socket.on ('select', function (tileNum, room, team, upgrade, attacker) {
		if (room) {
			var roomId;
			for (q=0; q<games.length; q++) {if (games [q].id == room) roomId = q;}
			if (games [roomId].stage == 4) {
				var terrainPoint = false;
				if (team == 0) {
					if (games [roomId].tile [tileNum] == 0 && games [roomId].p1 >= 1 && upgrade != 2) {		//CREATE 3
						games [roomId].tile [tileNum] = -3;
						games [roomId].p1--;
					}
					else if (games [roomId].tile [tileNum] == 0 && games [roomId].p1 >= 3 && upgrade == 2) {		//CREATE 11
						games [roomId].tile [tileNum] = -11;
						games [roomId].p1 -= 3;
					}
					else if (games [roomId].tile [tileNum] == -3 && games [roomId].p1 >= 1) {	//TRANSITION 4, 7
						if (upgrade == 0) games [roomId].tile [tileNum]--;
						else if (upgrade == 1) games [roomId].tile [tileNum] = -7;
						games [roomId].p1--;
					}
					else if (games [roomId].tile [tileNum] >= 20) {		//COLLECT POINT
						games [roomId].p1 += games [roomId].tile [tileNum]-18;
						terrainPoint = true;
						games [roomId].tile [tileNum] = 0;
					}
					else {
						var price;
						//UPGRADE
						if (games [roomId].p1 >= 2) {if (games [roomId].tile [tileNum] == -4 || games [roomId].tile [tileNum] == -7 || games [roomId].tile [tileNum] == -11) price = 2;}
						if (games [roomId].p1 >= 3) {if (games [roomId].tile [tileNum] == -5 || games [roomId].tile [tileNum] == -8 || games [roomId].tile [tileNum] == -12) price = 3;}
						
						//FIND ATTACKER
						if (games [roomId].tile [attacker] == -7 || games [roomId].tile [attacker] == -8 || games [roomId].tile [attacker] == -9) {
							//KILL
							if (games [roomId].p1 >= 1 && games [roomId].tile [tileNum] == 3) {
								games [roomId].tile [tileNum] = 0;
								games [roomId].p1--;
								games [roomId].p1Rage++;
								calculateBranches (roomId, 1);
							}
							if (games [roomId].p1 >= 1) {if (games [roomId].tile [tileNum] == 8 || games [roomId].tile [tileNum] == 7) price = 1;}
							if (games [roomId].p1 >= 2 && games [roomId].tile [tileNum] == 4) price = 2;
							if (games [roomId].p1 >= 3) {if (games [roomId].tile [tileNum] == 5 || games [roomId].tile [tileNum] == 9) price = 3;}
							if (games [roomId].p1 >= 5) {if (games [roomId].tile [tileNum] == 6 || games [roomId].tile [tileNum] == 10) price = 5;}
							if (games [roomId].tile [tileNum] > 10 && games [roomId].tile [tileNum] < 20) {
								games [roomId].p1 += (games [roomId].tile [tileNum]-8);
								games [roomId].tile [tileNum] = 0;
								games [roomId].p1Rage++;
								calculateBranches (roomId, 0);
							}
						}
						if (price > 0) {
							games [roomId].tile [tileNum]--;
							games [roomId].p1 -= price;
							if (games [roomId].tile [tileNum] == 10 || games [roomId].tile [tileNum] == 6 || games [roomId].tile [tileNum] == 3)  {
								games [roomId].tile [tileNum] = 0;
								games [roomId].p1Rage++;
							}
							calculateBranches (roomId, 1);
						}
					}
					io.sockets.in (room).emit ('tiles', games [roomId].tile, team, games [roomId].p1, games [roomId].p1Rage, terrainPoint);
				}
				if (team == 1) {
					if (games [roomId].tile [tileNum] == 0 && games [roomId].p2 >= 1 && upgrade != 2) {		//CREATE 3
						games [roomId].tile [tileNum] = 3;
						games [roomId].p2--;
					}
					else if (games [roomId].tile [tileNum] == 0 && games [roomId].p2 >= 3 && upgrade == 2) {		//CREATE 11
						games [roomId].tile [tileNum] = 11;
						games [roomId].p2 -= 3;
					}
					else if (games [roomId].tile [tileNum] == 3 && games [roomId].p2 >= 1) {	//TRANSITION 4, 7
						if (upgrade == 0) games [roomId].tile [tileNum]++;
						else if (upgrade == 1) games [roomId].tile [tileNum] = 7;
						games [roomId].p2--;
					}
					else if (games [roomId].tile [tileNum] >= 20) {		//COLLECT POINT
						games [roomId].p2 += games [roomId].tile [tileNum]-18;
						terrainPoint = true;
						games [roomId].tile [tileNum] = 0;
					}
					else {	//UPGRADES
						var price2;
						//UPGRADE
						if (games [roomId].p2 >= 2) {if (games [roomId].tile [tileNum] == 4 || games [roomId].tile [tileNum] == 7 || games [roomId].tile [tileNum] == 11) price2 = 2;}
						if (games [roomId].p2 >= 3) {if (games [roomId].tile [tileNum] == 5 || games [roomId].tile [tileNum] == 8 || games [roomId].tile [tileNum] == 12) price2 = 3;}
						
						//FIND ATTACKER
						if (games [roomId].tile [attacker] == 7 || games [roomId].tile [attacker] == 8 || games [roomId].tile [attacker] == 9) {
							//KILL
							if (games [roomId].p2 >= 1 && games [roomId].tile [tileNum] == -3) {
								games [roomId].tile [tileNum] = 0;
								games [roomId].p2--;
								games [roomId].p2Rage++;
								calculateBranches (roomId, 0);
							}
							if (games [roomId].p2 >= 1) {if (games [roomId].tile [tileNum] == -8 || games [roomId].tile [tileNum] == -7) price2 = 1;}
							if (games [roomId].p2 >= 2 && games [roomId].tile [tileNum] == -4) price2 = 2;
							if (games [roomId].p2 >= 3) {if (games [roomId].tile [tileNum] == -5 || games [roomId].tile [tileNum] == -9) price2 = 3;}
							if (games [roomId].p2 >= 5) {if (games [roomId].tile [tileNum] == -6 || games [roomId].tile [tileNum] == -10) price2 = 5;}
							if (games [roomId].tile [tileNum] < -10) {
								games [roomId].p2 -= (games [roomId].tile [tileNum]+8);
								games [roomId].tile [tileNum] = 0;
								games [roomId].p2Rage++;
								calculateBranches (roomId, 1);
							}
						}
						if (price2 > 0) {
							games [roomId].tile [tileNum]++;
							games [roomId].p2 -= price2;
							if (games [roomId].tile [tileNum] == -10 || games [roomId].tile [tileNum] == -6 || games [roomId].tile [tileNum] == -3)  {
								games [roomId].tile [tileNum] = 0;
								games [roomId].p1Rage++;
							}
							calculateBranches (roomId, 0);
						}
					}
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
			games [roomId2].p2 = 0;
			socket.emit ('tiles', games [roomId2].tile, 0, games [roomId2].p1, 0);
			socket.emit ('points', games [roomId2].p1, games [roomId2].p2);
		}
		if (team == 1 && games [roomId2].p2Rage >= 16) {
			games [roomId2].p2Rage = 0;
			games [roomId2].p2+= 18;
			games [roomId2].p1 = 0;
			socket.emit ('tiles', games [roomId2].tile, 1, games [roomId2].p2, 0);
			socket.emit ('points', games [roomId2].p1, games [roomId2].p2);
		}
	});
	//CLIENT SENT EMOJI
	socket.on ('emoji', function (room, team, face) {
		var roomId3;
		for (r=0; r<games.length; r++) {if (games [r].id == room) roomId3 = r;}
		if (team == 0) {
			games [roomId3].p1Face = face;
			io.sockets.in (room).emit ('emoji', games [roomId3].p1Face, games [roomId3].p2Face);
		}
		else if (team == 1) {
			games [roomId3].p2Face = face;
			io.sockets.in (room).emit ('emoji', games [roomId3].p1Face, games [roomId3].p2Face);
		}
	});
});

//CALCULATE BRANCHES
function calculateBranches (roomId, oppTeam) {
	var teamTiles = [];
	var searchTiles = [];
	var oldTiles = [];
	var defence = 0;
	var offence = 0;
	var support = 0;
	var structure = 1;
	//FIND TEAM TILES
	for (search=0; search<games [roomId].tile.length; search++) {
		if (oppTeam == 0) {
			if (games [roomId].tile [search] < -2) teamTiles.push (search);
		}
		else if (oppTeam == 1) {
			if (games [roomId].tile [search] > 2 && games [roomId].tile [search] < 20) teamTiles.push (search);
		}
	}
	oldTiles = teamTiles;
	//SEARCH FOR BASES
	for (bases=0; bases<teamTiles.length; bases++) {
		if (oppTeam == 0) {
			if (games [roomId].tile [teamTiles [bases]] == -10) {
				searchTiles.push (teamTiles [bases]);
				support++;
				teamTiles.splice (teamTiles.indexOf (teamTiles [bases]), 1);
			}
		}
		else if (oppTeam == 1) {
			if (games [roomId].tile [teamTiles [bases]] == 10) {
				searchTiles.push (teamTiles [bases]);
				support++;
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
		if (oppTeam == 0 && games [roomId].tile [searchTiles [branch]] > -11) {
			if (teamTiles.indexOf (searchTiles [branch]+1) != -1 && games [roomId].tile [searchTiles [branch]+1] < -2 && lr != 2) {
				searchTiles.push (searchTiles [branch]+1);
				teamTiles.splice (teamTiles.indexOf (searchTiles [branch]+1), 1);
				branch = 0;
			}
			if (teamTiles.indexOf (searchTiles [branch]-1) != -1 && games [roomId].tile [searchTiles [branch]-1] < -2 && lr != 1) {
				searchTiles.push (searchTiles [branch]-1);
				teamTiles.splice (teamTiles.indexOf (searchTiles [branch]-1), 1);
				branch = 0;
			}
			if (teamTiles.indexOf (searchTiles [branch]+20) != -1 && games [roomId].tile [searchTiles [branch]+20] < -2) {
				searchTiles.push (searchTiles [branch]+20);
				teamTiles.splice (teamTiles.indexOf (searchTiles [branch]+20), 1);
				branch = 0;
			}
			if (teamTiles.indexOf (searchTiles [branch]-20) != -1 && games [roomId].tile [searchTiles [branch]-20] < -2) {
				searchTiles.push (searchTiles [branch]-20);
				teamTiles.splice (teamTiles.indexOf (searchTiles [branch]-20), 1);
				branch = 0;
			}
			if (games [roomId].tile [searchTiles [branch]] < -3 && games [roomId].tile [searchTiles [branch]] != -7) {
				if (teamTiles.indexOf (searchTiles [branch]+19) != -1 && games [roomId].tile [searchTiles [branch]+19] < -2 && lr != 1) {
					searchTiles.push (searchTiles [branch]+19);
					teamTiles.splice (teamTiles.indexOf (searchTiles [branch]+19), 1);
					branch = 0;
				}
				if (teamTiles.indexOf (searchTiles [branch]-19) != -1 && games [roomId].tile [searchTiles [branch]-19] < -2 && lr != 2) {
					searchTiles.push (searchTiles [branch]-19);
					teamTiles.splice (teamTiles.indexOf (searchTiles [branch]-19), 1);
					branch = 0;
				}
				if (teamTiles.indexOf (searchTiles [branch]+21) != -1 && games [roomId].tile [searchTiles [branch]+21] < -2 && lr != 2) {
					searchTiles.push (searchTiles [branch]+21);
					teamTiles.splice (teamTiles.indexOf (searchTiles [branch]+21), 1);
					branch = 0;
				}
				if (teamTiles.indexOf (searchTiles [branch]-21) != -1 && games [roomId].tile [searchTiles [branch]-21] < -2 && lr != 1) {
					searchTiles.push (searchTiles [branch]-21);
					teamTiles.splice (teamTiles.indexOf (searchTiles [branch]-21), 1);
					branch = 0;
				}
			}
		}
		else if (oppTeam == 1 && games [roomId].tile [searchTiles [branch]] < 11) {
			if (teamTiles.indexOf (searchTiles [branch]+1) != -1 && games [roomId].tile [searchTiles [branch]+1] > 2 && games [roomId].tile [searchTiles [branch]+1] < 20 && lr != 2) {
				searchTiles.push (searchTiles [branch]+1);
				teamTiles.splice (teamTiles.indexOf (searchTiles [branch]+1), 1);
				branch = 0;
			}
			if (teamTiles.indexOf (searchTiles [branch]-1) != -1 && games [roomId].tile [searchTiles [branch]-1] > 2 && games [roomId].tile [searchTiles [branch]-1] < 20 && lr != 1) {
				searchTiles.push (searchTiles [branch]-1);
				teamTiles.splice (teamTiles.indexOf (searchTiles [branch]-1), 1);
				branch = 0;
			}
			if (teamTiles.indexOf (searchTiles [branch]+20) != -1 && games [roomId].tile [searchTiles [branch]+20] > 2 && games [roomId].tile [searchTiles [branch]+20] < 20) {
				searchTiles.push (searchTiles [branch]+20);
				teamTiles.splice (teamTiles.indexOf (searchTiles [branch]+20), 1);
				branch = 0;
			}
			if (teamTiles.indexOf (searchTiles [branch]-20) != -1 && games [roomId].tile [searchTiles [branch]-20] > 2 && games [roomId].tile [searchTiles [branch]-20] < 20) {
				searchTiles.push (searchTiles [branch]-20);
				teamTiles.splice (teamTiles.indexOf (searchTiles [branch]-20), 1);
				branch = 0;
			}
			if (games [roomId].tile [searchTiles [branch]] > 3 && games [roomId].tile [searchTiles [branch]] != 7) {
				if (teamTiles.indexOf (searchTiles [branch]+19) != -1 && games [roomId].tile [searchTiles [branch]+19] > 2 && games [roomId].tile [searchTiles [branch]+19] < 20 && lr != 1) {
					searchTiles.push (searchTiles [branch]+19);
					teamTiles.splice (teamTiles.indexOf (searchTiles [branch]+19), 1);
					branch = 0;
				}
				if (teamTiles.indexOf (searchTiles [branch]-19) != -1 && games [roomId].tile [searchTiles [branch]-19] > 2 && games [roomId].tile [searchTiles [branch]-19] < 20 && lr != 2) {
					searchTiles.push (searchTiles [branch]-19);
					teamTiles.splice (teamTiles.indexOf (searchTiles [branch]-19), 1);
					branch = 0;
				}
				if (teamTiles.indexOf (searchTiles [branch]+21) != -1 && games [roomId].tile [searchTiles [branch]+21] > 2 && games [roomId].tile [searchTiles [branch]+21] < 20 && lr != 2) {
					searchTiles.push (searchTiles [branch]+21);
					teamTiles.splice (teamTiles.indexOf (searchTiles [branch]+21), 1);
					branch = 0;
				}
				if (teamTiles.indexOf (searchTiles [branch]-21) != -1 && games [roomId].tile [searchTiles [branch]-21] > 2 && games [roomId].tile [searchTiles [branch]-21] < 20 && lr != 1) {
					searchTiles.push (searchTiles [branch]-21);
					teamTiles.splice (teamTiles.indexOf (searchTiles [branch]-21), 1);
					branch = 0;
				}
			}
		}
	}
	for (d=0; d<oldTiles.length; d++) {
		//BASE STRUCTURE DATA COLLECTION
		var searchTile = Math.abs (games [roomId].tile [oldTiles [d]]);
		if (teamTiles.indexOf (oldTiles [d]) != -1) {
			if (searchTile == 3) structure++;
			if (searchTile > 3 && searchTile < 7) defence += searchTile-3;
			if (searchTile > 6 && searchTile < 10) offence += searchTile-6;
			if (searchTile > 10 && searchTile < 13) support += searchTile-10;
		}
	}
	//CALCULATE AMOUNT OF TRASH
	console.log (defence+' '+offence+' '+support+' '+structure);
	if (oppTeam == 0) {
		//games [roomId].p1Income -= teamTiles.length; 	SIZE
		games [roomId].p1Income = support;
		if (teamTiles.length > 1) {
			games [roomId].p2 += defence+offence+(support-1)*2+structure-1;
			games [roomId].p2 = Math.round (games [roomId].p2-0.5);
			games [roomId].p2Rage += teamTiles.length;
		}
		if (games [roomId].p1Income <= 0) {
			games [roomId].stage = 6;
			io.sockets.in (games [roomId].id).emit ('gameOver', games [roomId].stage);
		}
	}
	else if (oppTeam == 1) {
		//games [roomId].p2Income -= teamTiles.length;	SIZE
		games [roomId].p2Income = support;
		if (teamTiles.length > 1) {
			games [roomId].p1 += defence+offence+(support-1)*2+structure-1;
			games [roomId].p1 = Math.round (games [roomId].p1-0.5);
			games [roomId].p1Rage += teamTiles.length;
		}
		if (games [roomId].p2Income <= 0) {
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
	record -= timeSinceLastFrame;
	for (w=0; w<games.length; w++) {
		//RECORD
		if (record <= 0 && games [w].stage == 4) io.sockets.in (games [w].id).emit ('record');
		//ADD POINTS
		if (games [w].stage == 4) {
			var pBef = [Math.round (games [w].p1-0.5), Math.round (games [w].p2-0.5)];
			games [w].p1 += timeSinceLastFrame/2000 + games [w].p1Income/4000;
			games [w].p2 += timeSinceLastFrame/2000 + games [w].p2Income/4000;
			if (pBef [0] < Math.round (games [w].p1-0.5)) games [w].p1 = Math.round (games [w].p1-0.5);
			if (pBef [1] < Math.round (games [w].p2-0.5)) games [w].p2 = Math.round (games [w].p2-0.5);
			if (pBef [0] < Math.round (games [w].p1-0.5) || pBef [1] < Math.round (games [w].p2-0.5)) io.sockets.in (games [w].id).emit ('points', games [w].p1, games [w].p2);
		}
		//DESTROY ROOM AFTER X MINUTES OF INACTIVITY
		if (games [w].stage >= 3) games [w].recycle += timeSinceLastFrame;
		if (games [w].stage == 5) games.splice (w, 1);
		else if (games [w].recycle >= 60000 && games [w].stage > 1) {
			io.sockets.in (games [w].id).emit ('gameOver', 0);
			levelPop [games [w].level] -= 2;
			games.splice (w, 1);
			console.log ('Game Destroyed');
			break;
		}
		else if (games [w].recycle >= 5000 && games [w].stage == 1) {
			io.sockets.in (games [w].id).emit ('gameOver', 1);
			levelPop [games [w].level] -= 2;
			games.splice (w, 1);
			console.log ('Researching');
			break;
		}
	}
	if (record <= 0) record = 3000;
}

setInterval (update, 1);
http.listen ('3000', function () {
	console.log('listening on "3000"');
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));