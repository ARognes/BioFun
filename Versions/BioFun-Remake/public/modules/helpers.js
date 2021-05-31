'use-strict';

import scaleCanvas from './scale-canvas.js';

const BACKGROUND_COLOR = '#cfc',
			TILE_PADDING = 4;

export class Grid {

	constructor(canvas, sprites, grid, gridWidth, team, socket) {
		this.canvas = canvas;
		this.ctx = canvas.getContext('2d');
		this.sprites = sprites;
		this.team = team;
		this.gridWidth = gridWidth;
		this.setGrid(grid);
		this.socket = socket;
		this.selector = {state: 0, gx: 0, gy: 0};
		this.heartIndex = Infinity;
		console.log(this.team);
	}

	draw() {
		if (!this.grid) return;
		this.ctx.setTransform(1, 0, 0, 1, 0, 0);
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.ctx.fillStyle = BACKGROUND_COLOR;

		let tileSize;
		if (this.canvas.width > this.canvas.height) {
			this.ctx.translate((this.canvas.width - this.canvas.height) / 2, 0);
			tileSize = this.canvas.height / this.gridWidth;
			this.ctx.fillRect(0, 0, this.canvas.height, this.canvas.height);
		} else {
			this.ctx.translate(0, (this.canvas.height - this.canvas.width) / 2);
			tileSize = this.canvas.width / this.gridWidth;
			this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.width);
		}
		
		this.grid.forEach((tile, i) => {
			if (!tile.type) return;
			let tileAlias = {'point': this.sprites.Point,
				'bank': tile.team === this.team ? this.sprites.PlayerBank : this.sprites.EnemyBank,
				'structure': tile.team === this.team ? this.sprites.PlayerStructure : this.sprites.EnemyStructure,
				'offense': tile.team === this.team ? this.sprites.PlayerDefense : this.sprites.EnemyDefense,
				'heart': tile.team === this.team ? this.sprites.PlayerHeart : this.sprites.EnemyHeart};
	
			let innerOffset = 9 - tile.level * 3 + TILE_PADDING,
					outerOffset = tileSize - 18 + tile.level * 6 - TILE_PADDING * 2,
					imgx = (i % this.gridWidth) * tileSize + innerOffset,
					imgy = Math.floor(i / this.gridWidth) * tileSize + innerOffset;
			this.ctx.drawImage(tileAlias[tile.type], imgx, imgy, outerOffset, outerOffset);
		});

		if (this.selector.state) {
			this.ctx.drawImage(this.sprites['Selected'], this.selector.gx * tileSize, this.selector.gy * tileSize, tileSize, tileSize);
		}
	}

	select(mx, my, state) {
		let tileSize = Math.min(this.canvas.width, this.canvas.height) / this.gridWidth,
				orient = this.canvas.width > this.canvas.height,
				offset = (this.canvas.height - this.canvas.width) / 2,
				smx = (orient ? mx + offset : mx),
				smy = (orient ? my : my - offset),
				gx = Math.floor(smx / tileSize),
				gy = Math.floor(smy / tileSize),
				tileIndex = gx + gy * this.gridWidth;//(this.team - 1) ? gx + gy * this.gridWidth : this.grid.length - gx - gy * this.gridWidth - 1;

		// Selected off grid
		if (gx >= this.gridWidth || gx < 0 || gy >= this.gridWidth || gy < 0) {
			this.selector.state = 0;
			return;
		}
		if (state === 2 && this.heartIndex > -1 && this.grid[tileIndex].type === null && tileIndex >= this.grid.length * 3 / 4) {

			// Clear old heartIndex
			if (this.heartIndex < this.grid.length)	this.grid[this.heartIndex].type = null;
			this.grid[tileIndex].type = 'heart';
			this.grid[tileIndex].team = this.team;
			this.grid[tileIndex].level = 1;
			this.heartIndex = tileIndex;
		}
		if (state === 2) this.socket.emit('select tile', this.team === 1 ? this.grid.length - 1 - tileIndex : tileIndex);
		this.selector = {state: state, gx: gx, gy: gy};
	}
	
	setGrid(grid) {
		this.grid = this.team === 1 ? grid?.reverse() : grid;
	}

	confirmHeart(heartIndex) {
		if (this.heartIndex >= this.grid.length && this.heartIndex < 0)	return;
		let revHeartIndex = this.team === 1 ? heartIndex = this.grid.length - 1 - heartIndex : heartIndex;
		this.grid[this.heartIndex].type = null;
		this.heartIndex = -1;
		this.grid[revHeartIndex].type = 'heart';
		this.grid[revHeartIndex].team = this.team;
		this.grid[revHeartIndex].level = 1;
	}
}

export function loadSprites(SPRITE_FILE_NAMES, dir) {
	let sprites = {};
	SPRITE_FILE_NAMES.forEach(name => {
		let img = new Image();
		img.src = dir + name + '.png';
		img.onload = () => sprites[name] = img;
	});
	return sprites;
}

// Resize the canvas to dynamically fill browser window
export function fitCanvas(canvas, ctx) {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	canvas.style.width = window.innerWidth + "px";
	canvas.style.height = window.innerHeight + "px";
	scaleCanvas(canvas, ctx, canvas.width, canvas.height);
	
	// Device detection retrieved from: https://stackoverflow.com/questions/3514784/what-is-the-best-way-to-detect-a-mobile-device/3540295#3540295
	if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent)
	|| /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4))) {
		return true;
	}
	return false;
}

const	MENUS_COLLECTION = document.getElementsByClassName('menu'), 
			menus = {};
for (let menu in MENUS_COLLECTION) menus[MENUS_COLLECTION[menu].id] = MENUS_COLLECTION.item(menu);

export function changeMenuState(_menuState) {
	for (let menu in menus) menus[menu].style.display = 'none';
	menus[_menuState].style.display = 'block';
	return _menuState;
}
