const MIN_SCALE = 0.35;

function onwheel(ev, board) {
  //let map = ev.target;if (ev.target.id!='imgMap')return;
  //console.log(map);
  //let board = ev.path[1];

  let delta = ev.wheelDelta;
  let z = delta < 0 ? 0.5 : 2;
  let dir = Math.sign(delta);

  let currentMouseX = ev.offsetX;
  let currentMouseY = ev.offsetY;

  let transOld = getTransformInfo(board);
  let getLeft = transOld.translateX;
  let getTop = transOld.translateY;
  let scale = transOld.scale;
  //console.log(scale, dir);
  if (scale <= MIN_SCALE + 0.1 && dir < 0) return;

  let dx = (currentMouseX - getLeft) * (z - 1);
  let dy = (currentMouseY - getTop) * (z - 1);

  let scaleNew = scale * z;
  let txNew = getLeft - dx;
  let tyNew = getTop - dy;
  const MIN_TX = -(3400 * scaleNew - 3400 * MIN_SCALE);
  const MIN_TY = -(2200 * scaleNew - 2200 * MIN_SCALE);
  txNew = Math.min(txNew, 0);
  txNew = Math.max(txNew, MIN_TX);
  tyNew = Math.min(tyNew, 0);
  tyNew = Math.max(tyNew, MIN_TY);

  let transNew = `translate(${txNew},${tyNew}) scale(${scaleNew})`;
  board.setAttribute("transform", transNew);

  //testing
  transNew = getTransformInfo(board);
  //console.log(transOld, transNew);
  ev.preventDefault();
}
function reset(ev, board) {
  let map = ev.target;
  let transNew = `translate(0,0) scale(${MIN_SCALE})`;
  board.setAttribute("transform", transNew);
}
var txStart;
var tyStart;
var xStart;
var yStart;
var panning = false;
var couldBePanning = false;
var totalMaxDelta;
function onmousedown(ev) {
  let map = ev.target;
  let board = ev.path[1];
  let x = ev.screenX; //offsetX;
  let y = ev.screenY; //offsetY;
  let transOld = getTransformInfo(board);
  //console.log(transOld);
  let scale = transOld.scale;
  if (scale <= MIN_SCALE + 0.1) return;
  //else //console.log(scale);
  xStart = x;
  yStart = y;
  txStart = transOld.translateX;
  tyStart = transOld.translateY;
  totalMaxDelta = 0;
  couldBePanning = true;
}

function onmousemove(ev, board) {
  //console.log(ev.target)
  let id = ev.target.id;
  if (id != 'imgMap' && id !='mapG') {
    couldBePanning=false;
    panning=false;
    return;
  }
  //console.log(ev);
  if (couldBePanning) {
    let x = Math.abs(ev.screenX-xStart); //offsetX;
    let y = Math.abs(ev.screenY-yStart); //offsetY;
    totalMaxDelta += Math.max(x,y);
    if (totalMaxDelta > 10) {
      panning = true;
      couldBePanning = false;
      board.setPointerCapture(true);
      ev.preventDefault();
    }
  } else if (panning) {
    //let map = ev.target;
    //let board = ev.path[1];
    //var offset=$(board.id).offset();
    let x = ev.screenX; //offsetX;
    let y = ev.screenY; //offsetY;
    let transOld = getTransformInfo(board);
    let tx = transOld.translateX;
    let ty = transOld.translateY;
    let scale = transOld.scale;

    let txNew = txStart + x - xStart; //tx + ev.movementX;
    let tyNew = tyStart + y - yStart; //ty + ev.movementY;
    const MIN_TX = -(3400 * scale - 3400 * MIN_SCALE);
    const MIN_TY = -(2200 * scale - 2200 * MIN_SCALE);
    txNew = Math.min(txNew, 0);
    txNew = Math.max(txNew, MIN_TX);
    tyNew = Math.min(tyNew, 0);
    tyNew = Math.max(tyNew, MIN_TY);
    let transNew = `translate(${txNew},${tyNew}) scale(${scale})`;
    board.setAttribute("transform", transNew);
    //console.log(ev);
  }
}
function onmouseup(ev, board) {
  if (panning) {
    let map = ev.target;
    //let board = ev.path[1];
    let x = ev.screenX; //offsetX;
    let y = ev.screenY; //offsetY;
    let transOld = getTransformInfo(board);
    let tx = transOld.translateX;
    let ty = transOld.translateY;
    let scale = transOld.scale;

    let txNew = txStart + x - xStart;
    let tyNew = tyStart + y - yStart;
    const MIN_TX = -(3400 * scale - 3400 * MIN_SCALE);
    const MIN_TY = -(2200 * scale - 2200 * MIN_SCALE);
    txNew = Math.min(txNew, 0);
    txNew = Math.max(txNew, MIN_TX);
    tyNew = Math.min(tyNew, 0);
    tyNew = Math.max(tyNew, MIN_TY);
    let transNew = `translate(${txNew},${tyNew}) scale(${scale})`;
    board.setAttribute("transform", transNew);
    //console.log(transOld, transNew);
    board.releasePointerCapture(true);
    panning = false;
  }else couldBePanning = false;
}
