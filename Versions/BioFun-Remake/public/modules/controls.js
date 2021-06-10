//'use-strict';

//nicknamebtn = document.getElementById('play-btn');
/*export function controls(canvas, IS_MOBILE) {
  canvas.addEventListener("mousedown", (event) => {
    if (event.button !== 0 || !gridObj) return;
    let { clientX: mx, clientY: my } = event,
      gx = Math.ceil((mx - window.innerWidth / 2 + 100) / gridWidth),
      gy = Math.ceil((my - window.innerHeight / 2 + 100) / gridWidth),
      tileIndex = gx + gy * gridWidth;
  
    if (tileIndex >= gridWidth * gridWidth || tileIndex < 0) return;
  
    socket.emit('select tile', tileIndex);
  }, false);
}*/
/*
canvas.addEventListener('mousedown', (event) => event.button === 0 ? gridObj?.select(event): null);
canvas.addEventListener('touchstart', (event) => gridObj?.select(event));
*/
/*
if (IS_MOBILE) {

	canvas.addEventListener('touchstart', (event) => {
			if (event.touches.length > 2 || !gridObj) return;    // Don't bother with 3 finger gestures
			let { clientX: mx, clientY: my } = event.changedTouches[0],
				gx = Math.ceil((mx - window.innerWidth / 2 + 100) / gridWidth),
				gy = Math.ceil((my - window.innerHeight / 2 + 100) / gridWidth),
				tileIndex = gx + gy * gridWidth;

		if (tileIndex >= gridWidth * gridWidth || tileIndex < 0) return;
			socket.emit('select tile', tileIndex);
	}, false);
	/*document.addEventListener('touchend',  touchEnd, false);
	document.addEventListener('touchcancel', touchEnd, false);
	function touchEnd(event) {

	}

canvas.addEventListener('touchmove', (event) => {

}, false);

} else {

	canvas.addEventListener("mousedown", (event) => {
		if (event.button !== 0 || !gridObj) return;
		let { clientX: mx, clientY: my } = event,
			gx = Math.ceil((mx - window.innerWidth / 2 + 100) / gridWidth),
			gy = Math.ceil((my - window.innerHeight / 2 + 100) / gridWidth),
			tileIndex = gx + gy * gridWidth;

		if (tileIndex >= gridWidth * gridWidth || tileIndex < 0) return;

		socket.emit('select tile', tileIndex);
	}, false);

	document.addEventListener("mouseup", (event) => {
	}, false);

	document.addEventListener("mousemove", (event) => {
	}, false);

	canvas.addEventListener("wheel", (event) => {
	}, false);

	document.addEventListener("keydown", (event) => {
			var key = event.code;

			// Undo and redo shortcut keys
			if (event.ctrlKey) {
					if (key === 90) undo();
					else if (key === 89) redo();
			}
	});

	canvas.addEventListener("keyup",(event) => {

	});
}*/