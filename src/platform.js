import * as Player from "./player";
import * as Tile from "./tile";
import { transform, identity, degToRad } from "./engine/math";
import { getCanvasSize } from "./game";

let gridWidth,
  parentTransform = identity(),
  state = 0,
  levelFinished = false,
  initPos = [0, 0];
export let platforms = [];

export let init = (gl) => {
  Tile.init(gl);
  Player.init(gl);
};

export let update = (delta) => {
  switch (state) {
    // Enter scene
    case 0:
      platforms.forEach((tile, i) => {
        Tile.setEnterPos(tile, i);
      });
      // Check if the last tile has been moved to position
      if (platforms[0].zpos === 0) {
        state = 1;
        Player.initPos(initPos[0], initPos[1]);
      }
      return 1;
    // Play scene
    case 1:
      Player.update(delta);
      // Check bounds
      if (
        Player.X < 0 ||
        Player.Y < 0 ||
        Player.X >= gridWidth ||
        Player.Y >= gridWidth
      ) {
        Player.fall();
        state = 2;
      } else {
        let tileInfo = Tile.checkTile(
          platforms[Player.X + gridWidth * Player.Y]
        );
        if (tileInfo === 2) {
          Player.fall();
          state = 2;
        }
        if (tileInfo === 1) {
          Player.fall();
          state = 2;
          levelFinished = true;
        }
      }
      return 1;
    // Wait for animation
    case 2:
      if (Player.update()) {
        Player.initPos(initPos[0], initPos[1]);
        state = 1;
        if (levelFinished) {
          return 0;
        }
      }
      return 1;
  }
};

export let draw = (gl) => {
  Tile.loadTileBuffer(gl, parentTransform);
  platforms.forEach((tile) => Tile.drawTile(gl, tile));

  Player.load(gl, parentTransform);
  Player.draw(gl);
};

export let loadLevel = (levelData) => {
  // to temporarily hide player until tiles show up
  Player.initPos(-10, -10);
  [gridWidth, tiles] = levelData.split(":");
  gridWidth = Number(gridWidth);
  state = 0;
  levelFinished = false;
  if (!levelData || !gridWidth || gridWidth < 0) {
    return 0;
  }

  {
    let [width, height] = getCanvasSize();
    parentTransform = transform(identity(), {
      y: width / 2,
      x: height / 2,
      rx: -degToRad(30),
      rz: -Math.PI / 4,
    });
  }
  // Fastest array initialization https://stackoverflow.com/q/1295584/7683374
  (parsedTiles = []).length = gridWidth * gridWidth;
  // First, create array of decoded tile chars
  for (let i = 0, curPos = 0; i < tiles.length; i++) {
    let val = tiles.charAt(i);

    if (Number(val)) {
      let count = Number(val);
      parsedTiles.fill(tiles.charAt(++i), curPos, curPos + count);
      curPos += count;
    } else {
      parsedTiles[curPos++] = val;
    }
  }
  // Next, fill platform wih position & detail metadata for each tile
  (platforms = []).length = 0;
  for (let y = 0; y < gridWidth; y++) {
    for (let x = 0; x < gridWidth; x++) {
      let type = parsedTiles[x + y * gridWidth];

      // TODO is this efficient? Only done once, so does it matter?
      if (type === "x") {
        initPos[0] = x;
        initPos[1] = y;
      }
      platforms.push(Tile.createTileData(x, y, type));
    }
  }
  return 1;
};
