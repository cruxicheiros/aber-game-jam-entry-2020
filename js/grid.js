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
    constructor(direction=ge.Directions.DOWN) {
        super(ge.EntityTypes.BOMB);
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
        if (this.isEmpty) {
            this.occupant = newOccupant;
        }
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
};
