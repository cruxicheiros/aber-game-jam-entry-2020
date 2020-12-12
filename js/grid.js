var ge = {}; // grid engine namespace

ge.EntityTypes = {
    PLAYER: 'player',
    WALL: 'wall',
    BOMB: 'bomb'
};

ge.Directions = {
    UP: 'up',
    DOWN: 'down',
    LEFT: 'left',
    RIGHT: 'right'
};

ge.Entity = class {
    constructor(type, direction=ge.Directions.DOWN) {
        this.type = type;
        this.direction = direction;
    }
};

ge.Wall = class extends ge.Entity {
    constructor(direction=ge.Directions.DOWN) {
        super(ge.EntityTypes.WALL, direction);
    }
};

ge.Player = class extends ge.Entity {
    constructor(id, position, direction=ge.Directions.DOWN) {
        super(ge.EntityTypes.PLAYER, direction);

        this.id = id;
        this.position = position;
        this.dead = false;
    }

    die() {
        this.dead = true;
    }
};

ge.Bomb = class extends ge.Entity {
    constructor(position, timer, callback, direction) {
        super(ge.EntityTypes.BOMB);
        
	this.direction = direction;
      	this.position = position;
        this.timer = timer;
        this._callback = callback;
        this._timeoutId = setTimeout(() => { this._callback(this.position, this.direction); }, timer);
    }
};

ge.Point = class {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    above() {
        return new ge.Point(this.x, this.y - 1);
    }

    below() {
        return new ge.Point(this.x, this.y + 1);
    }

    left() {
        return new ge.Point(this.x - 1, this.y);
    }

    right() {
        return new ge.Point(this.x + 1, this.y);
    }
};

ge.Tile = class {
    constructor(occupant=null) {
        this.occupant = occupant;
    }

    isEmpty() {
        return this.occupant === null;
    }

    fill(newOccupant) {
        if (this.isEmpty()) {
            this.occupant = newOccupant;
            return;
        }
      
        throw "Could not fill tile: The tile was already occupied by " + this.occupant;
    }

    clear() {
        this.occupant = null;
    }
};

ge.Grid = class {
    constructor(size) {
        this.size = size;
        this.contents = this._constructContents();
    }
  
    asText() {
        let str = "";
      	
      	for (let i = 0; i < this.size; i++) {
          	str = str + i.toString().padStart(2, '0');
          
            for (let j = 0; j < this.size; j++) {
                let entity = this.contents[i][j].occupant;
              	
              	if (entity == null) {
                    str = str + '.';
                } else {
                    switch (entity.type) {
                        case ge.EntityTypes.BOMB:
                            str = str + "B";
                            break;
                        case ge.EntityTypes.PLAYER:
                            str = str + "P";
                            break;
                        case ge.EntityTypes.WALL:
                            str = str + "W";
                        		break;
                        default:
                            str = str + "X";
                    }
                }
            }
          
            str = str + "\n";
        }
      
        return str;
    }

    getTileAtPos(point) {
        if (point.y < 0 || point.y >= this.size || point.x < 0 || point.x >= this.size) {
            throw 'There is no tile at (' + point.x + ', ' + point.y + ')!';
        } 

        return this.contents[point.y][point.x];
    }

    getTileAbovePos(point) {
        if (point.y == 0) {
            throw 'There is no tile above (' + point.x + ', ' + point.y + ')!';
        }

        if (point.y < 0) {
            throw 'Y is out of bounds! No negative y-values are allowed! (' + point.x + ', ' + point.y + ')';
        }

        return this.getTileAtPos(point.above());
    }
    
    getTileBelowPos(point) {
        if (point.y == this.size - 1) {
            throw 'There is no tile below (' + point.x + ', ' + point.y + ')!';
        }

        if (point.y >= this.size) {
            throw 'Y is out of bounds! (' + point.x + ', ' + point.y + ')';
        }

        return this.getTileAtPos(point.below());
    }

    getTileLeftOfPos(point) {
        if (point.x == 0) {
            throw 'There is no tile left of (' + point.x + ', ' + point.y + ')!';
        }

        if (point.x < 0) {
            throw 'X is out of bounds! No negative x-values are allowed! (' + point.x + ', ' + point.y + ')';
        }

        return this.getTileAtPos(point.left());
    }

    getTileRightOfPos(point) {
        if (point.x == this.size - 1) {
            throw 'There is no tile to the right of (' + point.x + ', ' + point.y + ')!';
        }

        if (point.x >= this.size) {
            throw 'X is out of bounds! (' + point.x + ', ' + point.y + ')';
        }

        return this.getTileAtPos(point.right());
    }

    isMotionPossible(startPoint, direction) {
        let possible = true;

        switch (direction) {
            case ge.Directions.UP:
                possible = this.getTileAbovePos(startPoint).isEmpty();
                break;
            case ge.Directions.DOWN:
                possible = this.getTileBelowPos(startPoint).isEmpty();
                break;
            case ge.Directions.LEFT:
                possible = this.getTileLeftOfPos(startPoint).isEmpty();
                break;
            case ge.Directions.RIGHT:
                possible = this.getTileRightOfPos(startPoint).isEmpty();
                break;
            default:
                throw direction + " is not a valid direction. Try Directions.UP, Directions.DOWN, Directions.LEFT, and Directions.RIGHT.";
        }

        return possible;
    }

    _constructContents() {
        let innerGrid = [];
        let sizeWithoutWalls = this.size - 2;

        // Add top wall
        innerGrid.push(this._makeHorizontalWall());

        // Add middle of grid
        for (let i = 0; i < sizeWithoutWalls; i++) {
            let row = [];

            // Left wall
            row.push(new ge.Tile(new ge.Wall()));

            for (let j = 0; j < sizeWithoutWalls; j++) {
                row.push(new ge.Tile());
            }

            // Right wall
            row.push(new ge.Tile(new ge.Wall()));

            innerGrid.push(row);
        }

        // Add bottom wall
        innerGrid.push(this._makeHorizontalWall());        

        return innerGrid;
    }

    _makeHorizontalWall() { 
        let horizontalWall = [];

        for (let i = 0; i < this.size; i++) {
            horizontalWall.push(new ge.Tile(new ge.Wall()));
        }

        return horizontalWall;
    }
};

ge.GameGridState = class {
    constructor(grid, players) {
        this.players = players;
        this._playersById = {};
        this.grid = grid;

        for (let i = 0; i < this.players.length; i++) {
            let player = this.players[i];

            this.grid.getTileAtPos(player.position).fill(player);
            this._playersById[player.id] = player;
        }
    }

    getPlayerById(playerId) {
        let player = this._playersById[playerId];

        if (player != null) {
            return player;
        }

        return null;
    }

    playerCanMove(playerId, direction) {
        let player = this.getPlayerById(playerId);
        
        if (player == null) {
            throw "Can't move player with id " + playerId + " because that player doesn't exist.";
        }

        return this.grid.isMotionPossible(player.position, direction);
    }

    movePlayer(playerId, point) {
        let player = this.getPlayerById(playerId);

        if (player == null) {
            throw "Can't move player with id " + playerId + " because that player doesn't exist.";
        }

        let oldPosition = player.position;
        let newPosition = point;

        let currentTile = this.grid.getTileAtPos(oldPosition);
        let nextTile = this.grid.getTileAtPos(newPosition);

        if (!nextTile.isEmpty()) {
            throw "Can't move player with id " + playerId + " to tile (" + newPosition.x + ", " + newPosition.y + ") because the tile at that position already has this in it: " + nextTile.occupant;
        }

        currentTile.clear();
        nextTile.fill(player);
        player.position = newPosition;
    }

    killPlayer(playerId) {
        let player = this.getPlayerById(playerId);
            
        if (player === null) {
            throw "Can't kill player with id " + playerId + " because that player doesn't exist.";
        }

        player.die();  // Tell the player object that it is dead :(
            
        let playerTile = this.grid.getTileAtPos(player.position);  // Get the tile where the player is located.
        playerTile.clear();  // Remove the player object from the grid.
        playerTile.fill(new ge.Wall(player.direction)); // Fill the player's old location with a wall facing in the player's direction.
    }

    playerDropBomb(playerId, bombTimer=500) {
        let player = this.getPlayerById(playerId);
        
        if (player == null) {
            throw "Player with id " + playerId + " can't drop a bomb because that player doesn't exist.";
        }
        
        // Can we place a new bomb?
        // This works because a player can only drop a bomb into the space directly in front of them, i.e. the space that they would
        // move into if they moved one grid square in the direction that they were facing.
        if (this.grid.isMotionPossible(player.position, player.direction)) {
            let bombPosition;

            // Find the new position of the bomb.
            switch (player.direction) {
                case ge.Directions.UP:
                    bombPosition = player.position.above();
                    break;
                case ge.Directions.DOWN:
                    bombPosition = player.position.below();
                    break;
                case ge.Directions.LEFT:
                    bombPosition = player.position.left();
                    break;
                case ge.Directions.RIGHT:
                    bombPosition = player.position.right();
                    break;
                default:
                    throw player.direction + " is not a valid direction. Please check the player's direction."
            }

            console.log(this.grid.asText());
          
            // Place the bomb. The bomb's direction controls which direction it explodes in.
            // explosionCallback is called when the timer runs out.
            this.grid.getTileAtPos(bombPosition).fill(new ge.Bomb(bombPosition, bombTimer, this.explodeBomb.bind(this), player.direction));
          
            console.log(this.grid.asText());
        }
    }
  
    _reverseDirection(direction) {
        switch (direction) {
            case ge.Directions.UP:
              return ge.Directions.DOWN;
              break;
            case ge.Directions.DOWN:
              return ge.Directions.UP;
              break;
            case ge.Directions.LEFT:
              return ge.Directions.RIGHT;
              break;
            case ge.Directions.RIGHT:
              return ge.Directions.LEFT;
              break;
            default:
              throw "Direction couldn't be reversed: " + direction + " is not a valid direction."
        }
    }

    explodeBomb(position, direction) {  // Callback that a bomb calls to make itself go boom
        console.log(this.grid.asText());
      
        let bombTile = this.grid.getTileAtPos(position);
        bombTile.clear();  // Remove the bomb...
      	
        // Create garbage in every direction except where the player who placed it is
        let directions = [ge.Directions.UP, ge.Directions.DOWN, ge.Directions.LEFT, ge.Directions.RIGHT];
      	let explosionDirections = directions.filter(d => d != this._reverseDirection(direction));
      	
      	for (let i = 0; i < explosionDirections.length; i++) {
						let garbagePosition;
            let garbageDirection = explosionDirections[i];
          
            switch (garbageDirection) {
                case ge.Directions.UP:
                    garbagePosition = position.above();
                    break;
                case ge.Directions.DOWN:
                    garbagePosition = position.below();
                    break;
                case ge.Directions.LEFT:
                    garbagePosition = position.left();
                    break;
                case ge.Directions.RIGHT:
                    garbagePosition = position.right();
                    break;
             }

            let garbageTile = this.grid.getTileAtPos(garbagePosition);

            try {
                garbageTile.fill(new ge.Wall(garbageDirection));
            } catch (e) {
                console.log("Encountered error while creating explosion garbage but ignored it: " + e);

                if (garbageTile.occupant.type == ge.EntityTypes.PLAYER) {
                    let hitPlayer = garbageTile.occupant;

                    console.log("Explosion hit a player: " + hitPlayer.id);

                    hitPlayer.die();
                    garbageTile.clear();
                    garbageTile.fill(new ge.Wall(hitPlayer.direction));
                }
            }
          
            console.log(this.grid.asText());
        }
   }
};